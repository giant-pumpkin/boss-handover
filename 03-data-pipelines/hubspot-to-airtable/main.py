import requests, os, json, pyairtable
from dotenv import load_dotenv
from pprint import pprint
from pyairtable import Api

# --- Setup environment variables --- #
print("Loading environment variables...")
load_dotenv()
AT_TOKEN = os.getenv('AT_TOKEN')
HS_TOKEN = os.getenv('HS_TOKEN')


# --- Query all quotes from Hubspot --- #
print("Querying Hubspot Quotes...")
URL="https://api.hubapi.com/crm/v3/objects/quotes"
headers={
    "Authorization": f"Bearer {HS_TOKEN}",
    "Content-Type": "application/json"
}
all_quotes = []
params = {
    "limit": 100,
    "properties":"hs_quote_status,hs_title,hs_deal_name,hs_quote_number,hs_quote_owner_id,hs_sender_email,hs_sender_firstname,hs_sender_lastname,hs_public_url_key,hs_pdf_download_link,hs_quote_link,hs_currency,hs_template_type,hs_expired, hs_createdate,hs_accepted_date,quote_type,quote_service,buyer_company",
    "associations": "deals,line_items"
}
while True:
    response = requests.get(URL, headers=headers,params=params)
    data = response.json()
    all_quotes.extend(data['results'])
    if data.get('paging', {}).get('next'):
        params['after'] = data['paging']['next']['after']
    else:
        break
print(f"{len(all_quotes)} Hubspot quotes loaded.")
# --- Query associations --- #

# Used for batch fetching
def yield_chunks(lst, size=100):
    for i in range (0, len(lst), size):
        yield lst[i:i+size]

# Set up line item, deal ids
print("Setting line item IDs and deal ID maps")
line_item_ids = []
deal_ids = []
for quote in all_quotes:
    quote_id = quote['id']
    for line_item in quote.get('associations', {}).get('line items', {}).get('results', {}):
        line_item_ids.append(line_item['id'])
    for deal in quote.get('associations', {}).get('deals', {}).get('results', {}):
        deal_ids.append(deal['id'])
line_item_ids = list(set(line_item_ids))
deal_ids = list(set(deal_ids))

# LINE ITEM → PRODUCT: Batch fetch line items for hs_product_id,
# then batch fetch products for quote_category.
# Line items are snapshots — they don't inherit product changes,
# so we go to the product for the live quote_category.

print("Fetching line items...")
line_item_response = []
for chunk in yield_chunks(line_item_ids):
    li_url = "https://api.hubapi.com/crm/v3/objects/line_items/batch/read"
    body = {
        "inputs": [{"id": lid} for lid in chunk],
        "properties": ["hs_product_id"]
    }
    response = requests.post(li_url, headers=headers, json=body)
    line_item_response.extend(response.json()['results'])
print(f"Fetched {len(line_item_response)} line items.")

# Build line_item_id -> product_id map, collect unique product IDs
li_to_product = {}
product_ids = set()
for li in line_item_response:
    pid = li['properties'].get('hs_product_id')
    li_to_product[li['id']] = pid
    if pid:
        product_ids.add(pid)

# Batch fetch products for quote_category
print(f"Fetching {len(product_ids)} products...")
product_map = {}
for chunk in yield_chunks(list(product_ids)):
    prod_url = "https://api.hubapi.com/crm/v3/objects/products/batch/read"
    body = {
        "inputs": [{"id": pid} for pid in chunk],
        "properties": ["quote_category"]
    }
    response = requests.post(prod_url, headers=headers, json=body)
    for prod in response.json()['results']:
        product_map[prod['id']] = prod['properties'].get('quote_category')
print(f"Fetched {len(product_map)} products.")

# Build final line_item_id -> quote_category map (via product)
line_item_map = {}
for li_id, prod_id in li_to_product.items():
    if prod_id and prod_id in product_map:
        line_item_map[li_id] = product_map[prod_id]
    else:
        line_item_map[li_id] = None
print("Finished mapping line items → products → quote_category.")
# DEALS: Batch fetch deal ids, create deal id <-> deal service map
print("Fetching deal IDs...")
deal_response = []
for chunk in yield_chunks(deal_ids):
    deal_url = "https://api.hubapi.com/crm/v3/objects/deals/batch/read"
    body = {
        "inputs": [{"id": deal_id} for deal_id in chunk],
        "properties":["service"]
    }
    response = requests.post(deal_url, headers=headers, json=body)    
    deal_response.extend(response.json()['results'])
print(f"Fetched {len(deal_response)} deals.")
deal_map = {}
for deal in deal_response:
    deal_map[deal['id']] = deal['properties']['service']
print("Finished mapping deals.")
# Update all quotes with service and quote type 
print("Updating all quotes of service, quote type...")
for quote in all_quotes:
    associated_deals = [deal['id'] for deal in quote.get('associations', {}).get('deals', {}).get('results', {})]
    associated_li = [li['id'] for li in quote.get('associations', {}).get('line items', {}).get('results', {})] 
    if associated_deals:
        deal_service = deal_map[associated_deals[0]]  # in Hubspot quote properties multi-select, 'Digital Signage' is denoted as 'true', while 'Music Streaming' is denoted as 'music_streaming'.
        if deal_service == 'Music Streaming':
            deal_service = 'music_streaming'
        elif deal_service == 'Digital Signage':
            deal_service = 'true'
        quote['properties']['quote_service'] = deal_service

    if associated_li:
        quote_categories = set(line_item_map[li_id] for li_id in associated_li if line_item_map[li_id] is not None)
        AT_quote_categories = ",".join(quote_categories)
        HS_quote_categories = ";".join(quote_categories)
        quote['properties']['quote_type'] = HS_quote_categories
        quote['properties']['AT_quote_type'] = AT_quote_categories
