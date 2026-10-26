import requests, json
from orgs import get_orgs
from refresh import refresh_token

refresh_token()
orgs = get_orgs() 
org = orgs[0] # Get the first org
with open("xero_tokens.json", "r") as f:
    xero_tokens = json.load(f)

def get_invoices():
    all_invoices = []
    page = 1
    while True:
        print(f"Requesting page {page}")
        response = requests.get(
            url = "https://api.xero.com/api.xro/2.0/Invoices",
            headers = {
                "Authorization": f"Bearer {xero_tokens["access_token"]}",
                "xero-tenant-id": org['tenantId'],
                "Accept": "application/json"
            },
            params = {
                "where": 'Type=="ACCREC"',
                "page": page,
            }
        )
        if response.status_code != 200:
            raise SystemExit(f"Error: get_invoices bad response {response.status_code} {response.text}")
        data = response.json()
        all_invoices.extend(data["Invoices"])
        print(f"Successfully requested {page}; added to all invoices.")

        pageCount = data["pagination"]["pageCount"]
        if page >= pageCount: break
        page += 1

    return all_invoices