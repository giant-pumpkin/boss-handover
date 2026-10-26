# dp-scraper

Scrapes Display Player (DP) portal data into Airtable Data › `Device Portal Scraper` (`tblgyESkug0TcBVHK`).

| | |
| --- | --- |
| Entry point | `dp_scraper.py` |
| Runs on | droplet `/root/sync_scripts/dp-scraper/`, n8n workflow `nUpnbCswyRIc8FR8` "Run dp_scraper" |
| Schedule | `5,20,35,50 * * * *` Bangkok |
| Env | `.env` in the folder: `DP_USER`, `DP_PASSWORD`, `URL`, `GSHEET_ID`, `GOOGLE_CREDS_JSON`, `AT_TOKEN` <!-- confirm against the live .env --> |
| History | first deployed as a GitHub Actions scheduled workflow (`.github/workflows/scraper.yml`, still in this folder); retired, see [../deprecated/](../deprecated/). |

## Failure modes

<!-- TODO -->
