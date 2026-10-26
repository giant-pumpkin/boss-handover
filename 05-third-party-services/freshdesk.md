# Freshdesk

Observed in the Freshdesk admin UI on 2026-10-26.

| | |
| --- | --- |
| What we use it for | customer support ticketing for signage and music-streaming clients (KFC franchisees are the bulk) |
| URL | https://giantpumpkin-help.freshdesk.com |
| Plan / tier | <!-- TODO: Admin → Account → Plans; "Seats available: 0" so every seat is used --> |
| Account Administrators | Mark Moreto, Sebastian Svensson; Sky Chew is Administrator |
| Agents | 8 support agents (Lapasrada, Mark, Phirunlak, Polkrit, Sebastian, Sky, Tantika, Taweesap), 4 deactivated, group "Customer Success"; channels Ticket + Phone |
| Billing | <!-- TODO --> |
| API key in use | an agent API key hard-coded in Airtable automation `wfluuR1cEWU3jmbW7` (rotation list); n8n credential "Fresh Desk Basic API (Sky)" |

## Automations that feed Airtable

All target `https://hooks.airtable.com/workflows/v1/genericWebhook/apprGGdy…` in the Tickets base.

| Trigger | Rule | Hits last 7 days | Last edited |
| --- | --- | --- | --- |
| On create | **Airtable - Create ticket** (any source) | 662 | Sky, 1 month ago |
| On create | Create OOS request (subject contains OOS or "Sync to AT") | — | Sky, 2 months ago |
| On update | **Airtable - Update ticket** | 1,386 | Sky, 2 months ago |
| On update | Airtable - Delete ticket | 318 | Yves, 2 years ago |
| On update | Sync to AT - Create Ticket (manual tick) | — | Sky |
| On update | Airtable - Create Ticket (Outbound Email) — the outbound-email workaround | 5 | Sky, 1 month ago |
| On update | Force Sync to AT Create OOS Ticket | — | Sky, 4 months ago |

Other rules: TargetR status mails → Urgent (requester `noreply@screenstatus.net`); Check OOS (302/wk); QSA new tickets from `qsaservicedesk@tcc-technology.com` (247/wk); RD new tickets from `keris@service-now.com` (145/wk); Freshchat status mapping; Mark's "Send Email Response to Customer". Hourly-trigger rules not reviewed. <!-- TODO -->

## Apps

The private sidebar app for multi-location picking is in development ([03-data-pipelines/freshdesk-to-airtable](../03-data-pipelines/freshdesk-to-airtable/)). Installed marketplace apps: <!-- TODO: Admin → Apps → Manage apps --> 

## What breaks if it is cancelled

Support intake stops; the Tickets base, SLA reporting and the support dashboard go stale.
