# 01 — Infrastructure

Everything that runs on a server I set up. Supabase is covered under [05-third-party-services/supabase.md](../05-third-party-services/supabase.md) and the ConnectIQ project under [06-connectiq](../06-connectiq/).

| Component | Doc | Status |
| --- | --- | --- |
| DigitalOcean droplet "Watermelon" (`168.144.43.182`, sgp1) | [digital-ocean-droplet/](digital-ocean-droplet/) | live, inspected 2026-10-26 |
| n8n 2.32.7 (on the droplet) | [n8n/](n8n/) | live, 6 active workflows |
| ConnectIQ docs site (on the droplet) | [digital-ocean-droplet/nginx.md](digital-ocean-droplet/nginx.md) | live, deployed by GitHub Actions |

**If something is down, start here:** [09-open-items/runbooks/](../09-open-items/runbooks/).
