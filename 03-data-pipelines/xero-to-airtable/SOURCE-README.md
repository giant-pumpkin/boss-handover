# Xero → Airtable Invoice Sync

Pulls sales invoices from Xero and upserts them into an Airtable table. Re-running it updates existing rows instead of creating duplicates.

```
Xero API ──► invoices.py ──► airtable.py ──► Airtable "Invoices" table
   ▲
   └── refresh.py keeps the login alive (tokens in xero_tokens.json)
```

Currently connected to the Xero **Demo Company (Global)** (fake data).

---

## Files

| File | What it does | When you run it |
|---|---|---|
| `login.py` | One-time OAuth login. Opens Xero's consent screen, you paste back the `code`, and it saves the tokens to `xero_tokens.json`. | Once, or when the connection breaks |
| `refresh.py` | `refresh_token()`: swaps the refresh token for fresh tokens and saves them back to the file. | Called automatically |
| `orgs.py` | `get_orgs()`: lists the Xero organisations the tokens can access. | Called automatically |
| `invoices.py` | `get_invoices()`: fetches every sales invoice (`ACCREC`), page by page. | Called automatically |
| `airtable.py` | **The entry point.** Maps each invoice to Airtable fields and upserts them. | Every sync |

### What happens when you run `airtable.py`

1. `import invoices` runs the top of `invoices.py`:
   1. `refresh_token()` gets a fresh 30-minute access token and saves the new refresh token.
   2. `get_orgs()` takes the **first** connected organisation.
   3. The fresh tokens are loaded from `xero_tokens.json`.
