# Monitoring base (`appQT3lKdh9bdw1zo`)

Device-health view. Everything except `CMS status` is synced in from other bases.

| Table | ID | Notes |
| --- | --- | --- |
| CMS status | `tblNYWtOVRYGzZnj7` | synced from Data › Signage Scraper (the abandoned scraper's landing table), linked to Inventory by serial every hour by `wflIyWtNIN9eLabPx` |
| Inventory, Subscription contracts | `tblUzyBNnI3JU4z5M`, `tblMnBOv8zi5UuVey` | synced from Inventory base |
| Customers, Locations, Brands, Brand Owners | `tblXHHHjzhIPEAsAc`, `tblITuNdlHo7zofcV`, `tbl0pAi4fZA0XhnGM`, `tblUDdMyIG5CJOEPQ` | synced from Locations base |

With the signage scraper abandoned, `CMS status` no longer updates. <!-- TODO: is this base still used by anyone, or can it be archived? -->

Automations: [automations.md](automations.md). `schema.json` exported 2026-10-26. No webhooks.
