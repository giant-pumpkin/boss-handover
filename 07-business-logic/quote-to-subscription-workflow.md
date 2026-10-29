# Quote-to-subscription workflow (detailed)

> Added to the handoff repo 2026-10-27. Written Aug–Sep 2026 from working sessions; the short version with every automation ID is [subscription-lifecycle.md](subscription-lifecycle.md). The Inventory-base webhook URL below has its trigger segment redacted because anyone holding the full URL can fire the ingest; the full value is in the Jobs-base automation `wflsW0LoP8zU6XBzv`.

Consolidated from chats between Aug and Sep 2026: *Subscription Management UI* (1–2 Sep), *ConnectIQ inventory part 1* (17 Sep), *Simplifying Giant Pumpkin subscription management* (24 Aug), *Converting subscription contract to list format* (28 Aug), *Querying Airtable subscriptions schema and records* (17 Aug).

---

## 1. Systems involved

| System | Role |
|---|---|
| **HubSpot** | CRM. Sales issues quotes here. The real commercial agreement lives here. |
| **Airtable — Jobs base** `appdo1WwONYvmYMWg` | Jobs, BOM, BOM Resources, Partners, Quote Staging extension. Synced copies of Subscription contracts and Inventory. |
| **Airtable — Inventory base** `appRor1ipbYAb4K7z` | Resources (catalog), Inventory (serial-tracked), Subscription types, Subscription contracts, Subscriptions, Stock locations, Inventory log. |
| **Airtable — Locations base** `appmFizJaAn7yKKVu` | Client locations. |
| **n8n** (`n8n.giant-pumpkin.com`) | Integration layer; runs `hubspot-to-airtable-sync` on a schedule. |
| **Xero / ApprovalMax** | Invoicing, deposits, PO approval. Not part of the Airtable chain directly. |
| **CMS Asia / Device Portal** | Downstream source of truth for what's actually deployed (signage / music boxes). |

Only one person (Boss) writes to the synced subscription tables. Sales never opens Airtable.

---

## 2. The chain at a glance

```
HubSpot Quote (accepted)
  → syncs to Airtable (hubspot-to-airtable-sync, n8n)
    → Quote Staging interface (map customer, allocate job count)
      → Create Job(s) with BOM, location, partner, type, schedule, contract
        → Deposit check (finance verifies customer payment)
          → Deployment team schedules with partner/installer
            → Installation happens
              → Installer enters serial numbers + photos via portal
                → Availability check automation (serials exist in inventory?)
                  → Boss ticks the 'sync' checkbox (manual)
                    → 'Send job SN to Inventory (Sync)' webhook → Inventory base
                      → 'Ingest SNs - Installation' updates inventory records
                        → 'Create subscription record' fires on contract attachment
                          → Subscription rows exist
```

Six handoffs, three automations, one manual trigger, two bases. It breaks regularly.

---

## 3. Stage by stage

### 3.1 HubSpot quote → Airtable

- Sales negotiates and issues the quote in HubSpot. Customer accepts.
- `hubspot-to-airtable-sync` (Python, orchestrated by n8n, every ~15 min) pulls accepted quotes into the Jobs base.
- Quotes are linked to Jobs via the `HS - Quotes` linked field. A `Quote Status` formula tracks deposit state (`No quote` → `Not invoiced` → `Deposit Invoiced` → `Deposit Paid`) off the `Deposit Inv` / `Deposit Paid` checkboxes.

### 3.2 Quote Staging

An Airtable extension that surfaces accepted quotes needing operational follow-up. Five-stage pipeline:

`Needs Customer → Needs Allocation → Ready → Done → Exempt`

- **Needs Customer** — map the HubSpot customer to an Airtable customer record.
- **Needs Allocation** — decide how many jobs the quote produces (typically one per location).
- **Ready** — spreadsheet-style grid to create jobs with BOM, location, partner, schedule, and contract fields. Jobs and BOM records are created via REST API; contracts via SDK.
- Extension code: [02-airtable/interface-extensions](../02-airtable/interface-extensions/) › `jobs/quote-to-job/quote-staging-extension.tsx`.

