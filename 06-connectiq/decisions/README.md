# Decision records from the prototype

One file each, format: Context · Decision · Consequences · Status.

| File | Decision |
| --- | --- |
| [001-pool-allocation.md](001-pool-allocation.md) | Units are allocated to a client pool before deployment |
| [002-no-kitting.md](002-no-kitting.md) | Kit assembly removed; BOM lines are individual items |
| [003-inventory-moves-on-serial-entry.md](003-inventory-moves-on-serial-entry.md) | Stock moves when a serial is linked, not when job status changes |
| [004-atomic-writes-in-db.md](004-atomic-writes-in-db.md) | All stock mutations are Postgres functions with constraints |
| [005-supabase-not-erpnext.md](005-supabase-not-erpnext.md) | Keep and harden the internal tool rather than adopt Odoo/ERPNext |
| [006-no-approvalmax-sync.md](006-no-approvalmax-sync.md) | PO reference typed on a receipt; no ApprovalMax/Xero integration |
