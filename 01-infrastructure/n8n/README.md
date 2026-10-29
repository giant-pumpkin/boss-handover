# n8n

| | |
| --- | --- |
| URL | https://n8n.giant-pumpkin.com (also reachable on `http://168.144.43.182:5678`, see open items) |
| Version | 2.32.7, image `n8nio/n8n` untagged |
| Runs on | Watermelon droplet, Docker Compose, SQLite storage |
| Owner account | <!-- TODO: email --> |
| Timezone | Asia/Bangkok (`GENERIC_TIMEZONE`), so all schedules below are Bangkok time |
| Execution history | kept 30 days, max 2,000 runs |

## What it is for today

n8n is **the scheduler for the Python scripts on the droplet**. Each active workflow is the same five-node shape: Schedule → SSH node (runs a script as root on the same box) → If exit code ≠ 0 → Slack message; plus an Error Trigger that also posts to Slack. Since 2026-10-29 each error branch has two Slack nodes, one DM to me and one to Sky (`U08NHRWAPSB`). Nothing else is active. The JSON exports in [workflows/](workflows/) predate the second node.

## Files

- [workflow-catalog.md](workflow-catalog.md) — all 27 workflows: 6 active, 21 archived, with schedules and commands
- [workflows/](workflows/) — JSON export of every workflow, 2026-10-26, named `<state>__<name>__<id>.json`. Two archived ones had an Airtable PAT inside an HTTP node; it is replaced by `<AIRTABLE_PAT_REDACTED>`.
- [gotchas.md](gotchas.md)

## Credentials stored in n8n

Eight; names and IDs in [../digital-ocean-droplet/secrets-and-env.md](../digital-ocean-droplet/secrets-and-env.md). Only the SSH key and the Slack token are used by active workflows.

## Re-export

```bash
docker exec n8n-n8n-1 n8n export:workflow --all --pretty > /root/n8n-export/all-$(date +%F).json
```

The first line of that output is a log message, not JSON; strip it before parsing.
