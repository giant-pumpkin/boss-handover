# Airtable webhooks

**Status 2026-10-26: none.** All four bases have zero webhooks. The two that existed belonged to the abandoned Airtable → Supabase sync and were deleted on 2026-10-26, after their n8n workflows had been removed the same day. See [03-data-pipelines/deprecated/airtable-to-supabase-sync](../03-data-pipelines/deprecated/airtable-to-supabase-sync/).

For the record (raw JSON as it was before deletion is in each base folder as `webhooks.json`):

| Webhook ID | Base | Watched | Posted to |
| --- | --- | --- | --- |
| `achTRaF6zyL0VZOjf` | Inventory `appRor1ipbYAb4K7z` | Subscriptions `tblyNA73D9jldeEir` | `n8n.giant-pumpkin.com/webhook/airtable-inventory` |
| `achhqSolaET3Br1hH` | Tickets `apprGGdynxDTZMZmO` | whole base | `n8n.giant-pumpkin.com/webhook/airtable-tickets` |

## Checking

```bash
curl -s "https://api.airtable.com/v0/bases/<baseId>/webhooks" -H "Authorization: Bearer $AT_PAT"
```

## If a webhook is ever needed again

Airtable webhooks expire 7 days after creation or last refresh (`POST …/webhooks/<id>/refresh`). Whatever consumes one must also refresh it, and someone must be alerted when `expirationTime` gets close or `lastNotificationResult.success` goes false. That fragility is why the Supabase sync was dropped.
