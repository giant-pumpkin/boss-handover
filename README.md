# Giant Pumpkin — Data & Systems Handoff

**Author:** Pitchayut (Boss) · pitchayut@giant-pumpkin.com
**Role handed off:** Data analyst / internal tooling (Airtable, pipelines, dashboards, ConnectIQ operations domain)
**Last working day:** 20 November 2026 <!-- TODO confirm -->
**Last updated:** 2026-10-26

This repository is the single entry point for everything I built, configured or own at Giant Pumpkin. It is written for the person who inherits the work, not for me. If a fact here disagrees with a live system, the live system wins — then fix the doc.

## How to read this repo

Folders are numbered in reading order. Every folder has a `README.md` that is its entry point.

| Folder | What it covers | Read it when |
| --- | --- | --- |
| [SYSTEM-MAP.md](SYSTEM-MAP.md) | One diagram of how every system connects | First, always |
| [HANDOFF-CHECKLIST.md](HANDOFF-CHECKLIST.md) | Accounts to transfer, secrets to rotate, who owns what after me | Before my last day |
| [GLOSSARY.md](GLOSSARY.md) | GP-internal vocabulary: job types, MA/PM, DS005, big G / lil g | When a term in any doc is unfamiliar |
| [01-infrastructure](01-infrastructure/) | The DigitalOcean droplet, n8n, Supabase projects, office network | Something server-side is down |
| [02-airtable](02-airtable/) | Every base, automation, webhook, interface extension and formula | Anything in Airtable misbehaves |
| [03-data-pipelines](03-data-pipelines/) | Each scheduled script: what it moves, where it runs, how it fails | Data stops arriving somewhere |
| [04-dashboards](04-dashboards/) | Looker Studio / Sheets dashboards and their data sources | A dashboard shows wrong or stale numbers |
| [05-third-party-services](05-third-party-services/) | One page per SaaS: purpose, where it is wired in, admin, cost | Renewals, access requests, vendor support |
| [06-connectiq](06-connectiq/) | The ConnectIQ platform: my operations domain, prototype, decisions | Working with Sky on Phase 2 |
| [07-business-logic](07-business-logic/) | Domain rules that outlive any tool (billing start, MA entitlement, procurement) | Before changing any automation or report |
| [08-audits-and-analyses](08-audits-and-analyses/) | One-off investigations and their findings | Someone asks "didn't Boss already look at this?" |
| [09-open-items](09-open-items/) | Unfinished work, known risks, runbooks | Day one of the handover |

## Ground rules for this repo

- **No secrets, ever.** Not in docs, not in exported workflow JSON, not in scripts. Variable *names* and *where the value lives* only. See [01-infrastructure/digital-ocean-droplet/secrets-and-env.md](01-infrastructure/digital-ocean-droplet/secrets-and-env.md).
- **Code lives next to its docs.** Scripts are copied here from the droplet and from `~/coding` so the repo survives both.
- **IDs are written out in full.** Airtable base/table/field/automation IDs (`app…`, `tbl…`, `fld…`, `wfl…`) are not secrets and are the only unambiguous way to name things.
- **Dates are absolute** (`2026-10-02`), never "last week".

## Where the code originally lived

| Local folder (my MacBook) | Copied to |
| --- | --- |
| `~/coding/hubspot-airtable-sync` | `03-data-pipelines/hubspot-to-airtable/` |
| `~/coding/at-supabase-reconciliation` (abandoned) | `03-data-pipelines/deprecated/airtable-to-supabase-sync/` |
| `~/coding/airtable-to-sheets`, `~/coding/jobs-to-sheets` | `03-data-pipelines/airtable-to-sheets/` |
| `~/coding/freshdesk-backfill`, `~/coding/freshdesk-location-picker` | `03-data-pipelines/freshdesk-to-airtable/` |
| `~/coding/xero-demo` | `03-data-pipelines/xero-to-airtable/` |
| `~/coding/subscription-reconciliation`, `~/coding/parse-subscriptions` | `03-data-pipelines/subscription-report/` |
| `~/coding/email-scraper` | `03-data-pipelines/email-intelligence/` |
| `~/coding/ixm-aqua-api`, `~/coding/aqua-api-probe` | `03-data-pipelines/cms-player-exports/` |
| `~/coding/cms-scraper`, `~/coding/dp-scraper` (abandoned) | `03-data-pipelines/deprecated/` |
| `~/coding/support-dash` | `04-dashboards/support-dashboard/` |
| `~/coding/airtable-interface-improvements` | `02-airtable/interface-extensions/` |
| `~/coding/connectiq-inventory-demo` | `06-connectiq/operations-prototype/` (docs only; code stays in its own repo) |
| `~/coding/massive-quote-project`, `~/coding/hubspot-line-item-parser`, `~/coding/workable-api` | `08-audits-and-analyses/` |

Copied 2026-10-26 with venvs, `.env`, data dumps (`.xlsx`, `.csv`, `.db`, PDFs) and notebook outputs excluded. Three hard-coded credentials were replaced with environment lookups (`AT_PAT`, `HS_API_KEY`, `FRESHDESK_API_KEY`); those keys still need rotating, see [HANDOFF-CHECKLIST.md](HANDOFF-CHECKLIST.md). Each folder's `SOURCE-README.md`, where present, is the original project README.