2. `get_invoices()` requests page 1, 2, 3… until `page >= pageCount`.
3. Each invoice is mapped to Airtable field IDs (see [Field mapping](#field-mapping)).
4. `batch_upsert` writes everything, matching rows on **Xero Invoice ID**.
5. It prints `N created, M updated`.

---

## Setup

### 1. Requirements

- Python 3.12+. The f-strings reuse double quotes inside `{}`, which older versions don't allow. Currently run with `/opt/anaconda3/bin/python`.
- Packages:
  ```bash
  pip install requests pyairtable
  ```

### 2. Secrets

These are read from environment variables. They're exported from `~/.secrets`, which `~/.zshrc` loads:

| Variable | What it is | Where it comes from |
|---|---|---|
| `XERO_CLIENT_ID` | The Xero app's ID | Xero developer portal → app → Configuration |
| `XERO_CLIENT_SECRET` | The Xero app's password | Same page. Shown only once when generated |
| `AT_PAT` | Airtable personal access token | airtable.com/create/tokens. Scopes: `data.records:read`, `data.records:write` |

To check one is loaded without printing it: `echo ${#AT_PAT}` (prints only the length).

### 3. Xero app

- App: **"Airtable Integration"** (Sky's app, type *Web app*)
- Redirect URIs: `http://localhost:5000/callback` (Sky) and `http://localhost:3000/callback` (this project)
- Scopes requested by `login.py`:
  ```
  offline_access accounting.invoices.read accounting.contacts.read
  ```
  All read-only: no bank, payroll, or write access. (The saved token also carries `openid profile email accounting.payments.read` from Sky's earlier connection, because Xero combines past grants.)

### 4. First login

```bash
cd ~/coding/xero-demo
python login.py
```

1. The browser opens Xero's consent screen. Pick the organisation and click **Allow**.
2. You land on a "can't connect" page at `localhost:3000`. **That's expected**, since nothing is listening there.
3. From the address bar, copy the part **between `code=` and `&scope`**.
4. Paste it into the terminal within ~5 minutes. The code expires quickly and works only once.

---

## Running a sync

```bash
cd ~/coding/xero-demo
python airtable.py
```

Expected output:
```
Successfully refreshed token and updated xero_tokens.json
Requesting page 1
Successfully requested 1; added to all invoices.
0 created, 32 updated
```

**You must run it from inside `xero-demo`**, because the scripts open `xero_tokens.json` using a relative path.

---

## Field mapping

Airtable base `app8H7IMW8gHyQzzn`, table **Invoices** `tblEvxNYRMA2xfSky`. The code uses field IDs, so renaming or retyping a column in Airtable doesn't break the sync. Deleting and re-creating a column does.

| Xero field | Airtable field | Field ID | Notes |
|---|---|---|---|
| `InvoiceID` | Xero Invoice ID | `fld1kSXorIZBHJv0F` | **Upsert key.** Never changes |
| `InvoiceNumber` | Invoice Number | `fld80ENdecDiZC8lV` | Primary field, e.g. `INV-0027` |
| `Contact.Name` | Contact | `fldh0DlFJvXX2Joba` | The only nested field |
| `Reference` | Reference | `fldKqhD3xcQKkkZEV` | Free text. May hold the quote number |
| `Status` | Xero Status | `fldeCAvRc6vOuVF4i` | Single select: DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED, DELETED |
| `DateString` | Date | `fldemgJ8C7Fc69MsC` | Sent as `2026-09-24T00:00:00`; Airtable stores the date |
| `DueDateString` | Due Date | `fldJLoz665cwLXzE1` | Same as Date |
| `Total` | Total | `fld5IZ29qGUgyf3kG` | |
| `AmountPaid` | Amount Paid | `fldmHJGaKIwnKZUfx` | `> 0` with status AUTHORISED means part-paid |
| `AmountDue` | Amount Due | `flddUNaMrbkNcxT8m` | |
| `CurrencyCode` | Currency | `fld15ta4wBoXENwXo` | |

To add a field: create it in Airtable, then add `"XeroFieldName": "fldXXXXXXXXXXXXXX"` to `field_mapping` in `airtable.py`. **Copy and paste the ID; don't retype it** (`l` vs `1` and `O` vs `0` look identical).

---

## How the Xero login works (OAuth 2.0, authorization code flow)

| Token | Lifetime | Stored in |
|---|---|---|
| Access token | 30 minutes | `xero_tokens.json` |
| Refresh token | 60 days if unused. **Replaced on every refresh** | `xero_tokens.json` |

- Every API call sends `Authorization: Bearer <access_token>` plus `xero-tenant-id: <org>`.
- Each refresh returns a **new** refresh token. The old one stops working 30 minutes later (Xero's grace period). `refresh_token()` saves the new one immediately, so don't remove that save.
- As long as the sync runs at least once every 60 days, you never need `login.py` again.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `401` from any call | Access token expired | `python -c "from refresh import refresh_token; refresh_token()"`. (`airtable.py` does this automatically.) |
| `invalid_grant` on refresh | Refresh token is dead: unused 60+ days, reused after the grace period, or the app was disconnected in Xero | Run `python login.py` again |
| `invalid_client` | Client ID/secret is wrong, or not loaded in this terminal | Check `echo ${#XERO_CLIENT_ID}` (should be 32). Open a new terminal |
| Xero says the redirect URI is invalid | `redirect_uri` doesn't exactly match the app's registered list | It must be exactly `http://localhost:3000/callback` |
| `FileNotFoundError: xero_tokens.json` | Run from the wrong folder, or you haven't logged in yet | `cd ~/coding/xero-demo`, or run `login.py` |
| `KeyError` in `airtable.py` | Xero omits empty fields (e.g. no `Reference`) | Use `invoice.get(field)` instead of `invoice[field]` |

---

## Security

- `xero_tokens.json` is effectively a password. It's in `.gitignore`, and it was scrubbed from git history with `git filter-repo`. **Never commit it.**
- Secrets live in `~/.secrets`, outside the repo.
- Sharing credentials is only acceptable because this uses the Demo Company. For real Giant Pumpkin data, use a Giant Pumpkin-owned Xero app and have a Standard or Adviser user approve it.

---

## Known limitations / next steps

- **Demo data only.** Switching to Giant Pumpkin's real Xero (Singapore, so Custom Connections aren't available) needs a Standard or Adviser user to click Allow once.
- **Only the first organisation** returned by `get_orgs()` is synced.
- **Importing `invoices.py` has side effects**: it refreshes the token and calls Xero. Fine for a script, but surprising if you reuse it elsewhere.
- **No schedule yet.** cron/launchd won't load `~/.zshrc`, so the secrets won't be set. That needs solving before automating.
- **Invoices aren't linked to quotes yet.** The quote number is free text (probably in `Reference` or the line-item descriptions). Parse it and link to `HS - Quotes`.
- Every run fetches **all** invoices. For large volumes, Xero's `If-Modified-Since` header could fetch only the changed ones.
