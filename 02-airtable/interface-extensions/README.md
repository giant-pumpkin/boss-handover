# Airtable interface extensions

Custom interface pages written as single `.tsx` files with `@airtable/blocks/interface/ui`. Copied from `~/coding/airtable-interface-improvements` on 2026-10-26; every `AIRTABLE_PAT` is the placeholder `YOUR_PAT_HERE`. `SOURCE-README.md` is the original project README and `skills/airtable-extension-guide.md` the full SDK-vs-REST guide.

| File | Base | Page | Does |
| --- | --- | --- | --- |
| `jobs/job-creation-page/create-job-combined.tsx` | Jobs | Create job | 3-step wizard (location → BOM → job) and spreadsheet-style bulk creator; optional subscription contract per BOM line |
| `jobs/quote-to-job/quote-staging-extension.tsx` | Quotes | Quotes-to-Job | sales → deployment handover |
| `jobs/dashboards/jobs-dashboard.tsx` | Jobs | Dashboard | |
| `inventory/inventory-swap.tsx` | Inventory | Swap | |

## How to install or edit one

1. Interfaces → page → add **Custom extension** block → paste the file.
2. Add every table the extension reads via `useRecords` to the extension's settings panel.
3. Field IDs are in a `const F = {…}` at the top. Update if copying to another base.

## Rules learned the hard way

| Operation | Use | Why |
| --- | --- | --- |
| Read configured tables | SDK `useRecords(table)` | reactive |
| Read unconfigured tables | REST in `useEffect` | `useRecords(null)` crashes |
| Create on non-synced tables | REST (`returnFieldsByFieldId=true`, batches of 10, retry 429 after 2 s) | SDK create only queues locally, ~80% success |
| Create on synced tables | SDK `createRecordAsync` | REST blocked by sandbox (422 on PATCH) |
| Linked records | REST `["recX"]`, SDK `[{id:"recX"}]` | mixing them fails silently |
| Dropdown close | `mousedown` document listener | `onBlur` does not fire in the iframe |
| Dropdown position | `position: fixed` + `getBoundingClientRect()` | escapes `overflow:auto` |
| Tooltips | CSS hover | `title` attribute does not render |

Customer prefill from a location must match by **name** (old vs new customer table, see [known-issues.md](../known-issues.md)).
