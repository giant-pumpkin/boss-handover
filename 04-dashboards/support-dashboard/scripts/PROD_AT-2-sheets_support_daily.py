import os
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo

import requests
import gspread
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials
import json

# ==========================
# Load .env
# ==========================

script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, ".env")

load_dotenv(env_path)

# ==========================
# Configuration
# ==========================

AIRTABLE_TOKEN = os.environ.get("at_key")

BASE_ID = "apprGGdynxDTZMZmO"
TABLE_ID = "tbl7Y9QHzO1TyWZDl"
VIEW_ID = "viwK10mzPETXkKZXE"

DAILY_GOOGLE_SHEET_ID = "1Muzx4kvV0HqblBU5GwPWjQJLye1360-mM-TLB7Mat88"
WORKSHEET_NAME = "Tickets"
META_WORKSHEET_NAME = "_sync_meta"

TIMEZONE = "Asia/Bangkok"

# Change this if your Airtable date field has a different name
DATE_FIELD = "Created Time"

RECORD_ID_COLUMN = "Airtable Record ID"
MAX_CELL_LENGTH = 50000

EXCLUDED_COLUMNS = {
    "Ticket - Description - Raw"
}

if AIRTABLE_TOKEN == "PASTE_YOUR_NEW_AIRTABLE_TOKEN_HERE":
    raise ValueError("Please set AIRTABLE_TOKEN or paste your Airtable token into the script.")

# ==========================
# Google Authentication
# ==========================

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets"
]

load_dotenv()

google_credentials_json = os.getenv("google_key")

if not google_credentials_json:
    raise ValueError("Missing GOOGLE_CREDENTIALS_JSON in .env")

credentials_info = json.loads(google_credentials_json)

creds = Credentials.from_service_account_info(
    credentials_info,
    scopes=SCOPES
)
gc = gspread.authorize(creds)
spreadsheet = gc.open_by_key(DAILY_GOOGLE_SHEET_ID)

worksheet = spreadsheet.worksheet(WORKSHEET_NAME)

try:
    meta_worksheet = spreadsheet.worksheet(META_WORKSHEET_NAME)
except gspread.WorksheetNotFound:
    meta_worksheet = spreadsheet.add_worksheet(
        title=META_WORKSHEET_NAME,
        rows=10,
        cols=2
    )

# ==========================
# Helpers
# ==========================

def sheet_value(value):
    if value is None:
        return ""

    if isinstance(value, list):
        return ", ".join(sheet_value(item) for item in value)

    if isinstance(value, dict):
        if "url" in value:
            return str(value["url"])
        if "name" in value:
            return str(value["name"])
        return str(value)

    return str(value)


def limit_cell_value(value, row_num, column_name):
    value = sheet_value(value)

    if len(value) > MAX_CELL_LENGTH:
        print(
            f"Truncated long cell: row {row_num}, "
            f"column '{column_name}', length {len(value)}"
        )

        return value[:49900] + "\n\n[TRUNCATED: cell was longer than Google Sheets limit]"

    return value


def parse_airtable_date(value):
    if not value:
        return None

    value = str(value)

    try:
        if len(value) == 10:
            return date.fromisoformat(value)

        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.astimezone(ZoneInfo(TIMEZONE)).date()

    except ValueError:
        return None


def get_record_date(record):
    fields = record.get("fields", {})
    date_value = fields.get(DATE_FIELD)

    if date_value is None and DATE_FIELD in {"createdTime", "Created Time"}:
        date_value = record.get("createdTime")

    return parse_airtable_date(date_value)


def record_is_today(record, today_date):
    return get_record_date(record) == today_date


def get_last_sync_date():
    values = meta_worksheet.get_all_values()

    for row in values:
        if len(row) >= 2 and row[0] == "daily_date":
            return row[1]

    return None


def set_last_sync_date(today_date):
    meta_worksheet.update(
        values=[["daily_date", str(today_date)]],
        range_name="A1:B1"
    )


def get_existing_record_ids():
    values = worksheet.get_all_values()

    if not values:
        return set(), []

    headers = values[0]

    if RECORD_ID_COLUMN not in headers:
        return set(), headers

    record_id_index = headers.index(RECORD_ID_COLUMN)

    existing_ids = {
        row[record_id_index]
        for row in values[1:]
        if len(row) > record_id_index and row[record_id_index]
    }

    return existing_ids, headers


def build_columns(records, existing_headers):
    columns = [RECORD_ID_COLUMN]

    for header in existing_headers:
        if header and header != RECORD_ID_COLUMN:
            columns.append(header)

    discovered_columns = set()

    for record in records:
        discovered_columns.update(record.get("fields", {}).keys())

    for column in sorted(discovered_columns):
        if column not in EXCLUDED_COLUMNS and column not in columns:
            columns.append(column)

    return columns


def build_row(record, columns, row_num):
    fields = record.get("fields", {})
    row = []

    for column in columns:
        if column == RECORD_ID_COLUMN:
            row.append(record.get("id", ""))
        else:
            row.append(limit_cell_value(fields.get(column), row_num, column))

    return row

# ==========================
# Airtable Download
# ==========================

headers = {
    "Authorization": f"Bearer {AIRTABLE_TOKEN}"
}

url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_ID}"

params = {
    "view": VIEW_ID
}

records = []

while True:
    response = requests.get(
        url,
        headers=headers,
        params=params
    )

    response.raise_for_status()

    data = response.json()
    records.extend(data.get("records", []))

    if "offset" not in data:
        break

    params["offset"] = data["offset"]

print(f"Downloaded {len(records)} total records from Airtable")

# ==========================
# Daily Logic
# ==========================

today_date = datetime.now(ZoneInfo(TIMEZONE)).date()
last_sync_date = get_last_sync_date()

print(f"Today: {today_date}")
print(f"Last synced date: {last_sync_date}")

if last_sync_date != str(today_date):
    worksheet.clear()
    print("Daily sheet cleared for new day")

today_records = [
    record
    for record in records
    if record_is_today(record, today_date)
]

print(f"Found {len(today_records)} records for today")

# ==========================
# Append New Records
# ==========================

existing_ids, existing_headers = get_existing_record_ids()
columns = build_columns(today_records, existing_headers)

if not existing_headers:
    worksheet.update(
        values=[columns],
        range_name="A1"
    )
elif existing_headers != columns:
    worksheet.update(
        values=[columns],
        range_name="A1"
    )

new_records = [
    record
    for record in today_records
    if record.get("id") not in existing_ids
]

if new_records:
    rows = [
        build_row(record, columns, row_num)
        for row_num, record in enumerate(new_records, start=len(existing_ids) + 2)
    ]

    worksheet.append_rows(
        rows,
        value_input_option="RAW"
    )

    print(f"Appended {len(rows)} new daily records")
else:
    print("No new daily records to append")

set_last_sync_date(today_date)

print("Daily Google Sheet updated successfully.")