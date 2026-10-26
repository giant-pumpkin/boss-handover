from pyairtable import Api
from supabase import create_client
import pandas as pd 
import os
import time

AT_PAT = os.environ["AT_PAT"]
print("Loaded ATPAT")
api = Api(AT_PAT)
base = api.base("apprGGdynxDTZMZmO")
print("Loaded base")
table = base.table("tbl7Y9QHzO1TyWZDl")
print("Loaded table")
print("Loading ticket records...")
start = time.time()
response = table.all(fields=['fld7z8mitaadsWGaf'])
print(f"Total time taken: {time.time() - start} seconds. Fetched {len(response)} records.")

AT_record_ids = [row['fields']['Record ID'] for row in response]

# ------------------- END OF AIRTABLE SECTION, STARTING SUPABASE SECTION -------------------- #

SUPABASE_URL = os.environ["AT_SUPABASE_URL"]
SUPABASE_KEY = os.environ["AT_SUPABASE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
all_rows = []
offset = 0
batch = 1000
while True:
    response = supabase.table('tickets.tickets').select('record_id').range(offset, offset+batch - 1).execute()
    all_rows.extend(response.data)
    print(f"Query records {offset} to {offset + len(response.data)}")
    if len(response.data) < batch:
        break
    offset += batch
SUPABASE_record_ids = [row['record_id'] for row in all_rows]

at_set = set(AT_record_ids)
sb_set = set(SUPABASE_record_ids)

in_sb_not_at = sb_set - at_set
print(f"Record IDs in Supabase, not Airtable:\n{in_sb_not_at}")

tickets_to_delete = list(in_sb_not_at)
supabase.table("tickets.tickets").delete().in_("record_id", tickets_to_delete).execute()