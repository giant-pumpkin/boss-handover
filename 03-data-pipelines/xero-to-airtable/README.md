# xero-to-airtable

Python sync of Xero sales invoices (ACCREC) into Airtable `Invoices` (`app8H7IMW8gHyQzzn` / `tblEvxNYRMA2xfSky`), upsert on Xero Invoice ID `fld1kSXorIZBHJv0F`. Source: `~/coding/xero-demo`.

| File | Does |
| --- | --- |
| `login.py` | one-time OAuth (redirect `http://localhost:3000/callback`), saves tokens to `xero_tokens.json` (git-ignored) |
| `refresh.py` | refreshes tokens |
| `orgs.py` | lists tenants |
| `invoices.py` | paginated fetch |
| `airtable.py` | **entry point**, `batch_upsert` |

**Status 2026-09-30:** works against Xero **Demo Company (Global)** via Sky's Xero app "Airtable Integration". Blocked on management approval for GP's real Xero (Singapore org, so no Custom Connections; a Standard/Adviser user must click Allow).

End goal: backfill quote number, location and paid status onto `HS - Quotes`.

Open: schedule it (cron does not load `.zshrc` env), switch tenant, parse quote number from Reference/line items.
