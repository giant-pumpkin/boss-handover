# n8n gotchas

- **SSH node, not Execute Command.** n8n runs in Docker and cannot see the host, so every script runs through an SSH node back into the same droplet as root, using the "Pitchayut's Droplet Private Key" credential. Execute Command would run *inside the container* where none of the venvs exist.
- **The SSH session has no env vars.** Commands that need `AT_PAT` or `GOOGLE_CREDS_JSON` must start with `source ~/.secrets &&`. The three to-sheets workflows do; the HubSpot sync and scrapers do not (they do not need those two).
- **Working directory** is set per SSH node (`cd` is not needed); the command is `venv/bin/python3 <script>` relative to `/root/sync_scripts/<folder>`.
- **Exports contain no credentials.** After an import, open each SSH and Slack node and reselect the credential.
- **The export command prints a log line first** ("Error tracking disabled because this release is older than 6 weeks") before the JSON array.
- **Schedules are Bangkok time** because of `GENERIC_TIMEZONE`; cron expressions in the catalog are local.
- **Webhook URLs** derive from `WEBHOOK_URL=https://n8n.giant-pumpkin.com/`. Changing the domain changes every webhook path consumers must call.
- **Image tag is unpinned**; see docker-services.md before running `docker compose pull`.
- Archived workflows still count as registered and still exist in the DB; only deleting removes them.
