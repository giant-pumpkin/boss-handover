# Supabase mirror stale

**Symptom:** rows in the data-pipeline project stop changing; dashboards built on it lag.

1. List webhooks: `curl -s https://api.airtable.com/v0/bases/<baseId>/webhooks -H "Authorization: Bearer $AT_PAT"`. Check `expirationTime` and `isHookEnabled`.
2. Expired → refresh (`POST …/webhooks/<id>/refresh`) or re-create with the same notification URL; then run the reconcile scripts for a full reload.
3. Not expired → check the receiver on the droplet (n8n execution log / script log) for errors; check the cursor.
4. Fix the refresh automation so it does not lapse again.
