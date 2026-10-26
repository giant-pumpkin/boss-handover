# nginx and domains

| Domain | Proxies to | TLS |
| --- | --- | --- |
| `n8n.giant-pumpkin.com` | 127.0.0.1:5678 | Let's Encrypt via certbot <!-- confirm --> |

Config lives in `/etc/nginx/sites-enabled/`.

## Cert renewal

certbot timer should auto-renew. Check with:

```bash
systemctl status certbot.timer && certbot certificates
```

## DNS

<!-- TODO: where the DNS zone is managed (Cloudflare? DO? registrar?) and who has access -->
