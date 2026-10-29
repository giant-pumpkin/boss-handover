# n8n workflow catalog (2026-10-26)

Times are Asia/Bangkok. All active workflows SSH into the droplet as root and run a script in `/root/sync_scripts/<folder>/`; failures post to Slack via the "n8n integration Auth" credential, as DMs to me and (since 2026-10-29) Sky.

## Active (6)

| ID | Workflow | Schedule | Command (in its folder) | Feeds | Status / notes |
| --- | --- | --- | --- | --- | --- |
| `BDRzM0LzjYKpuHYq` | Run hubspot-to-airtable-sync | `8,23,38,53 * * * *` | `venv/bin/python3 main.py` | HS - Quotes | live; the Airtable automation `Sync HS Quotes` also runs every 15 min, see open items |
| `oUoiyjdQie0QTVf1` | Run jobs-to-sheets.py | every 15 min | `source ~/.secrets && venv/bin/python3 jobs-to-sheets.py` | Sheets | live |
| `F8zOykA7keVegumT` | Run tickets-to-sheets.py | every 15 min | `source ~/.secrets && venv/bin/python3 tickets-to-sheets.py` | Sheets | live |
| `U8qwYlku6D7ALe30` | Run hs-quotes-to-sheets.py | every 15 min | `source ~/.secrets && venv/bin/python3 hs-quotes-to-sheets.py` | Sheets | live |
| `Y7V6fDXdUsGlDaKj` | Run cms_scraper | `3,18,33,48 * * * *` | `venv/bin/python3 scraper.py` | Data › Signage Scraper → Monitoring › CMS status | live |
| `nUpnbCswyRIc8FR8` | Run dp_scraper | `5,20,35,50 * * * *` | `venv/bin/python3 dp_scraper.py` | Data › Device Portal Scraper | live |

The four cron expressions are staggered on purpose so the scripts never overlap on a 2-vCPU box.

## Archived (21)

| ID | Workflow | What it was | Replaced by |
| --- | --- | --- | --- |
| `DnQfINO92jReUuBQ` | DS002 - Airtable - Jobs / Jobs | Airtable → Google Sheets, every 15 min, error mail via Gmail | `jobs-to-sheets.py` |
| `ZTzd0xFe3ytRuiF3` | DS005 - Contracts | subscription contracts → Sheets | the subscription report scripts |
| `Vghdyftp4nciQwoX` | DS005 - Subscriptions | subscriptions → Sheets | same |
| `TL3qCEyJYjiPJgBZ`, `pLgKTGmpIS08BbGo` | DS014 - Incidents / OOS items, DS014 - OOS Items | OOS items → Sheets for the support dashboard | `tickets-to-sheets.py` |
| `NEABk0wgYkJbYiYU` | DS014 - Tickets | tickets → Sheets | `tickets-to-sheets.py` |
| `nr2OCePA23KZdPyU`, `3DvuKt6yrzIlL4gb` | DS016 - HS Quotes | HS quotes → Sheets | `hs-quotes-to-sheets.py` |
| `qBiZjZTs8PUcv05H` | AT Subscriptions --> Supabase | webhook `/airtable-inventory` → Supabase | abandoned, archived 2026-10-26 |
| `MazS3yaOiEUfI4nU` | AT Tickets --> Supabase | webhook `/airtable-tickets` → Supabase | abandoned, archived 2026-10-26 |
| `pDObvoHHZPFj43dc` | Refresh Airtable Webhook | every 6 h, refreshed the two webhooks above | archived 2026-10-26 |
| `YsZ5KyWXJ62QNynr`, `LI5gbHIOHGRROa9F` | Run hubspot-to-airtable-sync (v1) | first versions, Gmail alerts | `BDRzM0LzjYKpuHYq` |
| `yTCEtAJrxGKAgFa3`, `PbdYR1x7QaFKM67X` | Run dp_scraper (v1) | first versions | `nUpnbCswyRIc8FR8` |
| `DQemTlC1ILqlQrsa` | Freshdesk - GET Tickets | manual API test with Sky's Freshdesk creds | — |
| `G0scOm8uj1ItWmLs` | My workflow 2 | Airtable → Google Drive test | — |
| `V9aA37hm1u7meYSp` | My workflow 5 | Airtable + Xero test (2026-10-26) | — |
| `sYbtcxlsxLOb79RT` | My workflow 4 | chat + Alibaba Cloud LLM test | — |
| `QiV25BD65d29s0XA`, `ZFLaDbBLvqj38XEB` | My workflow, My workflow 3 | empty | — |

**DS0xx** = my numbering for "data sync" workflows; DS005 and DS014 in the dashboard notes refer to these exports (contracts/subscriptions and tickets/OOS respectively).
