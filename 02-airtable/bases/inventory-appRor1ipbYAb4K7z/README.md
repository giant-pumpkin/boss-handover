# Inventory base (`appRor1ipbYAb4K7z`)

Source of truth for products, physical units, and subscriptions.

## Key tables

| Table | ID | What it holds |
| --- | --- | --- |
| Resources | `tbl3eqL9QVNgZfNgZ` | Product catalog. Synced to HubSpot as products. |
| Inventory | `tblp7sqsv25DVYs7T` | One row per physical unit (serial). View `viwpizVY6u1Z6C4He` is what the sync automations search. |
| Subscriptions | `tblyNA73D9jldeEir` | One row per subscription. Created by automation. Watched by webhook `achTRaF6zyL0VZOjf`. |
| Subscription contracts | `tblhn4CJZbi57C8WP` | Contract terms (the Jobs-base `tbl8uHwls1HZbjYun` is a copy) |
| Subscription types | `tblKuzC0cNODVv9Zm` | |
| Customers | `tblxGzxvDjhH7NX1N` | synced into Jobs base as `tblBjI9HEpZz8lFmY` |
| Locations | `tblChlR6D4roiK14y` | |
| Stock locations | `tblYuICPpfVdM7KRd` | warehouses |
| Inventory log | `tblZdnCl0LIyKSr1B` | movement history |
| Delivery notes | `tblzn0AD1zje8ZmEA` | |

29 tables in total; full list in `schema.json`. `TestObject`, `Rollback`, `Warehouse Move` look like scratch tables. <!-- TODO confirm which can be deleted -->

## The three-record-types problem

<!-- TODO: explain what the three types are, how they are told apart, and why it bites -->

## Automations

Full list in [automations.md](automations.md). The ones in the lifecycle:

| ID | Trigger | Does |
| --- | --- | --- |
| `wfl1YUiIjdVT3b66E` | serial arrives from Jobs base, job type = install | updates unit, sets `subscription contract add new` (`fldOUlb0lN9Ogcheg`) |
| `wfli2h0Tnt6I56dSM` | serial arrives, job type = <!-- --> | |
| `wfl3MhVWITaKix6QN` | serial arrives, job type = <!-- --> | |
| `wflKuBDk5Z6MYZzHq` | serial arrives, job type = <!-- --> | |
| `wflzWWNSCGdhtHrbv` (action `wacqJ82K9uo0jZJvr`) | `subscription contract add new` set | creates the subscription record |

All assume the unit with that serial **already exists** in Inventory. If it does not, nothing fires and nobody is told. See [07-business-logic/subscription-lifecycle.md](../../../07-business-logic/subscription-lifecycle.md).

## Files

- `schema.json` — exported 2026-10-26
- `webhooks.json` — exported 2026-10-26
- [automations.md](automations.md) — all 27
- [table-descriptions.md](table-descriptions.md)
- [scripts/](scripts/) — automation and scripting-extension JS, one file each, named by automation ID
- [interfaces.md](interfaces.md)
