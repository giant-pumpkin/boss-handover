# Quotes base, named **Data** in Airtable (`app8H7IMW8gHyQzzn`)

Mirror of HubSpot quotes, the landing table for Xero invoices, reporting copies, and the documentation registry.

| Table | ID | Populated by | Notes |
| --- | --- | --- | --- |
| HS - Quotes | `tblhX7SNxLUje9Rac` | [hubspot-to-airtable](../../../03-data-pipelines/hubspot-to-airtable/) every 15 min, upsert on Quote Number | `Deposit Invoiced` / `Deposit Paid` are **owned by accounting** via two-way sync from the Jobs base. The sync script must never write them. |
| Invoices | `tblEvxNYRMA2xfSky` | [xero-to-airtable](../../../03-data-pipelines/xero-to-airtable/) (demo org only so far), upsert on Xero Invoice ID `fld1kSXorIZBHJv0F` | |

## Derived fields the sync maintains

- `quote_type` — from line items' product `quote_category`, e.g. `Hardware;Software`. Accepted quotes only.
- `quote_service` — from the deal's `service` (`Digital Signage` → `true`, `Music Streaming` → `music_streaming`).
- `Status (Raw)` = `ARCHIVED` when `hs_archived` or `hs_quote_status = ARCHIVED` (HubSpot never updates `hs_status` on archive).

## Interfaces

- **Quotes-to-Job** page: the sales → deployment handover. Accepted quotes in certain categories appear here; deployment creates jobs from them. Extension: [interface-extensions/jobs/quote-to-job/](../../interface-extensions/).

## Other tables worth knowing

| Table | ID | Notes |
| --- | --- | --- |
| HS - Deals, HS - Contacts | `tblvb3PYTSa2fRa6T`, `tblhiRXqTSX9QCqyO` | HubSpot mirrors |
| Sync Meta (HubSpot) | `tblzGCr7RKJCGNGBM` | used by the **still-deployed** in-Airtable `Sync HS Quotes` automation (`wflmPH9mROs9nyH4M`, every 15 min). See [automations.md](automations.md) |
| Quote - Line Items | `tblpZg6JsXtzkb0li` | |
| Subscriptions, Subscriptions - Date range | `tbloG2fLQls9ESIrY`, `tblfA08VVwMAme3V3` | reporting copies |
| Signage Scraper, Device Portal Scraper | `tblC3p1fkNrxk4tMO`, `tblgyESkug0TcBVHK` | landing tables of [cms-scraper](../../../03-data-pipelines/cms-scraper/) and [dp-scraper](../../../03-data-pipelines/dp-scraper/) |
| Documentation - Base - Structure / Fields / Automations / Workflows / Integrations | `tbldD6iYBnufCyTaf`, `tblHG3NOPuDoLUm9H`, `tblqUMQCesQgeeaIp`, `tblINNYKKKgFdFvlL`, `tbldOLA5Jet12VNM1` | exported to [../../documentation-registry/](../../documentation-registry/) |
| Employees, Terminated Employees | `tblzRNXv6tFfHDs0K`, `tblzUch1Ra0jrgqbH` | from the Workable pull |

- `schema.json` — exported 2026-10-26 (21 tables). No webhooks on this base.

- [automations.md](automations.md)
- table descriptions: see [../../sync-topology.md](../../sync-topology.md) (the registry has only one-line descriptions for this base)
