# Quote Staging Extension — Claude Code Handover

## Problem

Giant Pumpkin (GP) uses HubSpot for sales quotes and Airtable for operational execution. When a quote is accepted in HubSpot, it syncs into the `HS - Quotes` table in Airtable. From there, one person (the deployment team member) needs to:

1. Read the quote (via HubSpot public URL)
2. Map the HubSpot company to an Airtable customer
3. Decide how many jobs it needs (one per location)
4. For each job: find or create the location record, manually build a BOM by matching resources from the AT catalog, fill in all job fields (partner, date, status, assigned to, etc.)
5. Link everything back to the quote so progress is tracked

Today there's no structured workflow for this — no queue showing which quotes need action, no progress tracking per quote. There's an existing Job Creation extension (3-step wizard: Location → BOM → Job Details) but it doesn't know about quotes.

## Solution

A new Airtable custom interface extension that combines:
- A **quote queue** (left panel) showing accepted HubSpot quotes grouped by stage
- A **job creation wizard** (right panel) — same 3-step flow as the existing extension but with the quote as the starting context

The flow: pick a quote from queue → map the HS company to an AT customer → set how many jobs → for each job, run through Location → BOM → Job Details → create. After each job, progress updates automatically via Airtable's count field. When all jobs are created, the quote drops into "Done."

### Why a Custom Extension, Not Native Interface + Automation

The workflow requires creating records across 4 tables in a specific order (Location → BOM → BOM Resources → Job) with links between them. Native Airtable interfaces can't chain multi-table record creation. An automation script could only create "shell" jobs — but the user needs to interactively pick locations, build BOMs with different resource mixes per location, and set all job fields.

### Key Design Decisions Made During Brainstorming

1. **HS - Quotes - LI (line items) are NOT used.** They're legacy work from a previous dev. Pulling line items from HubSpot and mapping to AT resources was unreliable. The user reads the quote and manually matches resources.
2. **BOMs differ per location.** A single quote covering 3 stores might give 2 screens to location A and 3 to location B. Each job gets its own BOM.
3. **One person does everything.** Customer mapping, location creation, BOM building, job field entry — all done by the same deployment team member.
4. **Location creation is part of the flow.** New locations (e.g. "Boost Juice - Siam Paragon") often don't exist in AT yet. The extension needs a "create new" option alongside "search existing."
5. **All job fields are set at creation time** — Service, Partner, Job Type, Status, Date Scheduled, Assigned To. No shell jobs.
6. **Stage logic is computed in JS, not a formula field.** No new formula field needed on the table.

---

## Base & Table IDs

**Base:** `appdo1WwONYvmYMWg` (Jobs base)

| Table | ID | Role |
|---|---|---|
| HS - Quotes | `tblRSXCmjroNPaO5j` | Synced from HubSpot. Accepted quotes enter the staging queue. |
| HS - Quotes - LI | `tbleeXRLEcGTrnwaE` | Line items from HubSpot. **NOT USED — ignore entirely.** |
| Jobs | `tblwHj9cO37wp1fVx` | Operational job records. This is what we're creating. |
| BOM | `tblMoXmjtWVO8Wyz7` | Bill of Materials. One per job. Created as empty shell, then BOM Resources link to it. |
| BOM Resources | `tblAHbCtXG4w9tzSF` | Line items inside a BOM. Each links a Resource to a BOM with a quantity. |
| Resources | `tbl6eFWh1yj7wjiGL` | Product/hardware/software catalog. Synced from Inventory base. |
| Job Locations | `tbl5Nj3zs3nxKPdEv` | Location master data. Synced bidirectionally with Locations base. |
| Customers | `tblhzcjYQk0NJCv9v` | Customer/brand records. |
| Partners | `tblkK66QqEkfAKb2S` | Field service partner organisations. |
| Countries | `tblPY2wcrdWOvYnkd` | Country reference table. **Currently commented out due to a bug — see "Current Bug" section.** |
| Quotes (AT) | `tbldE1r6MKSgebujM` | AT-native quotes table. Has its own enrichment pipeline. Not touched by this extension. |

---

## Field ID Reference

### HS - Quotes (`tblRSXCmjroNPaO5j`)

