# DigitalOcean droplet "Watermelon"

Inspected 2026-10-26 over SSH, read-only. Everything below was observed, not remembered.

| | |
| --- | --- |
| DO droplet name / hostname | `Watermelon-ubuntu-sgp1` |
| DO droplet ID | 586338574 |
| Region | `sgp1` (Singapore) |
| Public IPv4 | `168.144.43.182` |
| Private / VPC IPs | `10.15.0.5`, `10.104.0.3` |
| Size | 2 vCPU (DO-Regular @ 2.0 GHz), 3.8 GB RAM, **no swap**, 80 GB disk (`/dev/vda1`, 8.2 GB used, 11%) |
| OS | Ubuntu 24.04.4 LTS (Noble), kernel 6.8.0-137-generic |
| Uptime at inspection | 79 days (last reboot ≈ 2026-08-07, which matches the rebuild date in shell history) |
| Load | ~0.1; the box is idle most of the time |
| Unattended upgrades | on (`APT::Periodic::Unattended-Upgrade "1"`) |
| DO agent | `droplet-agent` active (console access from the DO panel works) |
| DO backups / snapshots | **unknown from inside the box** <!-- TODO: check DO panel → Backups; enable weekly if off --> |
| DO team / billing owner | <!-- TODO --> |

## What runs here

| Service | How | Reached at | Doc |
| --- | --- | --- | --- |
| n8n 2.32.7 | Docker Compose in `/root/n8n` | https://n8n.giant-pumpkin.com via nginx, **and directly on `:5678` from the internet** | [../n8n/](../n8n/) |
| ConnectIQ docs site | static files in `/var/www/connectiq`, pushed by GitHub Actions over rrsync | https://connectiq-docs.giant-pumpkin.com, and as the default site on port 80 | [nginx.md](nginx.md) |
| Sync scripts (HubSpot sync, 3× to-Sheets, CMS scraper, DP scraper) | Python venvs in `/root/sync_scripts/*`, **run by n8n SSH nodes**, not cron | — | [../../03-data-pipelines/](../../03-data-pipelines/) |
| nginx 1.24 + certbot | system packages | ports 80/443 | [nginx.md](nginx.md) |

There is **no root crontab**. The `cron.log` files in each script folder stopped on 2026-08-07, the day scheduling moved into n8n.

## Users and access

| User | Purpose | Auth |
| --- | --- | --- |
| `root` | everything | SSH key only (`PasswordAuthentication no`, `PermitRootLogin yes`). One key in `authorized_keys`, comment `droplet-new`. The same private key is stored inside n8n as the credential "Pitchayut's Droplet Private Key" so SSH nodes can run the scripts. |
| `deploy` | GitHub Actions deploy of the ConnectIQ docs | forced-command key `github-actions-deploy-connectiq`: `rrsync -wo /var/www/connectiq`, no pty, no forwarding. Can only write that folder. |

`ssh droplet` from my Mac works through an entry in `~/.ssh/config`. <!-- TODO: paste the Host block (no key material) -->

**Firewall:** `ufw` is inactive. Open ports: 22, 80, 443, 5678 (n8n direct, bypasses nginx). Accepted as-is on 2026-10-26: the n8n login is the control.

## Directory map

```
/root
├── .secrets              exports AT_PAT, GOOGLE_CREDS_JSON — sourced by .bashrc/.zshrc
├── n8n/
│   ├── docker-compose.yml       the only compose file on the box (see docker-services.md)
│   └── docker-compose.yml.save  editor backup, can go
├── n8n-export/           28 workflow JSONs exported 2026-08-31 (encrypted creds, safe)
├── n8n-creds/            8 credential exports 2026-08-31, data still encrypted
├── n8n-config-backup     56-byte JSON = the n8n encryption key file copy
└── sync_scripts/
    ├── hubspot-to-airtable-sync/   main.py, venv, cron.log (stale)
    ├── airtable-to-sheets/         jobs-, tickets-, hs-quotes-to-sheets.py, venv
    ├── cms-scraper/                scraper.py, run_cron.sh (old), venv
    └── dp-scraper/                 dp_scraper.py, venv
/var/www/connectiq        ConnectIQ docs site, owned by deploy, last push 2026-10-26 02:36
/var/lib/docker/volumes/n8n_n8n_data/_data   n8n SQLite DB (49 MB), event logs, backup/ restore/ creds/ copies
/etc/nginx/sites-enabled  connectiq, connectiq-docs, n8n
/etc/letsencrypt/live     n8n.giant-pumpkin.com, connectiq-docs.giant-pumpkin.com
```

The copies of the repo scripts here are the ones that actually run; the repo copies in `03-data-pipelines` came from my Mac. <!-- TODO: diff them -->

## Housekeeping observed

- Docker images 2.76 GB (3 images, 194 MB reclaimable), journal 1.0 GB.
- A `n8n-caddy-1` container exists in state *Created* since 2026-08-07 and has never run: a leftover from a Caddy attempt before nginx. Safe to remove.
- Last interactive root logins: 2026-10-16 (me), 2026-10-05, 2026-09-30.

## Files in this folder

- [docker-services.md](docker-services.md) — the compose file explained, volumes, restart and upgrade
- [nginx.md](nginx.md) — the three sites, TLS, the GitHub Actions deploy path
- [secrets-and-env.md](secrets-and-env.md) — every variable and credential name and where it lives
- [rebuild-from-scratch.md](rebuild-from-scratch.md) — what you need to stand this box up again
