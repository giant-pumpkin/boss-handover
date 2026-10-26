# Interface extension blank or erroring

1. Open the extension in edit mode; the console in the code editor shows the error.
2. `useRecords(null)` crash → a table was removed from the extension's settings panel; re-add it.
3. 401/403 from REST → the hard-coded PAT was rotated; update `AIRTABLE_PAT` in the file.
4. Linked-record write "fails silently" → wrong format (`["recX"]` for REST, `[{id}]` for SDK).
5. Source of truth for the code: [02-airtable/interface-extensions](../../02-airtable/interface-extensions/).
