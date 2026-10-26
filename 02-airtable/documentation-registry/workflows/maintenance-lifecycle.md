# Maintenance Package Lifecycle

Slug `maintenance-lifecycle` · version 1 · status Active · last reviewed 2026-04-02 · owner 

**Scope:** bases Jobs; tables Jobs > MA packages
Jobs > MA items
Jobs > Jobs
Jobs > MA jobs

# Maintenance Package Lifecycle

## Workflow Summary

A maintenance package version is assigned to a location, its line items are exploded into job scaffolding, and scheduled maintenance jobs are extended with MA-specific execution data. This workflow governs the generation of all maintenance work from a templated package structure through to scheduled execution.

---

## Core Tables Overview

### Ma - Packages (tblolQwuQPsrlk49C)
**Purpose:** Maintenance package template table defining recurring or reactive maintenance scope for linked customers, BOM context, and job locations. Packages act as the parent template layer from which linked maintenance items drive automated maintenance job creation.

**Key architectural role:** Parent template container linking customer, BOM, validity window, and child Ma - Items. The staging link field on job-locations triggers package explosion automation.

### Ma - Items (tblLHrvLMfFtwFy03)
**Purpose:** Atomic maintenance template table linked to Ma - Packages. Each record defines a maintenance obligation by type, validity period, and optional cycle assignment. Serves as the executable rule set used by automation to create maintenance jobs for attached locations.

**Key architectural role:** Executable template layer. One Ma - Item generates one Job record during package explosion. Job type field determines PM vs RM, Cycle link governs cadence logic for PM items.

### Ma - Cycles (tblWRW1I8yCMdvdgq)
**Purpose:** Reference scheduling table that standardizes preventive maintenance cadence into reusable cycle buckets. Linked to Ma - Items to group template-driven preventive maintenance work into predefined execution cycles for planning and operational control.

**Cadence logic:** PM items link to cycles defining execution frequency. Minimum 3-month gap after installation before first PM execution. Subsequent PM jobs maintain 3-4 month intervals. Reactive items remain ad hoc.

### Ma - Jobs (tblyPl0fsMSDW2uGQ)
**Purpose:** Maintenance-specific extension table derived from Jobs, created automatically for scheduled maintenance jobs. Captures structured maintenance inspection data, evidence, and report controls without widening the core Jobs table.

**Key architectural role:** Execution layer extension. Created only after Job receives scheduled date. Contains inspection checklists (connectivity, mounts, screens), evidence attachments (images, comments by category), and report generation controls. Single-record link back to parent Job.

---

## Workflow Phases

### Phase 0: MA Package Assignment

**What happens:** A user or upstream process stages a new MA package assignment to a location via the synced Locations table. The staged package assignment is recorded in a dedicated link field.

**Tables involved:**
- **Read:** Locations (synced copy in Jobs base)
- **Read:** Ma - Packages
- **Write:** Locations (staged package assignment field)

**Control mechanism:** Locations staging link field triggers automation. Ma - Packages validity window (Valid from/to) and Version field control package applicability and renewal position.

**Automation:** Workflow automation monitors the MA package staging field. When a link is placed, Phase 1 triggers.

---

### Phase 1: Package Explosion

**What happens:** Automation reads the staged package assignment and iterates over all child MA items linked to that package. For each MA item, a Job record is created with scaffolding initialized from the item's type, validity window, and lifecycle status.

**Tables involved:**
- **Read:** Ma - Packages (parent record)
- **Read:** Ma - Items (children of package)
- **Write:** Jobs (new records with scaffolding)
- **Write:** Locations > Ma package (staged) - cleared after explosion

**Control fields:** Ma - Items > Job type determines PM or RM. Valid from/to dates copied to Jobs scaffolding. Status (computed lifecycle) copied to Jobs. Cycle link (PM only) controls cadence logic. Jobs > Status set to Pending or Scheduled.

**Automation logic:**
1. Read location and package from staged link
2. Query all Ma - Items linked to package
3. Create one Job record per MA item with inherited metadata
4. Clear staging link to prevent repeated explosion

**Cadence logic (PM items):** PM items may link to Ma - Cycles defining execution frequency. Minimum 3-month gap after installation before first PM execution. Subsequent PM jobs maintain 3-4 month intervals. Reactive items remain ad hoc, no cadence-bound scheduling.