| Field | ID | Type | Notes |
|---|---|---|---|
| HS - Quote ID | `fldknQwGzwI1VngxQ` | multilineText | Primary field |
| Quote Number | `fldxPrvWs1LJH4YgZ` | multilineText | |
| Quote Status | `fldbOMc45bUlfodQI` | singleSelect | Choices: Accepted (`selFORMULADEFAULT`), Approved, Pending Approval, Draft, Void |
| Quote Type (HS) | `fldee1UAEbbBRZNw8` | multipleSelects | Choices: Installation (`selsxlAYAAYlzgBFH`), Hardware (`selYdKHkozdDrjNOB`), Software (`selgRe5dPINLh1qmK`), Delivery (`selKO2Am2W8nZIPun`), Maintenance (`sel59gNj92hGTdGS5`) |
| Quote Service (HS) | `fldOkbdzsb75CTmsk` | singleSelect | Choices: Digital Signage (`selQp9senRHPBuhmh`), Music Streaming (`selia8VBaqP3GcYG5`) |
| Deal Name | `fld04192O7AGeoSHZ` | singleLineText | |
| Company Name | `fldJfkmABVCUjmEnq` | singleLineText | HS company name — user reads this to decide which AT customer to map |
| Public Quote URL | `fldQxytU98niDmqu0` | url | Link to read the actual quote in HubSpot |
| Quote Title | `fldednnLaxvKeH26Z` | singleLineText | |
| Currency | `fld7opmszZ9yOy3PP` | singleLineText | |
| Allocated Jobs | `fldcxtVQn8aTaK6hm` | number | User sets this — how many jobs the quote needs |
| Jobs Opened | `fldD8PSiUVsxr6Dx6` | count | Auto-counts records in the Jobs link field |
| Allocation Progress | `fld9UI8iTHD89mOC5` | formula | `{Jobs Opened} / {Allocated Jobs}` → percent |
| Jobs | `flduqcUClFQMG8uMY` | multipleRecordLinks | Links to Jobs. **Inverse on Jobs: `fldr7l2cjqxoR7qQV`.** Auto-populates when a job sets the HS quote link. |
| Related Job | `fldKWlwClNSwNPEc2` | multipleRecordLinks | Different link to Jobs. Inverse: `fldsONbfto0Nkpn2n`. **Don't touch.** |
| Customer (AT) | `fldxsduX5imgE5hNW` | multipleRecordLinks | **Newly created.** → Customers (`tblhzcjYQk0NJCv9v`). `prefersSingleRecordLink: true`. Inverse: `fld9ZRUoFm0z4iQHe`. |
| Created | `fldxhSXasW6iV6Psw` | createdTime | |

### Jobs (`tblwHj9cO37wp1fVx`)

| Field | ID | Type | Notes |
|---|---|---|---|
| ID | `fldcbFW9pJzt3ZIVh` | formula | Primary field |
| Location | `flddTDwVWOq7fc1Je` | multipleRecordLinks | → Job Locations |
| BOM | `fldMsBGHYoDkBxvBM` | multipleRecordLinks | → BOM |
| Service | `fldexkzrV3Z1z270B` | singleSelect | Options: Digital signage, Music streaming, Test |
| Partner | `fldw2W2UmvTJiIuSY` | multipleRecordLinks | → Partners |
| Job type | `fldk5E1PkIy1ZrM1e` | singleSelect | Options: Collect, Delivery, Installation, Rework, Survey, Un-installation, Ma - Audit, Ma - Preventive, Ma - Reactive, Account setup, Pre-sale |
| Status | `fld7q5wjIg47nltes` | singleSelect | Options: Done, Incomplete, Installed, Scheduled, Tentative, Unscheduled, Cancelled |
| Date - Scheduled | `fld19en5UMabiUnqG` | date | |
| Assigned to | `fld9PbrU1Lw8IvCzy` | multipleCollaborators | |
| HS - Quotes | `fldr7l2cjqxoR7qQV` | multipleRecordLinks | → HS - Quotes. **Inverse: `flduqcUClFQMG8uMY`. This is the link the extension sets.** |
| HS - Quotes 2 | `fldsONbfto0Nkpn2n` | multipleRecordLinks | **Don't touch.** |
| Quotes (AT) | `fldxruMq0GY3eP9cO` | multipleRecordLinks | → AT Quotes table. Not used in this flow. |

### BOM Resources (`tblAHbCtXG4w9tzSF`)

| Field | ID | Type |
|---|---|---|
| Resources | `fldJWgcTlCdXLJca0` | multipleRecordLinks → Resources |
| Resources - Quantity | `fldX9nW8yWPagrPTt` | number |
| BOM | `fldUq5csjuSb50Ay1` | multipleRecordLinks → BOM |

### Job Locations (`tbl5Nj3zs3nxKPdEv`)

| Field | ID | Type |
|---|---|---|
| ID | `fldH1vrhUnKiwwpCA` | multilineText (primary) |
| Name | `fldqsL7TAKvXlgXiD` | singleLineText |
| Customer | `fld50gjrLkGm9UAWa` | multipleRecordLinks → Customers |
| Address - EN | `fldFKRQqqgq6ciM3N` | multilineText |
| Country | `fld2HASuI5dQ03JFG` | multipleRecordLinks → Countries |

**⚠️ This table is a bidirectional sync. `createRecordAsync` might fail if writes aren't allowed from this base. Test this — if it fails, remove the "create new" location mode and have the user create locations in the Locations base first.**

### Resources (`tbl6eFWh1yj7wjiGL`)

| Field | ID | Type |
|---|---|---|
| Name | `fld736xl5W3Mahu9I` | multilineText (primary) |
| Model | `fldJZ1YhZgDDU9Fw2` | singleLineText |

### Partners (`tblkK66QqEkfAKb2S`)

| Field | ID | Type |
|---|---|---|
| Name | `fldpNi9OwkPGLN03a` | formula (primary) |

### Customers (`tblhzcjYQk0NJCv9v`)

