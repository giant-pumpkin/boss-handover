# Deprecated pipelines

| What | Was | Retired | Why | Anything left to clean up |
| --- | --- | --- | --- | --- |
| Coupler.io | Airtable → Sheets connector | <!-- date --> | replaced by `*-to-sheets.py` | cancel subscription? |
| [`airtable-to-supabase-sync/`](airtable-to-supabase-sync/) | webhook-driven mirror of Subscriptions + Tickets into Supabase data-pipeline | 2026-10 | abandoned | n8n workflows and both webhooks deleted 2026-10-26; still to drop the mirror tables ([02-airtable/webhooks.md](../../02-airtable/webhooks.md)) |
| n8n bulk-pull workflows | periodic full pulls of Airtable tables into Supabase | | replaced by the webhook sync, itself now abandoned | workflows still exist, disabled; delete |
| cms-scraper / dp-scraper **on GitHub Actions** | scheduled Actions runs with secrets in the repo settings | 2026-08 | unreliable | the scrapers themselves are live, now run on the droplet by n8n ([../cms-scraper/](../cms-scraper/), [../dp-scraper/](../dp-scraper/)); disable the Actions workflows and remove the repo secrets |
| Airtable automation quote sync | HubSpot → HS - Quotes inside Airtable | | 50-fetch limit; replaced by Python | automation should be off |
