# Rebuilding Watermelon

## First, check DO backups

<!-- TODO: DO panel → this droplet → Backups. If weekly backups are on, "Restore from backup" is the whole procedure. If not, turn them on now (≈ 20% of droplet price). -->

## From a snapshot or backup

1. DO → Images → Snapshots/Backups → Create droplet, same region `sgp1`, same or bigger size.
2. Either keep the old IP by moving a Reserved IP, or update the two A records (`n8n`, `connectiq-docs`) to the new IPv4.
3. SSH in; `cd /root/n8n && docker compose up -d`; `systemctl status nginx`.
4. `certbot renew --dry-run` to confirm TLS still works on the new IP.
5. Re-add the successor's key to `/root/.ssh/authorized_keys` if it was not in the image.

## From nothing (≈ 1 hour)

1. **Droplet:** Ubuntu 24.04 LTS, 2 vCPU / 4 GB, `sgp1`, SSH key auth. Point DNS at it.
2. **Packages:** `apt install docker.io docker-compose-v2 nginx certbot python3-certbot-nginx python3-venv rrsync git`.
3. **n8n:** recreate `/root/n8n/docker-compose.yml` from [docker-services.md](docker-services.md), with the **same `N8N_ENCRYPTION_KEY`** from the vault, then `docker compose up -d`. Create the owner account on first visit, then import workflows: copy the JSONs from [../n8n/workflows/](../n8n/workflows/) into the container and run `n8n import:workflow --separate --input=/tmp/wf/`. Re-enter every credential by hand (the exports hold none in the clear). Activate the six "Run …" workflows.
4. **Scripts:** clone this repo; copy `03-data-pipelines/hubspot-to-airtable`, `airtable-to-sheets` (and the scrapers only if you still want them) into `/root/sync_scripts/<name>/`; in each, `python3 -m venv venv && venv/bin/pip install -r requirements.txt`. Recreate `/root/.secrets` with `AT_PAT` and `GOOGLE_CREDS_JSON` and add `source ~/.secrets` to `.bashrc`.
5. **n8n → droplet SSH:** generate a key pair for n8n, add the public half to `/root/.ssh/authorized_keys`, store the private half as the n8n SSH credential, and point the six SSH nodes at it.
6. **nginx:** recreate the three site files from [nginx.md](nginx.md), `ln -s` into `sites-enabled`, `nginx -t && systemctl reload nginx`, then `certbot --nginx -d n8n.giant-pumpkin.com -d connectiq-docs.giant-pumpkin.com`.
7. **Docs deploy:** `adduser deploy`, create `/var/www/connectiq` owned by deploy, add the GitHub Actions public key with the forced command `command="/usr/bin/rrsync -wo /var/www/connectiq",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty`. Re-run the Action in `connectiq-docs`.
8. **Optional:** pin the n8n image tag; enable DO backups. (Firewall and port binding were deliberately left open on the old box.)
