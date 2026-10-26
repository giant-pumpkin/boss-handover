# 02 — Airtable

Six bases. Base IDs are in folder names so nothing is ambiguous. The in-Airtable UI name of the Quotes base is **Data**.

| Base | ID | Source of truth for | Folder |
| --- | --- | --- | --- |
| Inventory | `appRor1ipbYAb4K7z` | Products (`Resources`), inventory units, subscriptions | [bases/inventory-appRor1ipbYAb4K7z/](bases/inventory-appRor1ipbYAb4K7z/) |
| Quotes | `app8H7IMW8gHyQzzn` | HubSpot quote mirror (`HS - Quotes`), Xero invoice mirror | [bases/quotes-app8H7IMW8gHyQzzn/](bases/quotes-app8H7IMW8gHyQzzn/) |
| Jobs | `appdo1WwONYvmYMWg` | Jobs, BOMs, maintenance packages/items/cycles | [bases/jobs-appdo1WwONYvmYMWg/](bases/jobs-appdo1WwONYvmYMWg/) |
| Tickets | `apprGGdynxDTZMZmO` | Freshdesk ticket mirror, SLA, compensation | [bases/tickets-apprGGdynxDTZMZmO/](bases/tickets-apprGGdynxDTZMZmO/) |
| Locations | `appmFizJaAn7yKKVu` | **Master data**: customers, brands, sites; synced out to every other base | [bases/locations-appmFizJaAn7yKKVu/](bases/locations-appmFizJaAn7yKKVu/) |
| Monitoring | `appQT3lKdh9bdw1zo` | Device-health view fed by the CMS scraper every 15 min | [bases/monitoring-appQT3lKdh9bdw1zo/](bases/monitoring-appQT3lKdh9bdw1zo/) |

Cross-base links are **synced tables**, not real links. Synced tables cannot be written through the REST API from inside an interface extension (the sandbox blocks it); use the SDK there.

## Workspace

- Workspace admin: <!-- TODO -->
- Plan: <!-- TODO -->
- PATs in circulation: see [HANDOFF-CHECKLIST.md](../HANDOFF-CHECKLIST.md). Several are hard-coded in extension files and in one automation script.

## Cross-cutting docs

- [sync-topology.md](sync-topology.md) — every synced table, its source base/view and direction (generated from the registry)
- [documentation-registry/](documentation-registry/) — the five `Documentation - …` tables exported: table descriptions, 2,420 field descriptions, automation notes, three written workflows, integrations

- [webhooks.md](webhooks.md) — none exist as of 2026-10-26; what was there and how to check
- [formulas.md](formulas.md) — the non-obvious formulas (customer ID dedupe, `ticket_open_mins`, subscription start-date MAX)
- [known-issues.md](known-issues.md)
- [interface-extensions/](interface-extensions/) — the custom `.tsx` interface pages and the SDK-vs-REST rules

## How to export a base's schema

```bash
curl -s "https://api.airtable.com/v0/meta/bases/<baseId>/tables" -H "Authorization: Bearer $AT_PAT" | python3 -m json.tool > schema.json
```

Done 2026-10-26: each base folder has `schema.json` and `webhooks.json`. Re-export after schema changes.
