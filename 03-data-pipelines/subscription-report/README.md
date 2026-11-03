# subscription-report

The monthly screens-serviced report Chris asks for, roughly monthly, to validate what GP pays the VA and to reconcile client invoicing. Signage only. Last run: Jan–Sep 2026 (v5, sent Oct 2026).

**Start with [HANDOVER.md](HANDOVER.md).** It is written for someone who has never run it: inputs, the three commands, how to read the output, the checks to do before sending, and what to do when a number looks wrong.

| File | What |
| --- | --- |
| [HANDOVER.md](HANDOVER.md) | the runbook, read first |
| [process.md](process.md) | full technical reference: every rule, every bug found and fixed, the regression checklist, change log (long; §12 embeds the script) |
| [code/](code/) | `convert_subscriptions.py` → `convert_cms_snapshots.py` → `build_report.py`, in that order; needs only `pandas` and `openpyxl` |
| [reference/](reference/) | the last report sent (`subscription_report_2026_jan_sep_v5.xlsx`) and the Oct 2026 Airtable fix list (56 record errors found by the report; 53 still open at handover) |
| [legacy-2026-05/](legacy-2026-05/) | the first attempt (May 2026): Airtable timeline vs the Sales tracker xlsx, plus two HubSpot quote helpers. Superseded; kept because the quote-type patch is referenced from [05/hubspot-api-access.md](../../05-third-party-services/hubspot-api-access.md). The original on my Mac has a PAT hard-coded. |

## Inputs, in one line each

1. Airtable Subscriptions view **"Subscriptions - Generate Report"**, downloaded as CSV. Must keep `Duration - FoC` and `Service Location`.
2. Airtable Inventory view **"Installed - No active subscription (Signage)"**, CSV.
3. End-of-month copies of the CMS/DP Information sheet from the `cms_daily` Drive folder (`1ZkT9fA3v7X8k9h2GXNrpqiVpQWmCDYnB`), one per month, sheet `CMS Asia`. These exist because of the Apps Script snapshot described in [../cms-scraper/README.md](../cms-scraper/README.md); if that trigger dies with my Google account, this report loses its source of truth for "was the screen on site".
4. Optional CMS Europe export for the Iceland Starbucks screens.

## Rules the report encodes

- CMS says whether a screen is installed (Online or Offline = installed, Unpaired = removed). Airtable says what is billed. The report joins them and lists every disagreement on its own tab.
- Billing starts the 1st of the month after installation; the install month is never billed.
- FOC months count from the contract start, not from each screen's record.
- Serial match is on the first 14 characters (Airtable truncates, CMS does not).

The same rules in prose: [07-business-logic/subscription-lifecycle.md](../../07-business-logic/subscription-lifecycle.md).

## Open at handover

See HANDOVER.md §7: Robinsons Butuan replacement screen with no subscription record, Nysa Hotel lapsed contract with 9 screens still on site, no CMS snapshot for January 2026, Virgin Active absent from CMS. Plus the 53 open rows in the fix list.

## Where it should go

A screen-month fact table in Supabase next to the existing sync, with the exception buckets as views (HANDOVER.md §9). Not urgent; the report as it stands is defensible.
