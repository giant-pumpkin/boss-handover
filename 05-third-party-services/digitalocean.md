# DigitalOcean

| | |
| --- | --- |
| What we use it for | one droplet, "Watermelon", hosting n8n, the sync scripts and the ConnectIQ docs site |
| URL | https://cloud.digitalocean.com |
| Resources | droplet ID 586338574, `Watermelon-ubuntu-sgp1`, sgp1, 2 vCPU / 4 GB / 80 GB, IPv4 168.144.43.182 |
| Plan / cost | <!-- TODO: ~USD 24/mo for this size; confirm invoice --> |
| Admin account (email) | <!-- TODO --> |
| Team | <!-- TODO --> |
| Billing | <!-- TODO --> |
| Backups | <!-- TODO: on/off --> |
| Support contact | DO support tickets from the panel |

## Where it is wired in

- DNS A records `n8n.giant-pumpkin.com` and `connectiq-docs.giant-pumpkin.com` → the droplet IP
- GitHub Actions in `connectiq-docs` deploys to it
- All n8n schedules and every Airtable → Sheets export depend on it

Full inventory: [01-infrastructure/digital-ocean-droplet/](../01-infrastructure/digital-ocean-droplet/).

## What breaks if it is cancelled

HS - Quotes stops updating, every Sheets-backed dashboard freezes, the ConnectIQ docs site goes down.
