# hubspot-to-airtable (`sync_quotes`)

Pulls **every** quote from HubSpot, derives `quote_type` and `quote_service`, patches them back to HubSpot, upserts all quotes to Airtable `HS - Quotes` (`app8H7IMW8gHyQzzn` / `tblhX7SNxLUje9Rac`).

Replaced an Airtable automation script that hit the 50-fetch limit.

| | |
| --- | --- |
| Entry point | `main.py` (from `~/coding/hubspot-airtable-sync`) |
| Schedule | every 15 min <!-- confirm cron line --> |
| Runs on | <!-- droplet / n8n --> |
| Env | HubSpot private-app token, `AT_PAT` |

## Flow

```
HubSpot GET quotes (+deal/contact/line_item assoc)
  → batch read deals (service), contacts, line items (quote_category)
  → derive quote_type (accepted quotes only), quote_service (all non-archived)
  → PATCH back to HubSpot
  → PATCH Airtable upsert on Quote Number, batches of 10
```

## Design decisions

- **Full sync every run, no cursor.** The incremental version was buggy. Idempotent.
- **Archive detection** via `hs_archived` or `hs_quote_status = ARCHIVED`.
- **Poison-record isolation:** failed batch retries record-by-record.
- **Orphaned quotes** (`MISSING_QUOTE_ASSOCIATED_OBJECT`) retried with deal association.
- **Never write `Deposit Invoiced` / `Deposit Paid`** — accounting owns them via the Jobs-base two-way sync.
- Rate limit 150 req/10 s handled with throttle + 429 retry.

## Failure modes

<!-- TODO: what a failed run looks like, where logs go -->

## Re-run by hand

```bash
source ~/.secrets && python main.py
```

Full context: `context.md` (copy from the source folder).