| Field | ID | Type |
|---|---|---|
| ID | `fldVUI3Tf7Zt8kB8E` | multilineText (primary) |

### Countries (`tblPY2wcrdWOvYnkd`)

| Field | ID | Type |
|---|---|---|
| Name | `fld1mAL19wYygGhIK` | singleLineText (primary) |

---

## Record Creation Chain

```
1. Location (only if "create new" mode)
   → locationsTable.createRecordAsync({
       fldqsL7TAKvXlgXiD: name,
       fld50gjrLkGm9UAWa: [{ id: customerId }],
       fldFKRQqqgq6ciM3N: address,
       fld2HASuI5dQ03JFG: [{ id: countryId }],
     })
   → returns locationId

2. BOM (empty shell)
   → bomTable.createRecordAsync({})
   → returns bomId

3. BOM Resources (one call per resource line)
   → bomResourcesTable.createRecordAsync({
       fldJWgcTlCdXLJca0: [{ id: resourceId }],
       fldX9nW8yWPagrPTt: quantity,
       fldUq5csjuSb50Ay1: [{ id: bomId }],
     })

4. Job
   → jobsTable.createRecordAsync({
       flddTDwVWOq7fc1Je: [{ id: locationId }],
       fldMsBGHYoDkBxvBM: [{ id: bomId }],
       fldexkzrV3Z1z270B: { name: service },
       fldw2W2UmvTJiIuSY: [{ id: partnerId }],
       fldk5E1PkIy1ZrM1e: { name: jobType },
       fld7q5wjIg47nltes: { name: status },
       fld19en5UMabiUnqG: dateScheduled,
       fld9PbrU1Lw8IvCzy: assignedToIds.map(id => ({ id })),
       fldr7l2cjqxoR7qQV: [{ id: quoteRecordId }],   // ← links job to HS quote
     })
```

After step 4, the inverse link auto-populates `flduqcUClFQMG8uMY` (Jobs) on the HS - Quotes record → `fldD8PSiUVsxr6Dx6` (Jobs Opened count) increments → `fld9UI8iTHD89mOC5` (Allocation Progress) updates → stage logic returns "done" when Jobs Opened >= Allocated Jobs.

---

## Stage Logic (computed in JS)

```
if Quote Status ≠ "Accepted" → skip (don't show in queue)
if Quote Type (HS) has none of [Installation, Hardware, Maintenance, Delivery] → skip
if Customer (AT) is empty → "needs_customer"
if Allocated Jobs is empty or 0 → "needs_allocation"
if Jobs Opened >= Allocated Jobs → "done"
else → "ready"
```

---

## Service Mapping

| HS - Quotes `Quote Service (HS)` | Jobs `Service` |
|---|---|
| Digital Signage | Digital signage |
| Music Streaming | Music streaming |

---

## Current Bug — Must Fix Before Extension Loads

**Error:** `Uncaught TypeError: Cannot read properties of null (reading 'id')` at `bundle.js:71:5701`

**Root cause:** Countries table was commented out from `getCustomProperties` and `useRecords` to avoid a loading crash, but `QuoteWorkspace` still expects `countriesTable` and `countries` as required props. `QuoteStagingApp` still passes `countriesTable!` (the `!` non-null assertion lies to TypeScript — the value is actually `undefined`). Inside `QuoteWorkspace`, this line crashes:

```tsx
const countryOptions = (countries ?? []).map(c => ({
    id: c.id,
    label: getFieldStr(c, countriesTable, F.cty_name) || c.id,
    //                      ^^^^^^^^^^^^^^ this is undefined → passes null to getFieldIfExists → crash
}));
```

**Fix — three spots:**

1. `QuoteWorkspace` props interface and function signature: make `countriesTable` and `countries` optional, or remove them entirely.

2. `QuoteStagingApp` render: remove these two prop lines from `<QuoteWorkspace>`:
   ```tsx
   countriesTable={countriesTable!}
   countries={countries}
   ```

3. `QuoteWorkspace` body: guard `countryOptions`:
   ```tsx
   const countryOptions: { id: string; label: string }[] = [];
   ```
   And optionally hide the Country dropdown in the "create new location" form, or wrap it in a `{countryOptions.length > 0 && ...}` conditional.

---

## What's Left To Do

### Must do (blocking)
1. **Fix the Countries bug** — see section above
2. **Verify the extension loads** after the fix

### Should do (before production use)
3. **Test full creation chain** — quote → customer → allocation → location → BOM → job details → create. Verify job appears with HS quote link.
4. **Test location creation** — verify `createRecordAsync` on the synced Job Locations table. If permission error, remove "create new" mode.
5. **Test `updateRecordAsync`** on HS - Quotes — customer mapping and allocation steps write to the quote record.

### Nice to have (v2)
6. **Customer alias auto-matching** — mapping table so repeat HS companies auto-fill Customer (AT)
7. **Wire Countries back in** properly as an optional dependency
8. **Clarify AT Quotes table relationship** — should HS-quote-sourced jobs also create a record in the AT-native Quotes table (`tbldE1r6MKSgebujM`)?
