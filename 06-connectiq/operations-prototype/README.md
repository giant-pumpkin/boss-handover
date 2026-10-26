# Operations prototype (`connectiq-inventory-demo`)

React 19 + TypeScript + Vite + Tailwind 4 + Supabase (`odpdnucjvgingrrwaaiv`). Branch `master`. Code stays in its own repo <!-- TODO: link -->; this folder holds the knowledge.

## What it proved

- Serial-tracked units (displays) and quantity-only items (cables, SD cards) across warehouses, repair centres and client sites.
- **Pool allocation** per client; a deployed serial must be unallocated or in the job client's pool.
- Warranty auto-activates on first installation.
- **Inventory moves on serial entry, not on job status** — the core design decision.
- All quantity operations and fulfilment via Postgres functions (`stock_in_quantity`, `transfer_quantity_stock`, `reallocate_quantity_stock`, `adjust_quantity_stock`, `fulfill_job_quantity`, `link_job_serial`); DB constraints backstop the rules; `trg_movement_chronology` rejects back-dated movements.
- Transfer and Return are one page that infers movement type from source location.
- CRM bridge (2026-09-22): quotes, quote↔job M:N, expected receipts, `job_readiness` / greenlight, deposit gate = every deposit-before-work quote paid, quotes immutable once sent.

## What it deliberately left open

No auth and **no RLS on any of its 20 tables** (Supabase flags this as critical: the anon key can read and write everything; acceptable only because it holds test data), no movement reversal, phantom product rows in Stock Overview, serial loops in Adjustment still app-side. Kit tables exist but are unused.

## How it maps to production

Prototype `job_`, `crm_`, `mock_cl_` → `ops_`, `com_`/`plan_`, `cl_`. Its cross-domain RPCs (e.g. `link_job_serial` writing inv + ops) are **forbidden** in production and become events. Carry pool identity, the chronology trigger and atomic-write lessons into the `inv_` object model as decision records.

## Files

| File | What |
| --- | --- |
| [connectiq-inventory-prototype.md](connectiq-inventory-prototype.md) | prototype overview |
| [next_steps.md](next_steps.md) | the planning doc from Claude web, section by section |
| [progress_report.md](progress_report.md) | session-by-session build log, the return direction |
| [stock-view-spec.md](stock-view-spec.md) | Stock Overview spec |
| [connectiq-design-system.md](connectiq-design-system.md) | design system the prototype follows |

The Airtable as-is lifecycle lives with the Jobs base: [02-airtable/bases/jobs-appdo1WwONYvmYMWg/job-lifecycle.md](../../02-airtable/bases/jobs-appdo1WwONYvmYMWg/job-lifecycle.md).