print("Finished updating all quotes.")
# -------------------------------------- End of Quotation Pull ---------------------------------- #
# ---------------------------------- Start of Hubspot / AT Upsert ------------------------------- #

# --- Hubspot Patching --- #

print("End of quotation pull, starting Hubspot patching...")

# Skip ARCHIVED/EXPIRED/VOID and empty properties
quote_updates = [
    {
        "id": quote['id'],
        "properties": {
            k: v for k, v in {
                "quote_service": quote['properties'].get('quote_service'),
                "quote_type": quote['properties'].get('quote_type'),
            }.items() if v
        }
    }
    for quote in all_quotes
    if quote['properties'].get('hs_quote_status') not in ['ARCHIVED', 'EXPIRED', 'VOID'] and quote['id'] not in ['296777104091']
]

quote_updates = [q for q in quote_updates if q['properties']]

print(f"{len(quote_updates)} quotes to be patched to Hubspot")

# Batch update with per-record retry
hs_patch_url = "https://api.hubapi.com/crm/v3/objects/quotes/batch/update"

failed_quotes = []
for chunk in yield_chunks(quote_updates, size=50):
    body = {"inputs": chunk}
    response = requests.post(hs_patch_url, headers=headers, json=body)
    if response.status_code == 200:
        print(f"HS: Patched {len(chunk)} quotes")
    else:
        print(f"Chunk failed — retrying {len(chunk)} individually")
        failed_quotes.extend(chunk)

still_failing = []
for idx, update in enumerate(failed_quotes):
    resp = requests.post(hs_patch_url, headers=headers, json={"inputs": [update]})
    if resp.status_code != 200:
        still_failing.append(update['id'])
        print(f"{idx+1}/{len(failed_quotes)}: FAILED {update['id']}: {resp.json().get('message', '')[:200]}")
    else:
        print(f"{idx+1}/{len(failed_quotes)}: OK {update['id']}")

if still_failing:
    print(f"\n{len(still_failing)} unpatchable quotes: {still_failing}")


# --- Airtable Upsert --- # 
print("Starting Airtable upsert")

BASE_ID='app8H7IMW8gHyQzzn'
TABLE_ID='tblhX7SNxLUje9Rac'

api = Api(AT_TOKEN)
table = api.table(BASE_ID,TABLE_ID)

at_field_map = {
    'buyer_company':      'Buyer Company',
    'hs_accepted_date':   'Quote Accepted',
    'hs_createdate':      'Quote Created',
    'hs_currency':        'Currency',
    'hs_deal_name':       'Deal Name',
    'hs_object_id':       'HS Record ID',
    'hs_pdf_download_link': 'PDF Download URL',
    'hs_quote_link':      'Public Quote URL',
    'hs_quote_number':    'Quote Number',
    'hs_quote_owner_id':  'Quote Owner ID',
    'hs_quote_status':    'Status (Raw)',
    'hs_sender_email':    'Quote Owner Email',
    'hs_template_type':   'Template Type',
    'hs_title':           'Quote Title',
    'quote_service':      'Quote Service (HS)',
    'quote_type':         'Quote Type (HS)',
}

SERVICE_DISPLAY = {
    'true': 'Digital Signage',
    'music_streaming': 'Music Streaming',
}

at_records = []
for quote in all_quotes:
    fields = {}
    for hs_key, at_field in at_field_map.items():
        value = quote['properties'].get(hs_key)
        if value is None or value == '':
            continue
        if hs_key == 'quote_type':
            value = ",".join(v.strip() for v in value.split(";") if v.strip())
        elif hs_key == 'quote_service':
            value = SERVICE_DISPLAY.get(value, value)
        fields[at_field] = value
    
    # Concatenate sender name
    first = quote['properties'].get('hs_sender_firstname', '')
    last = quote['properties'].get('hs_sender_lastname', '')
    full_name = f"{first} {last}".strip()
    if full_name:
        fields['Quote Owner Name'] = full_name
    
    at_records.append({"fields": fields})

print('Upserting to Airtable')
table.batch_upsert(at_records, key_fields=['Quote Number'], typecast=True)
print('Upsert successful.')


# Find quotes in Airtable but not in HubSpot
print('Finding missing quotes')
hs_quote_numbers = {q['properties']['hs_quote_number'] for q in all_quotes if q['properties'].get('hs_quote_number')}

at_records_all = table.all(fields=['Quote Number', 'Status (Raw)'])

missing = [
    {"id": rec['id'], "fields": {"Status (Raw)": "MISSING"}}
    for rec in at_records_all
    if rec['fields'].get('Quote Number') 
    and rec['fields']['Quote Number'] not in hs_quote_numbers
    and 'GP-' not in rec['fields']['Quote Number'] # skip legacy quotes (LEG-xxx) some quotes are 'legacy' quotes, i.e. quotes made in the data-base itself, not hubspot.
    and rec['fields'].get('Status (Raw)') != 'MISSING'  # don't re-update missing quotes
]

if missing:
    table.batch_update(missing)
    print(f"Marked {len(missing)} Airtable records as MISSING")
else:
    print("No missing quotes found")