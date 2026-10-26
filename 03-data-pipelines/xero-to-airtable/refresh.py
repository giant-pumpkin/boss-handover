import json, requests, os

XERO_CLIENT_ID = os.getenv("XERO_CLIENT_ID")
XERO_CLIENT_SECRET = os.getenv("XERO_CLIENT_SECRET")

def refresh_token():
    with open("xero_tokens.json", "r") as f:
        tokens = json.load(f)

    response = requests.post(
        url="https://identity.xero.com/connect/token",
        auth=(XERO_CLIENT_ID, XERO_CLIENT_SECRET),
        data={
            "grant_type":"refresh_token",
            "refresh_token":tokens["refresh_token"]
        }
    )

    if response.status_code != 200:
        raise SystemExit(f"Error: refresh_token bad response {response.status_code} {response.text}")

    tokens = response.json()

    with open("xero_tokens.json", "w") as f:
        json.dump(tokens, f, indent=2)
    
    print("Successfully refreshed token and updated xero_tokens.json")

