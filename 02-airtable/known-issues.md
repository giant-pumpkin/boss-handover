# Known issues in Airtable

| Issue | Where | Impact | Workaround |
| --- | --- | --- | --- |
| Contract `Customer` field links to the new customer table (`tblBjI9HEpZz8lFmY`) but Location `Customer` (`fld50gjrLkGm9UAWa`) still links to the old one (`tblhzcjYQk0NJCv9v`) | Jobs base | Cannot prefill customer by record id | Extensions match by **name** |
| SDK `createRecordAsync` only queues locally; ~80% success in a 10-job test | interface extensions | lost records | REST API for creates on non-synced tables |
| Freshdesk API key hard-coded in automation script | Tickets base, `wfluuR1cEWU3jmbW7` | secret exposure | rotate at handoff, move to a secret |
| Location/dedupe lookups use "contains" | Tickets ingest automation | KFC store codes match Jollibee `JB-xxxx` ids | exact match needed |
| ~30% of ingested ticket records are deleted ITSM notification emails | Tickets ingest | noise | filter on subject/sender |
| `Job locations.Ma - Package` returns 403 on API write | Jobs base | only the Add-new automation can write it | use the automation |
| `Ma - Cycles` on packages rolls up via locations, so it is misleading | Jobs base | wrong reading of what a package covers | look at items, not the package rollup |
| `Installed` status name | Jobs base | misleading for non-install jobs | rename when ConnectIQ takes over |
| `Resources` is the products table | Inventory base | confusing name | documented in GLOSSARY |
| Three record types in one inventory table <!-- TODO describe --> | Inventory base | | |
| Ingest matches serials with `contains` on the 14-char form, so near-identical serials all get updated and each spawns a subscription | Inventory base `wfl1YUiIjdVT3b66E` | duplicate billing rows | exact match on `SN - Normalised`, assert one result |
| 14/15-character serial rule lives in three places (availability script, ingest script, `SN - Normalised`) | Jobs + Inventory bases | drift | one formula, scripts read it |
| Cross-base webhook sends display strings, and Airtable link-by-name **creates a new record** on no exact match | Jobs → Inventory | phantom Locations and Contracts after any rename | send record IDs |
| Only the empty-start-date branch alerts; other guard failures are silent | `wflzWWNSCGdhtHrbv` | installed, never billed, no signal (~1,003 CMS devices without a subscription row) | Slack on every drop branch |
| Idempotency guard blocks a legitimate second subscription on one item (signage + music on one screen) | `wflzWWNSCGdhtHrbv` | | key on item + contract + type |
| `Location - Current` on subscriptions follows the hardware; swaps rewrite history | Inventory base | | use `Service location` |
| Software-only and delivery-fee-only quotes never match the Quote Staging filter | Quotes-to-Job | stranded, no job, no subscription | |
