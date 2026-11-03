# Subscription Report Generation — Process Documentation

This document explains, end to end, how the Giant Pumpkin (GP) subscription report is generated: what it's for, where the data comes from, the logic inside the script, every bug that was found and fixed along the way, and how to run it. It's written so a fresh Claude session (or a human) can pick this up cold in a new environment.

**Revised Sep-2026.** The report now cross-validates against the CMS, which is the source of truth for whether a screen is physically installed. Three input sources were added: the installed-no-active-subscription export, monthly CMS Asia snapshots, and the CMS Europe player export. Sections 3.5-3.8, 8, 9, 12 and 13 are new; Sections 1, 2, 5, 6, 10 and 11 were revised. See Section 14 for the change log.

---

## 1. What this report is

A monthly-grain Excel workbook showing, per client location, how many screens were serviced each month. One tab per brand owner (e.g. QSA, CRG, RD, Switch, Macstore), plus an Overview, a detail tab for expired-but-installed screens, two CMS exception tabs, and a Reconciliation tab.

Used for revenue/activity tracking, reconciliation against invoicing, and validating vendor (VA) payments.

**A screen is counted in a month if it was physically installed that month.** That is a CMS fact, not a subscription fact. Each screen-month falls into exactly one bucket:

| Bucket | Meaning |
|---|---|
| **Active subscription** | Live contract AND CMS confirms installed. Billable. |
| **Expired, still installed** | Contract lapsed but CMS confirms the screen is still on site. Serviced, not billed. |
| **Billed not installed** | Live contract but CMS shows no installed screen. Exception — excluded from the counts, listed on its own tab. |
| **Installed, no contract** | CMS shows it installed with no subscription record at all. Listed on its own tab. |

The Overview presents the first two as three stacked blocks by Brand x Brand Owner x month: Total serviced, Active only, Expired-still-installed. Total = Active + Expired by construction.

## 2. Where the data comes from

The report takes four inputs. Only the first is required.

| Source | Flag | Required | Role |
|---|---|---|---|
| Subscriptions audit export | positional | Yes | Contract history — who was billed, when |
| Installed - No active subscription | `--alert-log` | No | Screens on site with lapsed billing |
| CMS Asia monthly snapshots | `--cms-snapshots` | No | **Truth for physical installation, per month** |
| CMS Europe player export | `--cms-europe` | No | Same, for the Iceland/Starbucks server |

### 2.1 Subscriptions audit export (required)

**Primary source:** an export of the Airtable **Subscriptions** table (base `appRor1ipbYAb4K7z`, table `tblyNA73D9jldeEir`).

**Best current export to use:** the "Subscription Audit" view, which includes the corrected `Service Location` field (see Section 4). Columns in that export:

```
ID, Subscription contract, Subscription type, Resource, Start, End,
Hardware Location, Service Location, Status, Location Match (audit formula), ...
```

**The script itself expects** a slightly different column naming convention (legacy from an earlier export format). A conversion step maps between them — see Section 6.

**Export drift:** column sets change between exports. Audit \_6\_ had both `Start date` (M/D/YYYY) and `Start (DD-MMM-YYYY)`; audit \_9\_ and \_10\_ dropped the former. Always select columns by name, never by position, and always parse from the `DD-MMM-YYYY` variants.

### 2.2 Installed - No active subscription export (`--alert-log`)

Inventory items physically with the customer whose subscription has lapsed. Item is still on site; billing has stopped or was never updated.

Columns: `ID, Status, Latest Contract, Subscription - Status, Location - Installation, Resource - Name, Subscription - Start date, Subscription - End date, Customer`.

**Use the `Installed-Noactivesubscription` view, not the older `Inventory-Subscription_Alert` view.** The old view flagged screens whose *latest contract link* showed Expired, which stays true even when a newer active contract exists. It over-reported: 841 rows against 828, and among them 8 Boost Juice screens at Siam Paragon that had all renewed on 01-Jun-2026. See Section 3.5.

Scope has changed between pulls (an earlier 714-row version was KFC-only and missed every other brand owner). Always check the `Customer` spread against the audit before trusting it — Section 12 has the check.

### 2.3 CMS Asia monthly snapshots (`--cms-snapshots`)

End-of-month exports from the Asia CMS server, one file per month, filenames starting `YYYY-MM-DD`. **This is the source of truth for physical installation.**

Key columns: `SerialNumber, ScreenStatus, Client, Location, FirstContactDate, LastContactDate`.

- `ScreenStatus` is `Online`, `Offline` or `Unpaired`.
- **Online or Offline = still installed. Unpaired = actually uninstalled.**
- **Unpaired rows carry no serial number** — verified across all seven snapshots. So `installed` == has a serial AND status is Online/Offline, and that set exactly equals the serial-bearing row count every month.

Schemas drift here too: Feb-Apr 2026 carry `MountedDirection` and `PlayerFormat`; May-Aug don't, and column order differs. Select by name.

### 2.4 CMS Europe player export (`--cms-europe`)

A **separate CMS server** hosting Starbucks / BFI screens in Iceland. Easy to miss — these screens are absent from every Asia snapshot, which makes the brand owner look like it has no CMS presence.

- **Semicolon-delimited**, not comma.
- **No `ScreenStatus` and no `Client` column.** Installation is inferred from the contact window instead: installed in month M if `FirstContactDate <= end of M <= LastContactDate`.
- Point-in-time only, no monthly history, so its months are inferred rather than snapshot-verified.
- Contains test/placeholder rows (`Test GP1`, `Pregenerated fake player`, `Current Installation`) that carry no serial and are dropped by the same serial filter.

## 3. The core problem this report had to solve

### 3.1 Location contamination (the big one)

The original `Location - Installation` field on Subscriptions was a **lookup through the linked Inventory record** — meaning it showed where the screen physically sits **today**, not where it was when the subscription was active. When a screen got transferred between locations (common — screens get moved between franchise stores, repaired and reinstalled elsewhere, etc.), **every historical subscription row for that screen silently updated to the new location.**

Consequences:
- Subscription history mis-attributed to the wrong brand owner / location entirely (e.g. Switch+ Singapore history appearing under Switch Malaysia after a transfer).
- False "pre-installation" flags in the report (a subscription looking like it started before the screen was installed, when actually the install date shown was for a *different* location the screen later moved to).
- The same problem existed for `Installation date` — also a lookup through Inventory, same contamination.

**Fix implemented:** a new field, **`Service Location`**, was created directly on the Subscriptions table as a **Linked Record field to the Locations table** (not a lookup). It's set once, at the time each subscription's true location was determined, and doesn't recompute when the screen moves. The old lookup field was kept and renamed **`Hardware Location`** — it still shows current physical location, and the *disagreement* between the two fields (via an audit formula) is now a useful transfer-detection signal.

Backfilling `Service Location` for ~7,166 existing records required reconstructing historical location timelines from a separate, very messy inventory movement log (20k+ rows), cross-checked against a manually-maintained KFC screen replacement summary, then human-reviewed for edge cases. That backfill work is complete; **this script does not need to do that reconstruction anymore** as long as it's fed data where `Service Location` already exists and is populated. (A `--movement-log` option still exists in the script for the older-style export, in case it's ever needed again.)

### 3.2 Screen swap double-counting

