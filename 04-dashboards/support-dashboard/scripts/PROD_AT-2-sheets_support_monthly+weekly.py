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

WEEKLY_GOOGLE_SHEET_ID = "1l4EWlxVScrudG7xCUPKkO_jC210x7S-3-m-NjSm7Wt0"
MONTHLY_GOOGLE_SHEET_ID = "14xNRZg1DNkTTT3d_HJfo7I9c9zKy_wyAaVh0hWWnhn8"

WORKSHEET_NAME = "Tickets"
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

weekly_worksheet = gc.open_by_key(WEEKLY_GOOGLE_SHEET_ID).worksheet(WORKSHEET_NAME)
monthly_worksheet = gc.open_by_key(MONTHLY_GOOGLE_SHEET_ID).worksheet(WORKSHEET_NAME)

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


def get_monday_start(today_date):
    return today_date - timedelta(days=today_date.weekday())


def get_next_month_start(today_date):
    if today_date.month == 12:
        return date(today_date.year + 1, 1, 1)

    return date(today_date.year, today_date.month + 1, 1)


def record_is_in_range(record, start_date, end_date):
    record_date = get_record_date(record)

    if record_date is None:
        return False

    return start_date <= record_date < end_date


def get_existing_record_ids(worksheet):
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


def sync_sheet(worksheet, records, start_date, end_date, label, should_reset):
    if should_reset:
        worksheet.clear()
        print(f"{label}: sheet cleared for new period")

    period_records = [
        record
        for record in records
        if record_is_in_range(record, start_date, end_date)
    ]

    existing_ids, existing_headers = get_existing_record_ids(worksheet)
    columns = build_columns(period_records, existing_headers)

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
        for record in period_records
        if record.get("id") not in existing_ids
    ]

    if not new_records:
        print(f"{label}: no new records to append")
        return

    rows = [
        build_row(record, columns, row_num)
        for row_num, record in enumerate(new_records, start=len(existing_ids) + 2)
    ]

    worksheet.append_rows(
        rows,
        value_input_option="RAW"
    )

    print(f"{label}: appended {len(rows)} new records")

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
# Period Logic
# ==========================

today_date = datetime.now(ZoneInfo(TIMEZONE)).date()

week_start = get_monday_start(today_date)
week_end = week_start + timedelta(days=7)

month_start = date(today_date.year, today_date.month, 1)
month_end = get_next_month_start(today_date)

weekly_should_reset = today_date.weekday() == 0
monthly_should_reset = today_date.day == 1

print(f"Weekly period: {week_start} to {week_end - timedelta(days=1)}")
print(f"Monthly period: {month_start} to {month_end - timedelta(days=1)}")

# ==========================
# Sync Sheets
# ==========================

sync_sheet(
    worksheet=weekly_worksheet,
    records=records,
    start_date=week_start,
    end_date=week_end,
    label="Weekly",
    should_reset=weekly_should_reset
)

sync_sheet(
    worksheet=monthly_worksheet,
    records=records,
    start_date=month_start,
    end_date=month_end,
    label="Monthly",
    should_reset=monthly_should_reset
)

print("Weekly and monthly Google Sheets updated successfully.")