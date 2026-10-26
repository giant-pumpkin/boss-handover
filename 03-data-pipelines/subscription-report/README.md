# subscription-report

Monthly subscription revenue/report built from Airtable subscription records. Source: `~/coding/subscription-reconciliation` (`main.py`, `quote_line_items.py`, `patch_quote_types.py`) and `~/coding/parse-subscriptions` (`parse-subs.py`).

Output: `subscription_report_output.xlsx` (Jan–Sep 2026 produced <!-- date -->).

## Billing-start rules encoded here

See [07-business-logic/subscription-lifecycle.md](../../07-business-logic/subscription-lifecycle.md): install month never billed for signage, music prorated, FoC months, etc. <!-- TODO verify wording -->

## Data-fix backlog

<!-- TODO: the list of records that needed manual fixing and why -->

## Run

```bash
source ~/.secrets && python main.py
```
