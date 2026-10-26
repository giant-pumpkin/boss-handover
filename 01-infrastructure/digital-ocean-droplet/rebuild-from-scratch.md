# Rebuilding the droplet

## Snapshots

<!-- TODO: are DO snapshots/backups enabled? Weekly? Name of latest snapshot. -->

## From a snapshot

1. DO console → Images → Snapshots → Create droplet from snapshot (same region sgp1).
2. Re-point DNS A records to the new IP.
3. `docker compose up -d` in each compose folder.
4. Re-create `~/.secrets` from the vault.
5. Re-enable cron (`crontab -e`) from [README.md](README.md).

## From nothing

1. Ubuntu LTS droplet, 2 vCPU / 4 GB, sgp1, SSH key only.
2. Install Docker + compose plugin, nginx, certbot, python3 + venv.
3. Clone this repo; copy `03-data-pipelines/**/*.py` into `/root/sync_scripts/`.
4. Restore n8n: import every JSON in [../n8n/workflows/](../n8n/workflows/), re-enter credentials by hand (exports never contain them).
