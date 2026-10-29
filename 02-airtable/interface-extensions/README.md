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

## Page configuration: the half of the extension that is not in the code

Learned the hard way on 2026-10-29 ([incidents/2026-10-29-quote-staging-contracts-not-created.md](incidents/2026-10-29-quote-staging-contracts-not-created.md)): identical code worked on *Create job* and silently created no contracts on *Quote-to-job*. The difference was page settings. A custom page can only read and write what the **page** exposes, through **three independent panels** under *Page › Custom* in the editor's right panel. None of them are in the `.tsx`, none are versioned, and none copy when the same code is pasted into a second page.

| Panel | Controls | If wrong |
| --- | --- | --- |
| *Data › Table* (eye icons) | which tables the page can see at all | `getTableByIdIfExists` returns `null`; `useRecords(null)` crashes; a guarded `if (table)` skips silently |
| *Data › Fields* (per table, e.g. "54 visible") | which fields the page can read and write | hidden field reads as empty or throws; a write to it is dropped |
| *User actions › Edit records inline* and *Add records inline* (gear icon → per-table list) | SDK write permission per table | `Add` off → `createRecordAsync` throws *"not set to allow record creation"*; `Edit` off → writes dropped **including the reverse side of linked-record fields**, so the record is created with empty links |

Rules that follow:

- **Link targets need write permission too.** Setting a linked-record field writes both tables. Switch *Edit records inline* on for every table a link points at (for contracts: `Subscription contracts`, `Quotes`, `Customer (from Inventory base)`), not only the table receiving the record.
- **Edit before Add.** The per-table *Add* toggle is greyed out until *Edit* is on for the same table. The tooltip says "Inline record editing is disabled for this table."
- **Airtable drops, it does not always fail.** A create with some disallowed fields can succeed with those fields empty. A record that exists but is missing links is a permission problem first.
- **Publish after changing any of these.** Saving the code and publishing the interface are separate steps.
- **When a write works on one page and not another, diff these three panels on both pages before reading code.**

### Checklist for any page that writes records

For **every** table the code reads or writes, including tables reached only through linked-record fields:

- [ ] *Data › Table*: enabled
- [ ] *Data › Fields*: every field the code touches is visible (**Show all** unless there is a reason not to)
- [ ] *User actions › Edit records inline* (gear): on for the table
- [ ] *User actions › Add records inline* (gear): on for the table, if the code creates records in it
- [ ] *Custom properties*: every `useCustomProperties` slot is bound to a table
- [ ] **Publish**

### Other pitfalls when creating a new custom page

- **You cannot add a blank custom page by hand.** The *Create new…* menu has no "custom element" option. Ask Airtable's AI assistant (Omni) to create a blank custom page on the interface, then paste your code into it as above.
- **Map the custom properties.** The *Custom properties* section (HS - Quotes, Locations, BOM, BOM Resources, Jobs, Resources, Customers, Partners on the Quote Staging page) binds each `useCustomProperties` slot to a table. Unmapped slots come back `null`.
- Field IDs are in a `const F = {…}` at the top of each file. Update them if you copy a page to another base.

### Code rules that came out of the same incident

- **Never guard a write with a silent `if`.** `if (table) { create }` turns a misconfiguration into a fake success. Throw, or at least log, when a required table or field is missing. `quote-staging-extension.tsx` now throws and logs under `[QuoteStaging]`; `create-job-combined.tsx` still has the silent guard in both its single and bulk paths.
- **Render errors next to the button that caused them.** A banner at the top of a long panel is invisible during a bottom-of-page action.
- **The extension runs in a cross-origin iframe.** Browser automation on the parent page cannot read its console; an inline error on the page is the only observable signal from outside.

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

Customer prefill from a location must match by **name** (old vs new customer table, see [known-issues.md](../known-issues.md)). The contract form on Quote-to-job still prefills Customer from the quote's `Customer (AT)` link, which is a Jobs-base `Customers` record, while the contract's Customer field links to the Inventory-base customers table: a contract saved with the prefill carries a record ID from the wrong table. Resolve by name against the dropdown list instead, as the seed button already does.

**Repo copies are behind the live code** for `quote-staging-extension.tsx` since the 2026-10-29 diagnostics (inline error, `[QuoteStaging]` logging, seed button). Refresh with *Download source code* and redact the PAT before committing.
