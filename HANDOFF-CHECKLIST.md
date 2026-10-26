# Handoff checklist

Work through this before the last day. Tick as done, with a date. "Owner after" is the person who holds it once I am gone.

## Accounts and access to transfer

| Service | My role today | Owner after | Done |
| --- | --- | --- | --- |
| Airtable workspace | <!-- TODO: admin/creator --> | | ☐ |
| DigitalOcean (droplet, snapshots, billing) | | | ☐ |
| n8n instance login | | | ☐ |
| Supabase org — data-pipeline project (`odpdnucjvgingrrwaaiv`) | | | ☐ |
| Supabase org — ConnectIQ project | member | Sky | ☐ |
| GitHub `giant-pumpkin` org | | | ☐ |
| HubSpot private app / API key used by the quote sync | | | ☐ |
| Freshdesk admin + API key | | | ☐ |
| Google Workspace service account(s) for Sheets | | | ☐ |
| Looker Studio report ownership | | | ☐ |
| Xero app "Airtable Integration" (Sky's app) | | | ☐ |
| ApprovalMax | viewer | | ☐ |
| DocsAutomator | | | ☐ |
| Fillout | | | ☐ |
| CMS Asia / IXM Aqua `gpapi` user | | | ☐ |
| Vercel (ConnectIQ docs/app) | | Sky | ☐ |

## Secrets to rotate on or before the last day

Every one of these has been in my shell, a script, or an extension file. Rotate, then update the consumer listed.

| Secret (name only) | Where it is used | Done |
| --- | --- | --- |
| Airtable PAT (`AT_PAT`, and the ones hard-coded in `.tsx` extensions) | interface extensions, droplet scripts, xero sync, Freshdesk app | ☐ |
| HubSpot private app token | `hubspot-to-airtable` | ☐ |
| Freshdesk API key (hard-coded in the ticket-ingest Airtable automation) | Airtable automation `wfluuR1cEWU3jmbW7` script | ☐ |
| Supabase service-role key (data-pipeline) | airtable-to-supabase sync | ☐ |
| Google service-account JSON | `*-to-sheets.py` | ☐ |
| `XERO_CLIENT_ID` / `XERO_CLIENT_SECRET` | `xero-to-airtable` | ☐ |
| CMS / IXM Aqua `gpapi` credentials (`~/coding/cms-scraper/.env`) | cms scrapers, aqua probe | ☐ |
| Droplet SSH keys | add successor's key, remove mine | ☐ |

## Recurring duties that need a new owner

| Duty | Frequency | Doc |
| --- | --- | --- |
| Refresh Airtable webhooks before they expire | weekly | [02-airtable/webhooks.md](02-airtable/webhooks.md) |
| Tick `sync` on finished jobs so serials reach Inventory | daily-ish | [07-business-logic/subscription-lifecycle.md](07-business-logic/subscription-lifecycle.md) |
| Create next year's MA cycles and packages | yearly, by Nov | [07-business-logic/maintenance-packages.md](07-business-logic/maintenance-packages.md) |
| Monthly subscription report | monthly | [03-data-pipelines/subscription-report](03-data-pipelines/subscription-report/) |
| Check droplet disk / snapshot | monthly | [01-infrastructure/watermelon-droplet](01-infrastructure/watermelon-droplet/) |

## Knowledge transfer sessions

<!-- TODO: list the walkthroughs you want to hold and with whom, with dates. -->

- [ ] Airtable bases and automations walkthrough — with: ____ on: ____
- [ ] Droplet + n8n walkthrough — with: ____ on: ____
- [ ] Subscription lifecycle and report — with: ____ on: ____
- [ ] ConnectIQ Phase 2 open decisions — with Sky on: ____

## Final-day

- [ ] All scripts in this repo match what runs on the droplet
- [ ] `09-open-items/README.md` is current
- [ ] My personal folders on the droplet (`/root/…`) have nothing only I understand
- [ ] Forwarding / shared-mailbox arrangements for alerts that go to my email
