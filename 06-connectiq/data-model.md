# Data model (Phase 2 framing, from the model page)

- **`connectiq_objects`** — persistent, location-anchored "system deployed at a site". Id like `CIQ-00418`. Location immutable. States: no-object → pending_install → active → suspended → decommissioned, or cancelled.
- **`inventory_items`** — serial units, `owned_by` company|customer, status (in_stock, installed, …). Customer-owned units never return to stock.
- **`inventory_placements`** — episodic item↔object periods stamped with the causing job. One open placement per item; a swap closes one and opens another with the same `job_id`.
- Subscriptions hang off the object (DR-10 to confirm). Jobs act on objects. **"Nothing episodic owns anything persistent."**

## Stages

S1 Foundation `inv_` (object + placements; blocked on DR-10/12/35/41) → S2 Execution `ops_` → S3 Handover `plan_` (readiness incomplete→ready→handed over, frozen snapshot, BOM; blocked on DR-11/12) → S4 Service `sup_`/`mon_` → S5 Airtable retirement (DR-36).

## Prefixes

`cl_` customers/locations/brands · `com_` CRM/quotes/products/pricebooks · `plan_` handover/BOM/readiness · `ops_` jobs/tasks/schedules/partners · `inv_` units/stock/movements/scans/delivery notes · `sub_` subscriptions · `sup_` tickets · `mon_` device health · `int_` integrations · `rpt_` read-only views · `plat_` events/audit/identity.
