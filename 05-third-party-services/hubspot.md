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

Full detail, token prefixes, scopes, rotation procedure and the 2026-10-29 findings: [hubspot-api-access.md](hubspot-api-access.md). Apps live under Development › Legacy Apps since 2026.

| App | Token prefix | Last changed | Used by |
| --- | --- | --- | --- |
| **API - Quote line items** (`28968623`) | `pat-na2-a9f03` | 2026-07-16 | the `hubspot-to-airtable` Python sync (`HS_TOKEN`) and the Airtable `Sync HS Quotes` automation. ~20k calls/day; **~9,700 HTTP 400 a week, all `Published Quote cannot be edited` on the `quote_service` write-back**; uses API versions retiring March/September 2027 |
| Lovable-Forecast | `pat-na2-71470` | 2026-02-17 | a Lovable forecast prototype, read-only scopes; probably dead |
| Sales Dashboard | `pat-na2-b32cd` | 2026-02-03 | the sales dashboard. **Widest token in the portal**: sensitive and highly-sensitive contact/deal reads plus sales emails |
| GP-Webhooks | `pat-na2-36742` | 2025-11-11 | Subscription + Company webhooks posting to a **public webhook.site URL**; no real consumer |

Tokens are never shown here; the quote-line-items token lives in the droplet script's `.env` and on the rotation list.

## Where it is wired in

- Airtable Resources → HubSpot products (mechanism undocumented, see job-lifecycle.md gap)
- HubSpot quotes → Airtable `HS - Quotes` every 15 min, twice ([open item](../09-open-items/README.md))
- Quote line items → Airtable Data › `Quote - Line Items`
- Custom quote properties `quote_type`, `quote_service` written back by the sync
- ConnectIQ M8 cutover will retire all of this

## Gotchas

- `hs_status` never changes on archive; archive = `hs_archived` or `hs_quote_status = ARCHIVED`.
- Rate limit: the sync throttles to 150 requests / 10 s and is not rejected; HubSpot documents 100 / 10 s per private app.
- The 4XX volume on the API app is explained (2026-10-29): every run re-PATCHes `quote_service` onto published quotes, which HubSpot locks. Fix options in [hubspot-api-access.md §5.1](hubspot-api-access.md).
- GP-Webhooks is leaking Subscription and Company events to webhook.site; repoint or pause ([§5.2](hubspot-api-access.md)).

## What breaks if it is cancelled

Quoting, until ConnectIQ M5 ships; `HS - Quotes` and the Quotes-to-Job handover; line-item sync.
