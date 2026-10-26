# Deprecated pipelines

| What | Was | Retired | Why | Anything left to clean up |
| --- | --- | --- | --- | --- |
| Coupler.io | Airtable → Sheets connector | <!-- date --> | replaced by `*-to-sheets.py` | cancel subscription? |
| [`airtable-to-supabase-sync/`](airtable-to-supabase-sync/) | webhook-driven mirror of Subscriptions + Tickets into Supabase data-pipeline | 2026-10 | abandoned | n8n workflows and both webhooks deleted 2026-10-26; still to drop the mirror tables ([02-airtable/webhooks.md](../../02-airtable/webhooks.md)) |
| n8n bulk-pull workflows | periodic full pulls of Airtable tables into Supabase | | replaced by the webhook sync, itself now abandoned | workflows still exist, disabled; delete |
| `cms-scraper/` | GitHub Actions scraper of CMS Asia player/location lists into Sheets/Airtable | <!-- date --> | unreliable, abandoned | GitHub repo + Actions secrets can be deleted; superseded by the IXM Aqua API ([../cms-player-exports/](../cms-player-exports/)) |
| `dp-scraper/` | GitHub Actions scraper of Display Player info | <!-- date --> | unreliable, abandoned | same |
| Airtable automation quote sync | HubSpot → HS - Quotes inside Airtable | | 50-fetch limit; replaced by Python | automation should be off |
