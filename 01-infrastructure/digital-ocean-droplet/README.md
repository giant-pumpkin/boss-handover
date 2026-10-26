# Droplet: watermelon

| | |
| --- | --- |
| Provider | DigitalOcean |
| Region | sgp1 |
| Size | 2 vCPU / 4 GB <!-- TODO confirm --> |
| OS | <!-- TODO --> |
| Hostname / IP | <!-- TODO --> |
| DO project / team | <!-- TODO --> |
| Billing owner | <!-- TODO --> |

## Access

- SSH as `root` with key auth only <!-- TODO: confirm; list which public keys are in authorized_keys -->
- Successor's key must be added **before** mine is removed. See [HANDOFF-CHECKLIST.md](../../HANDOFF-CHECKLIST.md).

## What runs here

See [docker-services.md](docker-services.md) for the containers and [nginx.md](nginx.md) for the domain map.

Non-container things:

| Path | What | Scheduled by |
| --- | --- | --- |
| `/root/sync_scripts/` | Python sync scripts (Airtable ↔ Supabase, to-Sheets) | cron and/or n8n Execute Command nodes |
| `~/.secrets` | exported env vars sourced by scripts | — |

<!-- TODO: `crontab -l` output (with no secrets) pasted here -->

## Files in this folder

- [docker-services.md](docker-services.md) — containers, compose file paths, volumes, restart procedure
- [nginx.md](nginx.md) — domain → service map, TLS cert renewal
- [secrets-and-env.md](secrets-and-env.md) — variable names and where the values live
- [rebuild-from-scratch.md](rebuild-from-scratch.md) — snapshots and how to stand it back up
