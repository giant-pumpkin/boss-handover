"""
Airtable Tickets → Google Sheets Sync
======================================
Fetches Tickets from the Incidents base, resolves all linked record IDs,
and writes the flattened result to Google Sheets.

Triggered by n8n via SSH node on a schedule.

.env required:
  AT_PAT=your_airtable_pat
  GOOGLE_CREDS_JSON={"type":"service_account",...}
"""

import os
import re
import json
import sys
import logging
from time import time

import dotenv
import pandas as pd
import gspread
import pyairtable
from gspread_dataframe import set_with_dataframe

dotenv.load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
AT_PAT = os.getenv("AT_PAT")
GOOGLE_CREDS_JSON = os.getenv("GOOGLE_CREDS_JSON")
SHEET_TAB = "Tickets"  # tab name in the spreadsheet

# ── Airtable IDs (Incidents base) ─────────────────────────────────────────────
BASE_ID = "apprGGdynxDTZMZmO"

TABLES = {
    "tickets":     "tbl7Y9QHzO1TyWZDl",
    "locations":   "tbljrW84qbQIoYUBX",
    #"oos_items":   "tbl7imdzfTzQLIICs",
    "sla":         "tblSxD2sxiCGtUnBb",
    "customers":   "tblKL04W1YLy6q3SP",
    "compensation":"tbl8mdLvZrXTaU8lK",
    "jobs":        "tblalOqkup0XIxdVa",
    #"menu_items":  "tblBkzDATbdxYdoZo",
    #"ticket_log":  "tbleP7GMbY1P3ERFv",
    "weeks":       "tbl5v4LXUdI1nAxwg",
}

# Fields to use as display name per lookup table (tried in order)
PRIMARY_FIELDS = ["ID", "Name", "Brand owner", "Brand"]


# ══════════════════════════════════════════════════════════════════════════════
# AIRTABLE FETCH
# ══════════════════════════════════════════════════════════════════════════════

def get_api():
    return pyairtable.Api(AT_PAT)


def fetch_table(api, table_id, table_name):
    """Fetch all records from a table. Returns list of dicts with 'id' and 'fields'."""
    log.info("Fetching %s...", table_name)
    t0 = time()
    table = api.table(BASE_ID, table_id)
    records = table.all()
    elapsed = time() - t0
    log.info("  %s: %d records in %.1fs", table_name, len(records), elapsed)
    return records


def build_id_to_name(records):
    """Build a dict mapping record ID → primary field display name."""
    mapping = {}
    for r in records:
        rec_id = r["id"]
        fields = r.get("fields", {})
        name = None
        for pf in PRIMARY_FIELDS:
            if pf in fields and fields[pf]:
                name = str(fields[pf])
                break
        mapping[rec_id] = name or rec_id
    return mapping


# ══════════════════════════════════════════════════════════════════════════════
# RECORD TRANSFORMATION
# ══════════════════════════════════════════════════════════════════════════════

REC_ID_PATTERN = re.compile(r"^rec[A-Za-z0-9]{14,17}$")


def is_rec_id(val):
    return isinstance(val, str) and REC_ID_PATTERN.match(val)


def resolve_value(val, id_to_name):
    """Resolve a single field value, handling all Airtable types."""
    if val is None:
        return ""

    if isinstance(val, list):
        if len(val) == 0:
            return ""

        # Filter out nulls (e.g. Auto renew: [null])
        filtered = [v for v in val if v is not None]
        if not filtered:
            return ""

        first = filtered[0]

        # Array of record IDs
        if is_rec_id(first):
            return ", ".join(id_to_name.get(v, v) for v in filtered)

        # Array of objects (collaborators, attachments, specialValue)
        if isinstance(first, dict):
            parts = []
            for v in filtered:
                if "specialValue" in v:
                    parts.append(str(v["specialValue"]))
                elif "url" in v:
                    parts.append(v["url"])
                elif "name" in v:
                    parts.append(v["name"])
                elif "email" in v:
                    parts.append(v["email"])
                else:
                    parts.append(json.dumps(v))
            return ", ".join(parts)

        # Array of primitives
        return ", ".join(str(v) for v in filtered)

    if isinstance(val, dict):
        # Single collaborator or special object
        if "name" in val:
            return val["name"]
        if "id" in val:
            return val["id"]
        if "specialValue" in val:
            return str(val["specialValue"])
        if "error" in val:
            return val["error"]
        return json.dumps(val)

    return val


