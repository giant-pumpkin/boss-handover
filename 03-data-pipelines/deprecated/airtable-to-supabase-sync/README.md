# airtable-to-supabase-sync (abandoned)

**Abandoned 2026-10.** Kept for reference only. The n8n workflows and the Airtable webhooks `achTRaF6zyL0VZOjf` and `achhqSolaET3Br1hH` were deleted on 2026-10-26. Still to do: drop the mirror tables in the Supabase data-pipeline project `odpdnucjvgingrrwaaiv`: `public."inventory.subscriptions"` (10,579 rows), `public."tickets.tickets"` (20,918), `public."jobs.jobs"` (0, never used) and `public.sync_cursors` (3 rows, the webhook cursors). Clean-up steps: [02-airtable/webhooks.md](../../../02-airtable/webhooks.md).

What it did: mirrored the Subscriptions (Inventory base) and Tickets (Tickets base) tables into the Supabase data-pipeline project, driven by Airtable webhooks.

| | |
| --- | --- |
| Scripts | `reconcile_subscriptions.py`, `reconcile_tickets.py` (from `~/coding/at-supabase-reconciliation`); live sync on droplet `/root/sync_scripts/` <!-- TODO names --> |
| Trigger | Airtable webhooks `achTRaF6zyL0VZOjf` (Subscriptions) and `achhqSolaET3Br1hH` (Tickets) → n8n webhook nodes `/webhook/airtable-inventory` and `/webhook/airtable-tickets` on `n8n.giant-pumpkin.com` |
| Env | `AT_PAT`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` |

## Flow

```
Airtable table change → webhook notification → fetch payloads since cursor → upsert rows keyed on Airtable record id
```

## Why it was abandoned

<!-- TODO: one or two sentences -->

## Known weaknesses at the time

1. **Webhook expiry.** Refresh had to happen weekly or the mirror went stale silently.
2. **Cursor handling.** <!-- TODO: where the cursor is stored, what happens on restart -->
3. **409 on upsert.** <!-- TODO: cause and the pending fix -->
4. **No reconciliation job.** `reconcile_*.py` were written to diff Airtable vs Supabase and fix drift; not scheduled.

## Re-run / full reload (historical)

```bash
source ~/.secrets && python reconcile_subscriptions.py && python reconcile_tickets.py
```
