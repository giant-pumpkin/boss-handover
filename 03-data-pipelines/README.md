# 03 — Data pipelines

One folder per pipeline. Each has a `README.md` (flow, schedule, where it runs, failure modes, how to re-run) and the code next to it. **Copy the scripts in from `~/coding` and `/root/sync_scripts` on the droplet** — this repo must survive both. <!-- TODO -->

| Pipeline | From → To | Runs | Where | Status |
| --- | --- | --- | --- | --- |
| [hubspot-to-airtable](hubspot-to-airtable/) | HubSpot quotes → `HS - Quotes` (+ patches derived props back to HubSpot) | every 15 min | <!-- droplet cron / n8n --> | live |
| [airtable-to-sheets](airtable-to-sheets/) | Jobs / Tickets / HS Quotes → Google Sheets | <!-- --> | droplet | live |
| [freshdesk-to-airtable](freshdesk-to-airtable/) | Freshdesk tickets → Tickets base; sidebar location-picker app | on ticket create | Freshdesk automations + Airtable | live; sidebar app in dev |
| [xero-to-airtable](xero-to-airtable/) | Xero sales invoices → `Invoices` | manual | my Mac | demo org only; blocked on access to real Xero |
| [subscription-report](subscription-report/) | Airtable subscriptions → monthly Excel report | monthly, manual | my Mac | live, manual |
| [email-intelligence](email-intelligence/) | Gmail → Claude extraction → DB | — | — | designed, not built |
| [cms-scraper](cms-scraper/) | CMS Asia (Signage Player) player/location status → Data › Signage Scraper → Monitoring › CMS status | `3,18,33,48 * * * *` | droplet, n8n `Y7V6fDXdUsGlDaKj` | live |
| [dp-scraper](dp-scraper/) | Display Player portal → Data › Device Portal Scraper | `5,20,35,50 * * * *` | droplet, n8n `nUpnbCswyRIc8FR8` | live |
| [cms-player-exports](cms-player-exports/) | IXM Aqua API probes and player exports → Excel | manual | my Mac | ad hoc |
| [deprecated](deprecated/) | Coupler.io, disabled bulk-pull n8n workflows, the GitHub Actions deployment of the cms/dp scrapers, abandoned Airtable → Supabase webhook sync | — | — | retired |

Secrets for all of these: [01-infrastructure/digital-ocean-droplet/secrets-and-env.md](../01-infrastructure/digital-ocean-droplet/secrets-and-env.md).

## Template for each pipeline README

```
# <name>
What it moves · Trigger/schedule · Runs on · Entry point · Env vars (names)
## Flow (diagram)
## Idempotency (safe to re-run? keyed on what?)
## Failure modes and what you see
## How to re-run by hand
## Open items
```
