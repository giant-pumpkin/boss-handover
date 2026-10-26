# Supabase

Two projects, deliberately separate.

| Project | Ref | Purpose | Owner |
| --- | --- | --- | --- |
| data-pipeline | `odpdnucjvgingrrwaaiv` | Airtable mirror tables (subscriptions, tickets), the operations prototype's `inv_`/`job_`/`crm_` tables, scraper outputs | me → <!-- TODO successor --> |
| ConnectIQ | <!-- TODO ref, zkqb… --> | Production platform (Phase 1 CRM). `cl_`, `com_`, `plat_`, `int_` prefixes, RLS on every table | Sky |

**Why two:** the pipeline project is a sandbox I could change freely; ConnectIQ production has a strict migration/PR process (see [06-connectiq](../../06-connectiq/)). Airtable is explicitly out of scope for ConnectIQ Phase 1 and must not be connected to it.

## data-pipeline project

See [data-pipeline/](data-pipeline/) for schema, views, and how each table is populated.

## Access

- Org: <!-- TODO -->
- Plan: <!-- TODO free/pro -->
- Service-role key is used by the droplet sync scripts. Rotate at handoff.
