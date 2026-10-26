# Docker services on watermelon

<!-- TODO: paste `docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'` -->

| Container | Image | Compose file | Volumes | Ports |
| --- | --- | --- | --- | --- |
| n8n | n8nio/n8n:<ver> | `/root/n8n/docker-compose.yml` | `n8n_data` | 5678 (behind nginx) |
| | | | | |

## Restart procedure

```bash
cd /root/n8n && docker compose pull && docker compose up -d
```

## Logs

```bash
docker logs -f n8n --tail 200
```

## Upgrade notes

<!-- TODO: n8n version pinning, anything that broke on past upgrades -->