**Known gap:** software-only and delivery-fee-only quotes don't match the ops-type filter and get stranded — never linked to a job, never produce subscriptions.

### 3.3 Job structure

A job is a work order: a record of what needs to be done at a site. Fields that matter for this chain:

- `Location`
- `Installation Partner` (external install team)
- `Date - Scheduled`, `Date - Completed` (Completed = training sign-off, not install)
- `BOM` (`fldMsBGHYoDkBxvBM`) → one BOM record (`tblMoXmjtWVO8Wyz7`)
  - `BOM Resources` (`fldAc2IFjmNgqJfSy`) → line items (`tblAHbCtXG4w9tzSF`), e.g. `QM43C x 1`, `VESA mount x 1`
    - each line item has `Subscription Contract` (`fldWejNKXO8IhYzTs`) linking to the synced `Subscription contracts` table (`tbl8uHwls1HZbjYun`), e.g. `CON-1234`
- `Subscription - Contract` (rollup of the above, used in the webhook payload)
- `Close job - SN` (`fldIeKaFA33hZdtBG`) — empty at creation
- `Inventory - Availability` (`fld4nXGpbFqrNnI9r`) — status report written by automation
- `sync` checkbox (`fldhTpGWsywbFFSU7`)

Job types: Collect, Delivery, Installation, Rework, Survey, Un-installation, Ma - Audit, Ma - Preventive, Ma - Reactive, Account setup, Pre-sale. Only Installation jobs feed the subscription chain. Jobs also arise without a quote (maintenance, internal ops, partner-reported issues), so `quote` is nullable.

Example at creation:

```
JOB-001
  Location, Installation Partner, Scheduled Date
  BOM
    QM43C x 1  → CON-001 (Subscription type: 'Signage Player - 12 months')
    VESA Mount x 1
  Close job - SN: (empty)
```

### 3.4 What a "Subscription contract" actually is

The contract record specifies: customer, service, subscription type (type + duration), start date, FoC duration (free-of-charge months added to the term), price per unit (PPU) or price per location (PPL).

But it is **not the commercial contract** — that's the HubSpot quote. The Airtable "contract" is a **provisioning order**: a bundle of terms stapled to a BOM line so the automation knows what subscription records to create. This explains why:

