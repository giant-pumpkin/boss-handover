# Droplet down / n8n unreachable

1. DO console → droplet → is it running? Console access works without SSH.
2. SSH in; `docker ps`; `docker compose up -d` in the compose folder.
3. nginx: `systemctl status nginx`; cert expired? `certbot renew`.
4. Disk full is the usual cause: `df -h`, `docker system prune`.
5. Unrecoverable → [rebuild-from-scratch.md](../../01-infrastructure/digital-ocean-droplet/rebuild-from-scratch.md).
