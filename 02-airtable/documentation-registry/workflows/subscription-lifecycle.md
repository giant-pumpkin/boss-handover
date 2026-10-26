# Subscription Lifecycle: Contract Allocation to Subscription

Slug `subscription-lifecycle` · version 1 · status Draft · last reviewed 2026-04-02 · owner 

**Scope:** bases Inventory; tables Inventory > Subscription contracts
Inventory > Subscriptions
Inventory > Inventory
Inventory > Subscription types
Inventory > Customers

# Subscription Lifecycle: Contract Allocation to Operational Subscription

## Workflow Summary

Subscription contracts are operational allocation records that define subscription entitlement terms for a customer. When a contract allocation is linked to an inventory item (either physical hardware or a virtual placeholder for non-hardware subscriptions), automation creates a corresponding operational subscription record. Status for both entities is derived from start date, end date, and termination logic. Termination can occur directly on individual subscriptions or at the contract allocation level, in which case automation cascades termination to all associated subscriptions.

Subscription allocation to inventory can occur in two ways: manually by adding the contract to a staging link field on inventory, or automatically when a job is finalized (status set to Done) by an automation that links all installed inventory items to the subscription contract that exists at the bond level of the job.

## Phases

### Phase 0: Contract Allocation Creation

**Action:** Manual record creation in Subscription contracts table (Inventory base)

**Tables involved:**
- WRITE: Subscription contracts (tbld4LENkTfJGPWnP)
- READ: Customers (lookup for customer reference)
- READ: Subscription types (lookup for subscription type reference)

**Control fields:**
- Customer (link field, required)
- Subscription type (link field, required)
- Start date (required)
- Subscription duration (required, in months)
- Free-of-charge duration (optional, in months, default 0)

**Derived fields (formula-driven):**
- Contract end date: formula = start date + (subscription duration + free-of-charge duration in months)
- Contract status: formula-driven, derived from start date, end date, and termination logic

**Notes:** The contract record serves as the commercial origin point. No subscription entity is created at this stage. The contract is merely an allocation template.

---

### Phase 1: Inventory Assignment (Two Pathways)

#### Phase 1A: Manual Assignment

**Action:** Manual link from contract allocation to inventory item via staging link field

**Tables involved:**
- UPDATE: Inventory (Subscription contract - Add new staging field)
- READ: Subscription contracts (source contract record)
- READ: Virtual inventory (if subscription is non-hardware)

**Control fields:**
- Subscription contract - Add new (on Inventory, staging link field that triggers automation)

**Inventory carrier types:**
- Physical: Serialized hardware inventory item with device serial number, location, and asset tracking
- Virtual: Non-serialized placeholder inventory record for software/web-based subscriptions (e.g., Royal Streaming web player or subscriptions for customer-owned devices)

**Notes:** This staging link is cleared by the Create subscription automation in all branches (success or failure), making it a transient trigger mechanism rather than durable state.

---

#### Phase 1B: Automated Assignment (Job Finalization)

**Action:** Automated allocation when a job is finalized (status set to Done)

**Automation:** Ingest SNs - Installation (Inventory base, appRor1ipbYAb4K7z)
**Trigger:** Webhook from Jobs base when job status transitions to Done
**Webhook URL:** https://hooks.airtable.com/workflows/v1/genericWebhook/appRor1ipbYAb4K7z/wfl1YUiIjdVT3b66E/wtr8U2pX8am4WbV1M

**Tables involved:**
- READ: Jobs base (job record with installed inventory serial numbers and subscription contract at bond level)
- UPDATE: Inventory (status, installation date, location, subscription contract staging link)

**Automation logic:**
1. Webhook payload contains:
   - SNs: Comma-separated serial numbers of inventory items installed during this job
   - Date - Actual: Installation completion date
   - Location: Installation location reference
   - Subscription - Contract: Reference to subscription contract from job bond level
2. Normalize serial numbers:
   - Split by comma
   - Trim whitespace
   - If length == 15, trim to first 14 characters
3. For each normalized serial number:
   - Query Inventory where ID contains the serial number
   - For each matched inventory record:
     - Set Status = "Installed"
     - Set Installation date = webhook.Date - Actual
     - Clear Location - Stock
     - Set Location - Installation = webhook.Location
     - Set Subscription contract - Add new = webhook.Subscription - Contract

**Critical behavior:** Populating the Subscription contract - Add new staging link triggers the Create subscription automation (Phase 2), establishing the same downstream flow as the manual assignment path.

**Use case:** When a field installation job is completed, all hardware deployed during that job is automatically transitioned to Installed status and linked to the contract defined at the job level, triggering subscription creation without manual intervention.

---

### Phase 2: Subscription creation (Automated)

**Automation trigger:** Inventory.Subscription contract - Add new staging field is populated (from either Phase 1A or Phase 1B)

