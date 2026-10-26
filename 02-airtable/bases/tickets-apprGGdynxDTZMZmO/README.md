# Tickets base (`apprGGdynxDTZMZmO`)

Mirror of Freshdesk tickets plus the Locations table used for site picking.

| Table | ID | Populated by |
| --- | --- | --- |
| Tickets | <!-- TODO --> | Freshdesk automation → webhook `wfluuR1cEWU3jmbW7` "Ingest - Freshdesk - Create ticket" |
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

<!-- TODO: schema.json, automations.md -->
