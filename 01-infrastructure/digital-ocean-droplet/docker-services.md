# Docker on Watermelon

Docker 29.7.1, Compose v5.4.0. One compose project, `/root/n8n/docker-compose.yml`.

| Container | Image | State | Ports | Restart | Volume |
| --- | --- | --- | --- | --- | --- |
| `n8n-n8n-1` | `n8nio/n8n` (untagged = latest at pull time; running 2.32.7) | Up 7 weeks | `0.0.0.0:5678->5678` | always | `n8n_n8n_data` → `/home/node/.n8n` |
| `n8n-caddy-1` | `caddy:2` | Created, never started | — | — | `n8n_caddy_data` (unused) |

## The compose file (values redacted)

```yaml
services:
  n8n:
    image: n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=n8n.giant-pumpkin.com
      - N8N_PROTOCOL=https
      - GENERIC_TIMEZONE=<Asia/Bangkok>
      - TZ=<Asia/Bangkok>
      - N8N_SECURE_COOKIE=true
      - NODES_EXCLUDE=[]
      - WEBHOOK_URL=https://n8n.giant-pumpkin.com/
      - N8N_ENCRYPTION_KEY=<SECRET — see secrets-and-env.md>
      - EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
      - EXECUTIONS_DATA_SAVE_ON_ERROR=all
      - EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=true
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=720        # hours = 30 days
      - EXECUTIONS_DATA_PRUNE_MAX_COUNT=2000
    volumes:
      - n8n_data:/home/node/.n8n
volumes:
  n8n_data:
```

Notes:

- The image tag is not pinned. `docker compose pull` will jump to whatever n8n is current; n8n major upgrades have broken workflows before. Pin to `n8nio/n8n:2.32.7` before handing over. <!-- TODO -->
- `N8N_ENCRYPTION_KEY` is what makes the stored credentials readable. Lose it and every credential in the SQLite DB is garbage. There is a copy in `/root/n8n-config-backup` and inside the volume at `/home/node/.n8n/config`.
- n8n uses SQLite (`database.sqlite`, 49 MB) in the volume. No Postgres.
- Port 5678 is published on all interfaces, so n8n is reachable without nginx. Accepted risk (2026-10-26); `127.0.0.1:5678:5678` would close it if that ever changes.

## Day-to-day

```bash
cd /root/n8n
docker compose ps
docker compose logs --tail=100 n8n
docker compose restart n8n
```

## Upgrade

```bash
cd /root/n8n
docker compose pull && docker compose up -d
docker image prune -f
```

Before upgrading: export workflows (`docker exec n8n-n8n-1 n8n export:workflow --all --pretty > /root/n8n-export/all-$(date +%F).json`) and check the n8n release notes for breaking changes.

## Backups of n8n itself

Nothing automatic. `/root/n8n-export` and `/root/n8n-creds` are one-off exports from 2026-08-31. The repo now holds redacted exports of all 27 workflows at [../n8n/workflows/](../n8n/workflows/) (2026-10-26). A real backup = DO droplet snapshot, or copying `/var/lib/docker/volumes/n8n_n8n_data/_data` plus the encryption key.
