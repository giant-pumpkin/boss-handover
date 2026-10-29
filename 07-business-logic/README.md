# 07 — Business logic

Domain rules that outlive any tool. If you change an automation, report or schema, check here first. Nothing in this folder is written down anywhere a tool can show it.

| Doc | Covers |
| --- | --- |
| [subscription-lifecycle.md](subscription-lifecycle.md) | Product → quote → job → serial sync → inventory → subscription, with every automation ID |
| [quote-to-subscription-workflow.md](quote-to-subscription-workflow.md) | The same chain in depth: Quote Staging stages, what a "contract" really is, the scripts, the start-date rule, known flaws |
| [daily-operations.md](daily-operations.md) | What a human does each day: Quote Staging incl. the Exempt rule, job statuses, the unsynced-jobs routine, the inventory-import detective work |
| [installation-partners.md](installation-partners.md) | Audio Oasis, Titanium, Ofar; the Jobs X pages; guests vs collaborators; delivery-note headers per customer |
| [maintenance-packages.md](maintenance-packages.md) | MA packages, items, cycles, the one-visit-per-year entitlement |
| [job-types-and-statuses.md](job-types-and-statuses.md) | Every job type and status and what each means operationally |
| [inventory-and-warehouses.md](inventory-and-warehouses.md) | GP vs Rangsit warehouses, designation, ownership, warranties |
| [procurement-flows.md](procurement-flows.md) | The four procurement types and the deposit gate |
| [customer-id-convention.md](customer-id-convention.md) | How customers and locations are identified across systems |
