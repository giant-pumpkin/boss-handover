# Incident Report: Subscription Contracts Not Created from Quote Staging

**Date:** 29 October 2026
**Extension:** `jobs/quote-to-job/quote-staging-extension.tsx` (Quote-to-job page, Jobs base `appdo1WwONYvmYMWg`)
**Severity:** Functional gap, no data loss. Jobs and BOMs were created correctly; the Subscription Contract records that should accompany them were not.
**Status:** Resolved. Root cause was interface page configuration, not code.

---

## Summary

The bulk job creation flow on the Quote-to-job page creates Jobs, BOMs and BOM Resources through the REST API, then creates Subscription Contracts through the SDK on the synced `Subscription contracts` table. On the Quote-to-job page the contract step produced nothing, while the identical code on the Create job page worked.

The cause was three layers of per-page, per-table permissions in the Airtable interface editor that the Create job page had and the Quote-to-job page did not. None of these settings are part of the extension source, none copy between pages, and the SDK reported the failures either silently or in a banner that was scrolled out of view.

Fixing required no logic change. The only code changes were diagnostic: an inline error beside the Create button, console logging around the contract step, and a test seed button.

---

## Symptoms

- Clicking **Create N Jobs** created the jobs, BOMs and BOM resource lines correctly, linked to the HubSpot quote.
- No Subscription Contract record appeared in the Inventory base.
- No error was visible. The rows cleared as if everything had succeeded.
- The same contract form, same resource assignment, same code path on the Create job page produced a contract linked to its BOM line.

After the first fix, a new partial symptom appeared: the contract was created but its BOM resources and Customer links were empty.

---

## Timeline

| Trial | Page | Result | Finding |
|---|---|---|---|
| 1 | Quote-to-job | Job + BOM created, no contract | Contract prefilled with the wrong customer ID (see Open items). No error seen. |
| 2 | Quote-to-job | Same | Customer chosen from the dropdown this time. Rules out the prefill as the sole cause. |
| 3 | Create job | Contract created and linked | Proves the SDK write works and the code is not the difference. |
| — | Both pages, editor | Table and field visibility compared | Quote-to-job was missing the `Customer (from Inventory base)` table and had `Start date` hidden on `Subscription contracts`. Fixed by the user. |
| 4 | Quote-to-job | Still no contract | Config visibility alone did not fix it. |
| 5 | Quote-to-job, with inline error | Error finally visible | `You can't create records in 'Subscription contracts' because it is not set to allow record creation.` |
| — | Editor | Per-table User actions compared | `Add records inline` was off for `Subscription contracts`, greyed out because `Edit records inline` was also off. Fixed by the user. |
| 6 | Quote-to-job | Contract created, links empty | `Edit` and `Add` still off for `Quotes` and `Customer (from Inventory base)`. |
| — | Editor | Toggles matched to Create job and published | |
| 7 | Quote-to-job | Contract created and linked to BOM lines | Resolved. |

---

## Root cause

An interface custom extension can only read and write what the **page** exposes. Three independent settings, all under *Page › Custom* in the editor's right panel, must be correct for every table the code touches. The Quote-to-job page was missing all three for the contracts step.

### 1. Table not enabled

*Data › Table* lists every table in the base with an eye icon. A table that is not enabled is invisible to the SDK. `base.getTableByIdIfExists('tbl8uHwls1HZbjYun')` returns `null`, and the original code wrapped the whole contract step in `if (cTable) { ... }`, so it skipped silently.

The `Customer (from Inventory base)` table, which the contract's Customer field links into, was also not enabled.

### 2. Fields hidden

*Data › Fields* controls, per table, which fields the page can read and write. On the Quote-to-job page, `Subscription contracts` had nine fields hidden, one of which, `Start date`, the code writes on every contract.

### 3. Edit and Add records inline off per table

Under *User actions*, both `Edit records inline` and `Add records inline` have a gear icon that opens a per-table list. These are the permissions that gate SDK writes:

- `Add` off for a table → `createRecordAsync` throws *"not set to allow record creation"*.
- `Edit` off for a table → the page cannot write to records in that table. A linked-record field writes its reverse side on the target table, so `Edit` must be on for the **link target** too. With `Edit` off for `Customer (from Inventory base)`, the create went through but the link fields were dropped, producing a contract with no BOM lines and no customer.
- `Add` is greyed out until `Edit` is on for the same table. The tooltip reads *"Inline record editing is disabled for this table."*

