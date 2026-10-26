# Maintenance (MA) packages, items, cycles

Reverse-engineered 2026-09-25 from a full snapshot of the Jobs base (32 packages, 99 items, 9 cycles, 2,913 MA jobs). No table descriptions exist in Airtable.

## Structure

Package (`MPA-`, `tblolQwuQPsrlk49C`) → Items (`MPI-`, `tblLHrvLMfFtwFy03`) → Cycle (`MAC-YYYY - N`, `tblWRW1I8yCMdvdgq`); Items → Jobs (one per item × store); Ma - Jobs (`tblyPl0fsMSDW2uGQ`) = PM checklist, 1:1 with a PM job.

- **Package** = one franchisee (CRG/QSA/RD) × one install cohort (Year + Quad) × one contract generation (V1/V2). Since 2026-10-01: one package per contract period per version; `Reference` (`fldFPjTIigtr45DhE`) carries quote no. (renewals) or start month (V1).
- **Item** = a visit template. 2024 CRG/RD V1 = 3 PM; everything from 2025 and all V2 = 1 PM + 2 RM; QSA always 1 PM. RM jobs are almost never used (28 of 1,474 done).
- **Cycle** = 4-month slot: 1 = Jan–Apr, 2 = May–Aug, 3 = Sep–Dec. No dates on the record. Created by hand a year ahead. Nothing beyond `MAC-2026 - 3` exists. <!-- TODO: create 2027 cycles before leaving -->

## Entitlement rule (confirmed 2026-10-02)

Contract wording (CRG quote 058/26): one visit per store per contract year, reactive or preventive; an unused MA becomes a PM after the 4-month cut-off. `Valid from`/`Valid to` bound **reactive** call-outs only. **The preventive visit for each contract year is owed even after `Valid to`.** Do not stretch validity dates to make a late visit look in-contract; `Check - Ma - Valid date = TRUE` on a PM job means late, not not-owed.

## Creation order (since Feb 2025)

Package → Items (by hand) → paste stores into `Job locations.Ma - Package - Add new` → `wflzER5l1wFgSGB1a` creates one Unscheduled job per item per store → Ma - Jobs record created when the PM job goes Tentative/Scheduled (`wflOPEPm3UesQF7bU`).

## Cycle assignment habit

V1 first PM = cycle after the install Quad; 3-PM packages take 3 consecutive cycles. V2 = cycle running when created, +1 if V1 already covers it. Only ~40% of PM jobs are done inside their cycle; most in the next block.

## Known data problems (2026-09-25)

MPA-0030 (RD, 114 stores) 113 PMs never scheduled, expired 2026-08-31 · MPA-0033 (QSA) 52/64 never done · `MAC-2026 - 3` had zero items until the CRG batch · 331 stores expired with no successor package · 24 missing item×store jobs · 173 jobs from 2024 predate their packages (retro-fitted).

## Paused work (2026-10-02)

1. Add 6 stores to existing packages via `Add new`: Baan Silom 12341 → MPA-0035; Lotus Petchaboon 12242, Big C Rama 4 12129 → MPA-0038; PTT Buntharik 12428, Big C Chachoengsao 12111, PTT Baan Rai 12430 → MPA-0039.
2. Baan Silom cleanup: re-point JOB-00003524 to MPA-0035's MPI-0109; delete the surplus reactive job; decide the extra preventive job.
3. Ask Support whether a reinstall starts a new MA year (Big C Suksawat 12088, Central Chiangmai 2 12229).
4. QSA and RD not audited the way CRG was.


