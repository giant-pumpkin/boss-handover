# airtable-to-sheets

Flattens Airtable tables into Google Sheets that feed the Looker Studio dashboards.

| Script | Source | Sheet | Schedule |
| --- | --- | --- | --- |
| `jobs-to-sheets.py` | Jobs base | <!-- sheet id --> | every 15 min, n8n `oUoiyjdQie0QTVf1` |
| `tickets-to-sheets.py` | Tickets base | | every 15 min, n8n `F8zOykA7keVegumT` |
| `hs-quotes-to-sheets.py` | Quotes base | | every 15 min, n8n `U8qwYlku6D7ALe30` |
| `PROD_AT-2-sheets_support_daily.py` (support-dash, by Ruj) | Tickets base | Support dashboard sheet | every 5 min |
| `PROD_AT-2-sheets_support_monthly+weekly.py` (support-dash, by Ruj) | Tickets base | | daily at midnight |

DS002 / DS005 / DS014 / DS016 were the earlier n8n workflows doing the same exports (jobs, contracts+subscriptions, tickets+OOS, HS quotes); archived, see [01-infrastructure/n8n/workflow-catalog.md](../../01-infrastructure/n8n/workflow-catalog.md). The three scripts run from `/root/sync_scripts/airtable-to-sheets/` with `source ~/.secrets` for `AT_PAT` and `GOOGLE_CREDS_JSON`.

Env: `AT_PAT`, Google service-account JSON. The `.env` for the support-dash scripts was shared in Slack, not in the repo.

<!-- TODO: copy the five scripts in -->
