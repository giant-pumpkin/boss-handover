# HS - Quotes not updating

1. Check the last run log on the droplet <!-- path -->.
2. 401 → HubSpot token rotated/expired; update `~/.secrets`.
3. 429 storms → wait; throttler should recover.
4. Airtable 422 on upsert → a quote with a bad field value; the per-record retry logs which one.
5. Run by hand: `source ~/.secrets && python main.py`.
