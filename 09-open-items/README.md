# 09 — Open items

Honest list of what is unfinished and what can bite. Ordered by risk.

## Risks

| # | Risk | Likelihood | Impact | Mitigation / owner |
| --- | --- | --- | --- | --- |
| 1 | PATs hard-coded in extension files and one automation; one PAT was already exposed once | certain | account compromise | rotate at handoff ([HANDOFF-CHECKLIST.md](../HANDOFF-CHECKLIST.md)) |
| 2 | `MAC-2027 - *` cycles do not exist; nobody creates them | high | no PM jobs planned for 2027 | create before leaving or assign |
| 3 | Serial-not-pre-registered → subscription never created | ongoing | revenue not billed | pre-register units on stock-in |
| 4 | Droplet is a single box with <!-- TODO backup state --> | medium | all pipelines down | snapshots + [rebuild doc](../01-infrastructure/digital-ocean-droplet/rebuild-from-scratch.md) |
| 5 | Services with no hardware have no path to a subscription | ongoing | manual billing | ConnectIQ M4 |

## Unfinished work

| Item | State | Next step | Doc |
| --- | --- | --- | --- |
| Drop the Supabase data-pipeline mirror tables left by the sync | webhooks and n8n deleted 2026-10-26 | drop `subscriptions`/`tickets` mirror tables <!-- confirm names --> | [02-airtable/webhooks.md](../02-airtable/webhooks.md) |
| Xero → Airtable on the real org | blocked on access approval | get a Standard user to click Allow; parse quote number | [03](../03-data-pipelines/xero-to-airtable/) |
| Freshdesk location-picker sidebar app | in development | finish, publish privately, update ingest webhook | [03](../03-data-pipelines/freshdesk-to-airtable/) |
| MA packages: 6 stores to add, Baan Silom cleanup, reinstall question | paused 2026-10-02 | see list | [07](../07-business-logic/maintenance-packages.md) |
| QSA and RD maintenance audit | not started | repeat the CRG method | [08](../08-audits-and-analyses/maintenance-packages-audit/) |
| Email intelligence pipeline | designed only | decide store, build | [03](../03-data-pipelines/email-intelligence/) |
| Deposit gate approval step in ApprovalMax | <!-- implemented? --> | | [05](../05-third-party-services/approvalmax.md) |
| ConnectIQ Phase 2: DR-12, DR-41 evidence, `inv_` object model, event list | decisions pending | | [06](../06-connectiq/open-decisions.md) |
| Prototype kit tables unused | | drop `inv_kit_template`, `inv_kit_item_component` | |
| Marketplace chatbot (Shopee) | shelved 2026-10-01 | n/a — personal side project, not GP | — |

## Runbooks

"When X breaks, do Y." One file per failure mode in [runbooks/](runbooks/).
