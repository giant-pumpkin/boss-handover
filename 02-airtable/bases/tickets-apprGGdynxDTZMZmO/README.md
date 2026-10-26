# Tickets base (`apprGGdynxDTZMZmO`)

Mirror of Freshdesk tickets plus the Locations table used for site picking.

| Table | ID | Populated by |
| --- | --- | --- |
| Tickets | `tbl7Y9QHzO1TyWZDl` (123 fields) | Freshdesk automation → webhook `wfluuR1cEWU3jmbW7` "Ingest - Freshdesk - Create ticket". Whole base watched by webhook `achhqSolaET3Br1hH` → n8n |
| SLA | `tblSxD2sxiCGtUnBb` | SLA targets per customer |
| OOS items | `tbl7imdzfTzQLIICs` | out-of-service tracking |
| Compensation | `tbl8mdLvZrXTaU8lK` | |
| Agents | `tblKaHbVK8L9U1LT1` | |
| Locations | `tbljrW84qbQIoYUBX` | hand-maintained; read by the Freshdesk sidebar app |

## Ingest automation (`wfluuR1cEWU3jmbW7`)

- Freshdesk API key is **hard-coded in the script step**. Rotate and move at handoff.
- Enrichment calls Freshdesk with `?include=stats` to get timestamps.
- Location + dedupe lookups use `contains` → false matches (KFC store codes vs Jollibee `JB-xxxx`).
- ~30% of records are deleted ITSM notification emails.

## Outbound-email workaround

<!-- TODO: describe the Freshdesk outbound email issue and the workaround -->

## Formulas

`ticket_open_mins`, SLA and OOS fields — see [../../formulas.md](../../formulas.md).

- `schema.json`, `webhooks.json` — exported 2026-10-26

- [automations.md](automations.md)
- [table-descriptions.md](table-descriptions.md)
