# 03 — Data pipelines

One folder per pipeline. Each has a `README.md` (flow, schedule, where it runs, failure modes, how to re-run) and the code next to it. **Copy the scripts in from `~/coding` and `/root/sync_scripts` on the droplet** — this repo must survive both. <!-- TODO -->

| Pipeline | From → To | Runs | Where | Status |
| --- | --- | --- | --- | --- |
| [hubspot-to-airtable](hubspot-to-airtable/) | HubSpot quotes → `HS - Quotes` (+ patches derived props back to HubSpot) | every 15 min | <!-- droplet cron / n8n --> | live |
| [airtable-to-supabase-sync](airtable-to-supabase-sync/) | Subscriptions + Tickets → Supabase data-pipeline | on Airtable webhook | droplet | live, fragile (webhook refresh) |
| [airtable-to-sheets](airtable-to-sheets/) | Jobs / Tickets / HS Quotes → Google Sheets | <!-- --> | droplet | live |
| [freshdesk-to-airtable](freshdesk-to-airtable/) | Freshdesk tickets → Tickets base; sidebar location-picker app | on ticket create | Freshdesk automations + Airtable | live; sidebar app in dev |
| [xero-to-airtable](xero-to-airtable/) | Xero sales invoices → `Invoices` | manual | my Mac | demo org only; blocked on access to real Xero |
| [subscription-report](subscription-report/) | Airtable subscriptions → monthly Excel report | monthly, manual | my Mac | live, manual |
| [email-intelligence](email-intelligence/) | Gmail → Claude extraction → DB | — | — | designed, not built |
| [cms-player-exports](cms-player-exports/) | CMS Asia / IXM Aqua player lists → Excel / Supabase | manual | my Mac | ad hoc |
| [deprecated](deprecated/) | Coupler.io, disabled bulk-pull n8n workflows | — | — | retired |

Secrets for all of these: [01-infrastructure/watermelon-droplet/secrets-and-env.md](../01-infrastructure/watermelon-droplet/secrets-and-env.md).

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
