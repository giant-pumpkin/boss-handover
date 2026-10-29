# 09 — Open items

Honest list of what is unfinished and what can bite. Ordered by risk.

## Risks

| # | Risk | Likelihood | Impact | Mitigation / owner |
| --- | --- | --- | --- | --- |
| 1 | PATs hard-coded in extension files and one automation; one PAT was already exposed once | certain | account compromise | rotate at handoff ([HANDOFF-CHECKLIST.md](../HANDOFF-CHECKLIST.md)) |
| 2 | `MAC-2027 - *` cycles do not exist; nobody creates them | high | no PM jobs planned for 2027 | create before leaving or assign |
| 3 | Serial-not-pre-registered → subscription never created; plus silent guard drops and a `contains` match that double-bills near-identical serials | ongoing | revenue not billed or billed twice | pre-register units; exact match on `SN - Normalised`; Slack on every drop — [known-issues](../02-airtable/known-issues.md), [workflow doc §5](../07-business-logic/quote-to-subscription-workflow.md) |
| 4 | Droplet is a single box with <!-- TODO backup state --> | medium | all pipelines down | snapshots + [rebuild doc](../01-infrastructure/digital-ocean-droplet/rebuild-from-scratch.md) |
| 6 | Droplet: n8n image tag unpinned, no swap, DO backups status unknown | low | surprise upgrade; no restore point | pin `n8nio/n8n:2.32.7`, confirm backups — [01-infrastructure/digital-ocean-droplet](../01-infrastructure/digital-ocean-droplet/) |
| 7 | **RLS is off on 20 prototype tables** in Supabase `odpdnucjvgingrrwaaiv` (`inv_*`, `job_*`, `crm_*`, `sub_contracts`, `mock_*`): anyone with the anon key can read or write them | certain | data exposure if the anon key leaks | prototype only, no real customer data <!-- confirm -->; enable RLS or pause the project when the prototype is retired |
| 5 | Services with no hardware have no path to a subscription | ongoing | manual billing | ConnectIQ M4 |

## Accepted risks

- **n8n reachable directly on port 5678 and no `ufw`.** Decided 2026-10-26: the n8n login (email + password) is considered sufficient; no firewall or port binding change will be made.

## Unfinished work

| Item | State | Next step | Doc |
| --- | --- | --- | --- |
| Retire the start-date repair harness (`Start date - Check`, `Alert - Start dates`, `Trigger - Align start dates`, `Start date - Rollback`, `Rollback` table) | new rule live since 2026-09-01 | delete after a clean month | [07](../07-business-logic/subscription-lifecycle.md) |
| Invert the empty-start-date Slack guard; add a `Pending installation` contract state | follow-ups from the start-date fix | | [07 §4](../07-business-logic/quote-to-subscription-workflow.md) |


| Item | State | Next step | Doc |
| --- | --- | --- | --- |
| Drop the Supabase data-pipeline mirror tables left by the sync | webhooks and n8n deleted 2026-10-26 | drop `public."inventory.subscriptions"` (10,579 rows), `public."tickets.tickets"` (20,918), `public."jobs.jobs"` (0) and `public.sync_cursors` in `odpdnucjvgingrrwaaiv` |
| Two HubSpot quote syncs are running at once: Airtable automation `wflmPH9mROs9nyH4M` (every 15 min) and the Python `hubspot-to-airtable` | both deployed | pick one, turn the other off | [02-airtable/bases/quotes-app8H7IMW8gHyQzzn/automations.md](../02-airtable/bases/quotes-app8H7IMW8gHyQzzn/automations.md) |
| Delete empty automations `Automation 1` / `Automation 2` in the Tickets base | | | |
| DS005 contracts-and-subscriptions sheet has had no feeder since the n8n DS005 workflows were archived | stale | confirm whether a dashboard reads it; if so add a `contracts-to-sheets.py` or drop the pages | [04-dashboards](../04-dashboards/) |
| HubSpot private app `API - Quote line items` logs ~9,400 4XX errors a week and uses API versions retiring in 2027 | ongoing | find the failing call (likely the double sync); plan the migration or let ConnectIQ M8 retire it | [05-third-party-services/hubspot.md](../05-third-party-services/hubspot.md) |
| Fillout/Zite organization is owned by Yves's account (left) | | transfer ownership or recreate under a company login | [05-third-party-services/fillout.md](../05-third-party-services/fillout.md) |
| Airtable: Yves still a workspace Owner; three snapshot bases (Inventory - Rollback, Jobs July 7 and July 10) can be deleted | | | [05-third-party-services/airtable.md](../05-third-party-services/airtable.md) |
| Remove leftovers on the droplet: `n8n-caddy-1` container, `docker-compose.yml.save`, Supabase n8n credential `qktRU3RadWegJ0hz` | | | [01-infrastructure/digital-ocean-droplet](../01-infrastructure/digital-ocean-droplet/) |
| Xero → Airtable on the real org | blocked on access approval | get a Standard user to click Allow; parse quote number | [03](../03-data-pipelines/xero-to-airtable/) |
| Freshdesk location-picker sidebar app | in development | finish, publish privately, update ingest webhook | [03](../03-data-pipelines/freshdesk-to-airtable/) |
| MA packages: 6 stores to add, Baan Silom cleanup, reinstall question | paused 2026-10-02 | see list | [07](../07-business-logic/maintenance-packages.md) |
| Email intelligence pipeline | designed only | decide store, build | [03](../03-data-pipelines/email-intelligence/) |
| Deposit gate approval step in ApprovalMax | <!-- implemented? --> | | [05](../05-third-party-services/approvalmax.md) |
| ConnectIQ Phase 2: DR-12, DR-41 evidence, `inv_` object model, event list | decisions pending | | [06](../06-connectiq/open-decisions.md) |
| Prototype kit tables unused | | drop `inv_kit_template`, `inv_kit_item_component` | |
| Marketplace chatbot (Shopee) | shelved 2026-10-01 | n/a — personal side project, not GP | — |

## Runbooks

"When X breaks, do Y." One file per failure mode in [runbooks/](runbooks/).
