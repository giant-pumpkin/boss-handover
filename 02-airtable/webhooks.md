# Airtable webhooks

Airtable webhooks **expire after 7 days unless refreshed**. If the refresh lapses, the Supabase mirror silently stops updating. This is the single most fragile thing in the stack.

| Webhook ID | Base | Watches | Notification URL (consumer) | Refreshed by | Status |
| --- | --- | --- | --- | --- | --- |
| <!-- ach… --> | Inventory | Subscriptions table changes | droplet → airtable-to-supabase-sync | <!-- n8n workflow / cron --> | active |
| | Tickets | Tickets table changes | droplet → airtable-to-supabase-sync | | active |

## Refresh

```bash
curl -X POST "https://api.airtable.com/v0/bases/<baseId>/webhooks/<webhookId>/refresh" -H "Authorization: Bearer $AT_PAT"
```

<!-- TODO: which workflow/cron does this today, and how you would notice if it stopped -->

## Listing what exists

```bash
curl -s "https://api.airtable.com/v0/bases/<baseId>/webhooks" -H "Authorization: Bearer $AT_PAT"
```

Related: [03-data-pipelines/airtable-to-supabase-sync](../03-data-pipelines/airtable-to-supabase-sync/), runbook [09-open-items/runbooks/supabase-mirror-stale.md](../09-open-items/runbooks/supabase-mirror-stale.md).
