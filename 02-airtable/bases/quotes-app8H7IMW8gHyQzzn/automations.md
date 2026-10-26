# Data base automations

Live list from the Airtable API, 2026-10-26 (9 automations, 5 deployed). Where the in-Airtable registry had a description it is appended. Open any automation at `https://airtable.com/app8H7IMW8gHyQzzn/workflows/<id>`.

| ID | Name | Deployed | Trigger | What it does | Registry notes |
| --- | --- | --- | --- | --- | --- |
| `wflqUjw8vikw9cTtU` | Subscriptions - Assign time segment | on | conditions · Subscriptions (flag false) | two scripts |  |
| `wflUXV7YjUelVSGPk` | GET Request for Employees List from Workable | on | cron monthly, 1st 00:00 | script pulls Workable employees into Employees |  |
| `wflTqfBRX1DhUJz8S` | Employees - Assign time segment | on | cron monthly, 1st 00:00 | script |  |
| `wflwsn9jgLz9jQonk` | DEV - Hydrate HS quotes | off | conditions · HS - Quotes (checkbox) | script + update |  |
| `wfll0rrNOOEDWXmOG` | Assign previous segment | on | cron Sun 06:00 | script |  |
| `wfl6HG4pBZM843RaR` | Build "Documentation - Fields" table | off | cron daily 00:00 | script that regenerated the Documentation - Fields registry |  |
| `wflYfmHRR89J2Hg7T` | Sync HS Deals | off | cron monthly | script |  |
| `wflmKv9annbVplTtW` | Sync HS Contacts | off | cron monthly | script |  |
| `wflmPH9mROs9nyH4M` | Sync HS Quotes | **on** | cron every 15 min since 2026-04-27 | **the old in-Airtable HubSpot quote sync is still deployed.** The Python hubspot-to-airtable script was written to replace it (50-fetch limit). Both may be writing HS - Quotes. Decide which one lives and turn the other off. |  |
