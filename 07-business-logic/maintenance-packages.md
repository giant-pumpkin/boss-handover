# Maintenance (MA) packages, items, cycles

Reverse-engineered 2026-09-25 from a full snapshot of the Jobs base (32 packages, 99 items, 9 cycles, 2,913 MA jobs). No table descriptions exist in Airtable.

## Structure

Package (`MPA-`, `tblolQwuQPsrlk49C`) → Items (`MPI-`, `tblLHrvLMfFtwFy03`) → Cycle (`MAC-YYYY - N`, `tblWRW1I8yCMdvdgq`); Items → Jobs (one per item × store); Ma - Jobs (`tblyPl0fsMSDW2uGQ`) = PM checklist, 1:1 with a PM job.

- **Package** = one franchisee (CRG/QSA/RD) × one install cohort (Year + Quad) × one contract generation (V1/V2). Since 2026-10-01: one package per contract period per version; `Reference` (`fldFPjTIigtr45DhE`) carries quote no. (renewals) or start month (V1).
- **Item** = a visit template. 2024 CRG/RD V1 = 3 PM; everything from 2025 and all V2 = 1 PM + 2 RM; QSA bulk packages always 1 PM, QSA single-store packages 1 PM + N RM (see below). RM jobs are almost never used (28 of 1,474 done).
- **Cycle** = 4-month slot: 1 = Jan–Apr, 2 = May–Aug, 3 = Sep–Dec. No dates on the record. Created by hand a year ahead. Nothing beyond `MAC-2026 - 3` exists. <!-- TODO: create MAC-2027 - 1/2/3 before 13 Nov 2026; any package whose Valid to is in 2027 needs them -->

## Entitlement rule (confirmed 2026-10-02)

Contract wording (CRG quote 058/26): one visit per store per contract year, reactive or preventive; an unused MA becomes a PM after the 4-month cut-off. `Valid from`/`Valid to` bound **reactive** call-outs only. **The preventive visit for each contract year is owed even after `Valid to`.** Do not stretch validity dates to make a late visit look in-contract; `Check - Ma - Valid date = TRUE` on a PM job means late, not not-owed.

## Creation order (since Feb 2025)

Package → Items (by hand) → paste stores into `Job locations.Ma - Package - Add new` → `wflzER5l1wFgSGB1a` creates one Unscheduled job per item per store → Ma - Jobs record created when the PM job goes Tentative/Scheduled (`wflOPEPm3UesQF7bU`).

## QSA single-store packages from a PO (since 2026-11)

QSA normally buys MA in bulk for a cohort of stores. Since late 2026 they also buy MA for **one store at a time**, on a KFC purchase order, and Support asks us to open the jobs. This is the procedure Sky ran for store 1691 on 2026-11-02 (package `MPA-0050`); it is the template for the next one. Nothing about it is automated except the last step.

### 1. Read the PO

