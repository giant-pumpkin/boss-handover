# Support dashboard (Looker Studio)

| | |
| --- | --- |
| Report URL | <!-- TODO --> |
| Owner | <!-- transfer at handoff --> |
| Source sheet ID | <!-- TODO --> |
| Fed by | `PROD_AT-2-sheets_support_daily.py` (5 min), `PROD_AT-2-sheets_support_monthly+weekly.py` (midnight) — see [03-data-pipelines/airtable-to-sheets](../../03-data-pipelines/airtable-to-sheets/) |

## Sheet-side logic

- `QUERY()` / `MATCH` pattern: <!-- TODO describe -->
- SLA fields and OOS (out-of-service) fields: <!-- TODO -->
- **NULL bug:** <!-- TODO what it is and the workaround -->

Scripts and dashboard files: copy from `~/coding/support-dash/dashboard/`.
