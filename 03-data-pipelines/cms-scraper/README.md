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

## The "CMS/DP Information" Google Sheet

Sheet `19AQuRcClma4uzMvGz9kFG7shcxontNVRZGliAu2Mx0k` ("CMS/DP Information"). Tab `raw_data` is what `scraper.py` uploads (cleared and rewritten every run, `LAST UPDATED:` stamp in the header row); `raw_data_dp` is the same from [dp-scraper](../dp-scraper/). The front tab (`CMS Asia`) is a `=QUERY(raw_data!A:N, …)` over it: Client, PlayerName, LastContactDate, ScreenModels, SerialNumber, ScreenStatus (Online / Offline / Unpaired), ClientId. This is the sheet Support and Chris look at for player status; the Airtable `Signage Scraper` table is the same data. <!-- confirm: the GSHEET_ID in the droplet .env files should be this ID; the copies in ~/coding/*/.env on my Mac hold a different one -->

### Daily snapshot (Google Apps Script)

Because every scraper run overwrites `raw_data`, the sheet keeps its own history: a bound Apps Script (Extensions › Apps Script on the sheet, project "Untitled project", one file `Code.gs`) copies the whole spreadsheet into Drive folder [`1ZkT9fA3v7X8k9h2GXNrpqiVpQWmCDYnB`](https://drive.google.com/drive/folders/1ZkT9fA3v7X8k9h2GXNrpqiVpQWmCDYnB) once a day, named `YYYY-MM-DD_log`.

```js
function backupAsSheets() {
  const folderId = "1ZkT9fA3v7X8k9h2GXNrpqiVpQWmCDYnB";
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dateString = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const file = DriveApp.getFileById(ss.getId());
  const folder = DriveApp.getFolderById(folderId);
  file.makeCopy(dateString + "_log", folder);
}
```

| | |
| --- | --- |
| Trigger | time-driven, day timer, 04:00–05:00 Bangkok, function `backupAsSheets`, deployment Head |
| Failure notification | "Notify me daily", to the trigger owner |
| Owner | **Boss's Google account** (trigger "Owned by: Me"). Apps Script triggers die with the account, and the copies are made as the trigger owner. |
| Last seen running | 2026-11-03 04:56 |

**Handover:** someone who keeps a Google account must open the script, delete this trigger and create the same one under their own account (Triggers › Add Trigger). The folder should be moved to a shared drive or at least shared with that person. Nothing reads the snapshots automatically, but the **subscription report depends on them**: it takes the last-day-of-month copy for each month as the source of truth for whether a screen was on site ([../subscription-report/](../subscription-report/)). Old copies are never deleted. The folder is called `cms_daily`; snapshots start Feb 2026, so January 2026 cannot be validated.