The PO line is `MA Service Yearly Fee`, priced per store. Decode it with the QSA MA price table (Sales keeps it inside the KFC quotes; a screenshot is in Boss's Slack DM to Sky, 2026-11-02):

| Store installed | Visits | Price | Package covers |
| --- | --- | --- | --- |
| Jan–Apr 2025, or before 2025 | 3 | 6,000 | the following calendar year (3 cycles) |
| May–Aug 2025 | 5 | 10,000 | 2025-2 … 2026-3 |
| Sep–Dec 2025 | 4 | 8,000 | 2025-3 … 2026-3 |

One visit = 2,000 THB, one visit per 4-month cycle. So 8,000 = 4 visits. The PO never says which kind of visit.

### 2. Find the store's install date

Jobs interface › Deployment list › Homes (not the editor view: press *Launch*), search the store number. The install date gives the cohort (`Installation date - Year` + `Quad`) and, with the table above, the number of visits and the validity window. Store 1691 (`LOC-002266`) was installed 2025-12-19 → 2025 / Quad 3 → 4 visits.

### 3. Ask Sales for the PM/RM split, every time

The contract and the quote do not say how many visits are preventive. **Sales and QSA say "MA" for a reactive visit**, so "3 MA + 1 PM" means 3 reactive + 1 preventive. Ask Beam (Sales) on Slack and wait for the answer before building; a guess here is a wrong number of jobs on Support's list for a year. For 1691, confirmed 2026-10-30: 1 PM + 3 RM.

### 4. Create the package (`Ma - Packages`, view `create MA packages`)

| Field | Value for 1691 | Rule |
| --- | --- | --- |
| Customer | THA - QSA - KFC | the franchisee, not the store |
| Installation date - Year / Quad | 2025 / Quad 3 | from step 2 |
| Version | V1 | first package for that store; V2 if it already had one |
| Reference | `1933210222` | **the PO number** (bulk packages use the quote no.) |
| Valid from | 2025-09-01 | first day of the install cycle (1 Jan / 1 May / 1 Sep) |
| Valid to | 2026-12-31 | 31 Dec of the year after install |

The validity window is **not** install-date-plus-a-year: it starts at the beginning of the install cycle, because QSA pays per cycle and the install cycle counts as a visit slot. `Name` is a formula; note the running number it produces (here `MPA-0050`).

### 5. Create the items (`Ma - Items`, view `create MA items`)

One record per visit, all linked to the package:

- **Reactive** items (`Job type` = Ma - Reactive): no cycle. `Valid from`/`Valid to` = the package's dates.
- **Preventive** item (`Job type` = Ma - Preventive): link the `Cycle` Support should plan it in, normally the last cycle of the window (`MAC-2026 - 3` for 1691). `Valid from`/`Valid to` = that cycle's 4 months. A PM item created after its cycle started shows as Expired in some views; that is by design, see the entitlement rule above.

Then open the package record and check that `Ma - Items` shows all of them (1691: MPI-0154/0155/0156 RM, MPI-0157 PM).

### 6. Attach the store, which creates the jobs

In the **Jobs base** (not the Locations base), table `Job locations` (the sync table with the lightning icon), find the store with a filter `ID contains 1691` (searching by name finds addresses too). In the field **`Ma - Package - Add new`** pick the package. Do not use the `Ma - Package` field (writes to it fail with 403) and do not press the `+` that creates a new location record.

Picking the package fires `wflzER5l1wFgSGB1a`: one Unscheduled job per item appears within a minute (1691: `JOB-00007087` … `JOB-00007090`, 3 × Ma - Reactive, 1 × Ma - Preventive). Keep `Jobs › All jobs` filtered on the store in a second window to watch them land.

### 7. Tell Support and the PM

Nothing notifies anyone. Message the PM (Mild) and Support that the jobs exist; Support schedules the PM with the installer (AudioAsis for QSA). From here the normal MA flow applies: the Ma - Jobs checklist is created when the PM job goes Tentative/Scheduled.

### Gotchas

- `MAC-2027 - *` cycles do not exist. A package that runs into 2027 cannot have its PM item cycle-linked until someone creates them (Year + Cycle 1/2/3, by hand).
- `MPA-0049` (PTT OR Jomthien 3386, Reference 221/25) was built before this rule as 1 PM + 1 RM; Sales sold it as 5 visits. It needs 3 more RM items added and the jobs regenerated. <!-- TODO -->
- `MPA-0018` is an empty 2025 Quad 3 V1 shell with one PM item in the expired `MAC-2026 - 1`; do not attach stores to it.
- `JOB-00007089` (one of the 1691 reactive jobs) was marked Done the day it was created; check with Support whether that was a real visit.
- Recording: Google Meet "handover 4", 2026-11-02, Gemini notes and transcript in Boss's Drive.

## Cycle assignment habit

V1 first PM = cycle after the install Quad; 3-PM packages take 3 consecutive cycles. V2 = cycle running when created, +1 if V1 already covers it. Only ~40% of PM jobs are done inside their cycle; most in the next block.

## Known data problems (2026-09-25)

MPA-0030 (RD, 114 stores) 113 PMs never scheduled, expired 2026-08-31 · MPA-0033 (QSA) 52/64 never done · `MAC-2026 - 3` had zero items until the CRG batch · 331 stores expired with no successor package · 24 missing item×store jobs · 173 jobs from 2024 predate their packages (retro-fitted).

## Paused work (2026-10-02)

1. Add 6 stores to existing packages via `Add new`: Baan Silom 12341 → MPA-0035; Lotus Petchaboon 12242, Big C Rama 4 12129 → MPA-0038; PTT Buntharik 12428, Big C Chachoengsao 12111, PTT Baan Rai 12430 → MPA-0039.
2. Baan Silom cleanup: re-point JOB-00003524 to MPA-0035's MPI-0109; delete the surplus reactive job; decide the extra preventive job.
3. Ask Support whether a reinstall starts a new MA year (Big C Suksawat 12088, Central Chiangmai 2 12229).
4. QSA and RD not audited the way CRG was.


