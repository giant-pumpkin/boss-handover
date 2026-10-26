# Documentation registry (exported from Airtable)

Someone (<!-- TODO: who, when --> ) started documenting the whole stack **inside Airtable**, in five tables of the Data base (`app8H7IMW8gHyQzzn`). Exported here 2026-10-26 so it survives. These are the richest descriptions that exist of what each table and automation is *for*.

| File | Source table | Records | What |
| --- | --- | --- | --- |
| [`structure.json`](structure.json) → [../sync-topology.md](../sync-topology.md) and each base's `table-descriptions.md` | Documentation - Base - Structure `tbldD6iYBnufCyTaf` | 99 | one row per table per base: sync source, direction, description |
| [`fields.json`](fields.json) | Documentation - Fields `tblHG3NOPuDoLUm9H` | 2,420 | one row per field: type, description, formula, link target. Built by the (now undeployed) automation `wfl6HG4pBZM843RaR` |
| [`automations.json`](automations.json) → each base's `automations.md` | Documentation - Automations `tblqUMQCesQgeeaIp` | 62 | reads/writes, side effects, idempotency, race-condition risk. Only the Inventory and a few Jobs/Data entries have descriptions |
| [`workflows.json`](workflows.json) → [workflows.md](workflows.md), [workflows/](workflows/) | Documentation - Workflows `tblINNYKKKgFdFvlL` | 11 | end-to-end processes; three fully written (subscription lifecycle, quote-to-operations, maintenance lifecycle) |
| [`integrations.json`](integrations.json) → [integrations.md](integrations.md) | Documentation - Integrations `tbldOLA5Jet12VNM1` | 5 | Coupler, DocsAutomator, Freshdesk, HubSpot, Slack-style descriptions |

The registry predates some changes (Python HubSpot sync, abandoned Supabase mirror), so where it disagrees with the rest of this repo, the repo is newer.