Separately from the location problem: when a screen is physically replaced mid-contract (cracked panel, defect, etc.), the **same Subscription contract** gets a new row — old serial's row ends, new serial's row begins, often on the exact same day or one day apart. Naively counting "how many subscription rows are active this month" double-counts these transition months (2 units counted when there's really 1 physical screen).

But this had to be told apart from the *opposite* legitimate case: a single contract can also cover **multiple simultaneous physical screens at one location** (e.g. a 15-screen venue on one master contract). Those must never be collapsed.

**Fix implemented: slot chaining.** For each (contract, location) group, subscription rows are chained into "slots" — a row only continues an existing slot if its start month is 0–1 months after that slot's current end month (a genuine hand-off). If the gap is negative (rows overlap in time), they're concurrent, and each gets its own slot. This correctly:
- Collapses genuine swaps to 1 unit (with a purple highlight + hover comment naming both serials and dates)
- Never collapses genuinely simultaneous multi-screen contracts

### 3.3 Ambiguous serial numbers

Airtable stores some serial numbers truncated to 14 characters. Three specific 14-character prefixes turned out to match **two different physical screens** (the 15th character, which would disambiguate them, is missing). The script explicitly detects these collisions and refuses to chain them into any slot — it leaves them at their default (no merging), since guessing would be worse than not merging.

### 3.4 Location string format quirk

The Locations table's ID formula collapses when brand owner equals brand:
```
{Country} - IF({Brand owner}, IF(AND({Brand}, {Brand}!={Brand owner}), {Brand owner}-{Brand}, {Brand owner}), {Brand}) - {Store}
```
This means:
- **4-part strings** (`THA - QSA - KFC - Lotus Rama 4 - 1344`): `parts[1]` = brand owner, `parts[2]` = brand
- **3-part strings** (`THA - Boost Juice - Central Rama 9`): brand owner **equals** brand (the brand segment was omitted); `parts[1]` = both brand owner and brand, `parts[2]` = store

Any code that parses these location strings to derive brand/brand owner must handle the 3-part case, or brand owners like Boost Juice will show the wrong "brand" (the store name gets misread as the brand).

### 3.5 The alert view that over-reports (fixed by switching views)

The first cross-check used `Inventory-Subscription_Alert`, which keys off the *latest contract link* on the inventory record. That link lags: a screen that renewed still shows its old expired contract, so the screen gets flagged as lapsed while a live contract exists.

Concretely: 8 Boost Juice screens at Siam Paragon, all expired 31-May-2026, all renewed 01-Jun-2026 with contracts to 31-May-2027. The old view flagged all 8. The correct view flags 1 (terminated 08-Sep-2026, i.e. after the window).

**Rule: use the `Installed-Noactivesubscription` view. Never derive your own lapsed-screen list by filtering the audit.**

### 3.6 CMS serials are 15 chars, Airtable truncates to 14

Airtable stores serials truncated to 14 characters. CMS stores the full 15. **Exact matching finds 1 of 714. Prefix matching on the first 14 characters finds all 714.**

```python
P14 = lambda x: str(x).strip().upper()[:14]
```

Verified zero prefix collisions within the CMS set. Note this is the same underlying truncation behind the 3 ambiguous-serial collisions in Section 3.3 — the permanent fix is storing full serials in Airtable.

### 3.7 Removal is detected by absence, not by an Unpaired row

Because unpaired rows carry no serial (Section 2.3), a removed screen does not appear as `Unpaired` in the serial-matched set — it simply stops appearing. That makes the pipeline fragile: **one truncated or failed export looks identical to a mass removal.**

Guard before trusting any snapshot:
- reject a snapshot whose serial-bearing count drops implausibly against the prior month;
- require consecutive months of absence before treating a screen as removed.

### 3.8 A point-in-time snapshot cannot validate history

A single current snapshot applied to an eight-month window is wrong in both directions: a screen removed in April shows absent now and would be stripped from January, and a screen installed in July would never have existed in the earlier months.

With monthly snapshots each month is validated against its own file. The difference is not cosmetic — per-month validation found **39 screen-months** where a live subscription had no installed screen, dated to the month. The single snapshot found 20 and could not say when.

**Months with no snapshot are not validated.** They pass through subscription-driven and are flagged in red on the Reconciliation tab. Never silently mask a month you have no file for — you would strip every screen in it.

### 3.9 Concurrent screens on a short umbrella contract collapse into one slot

The swap-dedup logic (3.2) chains rows within a contract+location into slots: a row joins an existing slot when `0 <= rec.start_abs - slot.end_abs <= SWAP_GAP_MONTHS`. The guard against chaining concurrent screens only rejected *negative* gaps.

**Gap == 0 is also concurrent when both rows share the same span.** Five screens at one store, all on a one-month contract running 01-Aug to 31-Aug, each see gap == 0 against the first and all five collapse into one slot.

This stayed hidden while contracts were long and staggered. It surfaced when a lapsed-billing backlog was closed with **short backfill contracts spanning hundreds of screens** — `CON-002306` covers 688 screens in a single August month. The run undercounted August by roughly 500 screens and inflated the Reconciliation `other` bucket from 30 to 508.

Fix: a successor must also start **strictly later** than its predecessor.

```python
concurrent = s['start_abs'] >= rec['start_abs']
if 0 <= gap <= SWAP_GAP_MONTHS and not concurrent:
```

The `other` bucket is the tell. If it jumps, screens are being dropped from the grid — go and look at the contract structure before trusting any total.

### 3.10 The alert view cannot see a historical gap once it is backfilled

`Installed-Noactivesubscription` is a **current-state** view: screens with no active subscription *right now*. It is not a historical record.

When a lapsed-billing backlog is closed retroactively, the screens drop off the view and the gap they had during the report window becomes invisible to it. In Oct-2026 the view fell from 828 rows to 67 as 779 screens were backfilled.

**So a report for a past window run after a backfill will show almost no expired-but-installed screens, whether or not that was true at the time.** This is not a bug; it reflects the books as they now stand. But if you want what was true at the time, the alert view cannot give it to you.

The gap is computable directly from subscription history plus CMS, with no alert file at all: a screen is expired-but-installed in month M if CMS shows it installed in M and no subscription row covers M. Keep a dated copy of each month's report, or of the alert export, if the as-at-the-time figure matters — it cannot be reconstructed later.

*Resolved in 3.15: gaps are now derived from subscription history + CMS, so the alert view is only a fallback.*

### 3.11 FOC was silently zeroed for every row

The conversion step set `Duration - FoC = 0` because the Subscriptions export had no FOC column — FOC lives on the contract, not the subscription record. The FOC logic in the script was correct but never received any data, so no cell was ever shaded dark green. Caught by a colleague: Phetchabun (`CON-001326`, 3 months FOC from 01-Jan-2026) showed no FOC months.

**Counts were never affected** — subscription end dates already include the free months (01-Jan-2026 + 24 + 3 = 31-Mar-2028). What was wrong was the shading, and the Active block being labelled "billable" when ~100 screen-months in Jan–Sep 2026 were free.

Fix:
- The Subscriptions view now carries `Duration - FoC` as a lookup from the contract. **The export must include it.** If it's missing, stop — do not default it.
- FOC is anchored to the **contract** start, not each record's start. Contract start = earliest record start on that contract. Otherwise a screen swapped in mid-contract restarts its own free period (67 records affected in Oct-2026).
- The Overview now splits Active into **Billable** and **FOC (serviced, not billed)**. Total = Billable + FOC + Expired-still-installed.

### 3.12 Renewal flags were assigned to the wrong rows

```python
tmp = df.sort_values(['inventory_id', 'start_abs']).copy()
tmp['is_renewal'] = tmp.groupby('inventory_id').cumcount() > 0
df['is_renewal'] = tmp['is_renewal'].values   # BUG
```

`.values` drops the index, so flags computed in sorted order were pasted onto rows in their original order — onto the wrong rows. Present since the original script. **Counts were never affected**; `is_renewal` only drives the blue renewal fill. But renewal shading was effectively random, and it changed whenever the export's row order changed: adding 7 records to the export reshuffled ~100 cells between runs on identical data.

Fix: assign by index — `df['is_renewal'] = tmp['is_renewal']`.

General rule for this script: **never assign a column back with `.values` after a sort.**

### 3.13 Validate by CMS player, not by serial

Serial-only matching fails in two ways that look identical from the data: a screen swapped without an Airtable record, and a serial mistyped in either system and corrected later (Mandai Zoo: CMS showed `0SY6HNMY900001` on player `[24]` for Feb–Mar, then the real serial `0SE4HNML100082` from April — Airtable was right all along). Both drop real screens from the count.

The CMS **player** persists across both. A screen-month now validates if its serial is live, **or** a player that serial was paired to is live at the same CMS location with a different serial — provided that other serial is not itself billed that month (otherwise the old serial is simply stale and the replacement is the one being counted). Those months are kept and listed on `CMS - Serial Mismatch`. The tab cannot tell a swap from a typo; look before editing Airtable.

### 3.14 In a swap month, keep the serial CMS confirms

Slot dedup used to keep the incoming serial. If CMS said the incoming one wasn't there (not yet installed, or the swap record is wrong) the slot vanished even though the outgoing screen was still on site (The Scene Town, Sep-26). Rows now carry a `cms_ok_row` flag and the dedup sorts on it first.

What it cannot fix: a swap record with the **wrong outgoing serial**. Lotus Utaradit Sep-26 is recorded as `0R3GHNDX500032 → 0R3GHNDX900213`, but CMS shows 500032 never left; the screen that actually came out was `0R3GHNFXB00099`. Per the records those two are one slot, so the report shows 3 where CMS shows 4. Fix the record.

### 3.15 Gaps are found from subscription history + CMS, not the alert list

For every screen with subscription history, every month in the window that no record covers and that CMS shows installed is carried as expired-but-installed, labelled `Hole between contracts` or `Lapsed` on the detail tab. The alert list is now only the fallback for months with no snapshot and brand owners CMS doesn't cover. This is what makes a missing month in a backfill chain (Jomthien Jul, Theparak Aug, three CRG stores Sep) show up as a flagged gap rather than an unexplained dip in the totals. The Reconciliation `other` bucket dropped from 26 to 10 as a result; what remains there is worth a look each run.

A screen installed **before** its first contract is not carried, and this is correct by policy, not a gap:

> **Billing start rule.** Digital signage is charged from the **1st of the month after installation** (unless it is a POC). The install month is never billed. Music streaming is **prorated** from the install date.

So Khao Saming, Namphong and Central Northville, all online in July with contracts from 1 August, are exactly right. The `CMS - Installed No Contract` tab flags any screen whose CMS first contact falls in the report's end month as "installed this month, contract due next month" so it isn't chased as an error. A screen installed in month M with no contract by M+2 is the thing to chase.

## 4. Airtable schema reference

**Subscriptions table** (`tblyNA73D9jldeEir` in base `appRor1ipbYAb4K7z`) — key fields:

| Field ID | Name | Type | Notes |
|---|---|---|---|
| `fldJ0WRQcaHEhqXth` | Service Location | Linked Record → Locations | **Use this for reporting.** Static, set at creation. |
| `fldHUCgQFipY5UaR4` | Hardware Location | Lookup through Inventory | Current physical location. Disagrees with Service Location after a transfer — that disagreement is the transfer signal. |
| `fldHfSZDaxdy1Zgy0` | Install Date (static) | Date | Left blank for ~6,000 historical records (backfill deemed infeasible/unreliable given log quality); should be auto-stamped for new records going forward. |
| `fldfpvyD2j3v4L0Ut` | Installation date (lookup) | Lookup through Inventory | Old field, same contamination issue as Hardware Location. |
| `fldAzhmWmuhSX6ppN` | Inventory | Linked Record → Inventory | The physical screen. |
| `fldozqn9HeQyxCKso` | Subscription Contract | Linked Record → Contracts | |
| `fld95WxbXtbHfktSU` | Start date | Date | |
| `fldSO7ONdpFqVJnte` | End date | Formula | Terminated date or contract end, whichever applies |
| `fldeaJ5ciLHSChypF` | Terminated date | Date | Manual |
| `fld0C22HAphG6FSLc` | Location match audit | Formula | `Hardware Location == Service Location` → 0/1. |
| `fld22c3r9LiQw6j4F` | Status | Formula | Active / Expired / Terminated / Scheduled |

**Locations table** (`tblChlR6D4roiK14y`) — master list, canonical IDs, all Service Location values validated against it.

## 5. Report legend (fill colors)

| Color | Hex | Meaning |
|---|---|---|
| Orange | `FFB347` | Installation month (first month at this location) |
| Purple | `CC99FF` | Screen swap — same contract, serial replaced mid-contract. Hover the cell for the two serial numbers and dates. |
| Yellow | `FFFF99` | Pre-installation — subscription shows active before the location's first installation date |
| Dark green | `00B050` | Free-of-charge (FOC) month |
| Light green | `C6EFCE` | Brand new location (first-ever subscription there) |
| Blue | `BDD7EE` | Renewal |
| Red | `FFCCCC` | Terminated (cancelled, no successor) |
| Light grey | `D9D9D9` | Expired (contract ran its course, no renewal yet). *Was peach (`FFCC99`) originally — changed to grey because it was too visually similar to the orange install-month color and got confused for it.* |

| Salmon | `FF8C69` | **Expired subscription, screen still installed.** Hover the cell for the active/expired split. |

Priority order when multiple conditions apply to one cell (top wins): **expired-still-installed** → install month → swap → pre-install → FOC → new location → renewal → terminated → expired.

Expired-still-installed sits at the top because differentiating it is the point of the cross-check — it must not be masked by a lower-priority state.

## 6. Input conversion (Subscription Audit export → script format)

The script expects columns named `Start date`, `End date`, `Location - Installation`, `Brand owner (From Inventory)`, `Brand (From Inventory)`, `Inventory ID`, `Subscription contract`, `Status`, `Duration - FoC`, `Installation date`, `Service`.

The Subscription Audit CSV export has different names. Conversion:

```python
import pandas as pd

df = pd.read_csv('Subscriptions-Subscription_Audit.csv')
df['Start date'] = df['Start']
df['End date'] = df['End']
df['Location - Installation'] = df['Service Location']   # use the corrected field, NOT Hardware Location
df['Installation date'] = None                            # left blank — see Section 3.1
df['Duration - FoC'] = pd.to_numeric(df['Duration - FoC'], errors='coerce').fillna(0).astype(int)
#   ^ must come FROM THE EXPORT. Never hardcode 0 - see Section 3.11.
df['Created'] = None

def parse_loc(loc):
    if pd.isna(loc) or str(loc).strip() == '':
        return '', ''
    parts = [p.strip() for p in str(loc).split(' - ')]
    if len(parts) >= 4:
        return parts[1], parts[2]        # BrandOwner, Brand
    elif len(parts) == 3:
        return parts[1], parts[1]        # collapsed: BrandOwner == Brand
    return '', ''

df[['Brand owner (From Inventory)', 'Brand (From Inventory)']] = pd.DataFrame(
    df['Location - Installation'].apply(parse_loc).tolist(), index=df.index)

def classify(res):
    if pd.isna(res): return 'Unknown'
    r = str(res).lower()
    if any(x in r for x in ['samsung', 'lg', 'giada', 'generic']): return 'Digital signage'
    if 'streamit' in r: return 'Music streaming'
    if 'royal' in r: return 'Royal streaming'
    if 'giant pumpkin' in r: return 'Software'
    return 'Other'

df['Service'] = df['Resource'].apply(classify)
df.to_excel('input_converted.xlsx', index=False)
```

**Export drift warning:** newer audit exports (\_9\_, \_10\_) dropped the `Start date` column that older ones had. Map `Start date` from `Start (DD-MMM-YYYY)` and `End date` from `End (DD-MMM-YYYY)` — the `DD-MMM-YYYY` columns are present in every export and parse unambiguously. Never rely on the M/D/YYYY column.

**Note:** the brand/brand-owner derivation logic is duplicated inside the script itself (it runs it automatically if those columns come through empty), so this conversion step is really only responsible for renaming columns and classifying `Service`. Keeping both means the conversion script and the report script agree even if one changes.

## 7. Subscription types / Service filter

The Subscription Audit export includes non-signage subscription types that must be filtered out for this report:

| Type | Resource keyword | Included? |
|---|---|---|
| Digital signage | Samsung, LG, Giada, Generic | **Yes** — this report |
| Music streaming | Streamit | No |
| Royal streaming | Royal | No |
| Software only | Giant Pumpkin | No |

Run with `--service "Digital signage"` (the default) to get just the hardware subscriptions this report is about. Pass `--service ALL` to include everything.

## 8. Running it

Full run, all cross-checks on:

```bash
python build_report.py input.xlsx output.xlsx \
  --start-year 2026 --start-month 1 \
  --end-year 2026 --end-month 8 \
  --service "Digital signage" \
  --alert-log   Installed-Noactivesubscription_Signage.csv \
  --cms-snapshots "snaps/2026-*.csv" \
  --cms-europe  player_information_2026-09-11.csv
```

Every cross-check argument is optional and degrades cleanly:

| Omitted | Effect |
|---|---|
| `--alert-log` | No expired-but-installed block. Subscription-driven counts only. |
| `--cms-snapshots` | No CMS validation, no exception tabs, no Reconciliation estate section. |
| `--cms-europe` | BFI/Starbucks fall out of CMS scope and are held out of validation (see Section 9). |
| `--movement-log` | Only needed for older exports whose location field is a live lookup. Not needed for current Subscription Audit exports. |

**Running with no cross-checks reproduces the legacy subscription-only report exactly.** That is the regression baseline — see Section 12, check 6.

## 8.1 Order of operations

The sequence matters; getting it wrong silently corrupts counts.

1. Convert the audit export (Section 6).
2. Load CMS snapshots -> `cms_by_month[m_abs] = set of installed 14-char prefixes`.
3. Fold Europe in, **but only into months that already have an Asia snapshot.** Adding Europe to a month with no Asia file would create a partial truth set and mask every Asia screen in that month.
4. Determine CMS-scoped brand owners (Section 9).
5. Build carry-forward rows per month from the alert list.
6. Expand subscriptions to months, dedup by contract slot.
7. Apply the per-month CMS mask to the active population.
8. Write tabs.

Steps 5 and 7 both consult CMS but do opposite things: 5 *adds* screen-months CMS confirms, 7 *removes* screen-months CMS denies.

## 9. CMS scoping and brand owners not in CMS

A brand owner with zero screens in any snapshot is **not managed in that CMS instance**. Masking them to zero would delete real screens, so they are held out of validation and named on the Reconciliation tab.

Two distinct reasons a brand owner shows as unscoped:

1. **It lives on another CMS server.** BFI/Starbucks (Iceland) is on the Europe server. Supplying `--cms-europe` brings its 12 screens into scope. **Check this before concluding a client has no screens** — the first run of this cross-check wrongly flagged BFI as absent.
2. **It has no rows in the report window.** Green House terminated in Mar-2025; Apple, Best Buy and Com7 are one screen each, all outside the window. These are noise.

The warning is therefore **restricted to brand owners that actually appear in the window.** With Europe supplied, it currently fires on nothing.

## 10. Known outstanding issues

**Resolved since the last revision**

- *Screens billed but not installed* — now detected per month and listed on `CMS - Billed Not Installed`.
- *Screens installed with no contract* — now listed on `CMS - Installed No Contract`.
- *No way to verify the lapsed-screen population* — CMS now confirms it.

**Still open**

- **~6,000 historical install dates are blank.** Backfilling from the movement log was attempted and abandoned — enough typos and mislogged entries (confirmed against a KFC replacement summary) that bulk backfill risked new errors at a scale not worth the accuracy gained. New records should get this stamped at creation via an Airtable automation.
- **`FirstContactDate` is not an install date and must not be used as one.** It is 100% populated, which makes it look usable. It is not: 1,448 screens have subscriptions starting before 2025 and 1,433 of those show a 2025 first-contact date. Measured against first subscription start it ranges from -370 to +1,153 days, with only a quarter landing within a month. It resets on re-pair, or the CMS was migrated in 2025. **Monthly snapshots are the only reliable source of install history.**
- **15 subscription records have blank Service Location** — a `TAR167`/Royal Artist cluster with pre-existing gaps in the source export.
- **3 ambiguous serial collisions** where a truncated 14-char serial matches 2 physical screens. The script no-ops safely. Permanent fix: store full serials in Airtable (worth building into the ConnectIQ/Supabase migration).
- **"Offline" also covers pre-paired warehouse stock** (paired, switched on once, left off until deployment) and dead or removed-but-never-unpaired units. A 7-day-silence rule was tried in Oct-2026 and reverted as too hard to verify: it moved ~450 screen-months to billed-not-installed, most of them likely support issues rather than billing ones. Installed stays Online-or-Offline by decision.
- **"Offline" degrades at the tail.** Offline means installed but not communicating. Median offline screen last contacted 65 days ago; 24 are past 90 days and 3 past a year. For a week that is a network blip; at a year it is a dead or removed unit still counted as serviced. No threshold is currently applied. Consider one.
- **The 2026-05-30 snapshot is anomalous** — 17 offline against 335-455 in every other month. Harmless here because online+offline still equals the serial count, so the installed set is correct. **But any report on offline duration will be wrong for that month.**
- **Europe has no monthly snapshots.** Its months are inferred from the contact window, not verified. Getting end-of-month exports from that server would put it on the same footing as Asia.
- **January 2026 has no snapshot**, so it is subscription-driven only.
- **Movement log has no uninstall dates**, only install dates. Only relevant when using `--movement-log`.

## 11. Output tabs

| Tab | Contents |
|---|---|
| `Overview` | Three stacked blocks by Brand x Brand Owner x month: Total serviced, Active only, Expired-still-installed. Each block has a TOTAL row. |
| One per brand owner | Location x month grid, colour-coded per Section 5. Cells containing expired-but-installed units are salmon with a hover note giving the split. |
| `Expired - Still Installed` | Every carried screen: location, brand owner, last contract, month the subscription lapsed, alert status, **which months CMS confirms it installed**, CMS location, months carried. |
| `CMS - Billed Not Installed` | Screen-months where a live subscription had no installed screen. One row per screen-month, so it is dated. |
| `CMS - Serial Mismatch` | Screen-months kept because the CMS player was live under a different serial. Swap-not-recorded or typo; check which. |
| `CMS - Installed No Contract` | CMS serials installed at the end month with no subscription record at all. |
| `Reconciliation` | Alert-list waterfall, month-by-month check, snapshot coverage, and the end-month CMS estate partition. |

### 11.1 Reading the Reconciliation tab

Two independent reconciliations, and **both must tie**:

**Alert waterfall** — how 828 rows became 671 carried screens:

```
Rows in "Installed - No active subscription" export      828
Less: no subscription row in this service slice          -15   (software-only resources)
Less: subscription ran through the end month            -142   (covered all window, lapsed after)
Less: CMS shows no installed month inside the window      -0
= Screens carried as expired-but-still-installed         671
```

The `-142` line is the one most often misread. Those screens show Expired *today* but were covered every month of the window. **Counting them as a gap overstates exposure.** In the first version of this report the equivalent figure was 107 and would have inflated the number by 18%.

**Estate partition at the end month** — a strict partition that must sum to the CMS installed total:

```
CMS screens Online or Offline                           3,145
  active subscription                                   2,393
  expired / terminated, still installed                   671
  no signage subscription record at all                    54
  other: lapsed history, not on the flagged list           27
  SUM                                                   3,145   <- must equal
Screen-months removed: billed, no installed screen         39   (separate, not in the total)
```

The partition now has a fifth bucket, **installed, contract starts after the end month** — new stores installed during the end month and billed from the 1st of the next, per the billing rule. Expected, not an error.

**If the SUM does not equal the total, stop and find out why.** A growing `other` bucket means the alert view is missing screens — it was 102 under the KFC-only view and 27 under the corrected one.

## 12. Full script

The canonical copy is `code/build_report.py` in the handover package. The two conversion scripts (`convert_subscriptions.py`, `convert_cms_snapshots.py`) replace the ad-hoc conversion snippets in Section 6 and Section 14. This embedded copy is for reference only.

```python
"""
Subscription Report Builder
Usage: python build_report.py <input_xlsx> <output_xlsx> [options]

Options:
  --start-year    INT   Report start year (default: 2025)
  --start-month   INT   Report start month (default: 1)
  --end-year      INT   Report end year (default: 2026)
  --end-month     INT   Report end month (default: 8)
  --service       STR   Service filter (default: "Digital signage"). Pass "ALL" to include everything.
  --movement-log  STR   Optional inventory movement log CSV for historical location
                        re-attribution (only needed if the input's location field is a
                        live lookup, not a static field like Service Location)
  --alert-log     STR   "Installed - No active subscription" export. Screens physically
                        with the customer whose subscription has lapsed. Carried into the
                        grid as expired-but-still-installed.
  --cms-snapshots STR   Glob of end-of-month CMS Asia exports, e.g. "snaps/2026-*.csv".
                        Filename must start YYYY-MM-DD. Per-month source of truth for
                        whether a screen was physically installed.
  --cms-europe    STR   CMS Europe player export (semicolon-delimited, no ScreenStatus).
                        Covers Starbucks / BFI in Iceland.
"""
import argparse
import os
import pandas as pd
import numpy as np
from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font, Alignment
from openpyxl.utils import get_column_letter
from openpyxl.comments import Comment
import calendar, collections

def abs_idx(year, month):
    return year * 12 + (month - 1)

def idx_to_ym(idx):
    return idx // 12, (idx % 12) + 1

def build_report(input_path, output_path,
                 start_year=2025, start_month=1,
                 end_year=2026, end_month=8,
                 service_filter="Digital signage",
                 movement_log=None,
                 alert_log=None,
                 cms_snapshots=None,
                 cms_europe=None):

    df = pd.read_excel(input_path, header=0)
    print(f"Loaded {len(df)} rows")

    if 'Subscription contract' not in df.columns:
        df['Subscription contract'] = np.nan

    df['start'] = pd.to_datetime(df['Start date'], errors='coerce', dayfirst=True)
    df['end']   = pd.to_datetime(df['End date'],   errors='coerce', dayfirst=True)
    df['install_date'] = pd.to_datetime(df['Installation date'], errors='coerce', dayfirst=True)
    df['foc'] = pd.to_numeric(df['Duration - FoC'], errors='coerce').fillna(0).astype(int)

    for col, new in [('Inventory ID',                'inventory_id'),
                     ('Location - Installation',      'location'),
                     ('Brand owner (From Inventory)', 'brand_owner'),
                     ('Brand (From Inventory)',        'brand'),
                     ('Status',                       'status'),
                     ('Subscription contract',        'contract')]:
        df[new] = df[col].astype(str).str.strip()
    df['location'] = df['location'].str.strip('"').str.strip()

    # If brand_owner/brand columns are missing or empty, derive from location string.
    # Location format: CTY - BrandOwner - Brand - Store - StoreNum
    # When BrandOwner == Brand, the formula collapses to: CTY - BrandOwner - Store
    needs_derive = df['brand_owner'].isin(['nan', '']) | df['brand'].isin(['nan', ''])
    if needs_derive.any():
        def parse_loc(loc):
            parts = [p.strip() for p in str(loc).split(' - ')]
            if len(parts) >= 4:
                return parts[1], parts[2]
            elif len(parts) == 3:
                return parts[1], parts[1]  # brand == brand_owner (collapsed)
            return '', ''
        derived = df.loc[needs_derive, 'location'].apply(parse_loc)
        df.loc[needs_derive, 'brand_owner'] = derived.apply(lambda x: x[0])
        df.loc[needs_derive, 'brand'] = derived.apply(lambda x: x[1])

    mask = (
        df['start'].notna() & df['end'].notna() &
        ~df['location'].isin(['nan', '']) &
        ~df['brand_owner'].isin(['nan', '']) &
        ~df['inventory_id'].isin(['nan', ''])
    )
    if service_filter.upper() != 'ALL':
        mask &= (df['Service'] == service_filter)
    df = df[mask].copy().reset_index(drop=True)
    print(f"Filtered to {len(df)} rows")

    # --- Historical location re-attribution (optional) ---------------------
    # Only needed when the input'''s location field is a live lookup (reflects
    # current location, not historical). Not needed when the input already
    # uses a static/linked field like Service Location.
    if movement_log:
        log = pd.read_csv(movement_log)
        log['install'] = pd.to_datetime(log['Installation date'], dayfirst=True, errors='coerce')
        log['created'] = pd.to_datetime(log['Created'], dayfirst=True, errors='coerce')
        log = log[log['ID'].notna() & log['Location - Installation'].notna() & log['install'].notna()]
        log['ID'] = log['ID'].astype(str).str.strip()
        log['Location - Installation'] = (log['Location - Installation']
                                          .astype(str).str.strip().str.strip('"').str.strip())
        stints = (log.sort_values('created')
                     .groupby(['ID', 'install'])['Location - Installation']
                     .last().reset_index()
                     .sort_values(['ID', 'install']))
        def _mode(x):
            vc = x.value_counts()
            return vc.index[0] if len(vc) else (x.iloc[0] if len(x) else '')
        loc_meta = (df.groupby('location')[['brand_owner', 'brand']]
                      .agg(_mode).to_dict('index'))
        def meta_for(loc_str):
            if loc_str in loc_meta:
                m = loc_meta[loc_str]
                return m['brand_owner'], m['brand']
            parts = [p.strip() for p in loc_str.split(' - ')]
            if len(parts) >= 4: return parts[2], parts[1]
            if len(parts) == 3: return parts[1], parts[1]
            return loc_str, loc_str
        timelines = {}
        for sn, grp in stints.groupby('ID'):
            tl = list(zip(grp['install'], grp['Location - Installation']))
            if len(tl) > 1: timelines[sn] = tl
        new_rows, n_split = [], 0
        for _, row in df.iterrows():
            tl = timelines.get(row['inventory_id'])
            if not tl:
                new_rows.append(row); continue
            bounds = [abs_idx(ts.year, ts.month) for ts, _ in tl]
            sub_s = abs_idx(row['start'].year, row['start'].month)
            sub_e = abs_idx(row['end'].year, row['end'].month)
            segs = []
            for i, (ts, loc) in enumerate(tl):
                w_start = bounds[i] if i > 0 else -10**9
                w_end   = bounds[i+1] - 1 if i+1 < len(tl) else 10**9
                s, e = max(sub_s, w_start), min(sub_e, w_end)
                if s <= e: segs.append((s, e, loc, ts))
            if len(segs) <= 1 and (not segs or segs[0][2] == row['location']):
                if segs and pd.isna(row['install_date']):
                    row = row.copy(); row['install_date'] = segs[0][3]
                new_rows.append(row); continue
            n_split += 1
            for s, e, loc, ts in segs:
                seg = row.copy()
                y_s, m_s = idx_to_ym(s); y_e, m_e = idx_to_ym(e)
                seg['start'] = max(row['start'], pd.Timestamp(y_s, m_s, 1))
                last_day = calendar.monthrange(y_e, m_e)[1]
                seg['end'] = min(row['end'], pd.Timestamp(y_e, m_e, last_day))
                if loc != tl[-1][1]:
                    seg['location'] = loc
                    bo, br = meta_for(loc)
                    seg['brand_owner'], seg['brand'] = bo, br
                    seg['install_date'] = ts
                elif pd.isna(seg['install_date']):
                    seg['install_date'] = ts
                new_rows.append(seg)
        df = pd.DataFrame(new_rows).reset_index(drop=True)
        print(f"Movement log: {len(timelines)} moved serials, "
              f"{n_split} subscription rows split across locations -> {len(df)} rows")

    REPORT_START  = abs_idx(start_year, start_month)
    REPORT_END    = abs_idx(end_year,   end_month)
    MONTH_IDXS    = list(range(REPORT_START, REPORT_END + 1))
    MONTH_LABELS  = [idx_to_ym(m) for m in MONTH_IDXS]
    MONTH_HEADERS = [f"{calendar.month_abbr[m]}-{str(y)[2:]}" for y, m in MONTH_LABELS]

    df['start_abs']   = df['start'].apply(lambda d: abs_idx(d.year, d.month))
    df['end_abs']     = df['end'].apply(lambda d: abs_idx(d.year, d.month))
    df['install_abs'] = df['install_date'].apply(
        lambda d: abs_idx(d.year, d.month) if pd.notna(d) else np.nan)
    # FOC is the first N months of the CONTRACT, not of each subscription
    # record. A screen swapped in mid-contract has a later record start; if FOC
    # were counted from that it would restart its own free period. Contract
    # start = earliest record start on that contract.
    _has_c = ~df['contract'].isin(['nan', ''])
    _cstart = df[_has_c].groupby('contract')['start_abs'].min()
    df['contract_start_abs'] = df['contract'].map(_cstart).where(_has_c, df['start_abs'])
    df['contract_start_abs'] = df['contract_start_abs'].fillna(df['start_abs'])
    df['foc_end_abs'] = df.apply(
        lambda r: r['contract_start_abs'] + r['foc'] - 1 if r['foc'] > 0 else np.nan, axis=1)

    tmp = df.sort_values(['inventory_id', 'start_abs']).copy()
    tmp['is_renewal'] = tmp.groupby('inventory_id').cumcount() > 0
    # Assign by INDEX, not position. `.values` pasted sorted-order flags onto
    # rows in original order, so renewal shading depended on export row order.
    df['is_renewal'] = tmp['is_renewal']
    df['is_exp_inst'] = False

    # --- Expired-but-still-installed carry-forward -------------------------
    # An inventory item whose subscription lapsed but which is still
    # physically Installed at the location is still a serviced screen. Carry
    # it forward from the month after its last subscription ended through the
    # end of the report window, flagged so it can be counted separately.
    exp_inst_detail = []
    # --- CMS snapshots: per-month source of truth on physical installation -
    # One end-of-month export per month. Unpaired rows carry no serial in any
    # snapshot, so "installed" == present with a serial and status Online or
    # Offline. Airtable truncates serials to 14 chars; match on that prefix.
    cms_by_month = {}          # m_abs -> set of installed 14-char prefixes
    cms_meta = {}              # p14 -> (client, location) from the latest snapshot
    cms_player_month = {}      # m_abs -> {playerId: (p14, location)} for installed players
    cms_pid_of = {}            # p14 -> {playerId: location where that pairing was seen}
    cms_snap_info = []
    if cms_snapshots:
        import glob as _glob
        files = sorted(_glob.glob(cms_snapshots))
        for fp in files:
            base = os.path.basename(fp)[:10]
            try:
                snap_dt = pd.Timestamp(base)
            except Exception:
                continue
            cm = pd.read_csv(fp, encoding='utf-8-sig', low_memory=False)
            cm = cm.loc[:, [c for c in cm.columns
                            if not str(c).startswith('Unnamed')
                            and 'LAST UPDATED' not in str(c)]]
            cm['sn'] = cm['SerialNumber'].fillna('').astype(str).str.strip().str.upper()
            n_unpaired = int((cm['ScreenStatus'] == 'Unpaired').sum())
            cm = cm[cm['sn'] != ''].copy()
            cm['p14'] = cm['sn'].str[:14]
            # Installed = Online or Offline. Unpaired carries no serial and is
            # already excluded by the serial filter. Deliberately simple: an
            # offline-duration or pre-paired rule was tried and reverted.
            inst = cm[cm['ScreenStatus'].isin(['Online', 'Offline'])]
            m_abs = abs_idx(snap_dt.year, snap_dt.month)
            cms_by_month[m_abs] = set(inst['p14'])
            has_pid = 'PlayerId' in cm.columns
            if has_pid:
                cms_player_month[m_abs] = {str(r.PlayerId): (r.p14, str(r.Location))
                                           for r in inst.itertuples()}
            for r in cm.itertuples():
                cms_meta[r.p14] = (r.Client, r.Location, str(getattr(r, 'FirstContactDate', ''))[:10])
                if has_pid:
                    cms_pid_of.setdefault(r.p14, {})[str(r.PlayerId)] = str(r.Location)
            cms_snap_info.append({'file': base, 'm_abs': m_abs,
                                  'installed': len(cms_by_month[m_abs]),
                                  'unpaired': n_unpaired})
        print(f"CMS snapshots loaded: {len(cms_by_month)} months "
              f"({', '.join(s['file'] for s in cms_snap_info)})")

    P14 = lambda x: str(x).strip().upper()[:14]

    # (serial, month) pairs that a real subscription record covers. Used to stop
    # player-based validation double counting: if the serial now on the player
    # is itself billed that month, the old serial is stale, not swapped-unrecorded.
    _cov = df[(df['end_abs'] >= REPORT_START) & (df['start_abs'] <= REPORT_END)]
    covered_pairs = set()
    for r in _cov.itertuples():
        for m in range(max(int(r.start_abs), REPORT_START), min(int(r.end_abs), REPORT_END) + 1):
            covered_pairs.add((P14(r.inventory_id), m))

    def cms_check(inv_id, m_abs):
        """Is this screen installed in month m_abs, per CMS?

        Returns (kind, detail):
          ('serial', None)                 serial itself is Online/Offline
          ('player', (pid, other_serial))  serial absent, but a CMS player this
                                           serial was paired to is live at the
                                           SAME CMS location with another serial
                                           -> screen swapped, swap not in Airtable
          ('absent', None)                 not installed
        The location guard matters: a player moved to another store must not
        validate a screen that left.
        """
        p = P14(inv_id)
        if p in cms_by_month.get(m_abs, ()):
            return 'serial', None
        live = cms_player_month.get(m_abs, {})
        for pid, loc_seen in cms_pid_of.get(p, {}).items():
            if pid in live:
                other, loc_now = live[pid]
                if other != p and loc_now == loc_seen and (other, m_abs) not in covered_pairs:
                    return 'player', (pid, other)
        return 'absent', None

    unrecorded_swaps = {}   # (inv_id, m_abs) -> (pid, other_serial)
    def cms_installed(inv_id, m_abs, location='', brand='', brand_owner=''):
        kind, detail = cms_check(inv_id, m_abs)
        if kind == 'player':
            unrecorded_swaps[(inv_id, m_abs)] = (detail, location, brand, brand_owner)
        return kind != 'absent'

    # --- Europe CMS (separate server: Starbucks / BFI in Iceland) ----------
    # This export is a single point-in-time pull with no ScreenStatus column,
    # so installation is inferred from the contact window: a screen counts as
    # installed in month M if it had first contacted by the end of M and was
    # still contacting at or after the end of M. Only added to months that
    # already have an Asia snapshot, so no month gains a partial truth set.
    europe_n = 0
    if cms_europe and cms_by_month:
        eu = pd.read_csv(cms_europe, encoding='utf-8-sig', sep=';')
        eu['sn'] = eu['SerialNumber'].fillna('').astype(str).str.strip().str.upper()
        eu = eu[eu['sn'] != ''].copy()
        eu['p14'] = eu['sn'].str[:14]
        eu['fc'] = pd.to_datetime(eu['FirstContactDate'], errors='coerce', utc=True)
        eu['lc'] = pd.to_datetime(eu['LastContactDate'], errors='coerce', utc=True)
        eu = eu.drop_duplicates(subset=['p14'])
        for m_abs in list(cms_by_month.keys()):
            y, m = idx_to_ym(m_abs)
            eom = pd.Timestamp(y, m, calendar.monthrange(y, m)[1], tz='UTC')
            add = set(eu[(eu['fc'] <= eom) & (eu['lc'] >= eom)]['p14'])
            cms_by_month[m_abs] |= add
        europe_n = eu['p14'].nunique()
        for r in eu.itertuples():
            cms_meta.setdefault(r.p14, ('Europe server', r.Location, str(r.FirstContactDate)[:10]))
        print(f"Europe CMS: {europe_n} screens folded into snapshot months")

    # A brand owner with zero screens in any snapshot is not managed in this
    # CMS instance (e.g. BFI/Starbucks). Masking those to zero would be wrong,
    # so they are held out of CMS validation and reported separately.
    cms_scoped_bos, cms_unscoped_bos = set(), set()
    if cms_by_month:
        all_cms = set().union(*cms_by_month.values())
        in_window = df[(df['start_abs'] <= REPORT_END) & (df['end_abs'] >= REPORT_START)]
        bos_in_window = set(in_window['brand_owner'])
        for bo, g in df.groupby('brand_owner'):
            if any(P14(i) in all_cms for i in g['inventory_id'].unique()):
                cms_scoped_bos.add(bo)
            elif bo in bos_in_window:
                cms_unscoped_bos.add(bo)
        if cms_unscoped_bos:
            print(f"Brand owners not present in CMS (held out of validation): "
                  f"{', '.join(sorted(cms_unscoped_bos))}")

    # --- Expired-but-still-installed: derived from history + CMS -----------
    # A screen counts as expired-but-still-installed in month M when:
    #   * it has subscription history ending BEFORE M (it was a customer screen),
    #   * no subscription record covers M, and
    #   * CMS shows it installed in M.
    # This catches holes in a chain of contracts (a missing month between two
    # records) as well as plain lapses. The alert list cannot: it is a
    # current-state view, so a screen that has a subscription *today* never
    # appears on it, even if it went unbilled for months earlier.
    #
    # Months with no CMS snapshot, or brand owners CMS does not cover, fall
    # back to the alert list: on the list AND past its last subscription end.
    alert_status, installed_ids = {}, set()
    if alert_log:
        al = pd.read_csv(alert_log, encoding='utf-8-sig')
        al['ID'] = al['ID'].astype(str).str.strip()
        al = al[al['Status'].astype(str).str.strip().str.lower() == 'installed']
        alert_status = dict(zip(al['ID'], al['Subscription - Status'].astype(str).str.strip()))
        installed_ids = set(al['ID'])

    recon = None
    if alert_log or cms_by_month:
        carry_rows = []
        recon = {'alert_rows': len(installed_ids), 'carried': 0, 'screen_months': 0,
                 'from_alert': 0, 'from_history': 0, 'hole_months': 0,
                 'lapse_months': 0}
        for inv_id, grp in df.groupby('inventory_id'):
            g = grp.sort_values('end_abs')
            spans = list(zip(g['start_abs'].astype(int), g['end_abs'].astype(int)))
            last_end = int(g['end_abs'].max())
            bo = g.iloc[-1]['brand_owner']
            on_alert = inv_id in installed_ids
            months, kinds = [], []
            for m_abs in range(REPORT_START, REPORT_END + 1):
                if any(s_ <= m_abs <= e_ for s_, e_ in spans):
                    continue                                   # covered
                prior = g[g['end_abs'] < m_abs]
                if prior.empty:
                    continue                                   # no history yet
                validated = bool(cms_by_month) and bo in cms_scoped_bos \
                            and m_abs in cms_by_month
                if validated:
                    _last = g[g['end_abs'] < m_abs].iloc[-1]
                    ok = cms_installed(inv_id, m_abs, _last['location'],
                                       _last['brand'], _last['brand_owner'])
                else:
                    ok = on_alert and m_abs > last_end
                if not ok:
                    continue
                months.append(m_abs)
                kinds.append('lapse' if m_abs > last_end else 'hole')
            if not months:
                continue
            for m_abs in months:
                src0 = g[g['end_abs'] < m_abs].iloc[-1]        # record just before the gap
                src = src0.copy()
                src['start_abs'] = m_abs
                src['end_abs']   = m_abs
                y_s, m_s = idx_to_ym(m_abs)
                src['start'] = pd.Timestamp(y_s, m_s, 1)
                src['end']   = pd.Timestamp(y_s, m_s, calendar.monthrange(y_s, m_s)[1])
                src['status']       = 'Expired - still installed'
                src['contract']     = ''
                src['is_renewal']   = False
                src['is_exp_inst']  = True
                src['foc']          = 0
                src['foc_end_abs']  = np.nan
                src['contract_key'] = f"{inv_id}||{src['location']}||expinst{m_abs}"
                carry_rows.append(src)
            recon['screen_months'] += len(months)
            recon['hole_months']   += kinds.count('hole')
            recon['lapse_months']  += kinds.count('lapse')
            recon['from_alert' if on_alert else 'from_history'] += 1

            src0 = g[g['end_abs'] < months[0]].iloc[-1]
            ly, lm = idx_to_ym(int(src0['end_abs']))
            exp_inst_detail.append({
                'Inventory ID': inv_id,
                'Resource': src0.get('Resource', ''),
                'Location': src0['location'],
                'Brand': src0['brand'],
                'Brand Owner': src0['brand_owner'],
                'Last contract': src0['contract'],
                'Subscription ended': f"{calendar.month_abbr[lm]}-{str(ly)[2:]}",
                'Alert status': alert_status.get(inv_id,
                                 'Not on alert list (gap found from history + CMS)'),
                'Gap type': ('Hole between contracts' if 'lapse' not in kinds else
                             'Lapsed' if 'hole' not in kinds else 'Hole + lapsed'),
                'CMS installed months': ', '.join(
                    f"{calendar.month_abbr[idx_to_ym(m)[1]]}" for m in months),
                'CMS location': cms_meta.get(P14(inv_id), ('', '', ''))[1],
                'Months carried in window': len(months),
            })

        if carry_rows:
            df = pd.concat([df, pd.DataFrame(carry_rows)], ignore_index=True)
        recon['carried'] = len(exp_inst_detail)
        print(f"Expired-but-installed: {len(exp_inst_detail)} screens, {len(carry_rows)} "
              f"screen-months ({recon['hole_months']} in holes between contracts, "
              f"{recon['lapse_months']} after a lapse)")

    # --- Slot chaining for swap detection & dedup --------------------------
    # A contract can cover MULTIPLE simultaneous physical units at one
    # location (e.g. a 15-screen venue on one contract) — those must all
    # keep counting. A contract can also cover a single unit that gets
    # physically swapped mid-contract (old serial ends, new serial starts
    # right after) — those should collapse to ONE active unit, not two.
    # Chaining tells these apart: a row only continues an existing "slot"
    # if its start sits right at/after that slot's current end (0 to 1
    # month gap); negative gaps (concurrent) always get separate slots.
    SWAP_GAP_MONTHS = 1
    df['contract_key'] = df['inventory_id'] + '||' + df['location']
    df.loc[df['is_exp_inst'], 'contract_key'] = (
        df.loc[df['is_exp_inst'], 'inventory_id'] + '||'
        + df.loc[df['is_exp_inst'], 'location'] + '||expinst')
    swap_comment_lkp = {}

    has_contract = ~df['contract'].isin(['nan', ''])

    # Ambiguous serial guard: some truncated 14-char serials in this table
    # collide with 2+ distinct full serials elsewhere. Never chain those —
    # keep them at their raw per-serial key so nothing gets merged based on
    # a guess.
    groups = collections.defaultdict(set)
    for s in df['inventory_id'].unique():
        s = str(s).strip()
        if '/' not in s and 14 <= len(s) <= 16:
            groups[s[:14]].add(s)
    AMBIG = {p for p, v in groups.items() if len({x for x in v if len(x) > 14}) > 1}

    for (contract, location), grp in df[has_contract].groupby(['contract', 'location']):
        recs = grp.sort_values('start_abs').reset_index().to_dict('records')
        slots = []
        for rec in recs:
            if str(rec['inventory_id']).strip() in AMBIG:
                continue  # leave default contract_key (own inventory_id+location)
            best_si, best_gap = None, None
            for si, s in enumerate(slots):
                gap = rec['start_abs'] - s['end_abs']
                # Successor must start AT or AFTER predecessor's end. Negative
                # gaps mean the rows are concurrent (multi-screen store), not
                # a hand-off — never chain those.
                #
                # It must also start STRICTLY LATER than the predecessor did.
                # Without this, rows sharing an identical span (several screens
                # at one store on one short umbrella contract) see gap == 0 and
                # every one of them collapses into the first slot. Short
                # backfill contracts spanning hundreds of screens make this the
                # normal case, not an edge case.
                concurrent = s['start_abs'] >= rec['start_abs']
                if 0 <= gap <= SWAP_GAP_MONTHS and not concurrent:
                    same_serial = (s['inventory_id'] == rec['inventory_id'])
                    cand = (not same_serial, abs(gap))  # prefer same serial, then smallest gap
                    if best_gap is None or cand < best_gap:
                        best_si, best_gap = si, cand
            if best_si is None:
                slots.append({'start_abs': rec['start_abs'], 'end_abs': rec['end_abs'],
                              'end': rec['end'], 'inventory_id': rec['inventory_id']})
                slot_id = len(slots) - 1
            else:
                prev = slots[best_si]
                if prev['inventory_id'] != rec['inventory_id']:
                    key = (location, rec['brand_owner'], rec['start_abs'])
                    swap_comment_lkp[key] = (
                        f"Screen swap on contract {contract}:\n"
                        f"{prev['inventory_id']} ended {prev['end'].strftime('%d-%b-%y')}\n"
                        f"{rec['inventory_id']} started {rec['start'].strftime('%d-%b-%y')}")
                slots[best_si] = {'start_abs': rec['start_abs'], 'end_abs': rec['end_abs'],
                                  'end': rec['end'], 'inventory_id': rec['inventory_id']}
                slot_id = best_si
            df.loc[rec['index'], 'contract_key'] = f"{contract}||{location}||slot{slot_id}"

    frames = []
    for m_abs in MONTH_IDXS:
        mdf = df[(df['start_abs'] <= m_abs) & (df['end_abs'] >= m_abs)].copy()
        if mdf.empty: continue
        mdf = mdf[['inventory_id','location','brand_owner','brand','status',
                    'start_abs','end_abs','foc','foc_end_abs','is_renewal','install_abs',
                    'contract_key','is_exp_inst']].copy()
        mdf['m_abs'] = m_abs
        mdf['is_foc']          = (mdf['foc'] > 0) & mdf['foc_end_abs'].notna() & (mdf['foc_end_abs'] >= m_abs)
        mdf['is_renewal_this'] = mdf['is_renewal'] & (mdf['start_abs'] == m_abs)
        mdf['is_last_month']   = (mdf['end_abs'] == m_abs)
        frames.append(mdf)

    act_df = pd.concat(frames, ignore_index=True)
    act_df = act_df.sort_values(['inventory_id','m_abs','start_abs','end_abs'],
                                 ascending=[True,True,False,False])
    act = act_df.drop_duplicates(subset=['inventory_id','m_abs'], keep='first').copy()

    # Contract-aware dedup: collapse same-contract-slot rows per month so a
    # mid-contract screen swap counts as ONE active unit in its overlap month.
    # Within a slot-month, prefer the serial CMS confirms is installed. In a
    # swap month both serials share the slot; keeping the incoming one blindly
    # loses the slot whenever CMS says the incoming screen isn't there yet
    # (or the swap record is wrong) while the outgoing screen still is.
    def _row_ok(r):
        if not cms_by_month or r.brand_owner not in cms_scoped_bos: return True
        if r.m_abs not in cms_by_month or r.is_exp_inst:            return True
        return cms_installed(r.inventory_id, r.m_abs, r.location, r.brand, r.brand_owner)
    act['cms_ok_row'] = [_row_ok(r) for r in act.itertuples()]
    act_c = (act.sort_values(['contract_key','m_abs','cms_ok_row','start_abs'],
                              ascending=[True, True, False, False])
                .drop_duplicates(subset=['contract_key','m_abs'], keep='first')
                .copy())

    # --- Per-month CMS validation of the active population ------------------
    # A subscription that is live but whose screen CMS does not show installed
    # that month is an exception, not a serviced screen. Pull those out.
    cms_excluded = []
    if cms_by_month:
        def month_ok(r):
            if r.brand_owner not in cms_scoped_bos:  return True   # not in CMS
            if r.m_abs not in cms_by_month:          return True   # no snapshot
            if r.is_exp_inst:                        return True   # already validated
            return bool(r.cms_ok_row)
        keep = np.array([month_ok(r) for r in act_c.itertuples()])
        dropped = act_c[~keep].copy()
        for r in dropped.itertuples():
            y, m = idx_to_ym(r.m_abs)
            cms_excluded.append({
                'Inventory ID': r.inventory_id, 'Location': r.location,
                'Brand': r.brand, 'Brand Owner': r.brand_owner,
                'Month': f"{calendar.month_abbr[m]}-{str(y)[2:]}",
                'CMS status that month': 'Not installed (unpaired / absent)'})
        act_c = act_c[keep].copy()
        print(f"CMS validation removed {len(dropped)} screen-months where an active "
              f"subscription had no installed screen")

    active_pairs = set(zip(act_c['inventory_id'], act_c['m_abs']))

    def ending_type(r):
        if not r['is_last_month']: return None
        if (r['inventory_id'], r['m_abs'] + 1) in active_pairs: return None
        return r['status'].lower()

    act_c['ending_type']   = act_c.apply(ending_type, axis=1)
    act_c['is_terminated'] = act_c['ending_type'] == 'terminated'
    act_c['is_expired']    = act_c['ending_type'] == 'expired'

    cell = act_c.groupby(['location','brand_owner','m_abs']).agg(
        count=('inventory_id','count'),
        n_exp_inst=('is_exp_inst','sum'),
        has_renewal=('is_renewal_this','any'),
        has_foc=('is_foc','any'),
        has_terminated=('is_terminated','any'),
        has_expired=('is_expired','any'),
        brand=('brand','first'),
    ).reset_index()
    cell['n_exp_inst'] = cell['n_exp_inst'].astype(int)
    cell['n_active']   = cell['count'] - cell['n_exp_inst']
    cell['has_exp_inst'] = cell['n_exp_inst'] > 0

    # Hover note breaking out the split for any cell that mixes the two
    exp_note_lkp = {}
    for r in cell.itertuples():
        if r.n_exp_inst > 0:
            exp_note_lkp[(r.location, r.brand_owner, r.m_abs)] = (
                f"Total screens: {int(r.count)}\n"
                f"  Active subscription: {int(r.n_active)}\n"
                f"  Expired, still installed: {int(r.n_exp_inst)}")

    cell['is_swap'] = cell.apply(
        lambda r: (r['location'], r['brand_owner'], r['m_abs']) in swap_comment_lkp, axis=1)

    cell['first_install_abs'] = cell['location'].map(df.groupby('location')['install_abs'].min())
    cell['first_start_abs']   = cell['location'].map(df.groupby('location')['start_abs'].min())
    cell['is_install_month']  = cell['first_install_abs'].notna() & (cell['m_abs'] == cell['first_install_abs'])
    cell['is_pre_install']    = cell['first_install_abs'].notna() & (cell['m_abs'] < cell['first_install_abs'])
    cell['is_new_location']   = (cell['m_abs'] == cell['first_start_abs']) & (cell['first_start_abs'] >= REPORT_START)

    F_ORANGE = PatternFill('solid', fgColor='FFB347')
    F_YELLOW = PatternFill('solid', fgColor='FFFF99')
    F_DKGRN  = PatternFill('solid', fgColor='00B050')
    F_LTGRN  = PatternFill('solid', fgColor='C6EFCE')
    F_BLUE   = PatternFill('solid', fgColor='BDD7EE')
    F_RED    = PatternFill('solid', fgColor='FFCCCC')
    F_PEACH  = PatternFill('solid', fgColor='D9D9D9')  # light grey — was peach (FFCC99), too close to orange
    F_PURPLE = PatternFill('solid', fgColor='CC99FF')
    F_EXPINS = PatternFill('solid', fgColor='FF8C69')  # salmon — expired but still installed
    F_NONE   = PatternFill('none')

    def pick_fill(row):
        if row['has_exp_inst']:      return F_EXPINS
        if row['is_install_month']:  return F_ORANGE
        if row['is_swap']:           return F_PURPLE
        if row['is_pre_install']:    return F_YELLOW
        if row['has_foc']:           return F_DKGRN
        if row['is_new_location']:   return F_LTGRN
        if row['has_renewal']:       return F_BLUE
        if row['has_terminated']:    return F_RED
        if row['has_expired']:       return F_PEACH
        return F_NONE

    cell['fill'] = cell.apply(pick_fill, axis=1)
    fill_lkp  = {(r.location, r.brand_owner, r.m_abs): r.fill  for r in cell.itertuples()}
    count_lkp = {(r.location, r.brand_owner, r.m_abs): int(r.count) for r in cell.itertuples()}
    expc_lkp  = {(r.location, r.brand_owner, r.m_abs): int(r.n_exp_inst) for r in cell.itertuples()}

    loc_install_str = {}
    for loc, grp in df.groupby('location'):
        dates = sorted({d for d in grp['install_date'] if pd.notna(d)})
        loc_install_str[loc] = ', '.join(d.strftime('%d-%b-%y') for d in dates)

    bo_order = df.groupby('brand_owner')['start_abs'].min().index.tolist()
    bo_loc_order = (df.groupby(['brand_owner','location'])['start_abs']
                    .min().reset_index().sort_values('start_abs'))
    bo_brand = (df.groupby('brand_owner')['brand']
                .apply(lambda x: x.value_counts().index[0]).to_dict())
    bo_order_sorted = sorted(bo_order, key=lambda b: (bo_brand.get(b, ''), b))

    wb = Workbook()
    wb.remove(wb.active)

    HDR_FILL        = PatternFill('solid', fgColor='1F4E79')
    HDR_FONT        = Font(name='Arial', bold=True, size=10, color='FFFFFF')
    DATA_FONT       = Font(name='Arial', size=10)
    DATA_FONT_WHITE = Font(name='Arial', size=10, color='FFFFFF')

    def write_header(ws, row, col, text):
        c = ws.cell(row, col, text)
        c.font = HDR_FONT; c.fill = HDR_FILL
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

    KEY_ITEMS = [
        (F_EXPINS, 'Expired subscription, screen STILL INSTALLED (hover for active/expired split)'),
        (F_ORANGE, 'Installation month (subscription active in same month as first installation)'),
        (F_PURPLE, 'Screen swap (same contract, serial replaced mid-contract — hover for details)'),
        (F_YELLOW, 'Pre-installation (subscription active before first installation date)'),
        (F_DKGRN,  'Free of Charge (FOC) months at start of contract'),
        (F_LTGRN,  'Brand new location (first ever subscription)'),
        (F_BLUE,   'Renewal (subscription renewed from a previous period)'),
        (F_RED,    'Terminated (subscription actively cancelled — no successor)'),
        (F_PEACH,  'Expired (contract ran its course — may need renewal)'),
    ]

    used_names = set()
    for bo in bo_order_sorted:
        locs = bo_loc_order[bo_loc_order['brand_owner'] == bo]['location'].tolist()
        if not locs: continue
        sname = bo[:31]
        if sname in used_names: sname = bo[:28] + '_2'
        used_names.add(sname)
        ws = wb.create_sheet(title=sname)
        write_header(ws, 1, 1, 'Location')
        write_header(ws, 1, 2, 'Installation Date')
        for i, mh in enumerate(MONTH_HEADERS):
            write_header(ws, 1, 3+i, mh)
        ws.column_dimensions['A'].width = 55
        ws.column_dimensions['B'].width = 22
        for i in range(len(MONTH_HEADERS)):
            ws.column_dimensions[get_column_letter(3+i)].width = 9
        ws.row_dimensions[1].height = 28
        for r_idx, loc in enumerate(locs, start=2):
            ws.cell(r_idx, 1, loc).font = DATA_FONT
            c = ws.cell(r_idx, 2, loc_install_str.get(loc, ''))
            c.font = DATA_FONT; c.alignment = Alignment(horizontal='center')
            for mi, m_abs in enumerate(MONTH_IDXS):
                cnt  = count_lkp.get((loc, bo, m_abs), 0)
                fill = fill_lkp.get((loc, bo, m_abs), F_NONE)
                c = ws.cell(r_idx, 3+mi, cnt if cnt > 0 else None)
                c.alignment = Alignment(horizontal='center')
                c.font = DATA_FONT_WHITE if fill is F_DKGRN else DATA_FONT
                if fill is not F_NONE:
                    c.fill = fill
                notes = [n for n in (exp_note_lkp.get((loc, bo, m_abs)),
                                     swap_comment_lkp.get((loc, bo, m_abs))) if n]
                if notes:
                    c.comment = Comment('\n\n'.join(notes), 'Subscription report')
        ws.freeze_panes = 'C2'
        key_start = ws.max_row + 2
        ws.cell(key_start, 1, 'Key:').font = Font(name='Arial', bold=True, size=9)
        for ki, (fill, desc) in enumerate(KEY_ITEMS):
            r = key_start + 1 + ki
            swatch = ws.cell(r, 1)
            swatch.fill = fill
            swatch.font = Font(name='Arial', size=9,
                               color='FFFFFF' if fill is F_DKGRN else '000000')
            swatch.value = '      '
            dc = ws.cell(r, 2, desc)
            dc.font = Font(name='Arial', size=9)
            ws.merge_cells(start_row=r, start_column=2,
                           end_row=r, end_column=min(5, 2+len(MONTH_HEADERS)))

    ov = wb.create_sheet('Overview', index=0)
    write_header(ov, 1, 1, 'Brand')
    write_header(ov, 1, 2, 'Brand Owner')
    for i, mh in enumerate(MONTH_HEADERS):
        write_header(ov, 1, 3+i, mh)
    ov.column_dimensions['A'].width = 28
    ov.column_dimensions['B'].width = 28
    for i in range(len(MONTH_HEADERS)):
        ov.column_dimensions[get_column_letter(3+i)].width = 9
    ov.row_dimensions[1].height = 28

    # Summary by BRAND + BRAND OWNER, three stacked blocks:
    # total serviced screens / active subscription only / expired-still-installed
    act_c['_one'] = 1
    tot_lkp = act_c.groupby(['brand_owner','brand','m_abs'])['_one'].sum().to_dict()
    exp_lkp = act_c[act_c['is_exp_inst']].groupby(['brand_owner','brand','m_abs'])['_one'].sum().to_dict()
    foc_lkp = act_c[act_c['is_foc'] & ~act_c['is_exp_inst']].groupby(['brand_owner','brand','m_abs'])['_one'].sum().to_dict()

    pairs = sorted({(r.brand_owner, r.brand) for r in act_c.itertuples()},
                   key=lambda p: (p[1], p[0]))

    BLOCK_FILL = PatternFill('solid', fgColor='2E75B6')
    TOTAL_FONT = Font(name='Arial', bold=True, size=10)
    TOTAL_FILL = PatternFill('solid', fgColor='DDEBF7')

    def write_block(start_row, label, getter, label_fill):
        c = ov.cell(start_row, 1, label)
        c.font = Font(name='Arial', bold=True, size=10, color='FFFFFF')
        c.fill = label_fill
        ov.merge_cells(start_row=start_row, start_column=1,
                       end_row=start_row, end_column=2 + len(MONTH_HEADERS))
        r = start_row + 1
        col_tot = collections.defaultdict(int)
        for bo, br in pairs:
            ov.cell(r, 1, br).font = DATA_FONT
            ov.cell(r, 2, bo).font = DATA_FONT
            for mi, m_abs in enumerate(MONTH_IDXS):
                v = getter(bo, br, m_abs)
                col_tot[m_abs] += v
                cc = ov.cell(r, 3 + mi, v if v > 0 else None)
                cc.font = DATA_FONT
                cc.alignment = Alignment(horizontal='center')
            r += 1
        tc = ov.cell(r, 1, 'TOTAL'); tc.font = TOTAL_FONT; tc.fill = TOTAL_FILL
        ov.cell(r, 2, '').fill = TOTAL_FILL
        for mi, m_abs in enumerate(MONTH_IDXS):
            cc = ov.cell(r, 3 + mi, col_tot[m_abs] if col_tot[m_abs] else None)
            cc.font = TOTAL_FONT; cc.fill = TOTAL_FILL
            cc.alignment = Alignment(horizontal='center')
        return r + 2

    nr = write_block(2, 'TOTAL SCREENS SERVICED  (active subscription + expired but still installed)',
                     lambda bo, br, m: int(tot_lkp.get((bo, br, m), 0)), BLOCK_FILL)
    nr = write_block(nr, 'ACTIVE SUBSCRIPTION  (billable)',
                     lambda bo, br, m: int(tot_lkp.get((bo, br, m), 0))
                                       - int(exp_lkp.get((bo, br, m), 0))
                                       - int(foc_lkp.get((bo, br, m), 0)),
                     PatternFill('solid', fgColor='548235'))
    nr = write_block(nr, 'ACTIVE SUBSCRIPTION, FREE-OF-CHARGE MONTH  (serviced, not billed)',
                     lambda bo, br, m: int(foc_lkp.get((bo, br, m), 0)),
                     PatternFill('solid', fgColor='00B050'))
    nr = write_block(nr, 'EXPIRED SUBSCRIPTION, SCREEN STILL INSTALLED',
                     lambda bo, br, m: int(exp_lkp.get((bo, br, m), 0)),
                     PatternFill('solid', fgColor='C55A11'))

    ov.freeze_panes = 'C2'

    # --- Detail tab: every expired-but-still-installed screen --------------
    if exp_inst_detail:
        det = wb.create_sheet('Expired - Still Installed')
        cols = ['Inventory ID', 'Resource', 'Location', 'Brand', 'Brand Owner',
                'Last contract', 'Subscription ended', 'Alert status', 'Gap type',
                'CMS installed months', 'CMS location', 'Months carried in window']
        widths = [22, 34, 52, 20, 20, 34, 20, 30, 22, 28, 40, 24]
        for i, (cn, w) in enumerate(zip(cols, widths), start=1):
            write_header(det, 1, i, cn)
            det.column_dimensions[get_column_letter(i)].width = w
        det.row_dimensions[1].height = 28
        rows = sorted(exp_inst_detail, key=lambda d: (d['Brand'], d['Brand Owner'],
                                                      d['Location'], d['Inventory ID']))
        for ri, rec in enumerate(rows, start=2):
            for ci, cn in enumerate(cols, start=1):
                c = det.cell(ri, ci, rec[cn])
                c.font = DATA_FONT
                if cn in ('Subscription ended', 'Alert status',
                          'Months carried in window'):
                    c.alignment = Alignment(horizontal='center')
            det.cell(ri, 7).fill = F_EXPINS
        det.freeze_panes = 'A2'
        det.auto_filter.ref = f"A1:{get_column_letter(len(cols))}{len(rows)+1}"

    # --- CMS validation tabs ----------------------------------------------
    cms_val = None
    if cms_by_month:
        end_snap = cms_by_month.get(REPORT_END, set())
        act_end = act_c[(act_c['m_abs'] == REPORT_END) & (~act_c['is_exp_inst'])]
        exp_end = act_c[(act_c['m_abs'] == REPORT_END) & (act_c['is_exp_inst'])]
        p_active = {P14(i) for i in act_end['inventory_id']}
        p_expinst = {P14(i) for i in exp_end['inventory_id']}
        p_hist = {P14(i) for i in df['inventory_id']}
        p_future = {P14(i) for i in df[(~df['is_exp_inst']) & (df['start_abs'] > REPORT_END)]['inventory_id']}
        bucket = {'active': [], 'exp': [], 'nocontract': [], 'upcoming': [], 'other': []}
        for p in sorted(end_snap):
            if p in p_active:     bucket['active'].append(p)
            elif p in p_expinst:  bucket['exp'].append(p)
            elif p not in p_hist: bucket['nocontract'].append(p)
            elif p in p_future:   bucket['upcoming'].append(p)   # installed, contract starts next month
            else:                 bucket['other'].append(p)
        cms_val = {'installed': len(end_snap),
                   'active': len(bucket['active']), 'exp': len(bucket['exp']),
                   'nocontract': len(bucket['nocontract']), 'other': len(bucket['other']),
                   'upcoming': len(bucket['upcoming']),
                   'excluded_months': len(cms_excluded),
                   'unscoped': sorted(cms_unscoped_bos)}

        if cms_excluded:
            uc = wb.create_sheet('CMS - Billed Not Installed')
            ucols = ['Inventory ID', 'Location', 'Brand', 'Brand Owner', 'Month',
                     'CMS status that month']
            for i, (cn, w) in enumerate(zip(ucols, [22, 52, 20, 20, 12, 34]), start=1):
                write_header(uc, 1, i, cn)
                uc.column_dimensions[get_column_letter(i)].width = w
            uc.row_dimensions[1].height = 28
            rows = sorted(cms_excluded, key=lambda d: (d['Brand Owner'], d['Location'],
                                                       d['Inventory ID'], d['Month']))
            for ri, rec in enumerate(rows, start=2):
                for ci, cn in enumerate(ucols, start=1):
                    c = uc.cell(ri, ci, rec[cn]); c.font = DATA_FONT
                uc.cell(ri, 6).fill = PatternFill('solid', fgColor='FFC7CE')
            uc.freeze_panes = 'A2'
            uc.auto_filter.ref = f"A1:{get_column_letter(len(ucols))}{len(rows)+1}"

        if unrecorded_swaps:
            us = wb.create_sheet('CMS - Serial Mismatch')
            ucols2 = ['Inventory ID (in Airtable)', 'Serial on the live CMS player',
                      'CMS player', 'Location', 'Brand', 'Brand Owner', 'Month']
            for i, (cn, wd) in enumerate(zip(ucols2, [26, 28, 14, 52, 20, 20, 10]), start=1):
                write_header(us, 1, i, cn)
                us.column_dimensions[get_column_letter(i)].width = wd
            us.row_dimensions[1].height = 28
            rows2 = []
            for (inv, m_abs), ((pid, other), loc, br, bo) in unrecorded_swaps.items():
                if not (REPORT_START <= m_abs <= REPORT_END): continue
                y, m = idx_to_ym(m_abs)
                rows2.append([inv, other, pid, loc, br, bo,
                              f"{calendar.month_abbr[m]}-{str(y)[2:]}", m_abs])
            rows2.sort(key=lambda x: (x[5], x[3], x[0], x[7]))
            for ri, rec in enumerate(rows2, start=2):
                for ci, v in enumerate(rec[:7], start=1):
                    c = us.cell(ri, ci, v); c.font = DATA_FONT
                us.cell(ri, 2).fill = PatternFill('solid', fgColor='FFEB9C')
            us.freeze_panes = 'A2'
            if rows2:
                us.auto_filter.ref = f"A1:G{len(rows2)+1}"
            n_unrec = len(rows2)
        else:
            n_unrec = 0

        nc = wb.create_sheet('CMS - Installed No Contract')
        ncols = ['CMS serial (14)', 'CMS client', 'CMS location', 'CMS first contact', 'Note']
        for i, (cn, w) in enumerate(zip(ncols, [22, 34, 52, 16, 52]), start=1):
            write_header(nc, 1, i, cn)
            nc.column_dimensions[get_column_letter(i)].width = w
        nc.row_dimensions[1].height = 28
        ey, em = idx_to_ym(REPORT_END)
        for ri, p in enumerate(bucket['nocontract'], start=2):
            cl_, lo_, fc_ = (cms_meta.get(p, ()) + ('', '', ''))[:3]
            note = ''
            if fc_[:7] == f"{ey:04d}-{em:02d}":
                note = ('Installed this month. Digital signage bills from the 1st of the '
                        'following month (non-POC), so no contract is expected yet.')
            for ci, v in enumerate([p, cl_, lo_, fc_, note], start=1):
                c = nc.cell(ri, ci, v); c.font = DATA_FONT
            if note:
                nc.cell(ri, 5).fill = PatternFill('solid', fgColor='E2EFDA')
        nc.freeze_panes = 'A2'
        if bucket['nocontract']:
            nc.auto_filter.ref = f"A1:C{len(bucket['nocontract'])+1}"

    # --- Reconciliation tab -----------------------------------------------
    if recon:
        rc = wb.create_sheet('Reconciliation')
        rc.column_dimensions['A'].width = 66
        rc.column_dimensions['B'].width = 14
        rc.column_dimensions['C'].width = 76
        for i, h in enumerate(['Step', 'Screens', 'Explanation'], start=1):
            write_header(rc, 1, i, h)
        rc.row_dimensions[1].height = 28
        end_lbl = MONTH_HEADERS[-1]
        lines = [
            ('Screens with expired-but-installed months, found on the alert list',
             recon['from_alert'],
             'On the "Installed - No active subscription" export AND uncovered for at '
             'least one installed month inside the window.'),
            ('+ found only from subscription history + CMS', recon['from_history'],
             'NOT on the alert list (they have a subscription today), but had a month '
             'inside the window with no covering record while CMS shows them installed. '
             'Usually a month missing from a chain of short contracts.'),
            ('= Screens carried as expired-but-still-installed', recon['carried'],
             f'Counted per month. Total screen-months: {recon["screen_months"]} — '
             f'{recon["hole_months"]} in holes between contracts, '
             f'{recon["lapse_months"]} after the last contract lapsed.'),
            ('Alert list rows (for reference)', recon['alert_rows'],
             'Current-state view at export date. Not the source of the carried figure; '
             'used only for months with no CMS snapshot or brand owners outside CMS.'),
        ]
        r = 2
        for label, val, note in lines:
            c1 = rc.cell(r, 1, label); c1.font = DATA_FONT
            c2 = rc.cell(r, 2, val); c2.alignment = Alignment(horizontal='center')
            c3 = rc.cell(r, 3, note); c3.font = Font(name='Arial', size=9)
            c3.alignment = Alignment(wrap_text=True, vertical='top')
            rc.row_dimensions[r].height = 30
            if label.startswith('='):
                c1.font = TOTAL_FONT; c2.font = TOTAL_FONT
                c1.fill = TOTAL_FILL; c2.fill = TOTAL_FILL; c3.fill = TOTAL_FILL
            else:
                c2.font = DATA_FONT
            r += 1
        r += 1
        rc.cell(r, 1, 'Month-by-month check').font = TOTAL_FONT
        r += 1
        for i, h in enumerate(['Month', 'Total serviced', 'Active (billable)',
                               'Expired, still installed', 'FOC (not billed)'], start=1):
            write_header(rc, r, i, h)
        rc.column_dimensions['D'].width = 24
        hdr_row = r
        r += 1
        for mi, m_abs in enumerate(MONTH_IDXS):
            tot = int(act_c[act_c['m_abs'] == m_abs].shape[0])
            exp = int(act_c[(act_c['m_abs'] == m_abs) & act_c['is_exp_inst']].shape[0])
            foc = int(act_c[(act_c['m_abs'] == m_abs) & act_c['is_foc'] & ~act_c['is_exp_inst']].shape[0])
            for ci, v in enumerate([MONTH_HEADERS[mi], tot, tot - exp - foc, exp, foc], start=1):
                c = rc.cell(r, ci, v); c.font = DATA_FONT
                c.alignment = Alignment(horizontal='center')
            r += 1

        if cms_val:
            r += 1
            rc.cell(r, 1, 'CMS snapshot coverage').font = TOTAL_FONT
            r += 1
            for i, h in enumerate(['Snapshot', 'Installed (Online+Offline)', 'Unpaired'],
                                  start=1):
                write_header(rc, r, i, h)
            r += 1
            for si in cms_snap_info:
                for ci, v in enumerate([si['file'], si['installed'], si['unpaired']], start=1):
                    c = rc.cell(r, ci, v); c.font = DATA_FONT
                    c.alignment = Alignment(horizontal='center')
                r += 1
            missing = [MONTH_HEADERS[i] for i, m in enumerate(MONTH_IDXS)
                       if m not in cms_by_month]
            if missing:
                c = rc.cell(r, 1, 'Months with NO snapshot: ' + ', '.join(missing)
                            + ' — subscription-driven only, not CMS-validated.')
                c.font = Font(name='Arial', italic=True, size=9, color='C00000')
                r += 1
            if cms_val['unscoped']:
                c = rc.cell(r, 1, 'Brand owners absent from CMS, held out of validation: '
                            + ', '.join(cms_val['unscoped']))
                c.font = Font(name='Arial', italic=True, size=9, color='C00000')
                r += 1

            r += 1
            rc.cell(r, 1, f'CMS estate at {end_lbl}').font = TOTAL_FONT
            r += 1
            est = [
                ('CMS screens Online or Offline (physically installed)',
                 cms_val['installed'],
                 'Source of truth for ' + end_lbl + '. Unpaired excluded — uninstalled.'),
                ('  active subscription', cms_val['active'], 'Billable and on site.'),
                ('  expired / terminated, still installed', cms_val['exp'],
                 'Serviced but not billed. See "Expired - Still Installed" tab.'),
                ('  no signage subscription record at all', cms_val['nocontract'],
                 'Running in CMS, nothing in Subscriptions. '
                 'See "CMS - Installed No Contract" tab.'),
                ('  installed, contract starts after ' + end_lbl, cms_val['upcoming'],
                 'New installs. Signage bills from the 1st of the month after installation, '
                 'so no coverage this month is expected.'),
                ('  other: lapsed history, not on the flagged list', cms_val['other'],
                 'Subscription lapsed but not on the installed-no-active-subscription '
                 'export.'),
                ('  SUM of the five buckets above',
                 cms_val['active'] + cms_val['exp'] + cms_val['nocontract']
                 + cms_val['upcoming'] + cms_val['other'], 'Must equal the CMS installed total.'),
                ('Screen-months kept via CMS player (serial in Airtable differs from CMS)',
                 n_unrec,
                 'Serial in Airtable is absent from CMS, but the CMS player it was paired '
                 'to is live at the same location with another serial. Counted as installed; '
                 'listed on \"CMS - Serial Mismatch\". Either a swap not recorded in Airtable, or a mistyped serial in one system — check before editing.'),
                ('Screen-months removed: active subscription, no installed screen',
                 cms_val['excluded_months'],
                 'Live subscription with no paired screen in that month\'s snapshot. '
                 'Removed from the counts above. See "CMS - Billed Not Installed" tab.'),
            ]
            for label, val, note in est:
                c1 = rc.cell(r, 1, label); c1.font = DATA_FONT
                c2 = rc.cell(r, 2, val); c2.font = DATA_FONT
                c2.alignment = Alignment(horizontal='center')
                c3 = rc.cell(r, 3, note); c3.font = Font(name='Arial', size=9)
                c3.alignment = Alignment(wrap_text=True, vertical='top')
                rc.row_dimensions[r].height = 30
                if label.startswith('Screen-months removed'):
                    for cc in (c1, c2, c3):
                        cc.fill = PatternFill('solid', fgColor='FFC7CE')
                if label.strip().startswith('SUM'):
                    c1.font = TOTAL_FONT; c2.font = TOTAL_FONT
                    for cc in (c1, c2, c3): cc.fill = TOTAL_FILL
                r += 1

    wb.save(output_path)
    print(f"Saved: {output_path}")
    print(f"Sheets: {len(wb.sheetnames)} ({len(wb.sheetnames)-1} brand owners + Overview)")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('input')
    parser.add_argument('output')
    parser.add_argument('--start-year',  type=int, default=2025)
    parser.add_argument('--start-month', type=int, default=1)
    parser.add_argument('--end-year',    type=int, default=2026)
    parser.add_argument('--end-month',   type=int, default=8)
    parser.add_argument('--service',     type=str, default='Digital signage')
    parser.add_argument('--movement-log', type=str, default=None)
    parser.add_argument('--alert-log',    type=str, default=None)
    parser.add_argument('--cms-snapshots', type=str, default=None,
                        help='glob for end-of-month CMS exports, e.g. "snaps/2026-*.csv"')
    parser.add_argument('--cms-europe', type=str, default=None,
                        help='Europe CMS player export (semicolon-delimited)')
    args = parser.parse_args()
    build_report(args.input, args.output,
                 args.start_year, args.start_month,
                 args.end_year, args.end_month, args.service,
                 movement_log=args.movement_log,
                 alert_log=args.alert_log,
                 cms_snapshots=args.cms_snapshots,
                 cms_europe=args.cms_europe)
```

## 13. How to verify a fresh run is correct (regression checklist)

After any change to the script, re-run against a known input and spot-check.

**Subscription logic (unchanged since the original version)**

1. **Macstore, "Sendero La Fe", Dec-2025** → **1** (not 2), with a cell comment naming the two swapped serials.
2. **QSA, "LOTUS UDONTHANI 2", Nov/Dec-2025** → **3** in both months (a 3-screen renewal, not a swap — must not collapse to 1).
3. **Novotel Platinum** (or any large multi-screen contract) → holds its full simultaneous count across all months, never collapsed.
4. **Overview, Boost Juice row** → Brand and Brand Owner both read "Boost Juice" (tests 3-part location parsing).
5. **Last column header** → the expected end month, e.g. "Aug-26".

**Cross-check integrity (new)**

6. **Overlay isolation — the most valuable check in the list.** Run three ways and compare the Overview:
   - no overlays → Total block
   - `--alert-log` only → Active block. **Must be byte-identical to the above.** The alert overlay only ever adds an expired-installed block; if Active moves, it is corrupting the subscription counts.
   - full run → Active block. Differs from baseline by **exactly** the screen-months the run reports as CMS-removed. Sum the per-month deltas and check against that number.

   *(Earlier revisions stated Active must equal baseline in the full run. That was true only before per-month CMS masking; it now legitimately differs, and only by the removed count.)*

6b. **Determinism.** Shuffle the input rows (`df.sample(frac=1)`) and re-run. Counts **and** cell colours must be identical. Any difference means something depends on row order — that's how 3.12 was found.

6c. **Store spot-checks for the CMS fixes** (Jan–Sep 2026 inputs): Mandai Zoo 4 every month; The Scene Town Sep 3; Jomthien Jul, Theparak Aug, Big C Phrae/Samut Prakan/Mukdahan Sep all salmon at full count; Khao Saming Jul 3 salmon.

6a. **Watch the `other` bucket on the Reconciliation tab.** It should be small and stable — around 30. A jump into the hundreds means screens are being dropped from the grid, most likely the concurrent-slot collapse in Section 3.9.
7. **Overview arithmetic**: Total = Active + Expired-still-installed, every month, every row.
8. **Estate partition sums** to the CMS installed total (Section 11.1). If not, the `other` bucket is absorbing something.
9. **Alert waterfall arithmetic**: `export rows − service-slice − ran-through-end − no-CMS-month = carried`.
10. **Unpaired rows carry no serial** in every snapshot, and `online + offline == serial-bearing row count`. If this breaks, the installed-set rule is invalid and every count is suspect.
11. **Serial prefix matching** resolves substantially all of the alert list. If exact matching is accidentally reinstated it will match roughly 1 in 700 and the expired-installed population will collapse to near zero — a silent, plausible-looking failure.
12. **Months with no snapshot are flagged, not masked.** A month with no file must pass through unvalidated. If a month's count drops to near zero, masking was applied against an empty set.
13. **No brand owner is zeroed by CMS scoping.** Check the unscoped list on the Reconciliation tab names only brand owners with no rows in the window, or ones served by a CMS server you did not supply.

**Sanity figures for the Jan-Aug 2026 run** (audit \_10\_, 828-row alert, 7 Asia snapshots, Europe export):

| Check | Expected |
|---|---|
| Screens filtered to Digital signage | 5,203 |
| Expired-but-installed | 671 screens / 1,321 screen-months |
| Screen-months removed by CMS | 39 |
| Aug-26 estate | 3,145 = 2,393 + 671 + 54 + 27 |
| Aug-26 active, KFC | CRG 615, QSA 278, RD 489 = 1,382 |

## 14. Change log

**Sep-2026 — CMS cross-validation**

- Added `--alert-log`, `--cms-snapshots`, `--cms-europe`. All optional; omitting all three reproduces the legacy report exactly.
- Expired-but-installed screens are now carried into the grid, per month, validated against each month's own snapshot.
- Added the salmon fill at top priority, three-block Overview, and four new tabs.
- **Corrected the lapsed-screen source** from `Inventory-Subscription_Alert` to `Installed-Noactivesubscription`. The old view over-reported (Section 3.5).
- **Added 14-char prefix serial matching.** Exact matching found 1 of 714 (Section 3.6).
- Established that `FirstContactDate` cannot be used as an install date (Section 10).
- Folded in the Europe CMS server, which had been silently absent.

**Net effect on the headline number:** expired-but-installed moved 679 → 671, about 1%. The value is not the change in the number, it is that the number now reconciles. The 8-screen Boost Juice error in the first version was invisible because there was nothing to tie the numbers out against.

**Oct-2026 — concurrent-slot fix**

- **Fixed 3.9**, where concurrent screens sharing an identical span collapsed into one slot. Triggered by short backfill contracts covering hundreds of screens. Was undercounting August by ~500.
- **Corrected regression check 6**, which predated per-month CMS masking and could not pass.
- **Documented 3.10**: the alert view is current-state and cannot reconstruct a historical gap after a retroactive backfill.
- Confirmed the `Subscriptions - All` view works as input. It carries full history to 2021 and all service types; the service filter and date window handle the extra rows, and the longer renewal chains are an improvement.

**Oct-2026 — FOC**

- FOC now read from the export instead of hardcoded to 0 (3.11). Anchored to contract start.
- Overview: Active split into Billable and FOC. Reconciliation month table gained a FOC column.

**Oct-2026 — renewal shading**

- Fixed 3.12: renewal flags were positionally misassigned. Added determinism check 6b.

**Oct-2026 — gaps from history**

- Expired-but-installed derived from subscription history + CMS (3.13). Alert list demoted to fallback. Reconciliation waterfall rewritten to show alert-list vs history-only screens and hole vs lapse months.

**Oct-2026 — CMS player validation, swap-month dedup, history-based gaps**

- 3.13 validate by player (with the "other serial not billed" guard), new `CMS - Serial Mismatch` tab.
- 3.14 dedup prefers the CMS-confirmed serial.
- 3.15 gaps from history + CMS; alert list demoted to fallback. Detail tab gained `Gap type`.
- Sanity figures, Jan–Sep 2026: 80 expired-but-installed screens / 203 screen-months (38 hole, 165 lapse); 42 billed-not-installed screen-months; 6 serial-mismatch rows; `other` bucket 10.

**Oct-2026 — billing start rule**

- Documented the rule (3.15). No-contract tab now flags same-month installs as expected.

**Oct-2026 — post-fix re-run**

- CMS snapshots now arrive as .xlsx with a `CMS Asia` sheet; convert that sheet to CSV named `YYYY-MM-DD_….csv` before running.
- Added the `upcoming` estate bucket. After the 56-item fix list: `other` bucket 1, expired-but-installed 39 screens / 113 screen-months, billed-not-installed 37.
- Sanity figures, Jan–Sep 2026 (export 14-Oct, Sep-30 snapshot): Total 2,329 … 3,084; Billable 2,316 … 3,058; Sep estate 3,155 = 3,052 + 16 + 51 + 35 + 1.

**Nov-2026 — handover**

- Packaged as `HANDOVER.md` + `code/` (three scripts) + this document. The embedded script in Section 12 and `code/build_report.py` are identical; edit the file, not this doc.
- Removed a duplicate 3.13 heading left over from a merge.

## 15. Notes on working in this environment

If a regression check in Section 13 fails, the most likely cause is the script having reverted to an earlier version — this has happened more than once (the skill file did not reliably persist edits across tool-call turns). **Keep Section 12 as the canonical, verified-working copy to restore from.**

When source files are re-exported mid-task, treat every column set as unknown and re-profile before parsing. Across this project the audit dropped a column, the alert view changed scope twice, the CMS snapshots changed schema mid-year, and the Europe export used a different delimiter entirely. Selecting by name and re-profiling on every run costs seconds and has caught a real error each time.
