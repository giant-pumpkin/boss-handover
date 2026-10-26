# airtable-to-sheets

Flattens Airtable tables into Google Sheets that feed the Looker Studio dashboards.

| Script | Source | Sheet | Schedule |
| --- | --- | --- | --- |
| `jobs-to-sheets.py` | Jobs base | <!-- sheet id --> | |
| `tickets-to-sheets.py` | Tickets base | | |
| `hs-quotes-to-sheets.py` | Quotes base | | |
| `PROD_AT-2-sheets_support_daily.py` (support-dash, by Ruj) | Tickets base | Support dashboard sheet | every 5 min |
| `PROD_AT-2-sheets_support_monthly+weekly.py` (support-dash, by Ruj) | Tickets base | | daily at midnight |

Exports DS005 / DS014: <!-- TODO: what these are and which script produces them -->

Env: `AT_PAT`, Google service-account JSON. The `.env` for the support-dash scripts was shared in Slack, not in the repo.

<!-- TODO: copy the five scripts in -->
