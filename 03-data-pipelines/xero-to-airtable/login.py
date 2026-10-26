import os, requests, webbrowser, json
from urllib.parse import urlencode

XERO_CLIENT_ID = os.getenv("XERO_CLIENT_ID")
XERO_CLIENT_SECRET = os.getenv("XERO_CLIENT_SECRET")

if (XERO_CLIENT_ID and XERO_CLIENT_SECRET):
    print("Secrets loaded.")
else: 
    raise SystemExit("Missing XERO_CLIENT_ID or XERO_CLIENT_SECRET.")

params = {
    "response_type": "code",
    "client_id": XERO_CLIENT_ID,
    "redirect_uri": "http://localhost:3000/callback",
    "scope": "offline_access accounting.invoices.read accounting.contacts.read"
}

url = "https://login.xero.com/identity/connect/authorize?" + urlencode(params)
webbrowser.open(url)

code = input("Paste the code: ")
response = requests.post(
    url="https://identity.xero.com/connect/token",
    auth=(XERO_CLIENT_ID, XERO_CLIENT_SECRET),
    data={
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": "http://localhost:3000/callback"
    }
)

if response.status_code != 200:
    raise SystemExit(f"Token exchange failed: {response.status_code} {response.text}")

tokens = response.json()
with open("xero_tokens.json", "w") as f:
    json.dump(tokens, f, indent=2)

print("Saved tokens to xero_tokens.json")