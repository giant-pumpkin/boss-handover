# Airtable Job Lifecycle (as-is, 15-Oct-2026)

How a Giant Pumpkin / Royal Streaming sale becomes a job, gets executed, and ends up as inventory + subscription records in Airtable. Reverse-engineered from base schemas, automation configs, `hubspot-airtable-sync/main.py` and the Quotes-to-Job extension handover doc. Nothing here is documented inside Airtable itself.

Open questions are marked **[GAP]**. Treat every step as "what the system enforces", not "what people are supposed to do".

---

## 0. The three bases

| Base | ID | Holds |
|---|---|---|
| **Inventory** | `appRor1ipbYAb4K7z` | Resources (product catalog), Inventory (serial units), Subscription contracts, Subscriptions, Subscription types, Locations, Customers, Stock locations, Delivery notes |
| **Quotes** | `app8H7IMW8gHyQzzn` | HS - Quotes (HubSpot mirror), HS - Deals, HS - Contacts, Quote - Line Items, Invoices (Xero), Documentation tables |
| **Jobs** | `appdo1WwONYvmYMWg` | Jobs, Tasks, BOM, BOM resources, Quotes (AT-native), HS - Quotes (copy), Job locations, Ma - Packages/Items/Cycles/Jobs, FS - Partners/Workers |

Several tables exist in more than one base (Resources, HS - Quotes, Subscription contracts, Locations, Customers, Inventory). **[GAP]** Which copies are Airtable synced tables (read-only mirrors) vs independent tables is not confirmed. The Quotes-to-Job extension writes to the Jobs-base `HS - Quotes`, which only works if that copy is *not* a synced table.

---

## 1. Catalog → HubSpot

**Table:** Inventory base › `Resources` (`tbl3eqL9QVNgZfNgZ`). "Resources" = products. Name formula is `Brand - Type`, e.g. "Royal streaming - Music for Business - Commercial".

Fields that drive the rest of the chain:

| Field | Values | Effect downstream |
|---|---|---|
| `Category` | Display, Play box, Software, Services, Warranty, … (27 options) | Classification only |
| `Service` | Digital signage / Music streaming / Office equipment | Business line tag |
| `Quote - Category` | Installation, Hardware, Software, Delivery, Maintenance, Display, Player Box, Other Services | Copied to the HubSpot product's `quote_category`; decides whether an accepted quote enters the job queue (step 3) |
| `Hubspot - Product type` | Inventory / Service | Whether a serial unit is expected |
| `Hubspot - Export` | checkbox | Must be ticked to reach HubSpot |
| `Player` | Yes / No | Subscription automation (step 8) only fires for units whose Resource has Player = Yes |

Resources sync to HubSpot as products. **[GAP]** The mechanism isn't in `main.py` (which only pulls quotes). Unknown whether it's a second script, an Airtable automation, or a native integration.

---

## 2. Deal → Quote (HubSpot) → Airtable

1. Sales records the deal in HubSpot. Deal has a `service` property (Digital Signage / Music Streaming).
2. Sales builds a quote. Line items come from synced products.
3. Customer accepts in HubSpot.
4. `~/coding/hubspot-airtable-sync/main.py` runs every 15 min:
   - Pulls all quotes with deal + line-item associations.
   - For each line item → product → `quote_category`. Union of categories becomes the quote's `quote_type` (multi-select). Deal `service` becomes `quote_service`.
   - Patches those two properties back onto the HubSpot quote (skips Archived/Expired/Void).
   - Upserts into Quotes base › `HS - Quotes` (`tblhX7SNxLUje9Rac`) keyed on **Quote Number**. Writes Status (Raw), Quote Type (HS), Quote Service (HS), Accepted date, PDF URL, Buyer Company, etc.
   - Marks Airtable quotes absent from HubSpot as `MISSING` (except legacy `GP-` numbers).

The Jobs base has its own `HS - Quotes` (`tblRSXCmjroNPaO5j`) with extra operational fields: `Customer (AT)`, `Allocated Jobs`, `Jobs` (link), `Jobs Opened` (count), `Allocation Progress`. **[GAP]** See base note above: how the two copies relate.

`Quote - Line Items` (`tblpZg6JsXtzkb0li`) is also synced but the handover doc says it is **legacy and not used** for job creation. Its `Billing Frequency - Normalised` formula only knows Monthly/Annually; Quarterly comes through blank.

