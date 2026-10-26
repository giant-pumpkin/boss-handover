# Airtable → ConnectIQ migration, domain by domain

| Airtable | ConnectIQ domain | Stage | Notes |
| --- | --- | --- | --- |
| Resources (products) | `com_` products / pricebooks | Phase 1 M4 (Sky) | services with no hardware (e.g. Delta content curation) must fit |
| HS - Quotes | `com_` quotes | Phase 1 M5 | |
| Subscriptions | `sub_` | Phase 1 M6 | DR-10 |
| Inventory units | `inv_` | S1 | 1,003 orphan devices and serial truncation issues to clean first |
| Jobs, BOM | `ops_`, `plan_` | S2, S3 | |
| MA packages / items / cycles | `ops_` maintenance | S2 | entitlement model in [07-business-logic/maintenance-packages.md](../07-business-logic/maintenance-packages.md) |
| Tickets | `sup_` | S4 | Freshdesk stays as the front end? |
| Locations, Customers | `cl_` | Phase 1 M2 (live) | the old/new customer table split ends here |

Exit criterion for S1: every unit Airtable knows about is in ConnectIQ with placement history.
