import json, requests

def get_orgs():
    with open("xero_tokens.json", "r") as f:
        tokens=json.load(f)

    response = requests.get(
        url="https://api.xero.com/connections",
        headers={
            "Authorization": f"Bearer {tokens["access_token"]}"
        }
    )

    if response.status_code != 200:
        raise SystemExit(f"Error: get_orgs bad response {response.status_code} {response.text}")

    return response.json()