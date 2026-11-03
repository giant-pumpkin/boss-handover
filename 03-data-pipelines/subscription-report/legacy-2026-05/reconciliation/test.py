"""
Update HubSpot Quote Type from Line Item Categories
====================================================
Reads line items associated with a quote, extracts their
`quote_category` property, deduplicates, and PATCHes the
quote's `quote_type` multi-select field.

Usage:
  python update_quote_type.py                          # processes ALL quotes
  python update_quote_type.py <quote_number>           # processes a single quote
  python update_quote_type.py 20260512-031527385       # example

Requirements:
  pip install requests

Environment:
  Set HS_API_KEY to your HubSpot private app token, or edit the variable below.
"""

import os
import sys
import requests

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------
HS_API_KEY = os.environ.get("HS_API_KEY", "YOUR_HUBSPOT_TOKEN")
BASE_URL = "https://api.hubapi.com"
HEADERS = {
    "Authorization": f"Bearer {HS_API_KEY}",
    "Content-Type": "application/json",
}

# Valid quote_type enum values (must match HubSpot property definition)
VALID_QUOTE_TYPES = {"Installation", "Hardware", "Software", "Delivery", "Maintenance"}


# ---------------------------------------------------------------------------
# API HELPERS
# ---------------------------------------------------------------------------
def search_quote_by_number(quote_number: str) -> dict | None:
    """Search for a quote by its hs_quote_number property."""
    url = f"{BASE_URL}/crm/v3/objects/quotes/search"
    body = {
        "filterGroups": [
            {
                "filters": [
                    {
                        "propertyName": "hs_quote_number",
                        "operator": "EQ",
                        "value": quote_number,
                    }
                ]
            }
        ],
        "properties": ["hs_title", "hs_quote_number", "quote_type", "hs_status"],
        "limit": 1,
    }
    resp = requests.post(url, headers=HEADERS, json=body)
    resp.raise_for_status()
    results = resp.json().get("results", [])
    return results[0] if results else None


def fetch_all_quotes() -> list[dict]:
    """Fetch all quotes via the list endpoint (paginated)."""
    all_quotes = []
    after = None
    while True:
        url = f"{BASE_URL}/crm/v3/objects/quotes?limit=100&properties=hs_title,hs_quote_number,quote_type,hs_status"
        if after:
            url += f"&after={after}"
        resp = requests.get(url, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
        all_quotes.extend(data.get("results", []))
        paging = data.get("paging", {}).get("next", {})
        after = paging.get("after")
        if not after:
            break
    return all_quotes


def get_associated_line_item_ids(quote_id: str) -> list[str]:
    """Get line item IDs associated with a quote via v4 Associations API."""
    url = f"{BASE_URL}/crm/v4/objects/quotes/{quote_id}/associations/line_items"
    resp = requests.get(url, headers=HEADERS)
    resp.raise_for_status()
    results = resp.json().get("results", [])
    return [str(r["toObjectId"]) for r in results]


def batch_read_line_items(line_item_ids: list[str]) -> list[dict]:
    """Batch read line items to get their quote_category property."""
    if not line_item_ids:
        return []
    url = f"{BASE_URL}/crm/v3/objects/line_items/batch/read"
    body = {
        "inputs": [{"id": lid} for lid in line_item_ids],
        "properties": ["name", "quote_category"],
    }
    resp = requests.post(url, headers=HEADERS, json=body)
    resp.raise_for_status()
    return resp.json().get("results", [])


def patch_quote_type(quote_id: str, quote_type_value: str) -> bool:
    """PATCH the quote's quote_type property. Value is semicolon-delimited."""
    url = f"{BASE_URL}/crm/v3/objects/quotes/{quote_id}"
    body = {"properties": {"quote_type": quote_type_value}}
    resp = requests.patch(url, headers=HEADERS, json=body)
    if resp.status_code == 200:
        return True
    else:
        print(f"  ✗ PATCH failed ({resp.status_code}): {resp.text}")
        return False


# ---------------------------------------------------------------------------
# CORE LOGIC
# ---------------------------------------------------------------------------
def derive_quote_type(quote_id: str) -> str | None:
    """
    For a given quote ID:
      1. Fetch associated line items
      2. Read their quote_category
      3. Deduplicate & validate against allowed enum values
      4. Return semicolon-delimited string (or None if no valid categories)
    """
    # Step 1: Get line item IDs
    li_ids = get_associated_line_item_ids(quote_id)
    if not li_ids:
        return None

    # Step 2: Batch read line items
    line_items = batch_read_line_items(li_ids)

    # Step 3: Collect unique, non-empty categories
    categories = set()
    for li in line_items:
        cat = (li.get("properties", {}).get("quote_category") or "").strip()
        if cat:
            categories.add(cat)

    # Step 4: Validate against allowed enum values
    valid = categories & VALID_QUOTE_TYPES
    invalid = categories - VALID_QUOTE_TYPES
    if invalid:
        print(f"  ⚠ Skipping invalid categories: {invalid}")

    if not valid:
        return None

    return ";".join(sorted(valid))


def process_quote(quote: dict) -> None:
    """Process a single quote: derive and patch quote_type."""
    quote_id = quote["id"]
    props = quote.get("properties", {})
    title = props.get("hs_title", "(untitled)")
    number = props.get("hs_quote_number", "(no number)")
    current_type = props.get("quote_type", "") or ""

    print(f"\n📋 Quote: {title} ({number}) [ID: {quote_id}]")
    print(f"  Current quote_type: {current_type or '(empty)'}")

    # Derive quote_type from line items
    new_type = derive_quote_type(quote_id)

    if new_type is None:
        print("  → No line items with quote_category found. Skipping.")
        return

    # Compare — only patch if changed
    # Normalize both for comparison (sorted semicolon-delimited)
    current_normalized = ";".join(sorted(current_type.split(";"))) if current_type else ""
    if current_normalized == new_type:
        print(f"  → Already up to date: {new_type}")
        return

    # Patch
    print(f"  → Updating quote_type: {new_type}")
    if patch_quote_type(quote_id, new_type):
        print(f"  ✓ Updated successfully")


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
def main():
    if HS_API_KEY == "YOUR_PRIVATE_APP_TOKEN_HERE":
        print("ERROR: Set HS_API_KEY environment variable or edit the script.")
        sys.exit(1)

    if len(sys.argv) > 1:
        # Single quote mode
        quote_number = sys.argv[1]
        print(f"🔍 Searching for quote: {quote_number}")
        quote = search_quote_by_number(quote_number)
        if not quote:
            print(f"  ✗ Quote not found: {quote_number}")
            sys.exit(1)
        process_quote(quote)
    else:
        # All quotes mode
        print("📦 Fetching all quotes...")
        quotes = fetch_all_quotes()
        print(f"  Found {len(quotes)} quotes")
        for quote in quotes:
            process_quote(quote)

    print("\n✅ Done.")


if __name__ == "__main__":
    main()