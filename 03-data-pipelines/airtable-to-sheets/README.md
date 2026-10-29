# airtable-to-sheets

Flattens Airtable tables into Google Sheets that feed the Looker Studio dashboards.

| Script | Source | Sheet | Schedule |
| --- | --- | --- | --- |
| `jobs-to-sheets.py` | Jobs base | DS002 `1o-pNpyNMkVfZVN8B0KAU0yVctwzxo6YyGsHj-ZZ9Pio` | every 15 min, n8n `oUoiyjdQie0QTVf1` |
| `tickets-to-sheets.py` | Tickets base | DS014 `1nUD9MMQfmYU9auOobEvc49nXgHD6nbyOIsvjob5S2lo` | every 15 min, n8n `F8zOykA7keVegumT` |
| `hs-quotes-to-sheets.py` | Quotes base | DS019 `12uOu1gMyA0LNdS4CTAHcd3rKPgDvoEbLH_lQ4kFxHd4` | every 15 min, n8n `U8qwYlku6D7ALe30` |

The sheets live in the Drive folder "Data sources" ([04-dashboards](../../04-dashboards/)). DS002 / DS005 / DS014 / DS016 were the earlier n8n workflows doing the same exports; archived. **DS005 (contracts and subscriptions) has no live feeder since then.** See see [01-infrastructure/n8n/workflow-catalog.md](../../01-infrastructure/n8n/workflow-catalog.md). The three scripts run from `/root/sync_scripts/airtable-to-sheets/` with `source ~/.secrets` for `AT_PAT` and `GOOGLE_CREDS_JSON`.

Env: `AT_PAT`, Google service-account JSON. Ruj's older support-dash scripts are deprecated ([../deprecated/](../deprecated/)).

<!-- TODO: copy the five scripts in -->
