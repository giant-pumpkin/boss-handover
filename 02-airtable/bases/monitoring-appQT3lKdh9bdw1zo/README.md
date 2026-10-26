# Monitoring base (`appQT3lKdh9bdw1zo`)

Device-health view. Everything except `CMS status` is synced in from other bases.

| Table | ID | Notes |
| --- | --- | --- |
| CMS status | `tblNYWtOVRYGzZnj7` | synced from Data › Signage Scraper (filled by `cms-scraper` every 15 min), linked to Inventory by serial every hour by `wflIyWtNIN9eLabPx` |
| Inventory, Subscription contracts | `tblUzyBNnI3JU4z5M`, `tblMnBOv8zi5UuVey` | synced from Inventory base |
| Customers, Locations, Brands, Brand Owners | `tblXHHHjzhIPEAsAc`, `tblITuNdlHo7zofcV`, `tbl0pAi4fZA0XhnGM`, `tblUDdMyIG5CJOEPQ` | synced from Locations base |

Who reads this base and how: <!-- TODO -->

Automations: [automations.md](automations.md). `schema.json` exported 2026-10-26. No webhooks.
