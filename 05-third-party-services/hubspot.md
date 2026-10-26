# HubSpot

Observed in the HubSpot UI on 2026-10-26. Being replaced by ConnectIQ Phase 1 (M1–M3 live, M4 in progress).

| | |
| --- | --- |
| What we use it for | CRM: companies, contacts, deals, quotes with line items, products synced from Airtable Resources |
| URL | https://app-na2.hubspot.com (portal **244131765**, NA2 data centre) |
| Account | "Giant Pumpkin", time zone Bangkok, fiscal year Jan–Dec, industry Professional Services |
| Plan / tier | <!-- TODO: the billing page needs a Super Admin billing permission; Seb can read it --> |
| Super Admins | Pitchayut Lertniratwong (me), Sebastian Svensson |
| Users | 16 active, 0 pending, 3 deactivated. Revenue Professional seats: Chanissara, Patlita, Phongphot, Rattinand, Seb, me. View-only: Duangnate, Krittiyanee, Natamon, Patcharanat, Phirunlak, and others |
| Billing | <!-- TODO --> |
| Support | HubSpot in-app |

## Private apps (now "Legacy apps", all marked "update available")

| App | Last changed | Used by |
| --- | --- | --- |
| **API - Quote line items** (`28968623`) | 2026-07-16 | the `hubspot-to-airtable` Python sync and the Airtable `Sync HS Quotes` automation. ~25k calls/day; **9,421 4XX errors in the last 7 days** (most recent 7 minutes before inspection) and HubSpot warns it uses API versions retiring March/September 2027 |
| Lovable-Forecast | 2026-02-17 | a Lovable prototype; probably dead |
| Sales Dashboard | 2026-02-03 | <!-- TODO --> |
| GP-Webhooks | 2025-11-11 | <!-- TODO: which webhooks, pointing where --> |

Tokens are never shown here; the quote-line-items token lives in the droplet script's `.env` and on the rotation list.

## Where it is wired in

- Airtable Resources → HubSpot products (mechanism undocumented, see job-lifecycle.md gap)
- HubSpot quotes → Airtable `HS - Quotes` every 15 min, twice ([open item](../09-open-items/README.md))
- Quote line items → Airtable Data › `Quote - Line Items`
- Custom quote properties `quote_type`, `quote_service` written back by the sync
- ConnectIQ M8 cutover will retire all of this

## Gotchas

- `hs_status` never changes on archive; archive = `hs_archived` or `hs_quote_status = ARCHIVED`.
- Rate limit 150 requests / 10 s on this tier.
- The 4XX error volume on the API app should be looked at before handover: it may be the double sync fighting, or `MISSING_QUOTE_ASSOCIATED_OBJECT` retries.

## What breaks if it is cancelled

Quoting, until ConnectIQ M5 ships; `HS - Quotes` and the Quotes-to-Job handover; line-item sync.
