# Quotes base (`app8H7IMW8gHyQzzn`)

Mirror of HubSpot quotes, plus the landing table for Xero invoices.

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

<!-- TODO: schema.json, automations.md -->
