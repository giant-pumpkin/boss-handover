# hubspot-to-airtable (`sync_quotes`)

Pulls **every** quote from HubSpot, derives `quote_type` and `quote_service`, patches them back to HubSpot, upserts all quotes to Airtable `HS - Quotes` (`app8H7IMW8gHyQzzn` / `tblhX7SNxLUje9Rac`).

Replaced an Airtable automation script that hit the 50-fetch limit.

| | |
| --- | --- |
| Entry point | `main.py` (from `~/coding/hubspot-airtable-sync`) |
| Schedule | `8,23,38,53 * * * *` Bangkok time, by n8n workflow `BDRzM0LzjYKpuHYq` (SSH node) |
| Runs on | droplet `/root/sync_scripts/hubspot-to-airtable-sync/`, `venv/bin/python3 main.py` |
| Env | `HS_TOKEN` = HubSpot private app **API - Quote line items** (prefix `pat-na2-a9f03`, see [hubspot-api-access.md](../../05-third-party-services/hubspot-api-access.md)), `AT_PAT` |

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

A non-zero exit posts to Slack from n8n; stdout is in the n8n execution log (30 days). `cron.log` in the folder is stale since 2026-08-07. `main.py` reads `HS_TOKEN` and `AT_PAT` from the environment (`os.getenv`), loaded from the folder's `.env` on the droplet; `~/.secrets` is the laptop equivalent for hand runs.

**Known waste:** the HubSpot write-back skips `ARCHIVED`/`EXPIRED`/`VOID` quotes but not published ones, which HubSpot locks (`Published Quote cannot be edited`). Roughly 9,700 rejected calls a week land on the app, about half its budget. Filter to `hs_status = DRAFT` or drop the write-back; the per-record `PATCH …/quotes/{id}` shape in HubSpot's logs may come from the parallel Airtable automation `wflmPH9mROs9nyH4M` rather than this script, which uses `batch/update`. Details: [hubspot-api-access.md §5.1](../../05-third-party-services/hubspot-api-access.md).

## Re-run by hand

```bash
source ~/.secrets && python main.py
```

Full context: `context.md` (copy from the source folder).