**Automation:** Create subscription (Inventory base, appRor1ipbYAb4K7z)
**Automation URL:** https://airtable.com/appRor1ipbYAb4K7z/wflzWWNSCGdhtHrbv

**Tables involved:**
- READ: Inventory (trigger record)
- READ: Subscription contracts (source contract with start date)
- QUERY: Subscriptions (check for existing subscription on this inventory-contract pair)
- WRITE: Subscriptions (new record creation on success path)
- UPDATE: Inventory (move staging link to permanent link, clear staging field)
- NOTIFY: Slack (on missing contract start date)

**Automation logic:**
1. Trigger: Inventory.Subscription contract - Add new is not empty
2. Query Subscription contracts to retrieve contract with start date
3. Query Subscriptions to check if subscription already exists for this inventory-contract pair
4. Branch logic:

**Branch A: Missing contract start date**
- IF: Contract has no start date
- THEN: Send Slack notification, clear staging link (failure path)

**Branch B: Create subscription (success path)**
- IF:
  - Contract has start date
  - Inventory.Player == "Yes"
  - No existing subscription found for this inventory-contract pair
  - Staging link is populated
  - Inventory.Spare == FALSE
- THEN:
  1. Create new Subscriptions record:
     - Link to Inventory (trigger record)
     - Set Start date (from contract)
     - Link to Subscription contract (from staging link)
  2. Update Inventory:
     - Move staging link to permanent Subscription contract link field
     - Clear Subscription contract - Add new staging field

**Branch C: Clear staging link (all other conditions)**
- ELSE: Clear Subscription contract - Add new staging field (no subscription created)

**Critical mechanics:**
- Subscription contract - Add new acts as a temporary staging link, not durable state
- Subscription creation is restricted to non-spare inventory explicitly marked as player inventory
- Existing subscription detection prevents duplicate subscription creation for the same inventory-contract pairing
- The staging link is cleared in all branches (success, failure, no-op), making the process self-resetting but also destructive for troubleshooting

---

### Phase 3: Subscription Lifecycle Status (Formula-Driven)

**Tables involved:**
- READ: Subscriptions (all records)
- READ: Subscription contracts (status inheritance)

**Status derivation for Subscriptions:**

- **Scheduled:** Start date is in the future (current date < start date), and not terminated
- **Active:** Current date is between start date and end date (start date ≤ current date ≤ end date), and not terminated
- **Expired:** End date is in the past (current date > end date), and not terminated
- **Terminated:** Termination flag is true (overrides date logic)

**Status derivation for Subscription contracts (parallel to Subscriptions):**

- **Scheduled:** Start date is in the future (current date < start date), and not terminated
- **Active:** Current date is between start date and end date (start date ≤ current date ≤ end date), and not terminated
- **Expired:** End date is in the past (current date > end date), and not terminated
- **Terminated:** Terminate checkbox is checked on the contract allocation

**Critical rule:** Status is always derived from dependencies (dates and termination flags) and reconstructed in real-time by formula. Status fields are never manually edited. This ensures consistency between contract and subscription lifecycle.

---

### Phase 4: Termination (Two Control Points)

**Termination Type A: Subscription-Level Termination**

**Action:** Manual checkbox toggle on individual Subscriptions record

**Tables involved:**
- UPDATE: Subscriptions (Terminate checkbox)

**Effect:** That specific subscription transitions to Terminated status immediately (formula evaluation). Does not affect other subscriptions from the same contract allocation.

**Use case:** Subscription is cancelled for a specific inventory item, but contract allocation remains active for other items.

---

**Termination Type B: Contract-Level Termination (Cascade)**

**Action:** Manual checkbox toggle on Subscription contracts record (Terminate checkbox)

**Tables involved:**
- UPDATE: Subscription contracts (Terminate checkbox)
- QUERY: Subscriptions (all records linked to this contract)
- UPDATE: Subscriptions (Terminate checkbox set to true for all found records)

**Automation logic:**
1. Detect when Terminate checkbox is toggled to true on a Subscription contracts record
2. Query all Subscriptions records where Subscription contracts link matches the source record
3. For each matching Subscription, set Terminate checkbox to true
4. Those subscriptions immediately transition to Terminated status via formula

**Effect:** All subscriptions created from this contract allocation are terminated simultaneously. The contract allocation itself transitions to Terminated status (formula-driven). This is a parent-to-child state propagation.

**Use case:** Customer's entire subscription agreement is cancelled; all associated subscriptions (across potentially multiple inventory items) must terminate together.

