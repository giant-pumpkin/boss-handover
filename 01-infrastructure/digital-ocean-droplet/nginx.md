# nginx and domains

nginx 1.24.0, sites in `/etc/nginx/sites-enabled/` (symlinks to `sites-available/`).

| Site file | server_name | Serves | TLS |
| --- | --- | --- | --- |
| `n8n` | `n8n.giant-pumpkin.com` | reverse proxy → `http://localhost:5678`, websocket upgrade headers set | Let's Encrypt, expires 2027-01-04, auto-renews |
| `connectiq-docs` | `connectiq-docs.giant-pumpkin.com` | static `/var/www/connectiq` | Let's Encrypt, expires 2027-01-08, auto-renews |
| `connectiq` | `_` (default_server on port 80) | the same `/var/www/connectiq` for any other hostname or the bare IP | none |

HTTP → HTTPS redirects are the certbot-managed blocks in each file.

## TLS renewal

Two mechanisms, both present: `certbot.timer` (twice daily, active since 2026-08-07) and `/etc/cron.d/certbot` (every 12 h, only runs when systemd is absent, so effectively inert). Check with:

```bash
certbot certificates
systemctl list-timers certbot.timer
```

## DNS

`giant-pumpkin.com` zone: <!-- TODO: where it is hosted (registrar? Cloudflare? DO DNS?) and who can edit. The two A records above point at 168.144.43.182. -->

## ConnectIQ docs deploy path

GitHub Actions in the `giant-pumpkin/connectiq-docs` repo rsyncs the built site over SSH as user `deploy`. The key's forced command `rrsync -wo /var/www/connectiq` means it can write only that folder. Last deploy observed 2026-10-26 02:36 UTC from a GitHub runner. Nothing on this box builds anything; a broken docs site is fixed by re-running the Action.
