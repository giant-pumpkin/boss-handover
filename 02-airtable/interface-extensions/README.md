# Airtable interface extensions

Custom interface pages written as single `.tsx` files with `@airtable/blocks/interface/ui`. Copied from `~/coding/airtable-interface-improvements` on 2026-10-26; every `AIRTABLE_PAT` is the placeholder `YOUR_PAT_HERE`. `SOURCE-README.md` is the original project README and `skills/airtable-extension-guide.md` the full SDK-vs-REST guide.

| File | Base | Page | Does |
| --- | --- | --- | --- |
| `jobs/job-creation-page/create-job-combined.tsx` | Jobs | Create job | 3-step wizard (location → BOM → job) and spreadsheet-style bulk creator; optional subscription contract per BOM line |
| `jobs/quote-to-job/quote-staging-extension.tsx` | Jobs | Quote-to-job (`pagyNqW4yhwE7GbRE`) | sales → deployment handover (Quote Staging) |
| `jobs/dashboards/jobs-dashboard.tsx` | Jobs | Dashboard | |
| `inventory/inventory-swap.tsx` | Inventory | Swap | |

## How to edit an existing custom page

Verified in the Jobs base on 2026-10-29. The code lives only inside Airtable; the `.tsx` files here are the backup copy.

1. Open the base and click **Interfaces** in the top bar. It drops you straight into the interface editor (the URL ends in `/edit`). If you land on the published interface instead, open the page menu at the top of the purple sidebar and choose **Edit pages** (⌥1).
2. In the **left-most white column** (the editor's page list, not the purple navigation) click the page that holds the custom element, e.g. `Jobs › Quote-to-job`.
3. Click the page **body** (the empty canvas below the cards, not the page header). The right panel must change from **Page** to **Page › Custom** and show *Data › Table: 9 tables* and the *Custom properties* list. If it still says *Page*, you clicked the header.
4. Click the **⋯** at the top right of that panel. The menu is **Download source code / Edit source code / History / Share feedback**. Choose **Edit source code**.
5. The full-screen *Edit source code* view opens with the code on the left and a live preview on the right. Select all and paste the whole `.tsx` file from this repo.
6. Replace `YOUR_PAT_HERE` with the digital team's Airtable personal access token. It is hard-coded in the file by design (the `AIRTABLE_PAT` const near the top); there is no secrets store for custom pages. The repo copies are redacted on purpose, never commit the real value.
7. Click **Save changes** (top right). **Exit** discards. Saving the code is not the same as publishing: the interface header still says *Publish*, click it to release the change to users.

**Download source code** on the same menu is how to refresh the copies in this repo (redact the PAT before committing). **History** lists earlier saves and is the quickest rollback.

## Creating a new custom page: pitfalls

- **You cannot add a blank custom page by hand.** The *Create new…* menu has no "custom element" option. Ask Airtable's AI assistant (Omni, the sparkle icon in the editor) to create a blank custom page on the interface, then paste your code into it as above.
- **Enable the fields the code reads.** On the *Page › Custom* panel, *Data › Fields* (e.g. *54 visible*) controls which fields of each table the element may read. A field referenced in the `.tsx` but hidden here makes the page error at load. After pasting new code, open *Fields*, pick each table in the dropdown and tick what the code uses (or *Show all*).
- **Map the custom properties.** The *Custom properties* section (HS - Quotes, Locations, BOM, BOM Resources, Jobs, Resources, Customers, Partners in the Quote Staging page) binds each `useCustomProperties` slot to a table. Unmapped slots come back `null` and `useRecords(null)` crashes, see the table below.
- Field IDs are in a `const F = {…}` at the top of each file. Update them if you copy a page to another base.

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
