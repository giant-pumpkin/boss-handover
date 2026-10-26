# 06 — ConnectIQ

Giant Pumpkin's internal platform. **Phase 1** (Sky Chew) replaces HubSpot with the CRM. **Phase 2** (my domains: `inv_`, `ops_`, `plan_`, `sub_`, `sup_`, `mon_`) replaces Airtable, strictly after Phase 1 cutover (DR-35).

| | |
| --- | --- |
| Production | https://connectiq.giant-pumpkin.com |
| Staging | https://connectiq-git-staging-giant-pumpkin.vercel.app |
| Docs site | https://connectiq-docs.giant-pumpkin.com (strategy, architecture, model, Phase 1, Phase 2) — static files on the Watermelon droplet at `/var/www/connectiq`, pushed by GitHub Actions over rrsync as user `deploy` |
| ConnectIQ Supabase project | `zkqbmzffoimylkvyqypl` (Sky's; the prototype's `mock_cl_*` tables are sandbox copies of its `cl_*`) |
| Repos | `giant-pumpkin/connectiq-system` (app: Bun, React 19, TanStack, Supabase Pro, Vercel, Resend), `giant-pumpkin/connectiq-docs` |
| Builder | Claude Code since 2026-09-10 (replaced Lovable) |
| Status 2026-10-09 | M1 Foundation, M2 Customer records, M3 Sales pipeline live; M4 Products & pricing in progress; M5–M8 to come. Nothing of Phase 2 in production. |

The repo's `CONNECTIQ_MANAGEMENT_HANDOVER.md` and `PROJECT_KNOWLEDGE.md` are authoritative for the production system. This folder only covers **my** contribution: the operations domain spec, the prototype, and the decisions that gate Phase 2.

## Contents

- [operations-prototype/](operations-prototype/) — the inventory/jobs prototype (`~/coding/connectiq-inventory-demo`, Supabase `odpdnucjvgingrrwaaiv`): a **spec, not the product**
- [data-model.md](data-model.md) — the object / unit / placement model and prefix conventions
- [migration-plan.md](migration-plan.md) — Airtable → ConnectIQ, domain by domain, with the gating decisions
- [open-decisions.md](open-decisions.md) — DR-10, DR-11, DR-12, DR-35, DR-36, DR-41 with who decides and the evidence needed

## Architecture rules that bind Phase 2 work

- One Postgres DB, eleven locked prefixes; the domain that performs the write owns the table.
- No cross-domain joins in app code, no cross-domain writes or transactions. Cross-domain = store the ID, call the service client, snapshot, emit to `plat_domain_events`, or read an `rpt_` view (`security_invoker = true`).
- RLS in the same migration as the table. Per-domain DB roles. UUID ids plus human codes from DB functions.
- `inv_` must precede `ops_`; DR-10/12/35/41 must close before `inv_` starts.
- Process: Build Plan → branch `claude/<operator>-<name>` from `staging` → early PR with `intended-files` → evidence harness + independent review + human walkthrough on staging → merge commit → separate human-approved PR staging → main.
