# Support dashboard (Looker Studio)

| | |
| --- | --- |
| Report URL | https://datastudio.google.com/u/0/reporting/5b779fd0-4914-4de2-a786-bf348cca998e/page/KH05F/edit |
| Shown | video wall, Experience Center office, left side |
| Owner | Sky Chew (handed over 2026-10) |
| Source sheets | DS014 - Airtable - Tickets `1nUD9MMQfmYU9auOobEvc49nXgHD6nbyOIsvjob5S2lo` (`tickets-to-sheets.py`) |
| Fed by | `tickets-to-sheets.py` every 15 min — see [03-data-pipelines/airtable-to-sheets](../../03-data-pipelines/airtable-to-sheets/) |

## Sheet-side logic

- `QUERY()` / `MATCH` pattern: <!-- TODO describe -->
- SLA fields and OOS (out-of-service) fields: <!-- TODO -->
- **NULL bug:** <!-- TODO what it is and the workaround -->

Ruj's earlier `PROD_AT-2-sheets_support_*.py` scripts are deprecated; kept in [03-data-pipelines/deprecated/support-dash-scripts](../../03-data-pipelines/deprecated/support-dash-scripts/).

## Hosting

TargetR screen `ExpC - 1x1L(2) (Dashboard Left)`, sequence **Dashboard left**, slot 6 web item with the embed URL and `?hl=en`. See [../targetr-video-wall.md](../targetr-video-wall.md).
