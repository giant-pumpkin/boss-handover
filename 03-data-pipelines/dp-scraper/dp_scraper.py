from playwright.sync_api import sync_playwright
import pandas as pd
from datetime import datetime
from zoneinfo import ZoneInfo
import dotenv, os, gspread, json, pyairtable
from gspread_dataframe import set_with_dataframe

dotenv.load_dotenv()

USERNAME = os.getenv("DP_USER")
PASSWORD = os.getenv("DP_PASSWORD")
URL = os.getenv("URL")
headless_state = True

def wait(page):
    page.wait_for_load_state('networkidle')
    page.wait_for_load_state('domcontentloaded')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=headless_state)
    context = browser.new_context(accept_downloads=True)
    page = context.new_page()

    print("Going to login page...")
    page.goto(URL)
    wait(page)

    page.get_by_placeholder('Username').fill(USERNAME)
    page.get_by_placeholder('Password').fill(PASSWORD)
    page.get_by_role(role="button", name="Log in").click()
    wait(page)

    print("Exporting CSV...")
    with page.expect_download() as download_info:
        page.get_by_role('link', name='Export CSV').click()

    download = download_info.value
    export_data = pd.read_csv(download.path())
    browser.close()

### -------------------------------
### Transform to match old main_df columns
### -------------------------------

BKK = ZoneInfo("Asia/Bangkok")

main_df = export_data.rename(columns={
    'id': 'serial',
    'name': 'location',
    'organization': 'client',
    'last_seen': 'Last Contact Date',
})

main_df['status'] = main_df['status'].str.capitalize()

main_df['Last Contact Date'] = pd.to_datetime(main_df['Last Contact Date'], utc=True, errors='coerce')
main_df['Last Contact Date'] = main_df['Last Contact Date'].apply(
    lambda ts: ts.astimezone(BKK).isoformat() if pd.notna(ts) else None
)

main_df = main_df.loc[:, ~main_df.columns.duplicated()]
main_df = main_df[['serial', 'status', 'location', 'client', 'Last Contact Date']]

main_df = main_df[main_df['serial'].astype(str).str.match(r'^[A-Za-z0-9]{5}$', na=False)]
main_df['serial'] = "TAR167 " + main_df['serial'].astype(str)

print(f"Processed {len(main_df)} players.")

### -------------------------------
### AirTable Upload
### -------------------------------
print("Uploading to AirTable...")

AT_TOKEN = os.getenv("AT_TOKEN")
BASE_ID = "app8H7IMW8gHyQzzn"
TABLE_NAME = "Device Portal Scraper"

api = pyairtable.Api(api_key=AT_TOKEN)
table = api.table(BASE_ID, TABLE_NAME)

airtable_records = table.all()
airtable_existing_serials = set(
    record['fields']['serial']
    for record in airtable_records
    if record['fields'].get('serial')
)
scraped_serials = set(main_df['serial'])
missing_serials = airtable_existing_serials - scraped_serials
missing_records = [{"fields": {"serial": sn, "status": "Missing"}} for sn in missing_serials]

airtable_df = main_df.fillna('').to_dict(orient='records')
airtable_df = [
    {"fields": {k: v for k, v in record.items() if v != ''}}
    for record in airtable_df
]

print(f"Upserting scraped records ({len(airtable_df)} records)")
table.batch_upsert(airtable_df, key_fields=['serial'])
print(f"Upserting missing records ({len(missing_records)} records)")
table.batch_upsert(missing_records, key_fields=['serial'])
print("Uploaded to AirTable successfully.")

### -------------------------------
### Google Sheets Upload
### -------------------------------
print("Uploading to Google Sheets...")

GSHEET_ID = os.getenv("GSHEET_ID")
GOOGLE_CREDS_JSON = os.getenv("GOOGLE_CREDS_JSON")
timestamp = datetime.now(BKK).strftime("%a %d %b %Y %H:%M")
creds_dict = json.loads(GOOGLE_CREDS_JSON)
gc = gspread.service_account_from_dict(creds_dict)
workbook = gc.open_by_key(GSHEET_ID)
raw_data_sheet = workbook.worksheet("raw_data_dp")
raw_data_sheet.clear()
set_with_dataframe(raw_data_sheet, main_df)
raw_data_sheet.update_cell(1, 6, f"LAST UPDATED: {timestamp}")
print("Uploaded to Google Sheets successfully.")
