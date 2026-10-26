# Inventory base (`appRor1ipbYAb4K7z`)

Source of truth for products, physical units, and subscriptions.

## Key tables

| Table | ID | What it holds |
| --- | --- | --- |
| Resources | `tbl3eqL9QVNgZfNgZ` | Product catalog. Synced to HubSpot as products. |
| Inventory | `tblp7sqsv25DVYs7T` | One row per physical unit (serial). View `viwpizVY6u1Z6C4He` is what the sync automations search. |
| Subscriptions | <!-- TODO tbl… --> | One row per subscription contract. Created by automation. |
| <!-- customers, locations, subscription types tblVD2FwbJEZNYjVv … --> | | |

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

- `schema.json` — <!-- TODO export -->
- [automations.md](automations.md)
- [scripts/](scripts/) — automation and scripting-extension JS, one file each, named by automation ID
- [interfaces.md](interfaces.md)
