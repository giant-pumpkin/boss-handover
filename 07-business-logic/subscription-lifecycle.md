# Subscription lifecycle (pre-ConnectIQ, as of 2026-10-09)

Three Airtable bases and HubSpot. Every step assumes a physical unit with a serial number deployed at a site.

| # | Step | System | Human or automatic |
| --- | --- | --- | --- |
| 1 | Products live in `Resources` (`tbl3eqL9QVNgZfNgZ`, Inventory base), synced to HubSpot as products | Airtable → HubSpot | automatic |
| 2 | Sales records the deal and sends a quote whose line items are synced Resources | HubSpot | human |
| 3 | Customer accepts the quote | HubSpot | human |
| 4 | Quotes sync to `HS - Quotes` every 15 min | [hubspot-to-airtable](../03-data-pipelines/hubspot-to-airtable/) | automatic |
| 5 | Accepted quotes in certain categories appear on **Quotes-to-Job** | Quotes base interface | — |
| 6 | Deployment creates job records by hand in Jobs `tblwHj9cO37wp1fVx`, does the field work | Jobs base | **human gate** |
| 7 | Job → `Installed` (done, awaiting signed delivery note/photos) or `Done`. Installer **must type deployed serials** into `fldIeKaFA33hZdtBG` | Jobs base | **human gate** |
| 8 | Data analyst ticks `sync` (`fldhTpGWsywbFFSU7`) → `wflsW0LoP8zU6XBzv` sends serials to Inventory | Jobs base | **human gate** |
| 9 | Inventory automation matches the serial to an **existing** unit in `tblp7sqsv25DVYs7T` (view `viwpizVY6u1Z6C4He`); one of `wfl1YUiIjdVT3b66E` / `wfli2h0Tnt6I56dSM` / `wfl3MhVWITaKix6QN` / `wflKuBDk5Z6MYZzHq` fires by job type | Inventory base | automatic, **fails silently if the unit does not exist** |
| 10 | `wfl1YUiIjdVT3b66E` sets `subscription contract add new` (`fldOUlb0lN9Ogcheg`) → `wflzWWNSCGdhtHrbv` creates the subscription | Inventory base | automatic |

## Where it breaks

- Unit not pre-registered in Inventory → step 9 does nothing (main source of "missing subscription").
- Services with no hardware (Delta Group content curation: 4 quarterly batches of 100 MP4s, USD 750 each, signed 2026-09-30) have no Resource, quote category, job, serial or subscription. Raised in Slack 2026-10-09; relates to M4 products in ConnectIQ.
- Jobs created by hand (step 6) and the manual sync tick (step 8) depend on one person remembering.

## Subscription contract fields (Jobs base `tbl8uHwls1HZbjYun`)

Sales, Customer, Service, Subscription type, Duration FoC (1–7 months), Start date, Invoice frequency (Monthly/Annually), Units start, Units current, Currency, PPU/month, PPL/month. Displays and LISA boxes need a contract; stands and mounts do not.

## Billing-start rules

<!-- TODO: write these out exactly. Known so far: install month is never billed for signage; music is prorated; FoC months delay the first invoice; start date = MAX of … (see 02-airtable/formulas.md). -->
