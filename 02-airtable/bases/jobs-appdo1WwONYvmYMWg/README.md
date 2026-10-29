# Jobs base (`appdo1WwONYvmYMWg`)

Work orders, BOMs, and the whole maintenance (MA) structure.

## Key tables

| Table | ID | Notes |
| --- | --- | --- |
| Jobs | `tblwHj9cO37wp1fVx` | `Close job - SN` `fldIeKaFA33hZdtBG` (comma-separated serials); `sync` `fldhTpGWsywbFFSU7`; `Inventory - Availability` `fld4nXGpbFqrNnI9r` (automation report); `BOM` link `fldMsBGHYoDkBxvBM` |
| BOM | `tblMoXmjtWVO8Wyz7` | created by the job-creation extension |
| BOM resources | `tblAHbCtXG4w9tzSF` | one per BOM line; `Subscription Contract` link `fldWejNKXO8IhYzTs`; linked from BOM via `fldAc2IFjmNgqJfSy` |
| Tasks | `tblh1SjKm6XTlBY8q` | |
| Quotes (Airtable-native) | `tbldE1r6MKSgebujM` | |
| HS - Quotes (copy) | `tblRSXCmjroNPaO5j` | the Quotes-to-Job extension writes here |
| FS - Partners / FS - Workers | `tblkK66QqEkfAKb2S` / `tblR0LJqaeb44207J` | field-service partners and their workers |
| Subscription contracts | `tbl8uHwls1HZbjYun` | linked from BOM resource via `fldbBPPVyJBWuLNgM`; 12 fields, see [interface-extensions](../../interface-extensions/) |
| Customers (new) | `tblBjI9HEpZz8lFmY` | replaced `tblhzcjYQk0NJCv9v`; Locations still link to the old one |
| Ma - Packages | `tblolQwuQPsrlk49C` | `MPA-` ids; `Reference` `fldFPjTIigtr45DhE` |
| Ma - Items | `tblLHrvLMfFtwFy03` | `MPI-` ids; one visit template |
| Ma - Cycles | `tblWRW1I8yCMdvdgq` | `MAC-YYYY - N`; hand-created a year ahead |
| Ma - Jobs | `tblyPl0fsMSDW2uGQ` | PM checklist, 1:1 with a PM job |
| Job locations | `tbl5Nj3zs3nxKPdEv` | `Ma - Package - Add new` triggers job creation |

## Automations in the lifecycle

| ID | Does |
| --- | --- |
| `wflsW0LoP8zU6XBzv` | `sync` ticked → sends serials to Inventory base (four branches by job type) |
| `wflzER5l1wFgSGB1a` | store added to `Ma - Package - Add new` → one Unscheduled job per item for that store |
| `wflOPEPm3UesQF7bU` | PM job goes Tentative/Scheduled → creates Ma - Jobs record |

Full detail: [job-lifecycle.md](job-lifecycle.md) (as-is write-up, 15-Oct-2026, with every automation and the four sync branches). Read it before touching any automation.

Maintenance rules: [07-business-logic/maintenance-packages.md](../../../07-business-logic/maintenance-packages.md).

- `schema.json` — exported 2026-10-26 (26 tables, Jobs alone has 200 fields)

- [automations.md](automations.md) — all 37, with the DocsAutomator template codes
- [table-descriptions.md](table-descriptions.md)

<!-- TODO: interfaces.md (job creation wizard, bulk creator, jobs dashboard) -->
