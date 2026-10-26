from pyairtable import Api 
import gspread, json, os
from datetime import datetime, timezone, timedelta
from gspread_dataframe import set_with_dataframe
import pandas as pd
from pprint import pprint


AT_PAT = os.getenv("AT_PAT")
JOBS_BASE_ID = "appdo1WwONYvmYMWg"
QUOTES_TABLE_ID = "tblRSXCmjroNPaO5j"
CUSTOMERS_TABLE_ID = "tblhzcjYQk0NJCv9v"
FIELDS_TO_EXCLUDE = ['T&Cs', 'Signed Quotes (PDF)']

jobs_base = Api(AT_PAT).base(JOBS_BASE_ID)

quote_records = jobs_base.table(QUOTES_TABLE_ID).all()

customers = {
    r["id"]: r["fields"].get("ID", "") for r in jobs_base.table(CUSTOMERS_TABLE_ID).all()
}

rows = []
for record in quote_records:
    row = {}
    for key, val in record['fields'].items():
        if key in FIELDS_TO_EXCLUDE: 
            continue
        elif key == 'Customer (AT)':
            row[key] = ", ".join(customers.get(v, v) for v in val)
        elif isinstance(val, list):
            row[key] = ", ".join(val)
        else:
            row[key] = val
    rows.append(row)

df = pd.DataFrame(rows)

### Setup gspread auth
creds_dict = json.loads(os.getenv("GOOGLE_CREDS_JSON"))
gc = gspread.service_account_from_dict(creds_dict)
sheet = gc.open_by_key("12uOu1gMyA0LNdS4CTAHcd3rKPgDvoEbLH_lQ4kFxHd4")
worksheet0 = sheet.get_worksheet(0)
worksheet0.clear()
set_with_dataframe(worksheet0, df)

worksheet1 = sheet.get_worksheet(1)
worksheet1.clear()
worksheet1.update_cell(1,1,f"Last updated: {datetime.now(timezone(timedelta(hours=7))).strftime("%d-%b-%Y, %H:%M")} UTC+7")