---

## 3. Quotes-to-Job queue (sales → deployment handover)

**Code:** `~/coding/airtable-interface-improvements/jobs/quote-to-job/quote-staging-extension.tsx` (custom Airtable extension; handover doc alongside it).

A quote shows in the queue only if **both**:
- `Quote Status` = Accepted, **and**
- `Quote Type (HS)` contains any of **Installation, Hardware, Maintenance, Delivery**.

Software-only and Other Services quotes never enter the queue. That is by design: no site work means no job.

Queue stages (computed in JS, not a field): `needs_customer` → `needs_allocation` → `ready` → `done` (when `Jobs Opened` ≥ `Allocated Jobs`).

The deployment team member then, per job:
1. Maps HubSpot company → Airtable Customer (writes `Customer (AT)` on the quote).
2. Sets how many jobs the quote needs (`Allocated Jobs`), one per location.
3. Picks or creates the **Job location** (`tbl5Nj3zs3nxKPdEv`).
4. Builds a **BOM** by hand from the Resources catalog (BOM `tblMoXmjtWVO8Wyz7` → BOM resources `tblAHbCtXG4w9tzSF`). Line items from HubSpot are *not* used; the person reads the quote PDF and picks resources. BOMs differ per location.
5. Fills job fields: Service, Partner, Job type, Status, Date - Scheduled, Assigned to.
6. Creates the **Job**, linked to the HS quote (`HS - Quotes` link `fldr7l2cjqxoR7qQV`).

There is also a half-built automated path (`DEV - …` automations) that goes HS quote → AT-native `Quotes` (`tbldE1r6MKSgebujM`) → Master BOM → contracts → Job/Job BOM. Some of these are deployed. **[GAP]** Whether any live jobs are created this way, or it's abandoned. Jobs still carry a link to the AT-native `Quotes` table via `fldxruMq0GY3eP9cO`.

---

## 4. The Job record

**Table:** Jobs base › `Jobs` (`tblwHj9cO37wp1fVx`), ~197 fields. ID formula `JOB-00000000`.

**Job type** (`fldk5E1PkIy1ZrM1e`): Collect, Delivery, Installation, Rework, Survey, Un-installation, Ma - Audit, Ma - Preventive, Ma - Reactive, Account setup, Pre-sale.

**Status** (`fld7q5wjIg47nltes`): Unscheduled → Tentative → Scheduled → Installed → Done, plus Incomplete and Cancelled.
- *Installed* = field work finished, still waiting on signed delivery note / photos. The name is misleading since not every job is an installation; it is used for all types anyway.
- *Done* = paperwork complete.

**Stage** (`fldf5sIFaYbXUTb0y`): Processing / Completed / Signed off / On hold. **[GAP]** Who sets Stage and how it relates to Status.

**Service** (`fldexkzrV3Z1z270B`): Digital signage / Music streaming. Must match the BOM/contract service for step 7's webhook branching.

**Readiness formulas** on the job (used by interfaces): `Check - BOM`, `Check - Partner`, `Check - Date`, `Check - Status` (true for Tentative/Scheduled/Done), `Check - Contact`, `Check - Time slot`, `Check - Subscription contract`. The master `Check` formula only evaluates for Job type = Installation.

**Key links:** Location (single), BOM (single), Partner, Quotes (AT), HS - Quotes, Inventory, Inventory - Reserved, Tasks, Tickets, Ma - Item/Package, Linked jobs - Parent/Children.

### Automations that fire during the job's life (Jobs base)

