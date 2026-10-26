from supabase import client
from pyairtable import Api
from pprint import pprint
import os, time
AT_PAT = os.environ["AT_PAT"]
AT_SUPABASE_URL = os.environ["AT_SUPABASE_URL"]
AT_SUPABASE_KEY = os.environ["AT_SUPABASE_KEY"]

FIELD_MAP = {
    'ID': 'ticket_id',
    'Created - Normalised': 'created_datetime',
    'Agent': 'agent',
    'Open (min.)': 'time_open',
    'Last Modified - Status - Resolved': 'resolved_datetime',
    'Ticket - Status': 'status',
    'Location': 'location',
    'Within SLA': 'within_sla',
    'SLA': 'sla',
    'Ticket - Type': 'ticket_type',
    'OOS': 'oos',
}

api = Api(AT_PAT)
tickets = api.base('apprGGdynxDTZMZmO').table("Tickets").all(
    max_records=1,
    fields=list(FIELD_MAP.keys()),
)

tickets = [api.base('apprGGdynxDTZMZmO').table("Tickets").get(record_id='recleLGFZWvKMPc7M')]
pprint(tickets)
payload = []
for ticket in tickets:
    f = ticket['fields']
    row = {"record_id": ticket['id']}
    for at_field, sb_col in FIELD_MAP.items():
        val = f.get(at_field)
        if at_field == 'Agent' and val:
            val = val.get('name')
        if at_field in ('Location', 'SLA') and isinstance(val, list):
            val = val[0] if val else None
        row[sb_col] = val
    payload.append(row)
pprint(payload)

