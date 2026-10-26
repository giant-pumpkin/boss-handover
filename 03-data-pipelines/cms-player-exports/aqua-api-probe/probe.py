"""
IXM Aqua (Visual Art Signage Player) write-access probe
=======================================================
Step 1 (read only, default):
    python probe.py
  Decodes the API token's claims, lists clients, and samples locations
  for the test client.

Step 2 (one guarded write, create only):
    python probe.py --write
  In the test client only:
    1. Checks the test location ID does not already exist (aborts if it does)
    2. Creates it with our own ID via POST /api/locations/{id}
    3. Reads it back and verifies name + ID are ours

This script NEVER deletes or modifies existing data: call() refuses any
HTTP method other than GET and POST. Remove the test location by hand in the CMS.

Credentials are read from ../cms-scraper/.env (GRASSFISH_CLIENT_ID / _SECRET / _REGION).
API reference: https://connect.as01.signageplayer.app/swagger/index.html
"""

import argparse
import base64
import json
import sys
from pathlib import Path

import dotenv
import requests

ENV_PATH = Path(__file__).resolve().parent.parent / "cms-scraper" / ".env"
dotenv.load_dotenv(ENV_PATH)
import os  # noqa: E402  (after dotenv so os.environ is populated)

REGION = os.getenv("GRASSFISH_REGION", "as01")
IDENTITY_URL = f"https://identity.{REGION}.signageplayer.app/connect/token"
API_BASE = f"https://connect.{REGION}.signageplayer.app/api"

TEST_CLIENT_NAME = "Giant Pumpkin Demo"
TEST_LOCATION = {
    "id": "GP-SMOKE-TEST",
    "code": "GP-SMOKE-TEST",
    "name": "GP API smoke test (safe to delete)",
    "description": "Created by aqua-api-probe to test write access.",
}


def get_token() -> str:
    resp = requests.post(IDENTITY_URL, data={
        "grant_type": "client_credentials",
        "client_id": os.environ["GRASSFISH_CLIENT_ID"],
        "client_secret": os.environ["GRASSFISH_CLIENT_SECRET"],
        "scope": "spconnect",
    }, timeout=30)
    resp.raise_for_status()
    return resp.json()["access_token"]


def token_claims(token: str) -> dict:
    payload = token.split(".")[1]
    return json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))


def call(token: str, method: str, path: str, body=None, client_id: str | None = None,
         **headers) -> requests.Response:
    if method.upper() not in ("GET", "POST"):
        raise RuntimeError(f"{method} is not allowed in this script (read and create only).")
    h ={"Authorization": f"Bearer {token}", "Content-Type": "application/json", **headers}
    if client_id:
        h["x-clientId"] = client_id
    resp = requests.request(method, f"{API_BASE}{path}", json=body, headers=h, timeout=60)
    print(f"  {method} {path} -> HTTP {resp.status_code}")
    return resp


def show(resp: requests.Response, limit: int = 2000):
    try:
        text = json.dumps(resp.json(), indent=2, ensure_ascii=False)
    except ValueError:
        text = resp.text or "(empty body)"
    print("   ", text[:limit].replace("\n", "\n    "))


def section(title: str):
    print(f"\n== {title}")


def read_only(token: str) -> dict:
    section("Token claims (what this API user is allowed to do)")
    claims = token_claims(token)
    for k, v in claims.items():
        print(f"  {k}: {v}")

    section("Clients")
    resp = call(token, "POST", "/selectclients", {}, **{"x-request-countlocationsplayers": "true"})
    resp.raise_for_status()
    clients = resp.json().get("clients", [])
    for c in clients:
        counts = {k: v for k, v in c.items() if "count" in k.lower()}
        print(f"  {c.get('name', '')!r:40} id={c.get('id')!r} code={c.get('code')!r} {counts or ''}")

    test_client = next((c for c in clients if c.get("name") == TEST_CLIENT_NAME), None)
    if not test_client:
        sys.exit(f"Test client {TEST_CLIENT_NAME!r} not found; aborting.")

    section(f"Sample locations in {TEST_CLIENT_NAME}")
    resp = call(token, "POST", "/selectlocations", {"take": 2}, client_id=test_client["id"])
    show(resp)
    return test_client


def location_exists(token: str, client_id: str, loc_id: str) -> tuple[bool, dict | None]:
    resp = call(token, "GET", f"/locations/{loc_id}", client_id=client_id)
    if resp.status_code == 404:
        return False, None
    data = resp.json() if resp.content else {}
    if resp.ok and data.get("location"):
        return True, data["location"]
    if (data.get("success") or {}).get("notFound"):
        return False, None
    show(resp)
    sys.exit("Could not determine whether the test location exists; aborting to be safe.")


def guarded_write(token: str, client: dict):
    cid, loc_id = client["id"], TEST_LOCATION["id"]

    section(f"Pre-check: does {loc_id} already exist in {TEST_CLIENT_NAME}?")
    exists, existing = location_exists(token, cid, loc_id)
    if exists:
        print("   ", json.dumps(existing, indent=2, ensure_ascii=False)[:1500])
        sys.exit("Test location ID already exists; refusing to overwrite. Aborting.")
    print("  Not found, safe to create.")

    section("Create location (POST = create-or-update)")
    resp = call(token, "POST", f"/locations/{loc_id}", TEST_LOCATION, client_id=cid)
    show(resp)
    if not resp.ok or not (resp.json().get("success") or {}).get("ok"):
        sys.exit("Create failed. Nothing to clean up. (403/unauthorizedAccess = no write permission.)")

    section("Read back and verify")
    exists, loc = location_exists(token, cid, loc_id)
    if loc:
        print("   ", json.dumps(loc, indent=2, ensure_ascii=False)[:3000].replace("\n", "\n    "))
    ids_seen = {str(loc.get(k)) for k in ("id", "Id", "externalId", "code", "Code")} if loc else set()
    verified = bool(exists and loc.get("name", loc.get("Name")) == TEST_LOCATION["name"]
                    and loc_id in ids_seen)
    print(f"  Verified ours: {verified}")
    print(f"\n  Left {loc_id} in place. Remove it by hand in the CMS under {TEST_CLIENT_NAME}.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--write", action="store_true", help="run the guarded create/verify step")
    args = ap.parse_args()

    token = get_token()
    client = read_only(token)
    if args.write:
        guarded_write(token, client)


if __name__ == "__main__":
    main()