| Trigger | Automation | Does |
|---|---|---|
| Installation job + Scheduled + has date + `Tasks created` = false | `GP - Jobs - Installation - Tasks` (wfl1h5RlE4FbGPMWj) | Creates the pre/rollout/post task checklist |
| Un-installation job + has date | `GP - Jobs - Un-installation - Tasks` (wfl04P70Ev9d9ghVR) | Same for uninstall |
| Ma - Preventive job goes Tentative/Scheduled | `Create MA jobs - Ma Jobs` (wflOPEPm3UesQF7bU) | Creates the PM checklist record in `Ma - Jobs` |
| `Date - Scheduled` changes | `Notify change in scheduled date` (wflcn5iSrF9B6wjF3) | Slack |
| Status changes | `Job - Updated 'Date - Completed'` (wflZLTTvPyjwt0RYH) | Stamps `Date - Completed` |
| Schedule log time trigger | `Write schedule log` (wflnPHfyND6q0b4Ij) | Appends to `Jobs - Schedule log` |
| `Close job - SN` filled + status Installed/Done/Incomplete | `Inventory availability - Installed SNs added to Job` (wfl2jYQflf610Wpms) | Script updates `Inventory - Availability` text on the job |
| `Images - Delivery note` attached | `Create delivery note from image` (wflSSIGp06h7fTI94) | Script |
| Interface buttons | Create WO PDF, Create job report PDF, Generate Esign delivery note, Create Delivery Note (Manual Signature) | DocsAutomator templates GP/TEM-004/006/008/014/015/016/017, RS/TEM-002/003 |
| `Create job report` checkbox | `Tickbox - Create job report PDF` (wflGHYuN6sAVLDLBJ) | Same as the button |
| Ma - Jobs checklist signed | `FS - Ma - PM - Close job` (wflkueIIHNWvDNz3h) | Timestamps and generates PM report |

Undeployed (dead or paused): `FS - Installation - KFC - Close job`, `FS - Installation - Best Buy - Close job`, `DEV - Job reports - Auto-generate` (×2), `Send Slack - Invoice Job`, `Send Slack - Fulfilled quotes`, `Create delivery note for BoostJuice`, `DEV - Create Quote from HS`, `DEV - Create BOM from Quote`.

---

## 5. Field execution

Deployment/partner does the work. Afterwards they must:
1. Set Status to **Installed** (or Done).
2. Type the deployed serial numbers into **`Close job - SN`** (`fldIeKaFA33hZdtBG`), comma-separated. This is the single most important manual step; everything after depends on it.
3. Attach delivery note / installation images (Status → Done once documents are in).

Field service partners use an FS form (`Open job form` button, QR code per job). 15-character SNs are trimmed to 14 by the ingest scripts.

---

## 6. The `Sync` tick (manual gate into inventory)

The data analyst ticks **`Sync`** (`fldhTpGWsywbFFSU7`) on the job. This fires `Send job SN to Inventory (Sync)` (wflsW0LoP8zU6XBzv), which branches on **Job type** and POSTs to Inventory-base webhooks:

| Job type | Webhooks called | Payload |
|---|---|---|
| **Installation** | Ingest SNs - Installation (wfl1YUiIjdVT3b66E) **+** Change contract date (wflIrMQj2Otugkgro) **+** Set warranty date (wflmFzyisOjUQLq4d) | SNs + Brand, Service, Location, Close job - SN, Date - Completed, Date - Scheduled, Subscription - Contract, Quotes, Subscription Start Date (MS), Subscription Start Date (DS), Continue from Existing Contract (MS) |
| **Pre-sale** + `Alert - Report incident` = true | Ingest SNs - Installation - Incident (wfli2h0Tnt6I56dSM) | SNs + Location, dates, contract, quotes. Comment in the automation: "Job type used to be Installation, disabled for a while by setting it to Pre-sale". **[GAP]** Effectively dead? |
| **Collect** | Ingest SNs - Collect (wflKuBDk5Z6MYZzHq) | SNs only |
| **Delivery** | Ingest SNs - Delivery (wfl3MhVWITaKix6QN) | SNs + Location |

Any other job type (Rework, Survey, Un-installation, Ma - *, Account setup): the tick does nothing.

**[GAP]** `Change contract date` and `Set warranty date` were not in the user's description of the chain; their configs weren't read. Treat as part of the Installation path until checked.

`Subscription - Contract` on the job is a lookup through BOM. **[GAP]** Who creates the Subscription contract record and when. The only creator found is `DEV - Create contract from software Master BOM items` (wfluNitKVrYWiqjpc, deployed), triggered when a BOM resource is marked "Ready for contract". Unknown if that's the live path or contracts are made by hand.

`Subscription Start Date (Music Streaming)` is a hand-typed date on the job. `Subscription Start Date (Digital Signage)` is a formula: 1st of the month after `Date - Scheduled`. `Continue from Existing Contract (Music Streaming)` is a checkbox. **[GAP]** Who fills the MS date and the checkbox.

