# cms-scraper

Scrapes player and location status from the CMS Asia / Signage Player portal into Airtable Data › `Signage Scraper` (`tblC3p1fkNrxk4tMO`), which syncs to Monitoring › `CMS status` and is linked to Inventory by serial every hour.

| | |
| --- | --- |
| Entry point | `scraper.py` |
| Runs on | droplet `/root/sync_scripts/cms-scraper/`, n8n workflow `Y7V6fDXdUsGlDaKj` "Run cms_scraper" |
| Schedule | `3,18,33,48 * * * *` Bangkok |
| Env | `.env` in the folder: `SP_EMAIL`, `SP_PASSWORD`, `GSHEET_ID`, `GOOGLE_CREDS_JSON`, `AT_TOKEN` <!-- confirm against the live .env --> |
| History | first deployed as a GitHub Actions scheduled workflow (`.github/workflows/scraper.yml`, still in this folder); that deployment was unreliable and is retired, see [../deprecated/](../deprecated/). `run_cron.sh` is from the short cron era (Aug 2026) and is no longer used. |

## Failure modes

Portal login changes or layout changes break the scrape; n8n posts the non-zero exit to Slack. <!-- TODO: anything else seen -->
