from pyairtable import Api 
import gspread, json, os
from datetime import datetime, timezone, timedelta
from gspread_dataframe import set_with_dataframe
import pandas as pd
from pprint import pprint


AT_PAT = os.getenv("AT_PAT")
JOBS_BASE_ID = "appdo1WwONYvmYMWg"
JOBS_TABLE_ID = "tblwHj9cO37wp1fVx"
COUNTRIES_TABLE_ID = "tblPY2wcrdWOvYnkd"
CUSTOMERS_TABLE_ID = "tblhzcjYQk0NJCv9v"
JOBS_FIELDS = ["fldcbFW9pJzt3ZIVh","fldTthyDHjwYyP1S2","fldGPMfidH7qwjPm6","fld19en5UMabiUnqG","fldu0PmyaUa3gAMjd",
 "fldexkzrV3Z1z270B","fldsBkE8JNcCKnAPm","fldBsUJatSTFaBFm4","fldk5E1PkIy1ZrM1e","fld7q5wjIg47nltes","fldNTfFStzSypDSAe", "fldY5hnELa5REqtzk"]


jobs_base = Api(AT_PAT).base(JOBS_BASE_ID)

job_records = jobs_base.table(JOBS_TABLE_ID).all(
    fields=JOBS_FIELDS,
    max_records=5
)

countries = {
    r["id"]: r["fields"].get("Name", "") for r in jobs_base.table(COUNTRIES_TABLE_ID).all()
}

customers = {
    r["id"]: r["fields"].get("ID", "") for r in jobs_base.table(CUSTOMERS_TABLE_ID).all()
}

rows = []
for record in job_records:
    row = {}
    for key, val in record['fields'].items():
        if key == 'Country':
            row[key] = ", ".join(countries.get(v, v) for v in val)
        elif key == 'Customer - From Location':
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
sheet = gc.open_by_key("1o-pNpyNMkVfZVN8B0KAU0yVctwzxo6YyGsHj-ZZ9Pio")
worksheet0 = sheet.get_worksheet_by_id(0)
worksheet0.clear()
set_with_dataframe(worksheet0, df)

worksheet1 = sheet.get_worksheet_by_id(1454625326)
worksheet1.clear()
worksheet1.update_cell(1,1,f"Last updated: {datetime.now(timezone(timedelta(hours=7))).strftime("%d-%b-%Y, %H:%M")} UTC+7")