The Create job page had every one of its eleven tables switched on for both. The Quote-to-job page was configured later with a different starting set and these were never switched on for the contracts-related tables.

---

## Why it took seven trials

1. **Silent skip in code.** The null-table guard turned a configuration error into a no-op.
2. **Error banner out of view.** When the SDK did throw, the message rendered at the top of the detail panel body. During bulk creation the user is scrolled to the table at the bottom, behind an 800px spacer, so the banner was never seen.
3. **Partial writes.** Airtable applied the record but dropped the fields it could not write, so the second failure mode looked like success with missing data rather than a failure.
4. **Settings live in three places.** Table visibility, field visibility and per-table user actions are separate panels. Fixing one at a time, each fix changed the symptom without resolving it.
5. **Console not reachable from outside.** The extension runs in a cross-origin iframe. Browser automation on the parent page cannot read its console, so the inline error text was the only observable signal.

---

## Resolution

All on the Quote-to-job page, in the interface editor, then **Publish**:

1. *Data › Table*: enable `Subscription contracts` and `Customer (from Inventory base)`.
2. *Data › Fields* → `Subscription contracts` → **Show all**.
3. *User actions › Edit records inline* (gear): switch on `Subscription contracts`, `Quotes`, `Customer (from Inventory base)`.
4. *User actions › Add records inline* (gear): switch on the same three.

The code change that mattered for diagnosis, kept in the extension:

- The creation error is now rendered beside the Create button as well as at the top of the panel.
- The contract step logs its inputs, the table lookup, each payload and each new record ID to the console under `[QuoteStaging]`, and throws a clear message if the table lookup is null instead of skipping.

---

## Lessons learned

**Configuration is part of the deployment.** An extension's `.tsx` is only half of what makes a page work. The other half is the page's data and permission settings, which are not versioned, not visible in code review, and not copied when the same code is pasted into a second page. Any handover that includes an extension must include its page configuration.

**Never guard a write with a silent `if`.** `if (table) { create }` hides a misconfiguration as a success. Throw, or at least log, when a required table or field is missing.

**Put errors where the user is looking.** A banner at the top of a long scrolling panel is invisible during a bottom-of-page action. Render errors adjacent to the button that triggered them.

**Compare the working page before reading code.** When identical code behaves differently on two pages, the difference is in the page. Checking the three panels first would have saved four trials.

**Link targets need write permission too.** Setting a linked-record field is a write on both tables. Enable `Edit records inline` for every table a link points at, not only the table receiving the record.

**Edit before Add.** The per-table `Add` toggle is disabled until `Edit` is on. If `Add` looks greyed out, that is why.

**Airtable drops, it does not always fail.** A create with some disallowed link fields can succeed with those fields empty. Treat "record exists but is missing links" as a permission problem first.

---

## Checklist for any extension that writes records

For **every** table the code reads or writes, including tables reached only through linked-record fields:

- [ ] *Data › Table*: the table is enabled.
- [ ] *Data › Fields*: every field the code reads or writes is visible. Use **Show all** unless there is a reason not to.
- [ ] *User actions › Edit records inline* (gear): on for the table.
- [ ] *User actions › Add records inline* (gear): on for the table, if the code creates records in it.
- [ ] *Custom properties*: every `useCustomProperties` slot is bound.
- [ ] **Publish** after changing any of the above.

When a write works on one page and not another, diff these panels on both pages before touching code.

---

## Open items

- **Customer prefill uses the wrong table.** The contract form prefills Customer from the quote's `Customer (AT)` link, which is a record in the Jobs base `Customers` table. The contract's Customer field links to the Inventory base customers table (the dropdown's source). A contract saved with the prefill carries a record ID from the wrong table. The seed button avoids this by resolving the customer against the dropdown list by name; the form itself still needs the same fix.
- **Same silent guard in the Create job extension.** `create-job-combined.tsx` has the identical `if (cTable)` skip in both its single and bulk paths. It works today only because that page is fully configured. The same loud-failure change should be applied there.
- **Test records to clean up.** Trials created jobs JOB-00007068 through JOB-00007079 (approximately) against the Coffee Academics 2026 quote and a QSA KFC test location, plus BOMs, BOM resource lines and at least one Subscription Contract (CON-002357 and later). Detach or delete as appropriate.
- **Seed test data button.** Still in the extension, visible to all users of the page. Decide whether to keep it behind a flag, remove it, or leave it.
- **Console logging.** The `[QuoteStaging]` logs are harmless but noisy. Remove once the flow has been stable for a few real quotes.