def flatten_record(record, id_to_name):
    """Flatten an Airtable record into a dict of resolved values."""
    fields = record.get("fields", {})
    row = {}
    for key, val in fields.items():
        row[key] = resolve_value(val, id_to_name)
    row["airtable_record_id"] = record["id"]
    return row


# ══════════════════════════════════════════════════════════════════════════════
# GOOGLE SHEETS UPLOAD
# ══════════════════════════════════════════════════════════════════════════════

def upload_to_sheets(df):
    log.info("Uploading %d rows x %d cols to Google Sheets...", len(df), len(df.columns))
    creds_dict = json.loads(GOOGLE_CREDS_JSON)
    gc = gspread.service_account_from_dict(creds_dict)
    workbook = gc.open_by_key('1nUD9MMQfmYU9auOobEvc49nXgHD6nbyOIsvjob5S2lo')

    needed_rows = len(df) + 1
    needed_cols = len(df.columns)

    try:
        sheet = workbook.worksheet(SHEET_TAB)
        sheet.clear()
        if sheet.row_count < needed_rows or sheet.col_count < needed_cols:
            sheet.resize(rows=needed_rows, cols=needed_cols)
    except gspread.exceptions.WorksheetNotFound:
        sheet = workbook.add_worksheet(title=SHEET_TAB, rows=needed_rows, cols=needed_cols)

    headers = [list(df.columns)]
    sheet.update(headers, "A1")
    log.info("  Header row written (%d columns)", len(df.columns))

    CHUNK_ROWS = 5000
    total_rows = len(df)
    for start in range(0, total_rows, CHUNK_ROWS):
        end = min(start + CHUNK_ROWS, total_rows)
        chunk = df.iloc[start:end]
        values = chunk.astype(str).values.tolist()
        cell_start = f"A{start + 2}"
        sheet.update(values, cell_start)
        log.info("  Wrote rows %d–%d of %d", start + 1, end, total_rows)

    log.info("Google Sheets upload complete.")


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    t0 = time()
    log.info("=== Airtable Tickets → Google Sheets Sync Started ===")

    api = get_api()

    # ── Fetch all tables ──────────────────────────────────────────────────────
    tickets = fetch_table(api, TABLES["tickets"], "Tickets")

    # Fetch lookup tables
    lookup_records = []
    for name, table_id in TABLES.items():
        if name == "tickets":
            continue
        records = fetch_table(api, table_id, name)
        lookup_records.extend(records)

    # Also index tickets themselves (for self-referential Parent field)
    lookup_records.extend(tickets)

    # ── Build ID → Name map ───────────────────────────────────────────────────
    id_to_name = build_id_to_name(lookup_records)
    log.info("ID map built: %d entries", len(id_to_name))

    # ── Flatten and resolve all records ───────────────────────────────────────
    log.info("Resolving %d ticket records...", len(tickets))
    rows = [flatten_record(r, id_to_name) for r in tickets]

    df = pd.DataFrame(rows)
    df = df.fillna("")
    # Strip .000Z from Freshdesk ISO timestamps so Looker parses them as native dates
    date_cols = [c for c in df.columns if c.lower().endswith("_at")]
    for col in date_cols:
        df[col] = df[col].astype(str).str.replace(r"\.\d{3}Z$", "", regex=True)
        mask = df[col].str.len() > 0
        df.loc[mask, col] = pd.to_datetime(df.loc[mask, col]).dt.tz_localize("UTC").dt.tz_convert("Asia/Bangkok").dt.strftime("%Y-%m-%dT%H:%M:%S")

    log.info("DataFrame: %d rows x %d columns", df.shape[0], df.shape[1])

    # ── Upload ────────────────────────────────────────────────────────────────
    try:
        MAX_CELL_LEN = 1000
        for col in df.columns:
            df[col] = df[col].apply(lambda x: str(x)[:MAX_CELL_LEN] if isinstance(x, str) and len(str(x)) > MAX_CELL_LEN else x)
        upload_to_sheets(df)
    except Exception as e:
        log.error("Google Sheets upload failed: %s", e, exc_info=True)
        sys.exit(1)

    elapsed = time() - t0
    mins = int(elapsed // 60)
    secs = round(elapsed % 60, 1)
    log.info("=== Done. %d tickets synced in %dm %ss ===", len(tickets), mins, secs)


if __name__ == "__main__":
    main()