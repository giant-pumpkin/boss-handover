# ApprovalMax

| | |
| --- | --- |
| What we use it for | PO and bill approval workflows on top of Xero |
| Org | Giant Pumpkin Co., Ltd. |
| Plan / tier | **ApprovalMax for Xero Advanced**. Public API + webhooks need Premium; Seb declined the upgrade (2026-09) and support refused a trial |
| Admin account | Seb (Owner) |
| API spec | `https://public-api.approvalmax.com/swagger/v1/swagger.json` (public, no auth) |

## Constraints verified 2026-09-18 (do not re-derive)

- No custom fields for Xero POs/bills (QBO and NetSuite only).
- Xero has no custom fields on POs/bills either; both tracking-category slots (`Customer`, `Salesperson / Department`) are used and drive routing.
- `Reference` is writable by API but absent from the Requester matrix, so cannot be mandatory.
- Editing an in-flight request may reset approvals (`requesterUpdatedWithReset`); unconfirmed.

## The deposit gate (chosen design, free, works on Advanced)

Add an `A/R Deposit Check` approval step to the PO workflow between Cost Review and C-Level, owned by finance with a backup, "Any of". Condition on `Customer` not `Empty`/`Company Outing`. Make `Customer` mandatory in both Requester matrices. Finance approves if deposit invoiced/paid, uses **On hold** (never reject) otherwise. Bill workflow may already have this as the AR step (Duangnate Promsorn) — confirm before duplicating.

Status: <!-- TODO implemented? -->

## Why not an integration

Seb asked for accountability and a visible process, not a data field. An API build would have no owner, silent gaps when a PO lacks a job reference, and would target Airtable which is being migrated.