---

### Phase 2: Job Scheduling

**What happens:** Jobs created in Phase 1 remain unscheduled until a user assigns an execution date. When a scheduled date is set, a corresponding Ma - Jobs record is created to hold MA-specific execution detail.

**Tables involved:**
- **Read:** Jobs (maintenance job with scheduled date)
- **Write:** Ma - Jobs (new extension record)

**Control mechanism:** Jobs > Scheduled Date field triggers Ma - Jobs creation. Ma - Jobs > Job field establishes single-record link back to parent.

**Automation:** Workflow automation monitors Jobs for scheduled maintenance jobs. When date is set, automation creates Ma - Jobs record linked to Jobs.

---

### Phase 3: MA Jobs as Execution Layer

**What happens:** Ma - Jobs record stores maintenance-specific operational data (inspection checklists, evidence attachments, completion notes) without overloading main Jobs table. Separation allows Jobs to remain generic scaffolding while Ma - Jobs contains specialized execution context.

**Tables involved:**
- **Read:** Jobs (parent record, execution state)
- **Write:** Ma - Jobs (extended execution data)

**Execution data categories:**
- **Inspection checklists:** Tick fields for connectivity (power sockets/cables, network sockets), mounts, screens (cleaning, performance checks for pixels/discoloration)
- **Evidence capture:** Images and comments fields organized by inspection category (connectivity, mounts, screens - cleaning, screens - performance, installation)
- **Report controls:** Trigger - Create report checkbox, Document - Job report lookup, Reviewed flag

**Critical mechanics:** Ma - Jobs records created only after Job is scheduled with date. Single Job may not have Ma - Jobs record until scheduled. Ma - Jobs table is specialized, contains only scheduled/executed maintenance.

---

## Data Flow Diagram

```
Location → MA package assignment staged (Locations > Ma package [staged])
        ↓
    Automation (Phase 1):
    read package + items
        ↓
    Ma - Items exploded → Job scaffolding created
        ↓
    Jobs (unscheduled, Status: Pending)
        ↓
    User assigns Scheduled Date
        ↓
    Automation (Phase 2):
    detect date set
        ↓
    Ma - Jobs record created (linked via Job > Ma - Job link field)
        ↓
    Ma - Jobs (execution layer: inspection checklists, evidence, reports)
```

---

## Exception Paths

### Explosion Failure
If package explosion automation fails mid-iteration (script timeout, quota exceeded), some MA items may be exploded and others not. The staging link is cleared regardless of partial failure, so package will not re-trigger.

**Mitigation:** Implement explicit error logging in automation. Clear staging link conditionally only after all items succeed, or implement recovery automation to detect and re-trigger incomplete explosions.

### Overlapping Validity Windows
If two MA packages with overlapping validity windows are assigned to same location, both will explode and generate duplicate jobs.

**Mitigation:** Add validation step before staging to ensure no overlapping validity windows exist for same location.

### Scheduling Without MA Jobs Creation
If scheduling automation fails to create Ma - Jobs record after date is set on Jobs record, maintenance work is scheduled but lacks MA-specific execution context.

**Mitigation:** Implement reconciliation automation to detect Jobs with scheduled dates but no linked Ma - Jobs and retry creation.

---

## Gaps and Known Issues

1. **No explicit audit trail of package assignments.** Staging link is transient; once cleared, no record of which package was assigned when exists. This is by design (stage, explode, clear), not a gap.

2. **Reactive and preventive cadence logic may be implicit in automation.** Three-month gap and 3-4 month interval rules are part of automation logic and should be documented in related automations.

3. **Package explosion is all-or-nothing by design.** When location needs complete maintenance package, all items exploded together. Partial package assignment not supported.

4. **Version field on Ma - Packages tracks renewal position.** Version field allows distinguishing successive packages assigned to same location over time, preventing accidental reuse.

5. **Synced Locations table as integration point.** Package assignment happens on Jobs base copy of Locations via staging link field. This is designed control surface for triggering package explosion.

## Known gaps

See Gaps and Known Issues section in MD Description.

## Notes

Initial documentation from live system flow.
