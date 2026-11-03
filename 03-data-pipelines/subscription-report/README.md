# subscription-report

Subscription timeline report, produced **on request** (Chris asks for it now and then; it is not on a schedule). Last produced 2026-05-11, Jan 2026 to date. Keep it runnable.

Source on my Mac: `~/coding/subscription-reconciliation` (`main.py`, plus two HubSpot helpers from the same exercise). Copies are in [reconciliation/](reconciliation/). The repo copy reads the Airtable token from `AT_PAT`; the original on my Mac still has a PAT hard-coded, which is one of the reasons the PAT is on the rotation list.

## What `main.py` produces

`subscription_report_output.xlsx`, one sheet per customer group, one row per location, one column per month from April 2022 to the current month. A cell holds the number of active subscriptions for that location in that month (active = `Start date` ≤ month end and `End date` ≥ month start). Extra columns: the location's installation job completion date, and the installation date. Rows whose Airtable start month differs from the Sales tracker are highlighted, and fuzzy name matches below the confidence threshold are listed in the console output for a human to check.

Inputs:

| Input | Where |
| --- | --- |
| Subscriptions | Inventory base `appRor1ipbYAb4K7z`, table `tblyNA73D9jldeEir` (Location - Installation, Start date, End date, Status, Customer group) |
| Installation jobs | Jobs base `appdo1WwONYvmYMWg`, Jobs table (Location, Date completed / Date scheduled, Job type, Status) |
| Sales tracker | `new_digital_signage_subscription_tracker_sales.xlsx`, Sales' own sheet exported to xlsx; one tab per customer group, a few template tabs skipped (`SKIP_SHEETS`) |

The other two scripts are a one-off from May 2026 and are not part of the report: `quote_line_items.py` dumps every HubSpot quote's line items to Excel; `patch_quote_types.py` wrote `quote_type` / `quote_service` back onto HubSpot quotes from a grouped xlsx. `parse-subscriptions/` is an abandoned stub.

## Run

```bash
cd ~/coding/subscription-reconciliation
source venv/bin/activate   # requests openpyxl rapidfuzz python-dateutil
export AT_PAT=...
python main.py [path/to/sales_tracker.xlsx]
```

Takes a few minutes (full table scans of subscriptions and jobs). Send Chris the xlsx.

## Billing-start rules

The report counts a subscription as active from its Airtable `Start date`; it does not apply the billing rules itself. Those are in [07-business-logic/subscription-lifecycle.md](../../07-business-logic/subscription-lifecycle.md) (install month never billed for signage, FoC months, etc.). If Chris wants billed months rather than active months, that is a change to `is_active`.

## Data-fix backlog

The May 2026 run found start-date discrepancies against the Sales tracker; the fixes were applied in Airtable at the time. Rerun and read the console output for the current list. <!-- TODO: the known remaining mismatches, if any -->