**Failure modes:**
- Cascade automation fires multiple times or partial termination occurs: Ensure query uniqueness on Subscription contracts link and implement idempotent logic (check if Terminate is already true before updating).
- New subscriptions created after contract termination: Should inherit termination status from parent contract at creation time (Phase 2 automation should detect Terminate flag on contract and set it on the created subscription).

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 0: Contract Allocation Creation                           │
│ User creates Subscription contracts record with Customer,       │
│ Type, Start, Duration                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1: Inventory Assignment (Two Pathways)                    │
│                                                                 │
│ ┌─────────────────────┐       ┌─────────────────────────────┐ │
│ │ 1A: Manual          │       │ 1B: Automated (Job Done)    │ │
│ │ Link contract to    │  OR   │ Webhook → Ingest SNs -      │ │
│ │ staging field       │       │ Installation automation     │ │
│ └─────────────────────┘       └─────────────────────────────┘ │
│                                                                 │
│ Both paths populate Subscription contract - Add new staging    │
│ link on Inventory record                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ [TRIGGER]
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase 2: Automation creates Subscriptions record                │
│ (Create subscription automation)                                │
│ Links subscription back to contract and inventory carrier,      │
│ clears staging link in all branches                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase 3: Formula-driven status lifecycle (continuous)            │
│ Scheduled > Active > Inactive (or Terminated at any point)       │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ Phase 4A: Subscription-level │  │ Phase 4B: Contract-level    │
│ termination (isolated)        │  │ termination (cascade)       │
│ One subscription affected     │  │ All subscriptions from      │
│                              │  │ contract affected           │
└──────────────────────────────┘  └──────────────────────────────┘
```

## Virtual Inventory Support

For subscriptions without physical hardware (e.g., Royal Streaming web players on customer-owned devices), virtual inventory items are created as non-serialized placeholders. The workflow is identical; virtual inventory serves as the inventory carrier instead of physical hardware.

## Gaps and Risks

1. **Automation idempotency:** If Phase 2 fires multiple times, duplicate subscriptions could be created. Add pre-creation check for existing subscription for this contract-inventory pair.

2. **Termination cascade timing:** Contract-level termination is asynchronous. New inventory links added after cascade begins may not inherit termination status. Prevent new links on terminated contracts via interface validation.

3. **Virtual inventory ID uniqueness:** Use auto-increment or UUID generation. Do not rely on manual ID assignment.

4. **Formula-driven status:** If date formulas have errors, incorrect status propagates everywhere. Unit test all date formulas with edge cases. Document formula dependencies.

5. **Inventory carrier deletion:** If linked inventory is deleted, subscriptions become orphaned. Implement database constraints preventing deletion of inventory with active subscriptions.

6. **Job finalization webhook failure:** If Ingest SNs - Installation webhook fails or times out, inventory items remain in pre-installation state and subscription records are not created. No retry mechanism exists. Consider implementing webhook delivery confirmation and manual reconciliation interface.

7. **Serial number normalization edge cases:** 15-character serial numbers are trimmed to 14 characters in normalization logic. If inventory ID field contains 15-character values that differ only in the final character, wrong inventory items may be matched.

8. **Staging link race condition:** If multiple jobs complete simultaneously and reference the same inventory items, staging link could be overwritten before Create subscription automation processes the first assignment.

## Exception Paths

1. **Inventory link removed after subscription creation:** Subscription remains orphaned. Constraint: inventory links are immutable once subscription is created; termination flow must be used.

2. **Subscription type changed on contract:** Existing subscription retains original type; contract and subscription diverge. Lock subscription type after materialization; create new contract flow if type change needed.

3. **Cascade flag set then unset before automation completes:** Partial termination. Use idempotent cascade logic; log all operations.

4. **Customer deleted with active subscriptions:** Subscription becomes orphaned; reporting broken. Prevent customer deletion if active subscriptions exist.

5. **Virtual inventory linked to hardware-only subscription type:** Violates semantic intent. Add UI validation rule preventing this combination.

6. **Job finalized but subscription contract missing at bond level:** Webhook fires but Subscription - Contract field is empty. Ingest SNs - Installation sets staging link to empty, Create subscription automation clears it with no subscription created. No error notification. Add validation to Jobs interface preventing job finalization without contract.

7. **Inventory status already Installed when job finalizes:** Webhook overwrites existing installation date and location. If inventory was previously installed at different location, historical tracking is lost. Consider status-based guard condition in Ingest SNs - Installation automation.

8. **Serial number not found in Inventory:** Normalization and query logic silently skip unmatched serial numbers. No error raised, no notification sent. Add webhook response logging or Slack notification for unmatched serials.

## Exception paths

- New inventory linked to terminated contract before cascade completes
- Formula-driven status derivation errors; Inventory deletion orphans subscriptions
- Inventory link removal after subscription creation
- Subscription type change after materialization
- Customer deletion with active subscriptions;

## Known gaps

- Add idempotency check for Phase 2 automation
- Prevent new inventory links to terminated contracts
- Use auto-increment for virtual inventory IDs 
- Unit test date formulas with edge cases
- Implement deletion constraints for linked inventory
- Make inventory links immutable after subscription creation
- Lock subscription type after materialization
- Clearly document all formula status fields as derived, read-only state
- Add UI validation for virtual vs. hardware-only subscriptions
- Log all termination cascade operations with audit trail
