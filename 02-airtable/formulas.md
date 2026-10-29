# Non-obvious formulas

<!-- TODO: paste each formula verbatim with the field ID and a sentence on why it is shaped that way -->

## Customer ID dedupe

Field: <!-- fld… --> in <!-- base/table -->

```
```

## `ticket_open_mins`

Field: <!-- fld… --> in Tickets base

```
```

## Subscription start date

Field: `Start date` on Subscriptions `tblyNA73D9jldeEir`, Inventory base <!-- confirm fld -->

```
IF({Start date - Override}, {Start date - Override},
   MAX(first-of-month-after({Installation date}), {contract Start date}))   // contract start ignored when empty
```

Why: billing starts the first of the month after install; see [07-business-logic/subscription-lifecycle.md](../07-business-logic/subscription-lifecycle.md).

## `SN - Normalised`

Inventory base. Samsung serials are 15 characters on the device but stored as 14 in Airtable; the formula drops the 15th character. **The same rule is duplicated in two automation scripts** (availability check, ingest), so they can drift. See [07-business-logic/quote-to-subscription-workflow.md](../07-business-logic/quote-to-subscription-workflow.md) §3.6 and §3.9.

## Maintenance package ID

`Ma - Packages` ID formula now includes `Reference` (`fldFPjTIigtr45DhE`): quote number for renewals, start month for V1. Added 2026-10-01.