---

## 7. Inventory base reacts

**Table:** Inventory base › `Inventory` (`tblp7sqsv25DVYs7T`). One record per serial unit. ID formula = TargetR MAC → SN → `INV-000000`. **The unit must already exist with that SN** (created by purchase/import/scan, `Import inventory` / `Scan - Input` tables) or the webhook finds nothing and silently does nothing.

Each ingest automation: split SNs → for each, find Inventory records whose ID contains the SN → update.

| Automation | Sets on the unit |
|---|---|
| Ingest - Installation | Status = **Installed**; `Location - Installation` = job location; clears `Location - Stock`; `Installation date` = Date - Scheduled; `Subscription contract - Add new` = job's contract; `Subscription Start Reference Date (Latest)` = the MS or DS start date from the job (branch on Service) |
| Ingest - Installation - Incident | Status = **Incomplete**; same location/contract/date fields |
| Ingest - Delivery | Status = **Delivered**; `Location - Installation` = job location |
| Ingest - Collect | Status = **Available**; clears both locations and installation date |

Unit `Status` options: Available, Defect, Delivered, Demo, Expired, In production, In transit, Incomplete, Installed, Lost, Pending, Swapped, Spare.

---

## 8. Subscription created

**Trigger:** Inventory base › `Create subscription record` (wflzWWNSCGdhtHrbv) fires when a unit's **`Subscription contract - Add new`** (`fldOUlb0lN9Ogcheg`) becomes non-empty (set by step 7).

It creates a `Subscriptions` (`tblyNA73D9jldeEir`) record **only if all of**:
- the unit's Resource has `Player` = **Yes**
- the unit is **not** `Spare`
- no subscription already exists for this contract + this unit
- a contract was actually linked

Subscription fields set: Inventory (the unit), Subscription type (from contract), Start date (unit's start reference date, or contract start if the reference is empty), Subscription contract, Installation - Date (Proposed), Service Location.
Then it moves the contract from `Add new` into the permanent `Subscription contract` link and clears `Add new`. If conditions fail, it just clears `Add new` (no subscription, no error).

Subscription ID formula = `Contract ID - Subscription type - Inventory ID`. Status formula: Terminated / Scheduled / Active / Expired, driven by Start date + End date (from contract).

**Contract shape** (`Subscription contracts`, `tblhn4CJZbi57C8WP`): Service = Digital signage | Music streaming only; `Pricing basis` = Per unit | Per location; `Invoice frequency` = Monthly | Annually; `PPU/month`, `Units - Start/Current`, Duration from Subscription type. There is no way to express a per-deliverable or non-DS/MS service.

---

## 9. What the chain assumes

Every step after the quote assumes:
1. A **physical site** in Thailand (Job location).
2. A **serial-numbered unit** that already exists in Inventory.
3. A **Player = Yes** resource, if a subscription is wanted.
4. Service is **Digital signage or Music streaming**.
5. Pricing is **per unit or per location per month**.

Anything that breaks one of these (e.g. Delta Group: content curation, UK client, 4 quarterly deliveries at USD 750, no hardware) has no honest home past the HubSpot quote. Current answer for such deals: HubSpot quote with a Service-type product under `Other Services` (stays out of the queue), no Airtable inventory/subscription, deliveries tracked separately.

---

## 10. Open questions (consolidated)

1. What pushes Resources to HubSpot?
2. Jobs-base `HS - Quotes` vs Quotes-base `HS - Quotes`: synced copy or independent? The extension writes to the Jobs-base one.
3. Is the AT-native `Quotes` table (LEG-/GP- numbers) + `DEV -` BOM automations a live path or abandoned?
4. Who creates `Subscription contract` records, and when relative to the job?
5. Who sets `Subscription Start Date (Music Streaming)` and `Continue from Existing Contract`?
6. What do `Change contract date` (wflIrMQj2Otugkgro) and `Set warranty date` (wflmFzyisOjUQLq4d) do?
7. Software-only DS and Web Player MS: what goes in the unit's SN so a subscription can exist?
8. Is the Pre-sale/incident branch of the Sync tick alive?
9. `Deposit Invoiced/Paid` (quote) and `Balance Invoiced/Paid` (job): who ticks them, does anything read them?
10. `Stage` vs `Status` on jobs: who owns Stage?
