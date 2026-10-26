# airtable-to-supabase-sync

Mirrors the Subscriptions (Inventory base) and Tickets (Tickets base) tables into the Supabase data-pipeline project, driven by Airtable webhooks.

| | |
| --- | --- |
| Scripts | `reconcile_subscriptions.py`, `reconcile_tickets.py` (from `~/coding/at-supabase-reconciliation`); live sync on droplet `/root/sync_scripts/` <!-- TODO names --> |
| Trigger | Airtable webhook → <!-- n8n webhook node / HTTP endpoint --> |
| Env | `AT_PAT`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` |

## Flow

```
Airtable table change → webhook notification → fetch payloads since cursor → upsert rows keyed on Airtable record id
```

## Known weaknesses (open)

1. **Webhook expiry.** Refresh must happen weekly or the mirror goes stale silently. See [02-airtable/webhooks.md](../../02-airtable/webhooks.md).
2. **Cursor handling.** <!-- TODO: where the cursor is stored, what happens on restart -->
3. **409 on upsert.** <!-- TODO: cause and the pending fix -->
4. **No reconciliation job.** `reconcile_*.py` were written to diff Airtable vs Supabase and fix drift; not scheduled.

## Re-run / full reload

```bash
source ~/.secrets && python reconcile_subscriptions.py && python reconcile_tickets.py
```
