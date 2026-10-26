# Tickets not arriving in Airtable

1. Freshdesk → Admin → Automations: is the webhook rule on? Check its failure log.
2. Airtable automation `wfluuR1cEWU3jmbW7` run history: failures usually mean the Freshdesk API key in the script step was rotated.
3. Backfill gaps with `backfill.py` ([03-data-pipelines/freshdesk-to-airtable](../../03-data-pipelines/freshdesk-to-airtable/)).