- Boost Juice has ~170 of them (one per store install, not 170 signed contracts)
- Contract IDs embed a location name (they're per-job, not per-customer)
- `Units - Start` drifts (it was never a negotiated quantity, it's what the BOM expected)
- Sales never looks at it (it was never their object)

Signage vs music streaming differ:

- **Digital signage** — late-installed screens get their own separate contract. No formal contract exists for signage; it's per-install.
- **Music streaming** — umbrella contract per customer, units join over time with staggered start dates.

### 3.5 Installation → serial number entry

Installer (or deployment team) finishes the install and fills `Close job - SN` via the portal: a **comma-separated text field** of serial numbers, plus photos. There's no pre-assignment of inventory items to a job — the installer grabs from the client pool and reports afterwards.

### 3.6 Availability check (Jobs base automation)

On `Close job - SN` being filled, an automation checks each serial against the synced Inventory table (`tblIYO0rNMG36bUmL`) and writes a multiline report into `Inventory - Availability`:

```typescript
let tableJobs = base.getTable("Jobs");
let tableInventory = base.getTable("Inventory");

let inputConfig = input.config();
let jobRecord = await tableJobs.selectRecordAsync(inputConfig.jobRecordId);
let closeJobSN = jobRecord.getCellValue("Close job - SN");

if (closeJobSN) {
    let serialNumbers = closeJobSN.split(",").map(sn => sn.trim());
    let allInventoryRecords = await tableInventory.selectRecordsAsync();
    let outputResults = [];

    for (let sn of serialNumbers) {
        let found = false;
        let original = allInventoryRecords.records.filter(r => r.getCellValue("ID") === sn);
        if (original.length > 0) { outputResults.push(`✅︎ ${sn}`); found = true; }

        // Samsung 15-char serials are stored as 14 chars in Airtable
        if (!found && sn.length === 15) {
            let trimmed = sn.slice(0, -1);
            let trimmedMatch = allInventoryRecords.records.filter(r => r.getCellValue("ID") === trimmed);
            if (trimmedMatch.length > 0) { outputResults.push(`✅︎ ${sn}: 14 character match`); found = true; }
        }
        if (!found) outputResults.push(`❗ ${sn}`);
    }
    output.set("results", outputResults.join("\n"));
}
```

### 3.7 Manual sync trigger

If the serials check out, Boss ticks the `sync` checkbox. This is the only manual gate in the chain and it's a single person.

### 3.8 `Send job SN to Inventory (Sync)` — Jobs base → webhook

```typescript
var inputConfig = input.config();
const recordId = inputConfig.recordId;
const closeJobSn = inputConfig.closeJobSn;

const jobsTable = base.getTable("Jobs")
const url = "https://hooks.airtable.com/workflows/v1/genericWebhook/appRor1ipbYAb4K7z/wfl1YUiIjdVT3b66E/<TRIGGER_ID>"
const fieldsToSend = ["Location","Close job - SN","Date - Completed","Date - Scheduled","Subscription - Contract","Quotes"]

const record = await jobsTable.selectRecordAsync(recordId)
const recordData = Object.fromEntries(fieldsToSend.map(key => [key, record?.getCellValueAsString(key)]))

await fetch(url, {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ SNs: closeJobSn, fields: recordData })
})
```

Everything crosses the base boundary as **display strings** (`getCellValueAsString`), not record IDs. Linked fields like `Subscription - Contract` arrive comma-joined; a later fix fans out one webhook call per contract rather than changing the payload shape, because downstream legacy automations can't accept lists.

### 3.9 `Ingest SNs - Installation` — Inventory base webhook

1. Normalise serials:

```typescript
let snNormalisedArray = input.config().SNs.split(",").map(item => {
    item = item.trim();
    return item.length === 15 ? item.slice(0, 14) : item;
});
output.set("SnNormalised", snNormalisedArray);
```

2. For each normalised serial:
   - Find records in `Inventory` where `ID` **contains** the serial
   - Update every record found:
     - `Status` (`fldtg97LlgkiDAdhf`) → `Installed`
     - `Location - Installation` (`fldwAwIh1u5d5b436`) → `{location}`
     - `Subscription contract - Add new` (`fldOUlb0lN9Ogcheg`) → `{subscription contract}`
     - `Installation date` (`fldQgj8bijkjlQpuq`) → `{Date - Scheduled}`

### 3.10 `Create subscription record` — fires when `Subscription contract - Add new` is set

1. Find contract in `Subscription contracts` where `Inventory - Subscription contract` contains this inventory ID
2. Find existing subscriptions where `Subscription contract` = that contract and inventory `ID` = this ID (idempotency guard)
3. Find the inventory item
4. If contract `Start date` is empty → Slack error. Else, if `Player = Yes`, existing-subscriptions count = 0, `Add new` not empty, `Spare` unchecked → create a `Subscriptions` record:
   - `Inventory` = inventory item
   - `Subscription type` = contract's type
   - `Start date` = (see §4)
   - `Subscription contract` = contract
   - `Installation date (proposed)` = `Installation date`
   - `Service location` = location
5. Clear `Subscription contract - Add new`

`Subscription contract - Add new` is a **handoff/trigger channel**, not the authoritative link. `Subscription contract` on the Subscription is the persistent one.

---

## 4. Start date rule (fixed 1 Sep 2026, shipped and confirmed working)

Problem: the pipeline inherited start dates from the contract. For signage there's no real contract term, so dates were wrong, and an entire repair harness grew up around it (`Start date - Check`, `Alert - Start dates`, `Trigger - Align start dates`, `Start date - Rollback`, the `Rollback` table, "Contract – Multiple start dates").

Decisions:

- Install date derives from **`Date - Scheduled`**, not `Date - Completed` (Completed means training sign-off, which can be weeks later).
- Billing starts the **first of the month after installation**.
- Unified formula:

```
subscription Start date =
  IF   {Start date - Override} present → override
  ELSE MAX( first-of-month-after({Installation date}), {contract Start date} )
       // contract start ignored if empty
```

- Signage: contract start empty → derived from install, then stamped onto the contract once.
- Music streaming, new site: both agree.
- Music streaming, addition under umbrella contract: install is later → later wins.

Follow-ups implied: the empty-start-date Slack guard inverts (empty is now normal for signage pre-install); contracts need a `Pending installation` state until first install stamps them; retire the repair harness after a month of watching the new rule.

---

## 5. Known flaws in the chain

**Critical**
- `contains` match on a 14-char normalised serial updates *all* matching inventory records — `...137K` and `...137L` both get installed and both spawn subscriptions. Likely source of the duplicate-serial billing rows. Fix: exact match on `SN - Normalised`, assert exactly one result.
- The 14/15-char truncation rule is implemented in three places (availability script, ingest script, `SN - Normalised` formula). They will drift.
- Display strings cross the base boundary and get written into link fields. Airtable link-by-name silently **creates a new record** when no exact match exists → phantom Locations / Contracts on any upstream rename. Should send `record.id` and link by ID.

**High**
- Silent guard failures: only the empty-start-date branch Slacks. `Player = No`, `Spare` checked, or idempotency hits drop silently → installed, never billed, no signal. Compensating views (`Installed – No active subscription`) exist because of this. Contributes to ~1,003 CMS devices with no subscription row.
- Idempotency guard (`Records length = 0`) also blocks a legitimate second subscription on the same item + contract (signage + music on one screen).
- `Subscription contract - Add new` set→fire→clear leaves no audit trail and no dead-letter on half-failure; the "Otherwise → re-set" branch is an unobservable retry loop.

**Medium**
- No provenance: nothing links a Subscription back to the Job or BOM Resource that created it.
- `Location - Current` on subscriptions is a lookup that follows the inventory item's physical location → hardware swaps silently rewrite subscription history. `Service location` (formerly `Location (Proposed)`) is the stable field.
- Inventory log is unreliable for backfill (blank install dates, bulk imports masquerading as moves, free-text locations). CMS and DP exports are the real source of truth; Airtable signage location strings embed a store code matching CMS `LocationId`.

**Process**
- Sales lives in HubSpot and will never open Airtable; no UI fixes that. Expiry notification automations exist but `Notifications for expired subscriptions` is off.
- Stranded software-only / delivery-fee quotes (see §3.2).
- One person is the manual gate for every installation.

---

## 6. Where this is going

ConnectIQ replaces the chain with one database (Supabase) and one transaction: a completed Installation job moves serial-tracked items to `installed`, and that state change is the subscription trigger. Quote Staging redesign and the Subscription domain each need their own FRD; for the prototype, jobs are created manually and `quote_id` is nullable. Software-only `INV-xxxx` records migrate to the Subscriptions domain, not inventory.

---

## Source chats

- [Subscription Management UI](https://claude.ai/chat/a870b684-5284-4dfa-a771-78238d1ceff1) — full pipeline walkthrough with scripts, flaw review, start-date fix, "provisioning order" reframe
- [ConnectIQ inventory part 1](https://claude.ai/chat/0de73fa2-a7da-4cc5-bec0-77c99c6d9aa6) — 8-step summary, Quote Staging pipeline, job types, external systems
- [Simplifying Giant Pumpkin subscription management](https://claude.ai/chat/2fff88cd-7c05-4b62-9c4a-0cb54ea7a348) — Inventory base schema, four subscription tables
- [Converting subscription contract to list format](https://claude.ai/chat/706343b6-4590-4766-b78a-8f148efb1ade) — webhook fan-out per contract
- [Querying Airtable subscriptions schema and records](https://claude.ai/chat/d120e800-4278-462b-a149-8d81a6e6edfe) — location integrity, CMS/DP as source of truth
