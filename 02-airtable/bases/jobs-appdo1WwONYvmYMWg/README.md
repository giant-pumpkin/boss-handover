# Jobs base (`appdo1WwONYvmYMWg`)

Work orders, BOMs, and the whole maintenance (MA) structure.

## Key tables

| Table | ID | Notes |
| --- | --- | --- |
| Jobs | `tblwHj9cO37wp1fVx` | Serial numbers typed into `fldIeKaFA33hZdtBG`; `sync` checkbox `fldhTpGWsywbFFSU7` |
| BOM / BOM Resources | <!-- TODO --> | created by the job-creation extension |
| Subscription contracts | `tbl8uHwls1HZbjYun` | linked from BOM resource via `fldbBPPVyJBWuLNgM`; 12 fields, see [interface-extensions](../../interface-extensions/) |
| Customers (new) | `tblBjI9HEpZz8lFmY` | replaced `tblhzcjYQk0NJCv9v`; Locations still link to the old one |
| Ma - Packages | `tblolQwuQPsrlk49C` | `MPA-` ids; `Reference` `fldFPjTIigtr45DhE` |
| Ma - Items | `tblLHrvLMfFtwFy03` | `MPI-` ids; one visit template |
| Ma - Cycles | `tblWRW1I8yCMdvdgq` | `MAC-YYYY - N`; hand-created a year ahead |
| Ma - Jobs | `tblyPl0fsMSDW2uGQ` | PM checklist, 1:1 with a PM job |
| Job locations | <!-- tbl --> | `Ma - Package - Add new` triggers job creation |

## Automations in the lifecycle

| ID | Does |
| --- | --- |
| `wflsW0LoP8zU6XBzv` | `sync` ticked → sends serials to Inventory base (four branches by job type) |
| `wflzER5l1wFgSGB1a` | store added to `Ma - Package - Add new` → one Unscheduled job per item for that store |
| `wflOPEPm3UesQF7bU` | PM job goes Tentative/Scheduled → creates Ma - Jobs record |

Full detail: `~/coding/connectiq-inventory-demo/airtable-job-lifecycle.md` (15-Oct-2026) — **copy it here as `job-lifecycle.md`**. <!-- TODO -->

Maintenance rules: [07-business-logic/maintenance-packages.md](../../../07-business-logic/maintenance-packages.md).

<!-- TODO: schema.json, automations.md, interfaces.md (job creation wizard, bulk creator, jobs dashboard) -->
