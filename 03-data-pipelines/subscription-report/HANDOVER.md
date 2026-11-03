# Subscription Report — Handover

**From:** Pitchayut (Boss) Lertniratwong
**Date:** 3 November 2026
**Last day in office:** 13 November 2026 (employment ends 30 November)

This is a complete handover of the monthly subscription report. It is written for someone who has never run it. Read this file first; everything else in the package is reference.

---

## 1. What the report is and who uses it

A monthly Excel workbook showing, per client store, how many digital signage screens were serviced each month, split into:

| Bucket | Meaning | Who cares |
|---|---|---|
| **Billable** | Live contract AND the CMS confirms the screen was physically on site | Finance / VA invoicing — **this is the number** |
| **FOC** | Live contract, but inside the free-of-charge months at the start | Finance (serviced, not invoiced) |
| **Expired, still installed** | Contract has lapsed but the screen is still on site | Sales (renewals) |
| **Billed not installed** | Live contract but the CMS has no screen — listed, excluded from the count | Ops (something's wrong) |

The report is requested by Chris roughly monthly, used to validate what Giant Pumpkin pays the VA (vendor) and to reconcile against client invoicing. The last run was Jan–Sep 2026.

The single most important idea: **the CMS is the source of truth for whether a screen is physically installed. Airtable is the source of truth for what we are billing.** The report joins the two and reports where they disagree.

---

## 2. What you need before you can run it

Four inputs. Only the first is strictly required; without the others you get a weaker report.

### 2.1 Subscriptions export (REQUIRED)

- **Where:** Airtable → Subscriptions table → view **"Subscriptions - Generate Report"**
- **How:** open the view, `...` menu → Download CSV
- **Must contain these columns** (the script checks and refuses to run without them):

  ```
  ID, Status, Subscription contract, Resource, Duration - FoC,
  Inventory ID, Service Location, Start (DD-MMM-YYYY), End (DD-MMM-YYYY)
  ```

- `Duration - FoC` is a lookup from the contract. If someone removes it from the view, FOC silently becomes zero and the billable number is overstated. Check it's there.
- Use `Service Location`, not `Location - Installation`. The latter is a live lookup that rewrites history when a screen moves.
- The two `DD-MMM-YYYY` date columns are formula fields that export unambiguously. Don't substitute the raw date fields.

### 2.2 Installed - No active subscription export (recommended)

- **Where:** Airtable → Inventory table → view **"Installed - No active subscription (Signage)"**
- **How:** Download CSV
- **Columns used:** `ID`, `Status`, `Subscription - Status`
- Only three columns are read; everything else is ignored. This view is the fallback for months with no CMS snapshot. Since the report now derives gaps from CMS directly, this file matters less than it used to, but still supply it.

### 2.3 CMS Asia monthly snapshots (strongly recommended)

- **Where:** Google Drive → `cms_daily` folder:
  **https://drive.google.com/drive/folders/1ZkT9fA3v7X8k9h2GXNrpqiVpQWmCDYnB**
- **What:** one `.xlsx` per day, named `YYYY-MM-DD_log.xlsx`, with a sheet called **`CMS Asia`**
- **Which to use:** the **last day of each month** in your reporting window. One file per month. A missing month is not validated and the report flags it in red.
- **Columns used:** `SerialNumber`, `ScreenStatus`, `Client`, `Location`, `PlayerId`, `FirstContactDate`
- These are converted to CSV by `convert_cms_snapshots.py` (Section 4). The report reads the CSVs.

Without these the report is subscription-driven only — it will count screens that aren't on site, and miss screens that are.

### 2.4 CMS Europe export (optional)

- Only Starbucks / BFI (Iceland) screens live on the Europe server. Without this export those ~12 screens are held out of CMS validation and counted from Airtable alone — which is fine. Supply it only if you want them validated.
- It's a semicolon-delimited CSV with no `ScreenStatus` column; the script infers installation from the contact dates.

---

## 3. One-time setup

You need Python 3.10+ with two packages:

```bash
pip install pandas openpyxl
```

Copy the `code/` folder somewhere stable. That's it.

---

## 4. Running it — step by step

Assume you want Jan–Oct 2026.

**Step 1 — Get the files.** Download the Subscriptions export (2.1) and the alert export (2.2). From the Drive folder, download the end-of-month `.xlsx` for every month Feb–Oct 2026 into a folder, e.g. `cms_xlsx/`. (January has no snapshot; that's known.)

**Step 2 — Convert the CMS snapshots.**

```bash
python code/convert_cms_snapshots.py cms_xlsx/ cms_csv/
```

It prints one line per file. Each line should show `installed == with serial`. If a line has a WARNING, that snapshot is broken — the unpaired-screens rule relies on this equality. Don't use it.

**Step 3 — Convert the Subscriptions export.**

```bash
python code/convert_subscriptions.py "Subscriptions-Subscriptions - Generate Report.csv" input.xlsx
```

It prints the row count, the service breakdown, and the number of rows with FOC. If it prints WARNINGs about unparseable dates or end-before-start, fix those records in Airtable before continuing — they're wrong in the source, and the report will be wrong too.

**Step 4 — Build the report.**

```bash
python code/build_report.py input.xlsx subscription_report_2026_jan_oct.xlsx \
  --start-year 2026 --start-month 1 \
  --end-year 2026 --end-month 10 \
  --service "Digital signage" \
  --alert-log "Installed-Noactivesubscription(Signage).csv" \
  --cms-snapshots "cms_csv/2026-*.csv"
```

The quotes around the glob matter. It prints four lines at the end — expired-but-installed count, CMS-removed count, the saved path, and the sheet count.

**Step 5 — Check it** (Section 6). This takes five minutes and is not optional.

---

## 5. Reading the output

The workbook has these tabs:

| Tab | What's in it |
|---|---|
| **Overview** | Four stacked blocks by Brand × Brand Owner × month: Total serviced, Billable, FOC, Expired-still-installed. Each has a TOTAL row. **Billable is the VA number.** |
| One tab per brand owner (QSA, CRG, RD, Boost Juice …) | Store × month grid with colour coding. Hover a coloured cell for the reason. |
| **Expired - Still Installed** | Every screen on site without a contract, with the months affected and whether it's a gap between contracts or a lapse |
| **CMS - Billed Not Installed** | Screen-months with a live contract but no screen in CMS that month. Excluded from totals. Each needs a look. |
| **CMS - Serial Mismatch** | The CMS player is live under a different serial than Airtable has. Either a swap nobody recorded, or a typo in one system. |
| **CMS - Installed No Contract** | In CMS, nothing in Airtable. Mostly demo/POC units. New installs are flagged as "contract due next month". |
| **Reconciliation** | How the numbers tie out. See below. |

### Colours on the brand-owner tabs

| Colour | Meaning |
|---|---|
| Salmon | Expired, still installed |
| Orange | Installation month |
| Purple | Screen swap mid-contract (hover for the two serials) |
| Dark green | FOC month |
| Light green | Brand new store |
| Blue | Renewal |
| Pink | Terminated |
| Grey | Expired |

### The Reconciliation tab

Two sections, and **both must tie**.

The **estate partition** at the end month is a strict split of every screen CMS says is installed:

```
CMS screens Online or Offline               3,155
  active subscription                       3,052
  expired / terminated, still installed        16
  no signage subscription record               51
  installed, contract starts next month        35
  other                                         1
  SUM                                       3,155   <- must equal the top line
```

If the SUM doesn't match, stop. If the `other` line is more than a handful, screens are being dropped — look at Section 7 of the process doc.

### Business rules the report encodes

- **Billing starts the 1st of the month after installation** (signage, non-POC). The install month is never billed. Music streaming is prorated instead, but this report is signage-only.
- A screen is **installed** if the CMS lists it as Online or Offline. Unpaired = removed. A 7-day-offline rule was tried and reverted as too hard to verify — don't reintroduce it.
- **FOC** is counted from the contract start, not from each screen's record start, so a replacement screen doesn't restart the free period.
- Airtable stores serials truncated to 14 characters; CMS stores 15. Matching is on the first 14.

---

## 6. Checking a run before you send it

Do these every time. Each catches a real failure that has happened.

1. **Overview arithmetic.** Total = Billable + FOC + Expired, every month. (The script enforces this; eyeball one column.)
2. **Reconciliation SUM equals the CMS installed total.** If not, don't send.
3. **`other` bucket is small** — under 5. In the last run it was 1.
4. **Run it a second time with no `--cms-snapshots` and no `--alert-log`.** The Total row of that run must equal Billable + FOC of the full run plus the number of screen-months the full run reported as "CMS validation removed". If it doesn't, the overlays are corrupting the base counts.
5. **Swap check.** Run Jan 2025 → now and look at Macstore / "Sendero La Fe" / Dec-25: must be **1**, with a purple cell and a hover note naming two serials. QSA / "LOTUS UDONTHANI 2" / Nov-25 and Dec-25: must be **3** both months.
6. **Compare to the previous run.** The Overview TOTAL rows for months you both cover should be identical, unless records were fixed in between. If a month moved and you don't know why, find out before sending.

Expected figures for Jan–Sep 2026, from the 14-Oct-2026 export with the Sep-30 snapshot, so you can tell if something's drifted:

| | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep |
|---|---|---|---|---|---|---|---|---|---|
| Total serviced | 2,329 | 2,487 | 2,758 | 2,880 | 2,898 | 2,934 | 3,031 | 3,077 | 3,084 |
| Billable | 2,316 | 2,463 | 2,738 | 2,859 | 2,882 | 2,904 | 2,998 | 3,039 | 3,058 |
| FOC | 10 | 13 | 12 | 8 | 6 | 17 | 16 | 17 | 9 |
| Expired, installed | 3 | 11 | 8 | 13 | 10 | 13 | 17 | 21 | 17 |

---

## 7. When a number looks wrong

It usually isn't the script. In order of likelihood:

1. **An Airtable record is wrong.** Screen on the wrong store, swap recorded with the wrong serial, a one-month backfill contract missing a month, a terminated screen never unpaired in CMS. The exception tabs point at these. Trace the store: pull its records from the export, pull its serials from the CMS snapshots, line them up month by month.
2. **The export changed shape.** A column renamed or dropped. `convert_subscriptions.py` refuses to run if a required column is missing — read the error.
3. **A CMS snapshot is bad.** `convert_cms_snapshots.py` warns if `installed != with serial`. A truncated export looks exactly like a mass removal.
4. **The billing rule.** A store installed on the 20th shows no contract that month. That's correct.
5. **Genuinely the script.** Section 3 of the process doc lists every bug found so far and what it looked like from the outside. Check there before debugging.

### Known open items at handover

- **Robinsons Butuan (Power Mac)** — screen 311INVM93871 destroyed in an earthquake (May), replacement 511INGQ9L663 live in CMS since June, no subscription record. Sales were deciding how to bill. Shows salmon until resolved.
- **Nysa Hotel (Kingston)** — 9 screens, contract lapsed end of July, still on site. Renewal question for sales.
- **January 2026** has no CMS snapshot. Subscription-driven only.
- **Virgin Active** shows as absent from CMS. Three screens. Not investigated — may be a parsing artefact or another server.

---

## 8. What's in this package

```
HANDOVER.md                         this file
code/
  convert_subscriptions.py          step 1 — Airtable export → script input
  convert_cms_snapshots.py          step 2 — Drive .xlsx → CSV per month
  build_report.py                   step 3 — the report (≈1,050 lines)
process.md                          full technical reference: every rule, every
                                    bug found and fixed, the regression checklist,
                                    the change log. Read Section 3 when something
                                    is weird and Section 13 before trusting a change.
reference/airtable_fix_list_2026-10.xlsx
                                    the 56 record errors found in Oct-2026 and how
                                    each was resolved — worked example of tracing
                                    a discrepancy to its cause
reference/subscription_report_2026_jan_sep_v5.xlsx
                                    the last report sent, for comparison
```

Also referenced but not in this package:

- **CMS daily logs:** https://drive.google.com/drive/folders/1ZkT9fA3v7X8k9h2GXNrpqiVpQWmCDYnB
- **Airtable views:** "Subscriptions - Generate Report" (Subscriptions table), "Installed - No active subscription (Signage)" (Inventory table)

---

## 9. Where this should go next

The script works, but it's a 1,000-line reconciliation of CSV exports, and every rule in it is a join. The durable version is a screen-month fact table in Supabase, next to the Airtable sync that already exists: subscriptions × months × CMS snapshots, with the exception buckets as views. Then "which screens were on site and unbilled in August" is a query, not a report run.

The root cause of almost every discrepancy found was a physical event — a swap, a move, a removal — that was done by an installer and never keyed into Airtable. The CMS knew because the screen reports itself. The fix that would make this report mostly unnecessary is making job completion write the subscription change, and giving Airtable and the CMS a shared location ID so player names stop being free text.

Neither is urgent. The report as it stands is defensible, and the exception tabs tell you exactly what isn't.
