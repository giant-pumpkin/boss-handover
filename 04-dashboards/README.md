# 04 — Dashboards

All four are Looker Studio reports on Google Sheets that the `*-to-sheets.py` scripts refresh every 15 minutes. **Ownership was handed to Sky Chew** (2026-10). The two team dashboards run on the video wall in the Experience Center office.

| Dashboard | Shown where | Report | Doc |
| --- | --- | --- | --- |
| Deployment team dashboard | video wall, right side | https://datastudio.google.com/u/0/reporting/9d81425a-db1f-473e-8607-abf7215a8a37/page/KH05F/edit | [operations-dashboard/](operations-dashboard/) |
| Support team dashboard | video wall, left side | https://datastudio.google.com/u/0/reporting/5b779fd0-4914-4de2-a786-bf348cca998e/page/KH05F/edit | [support-dashboard/](support-dashboard/) |
| Boost Juice dashboard | customer-facing | https://datastudio.google.com/u/0/reporting/af490a77-6a09-4489-8f5b-268d19b35d4c/page/1RQBG | — |
| Apple Latin America dashboard | customer-facing | https://datastudio.google.com/u/0/reporting/1150992f-b758-4caf-9aba-7d3ec189fd9f/page/vT60F | — |

## Data sources (Google Drive, "Data sources" folder)

Folder: https://drive.google.com/drive/folders/1o2VMKp1myGcIN8WcCSEcD9bYcJgdWr93

| Sheet | ID | Fed by | Schedule |
| --- | --- | --- | --- |
| [DS002 - Airtable Jobs](https://docs.google.com/spreadsheets/d/1o-pNpyNMkVfZVN8B0KAU0yVctwzxo6YyGsHj-ZZ9Pio/edit) | `1o-pNpyNMkVfZVN8B0KAU0yVctwzxo6YyGsHj-ZZ9Pio` | `jobs-to-sheets.py` (n8n `oUoiyjdQie0QTVf1`) | every 15 min |
| [DS005 - Airtable - Contracts and Subscriptions](https://docs.google.com/spreadsheets/d/1KwpxDl7R66oH_aiKD9rjXJiWuQwImXzK68cFGHSbXLY/edit) | `1KwpxDl7R66oH_aiKD9rjXJiWuQwImXzK68cFGHSbXLY` | **nothing live**: only the archived n8n `DS005 - Contracts` / `DS005 - Subscriptions` workflows reference it <!-- TODO: is this sheet still read by a dashboard? If so it is stale since the n8n workflows were archived --> | — |
| [DS014 - Airtable - Tickets](https://docs.google.com/spreadsheets/d/1nUD9MMQfmYU9auOobEvc49nXgHD6nbyOIsvjob5S2lo/edit) | `1nUD9MMQfmYU9auOobEvc49nXgHD6nbyOIsvjob5S2lo` | `tickets-to-sheets.py` (n8n `F8zOykA7keVegumT`) | every 15 min |
| [DS019 - HS Quotes](https://docs.google.com/spreadsheets/d/12uOu1gMyA0LNdS4CTAHcd3rKPgDvoEbLH_lQ4kFxHd4/edit) | `12uOu1gMyA0LNdS4CTAHcd3rKPgDvoEbLH_lQ4kFxHd4` | `hs-quotes-to-sheets.py` (n8n `U8qwYlku6D7ALe30`) | every 15 min |

The `Deprecated` subfolder holds the sheets Coupler.io used to fill. Coupler is retired; those sheets are not read by anything.

## Hosting on the video wall

<!-- TODO: how the two team dashboards are displayed on TargetR: player, URL, login kept alive, refresh interval -->
