# Supabase: data-pipeline (`odpdnucjvgingrrwaaiv`)

## Tables

| Table | Populated by | Keyed on | Notes |
| --- | --- | --- | --- |
| `subscriptions` <!-- TODO real name --> | airtable-to-supabase-sync (webhook) | Airtable record id | |
| `tickets` | airtable-to-supabase-sync (webhook) | Airtable record id | |
| `inv_*`, `job_*`, `crm_*`, `mock_cl_*` | operations prototype app | uuid | prototype only; see [06-connectiq/operations-prototype](../../../06-connectiq/operations-prototype/) |
| `inv_kit_template`, `inv_kit_item_component` | nothing | | unused, safe to drop |

<!-- TODO: `supabase db dump --schema-only` into schema.sql next to this file -->

## Views and RPCs worth knowing

- Prototype RPCs: `stock_in_quantity`, `transfer_quantity_stock`, `reallocate_quantity_stock`, `adjust_quantity_stock`, `fulfill_job_quantity`, `link_job_serial`. All inventory writes go through these.
- Trigger `trg_movement_chronology` on `inv_stock_movement` rejects back-dated movements.

## RLS

Off on the pipeline tables (service-role access only from the droplet). The prototype has no auth. Do not expose anon keys.
