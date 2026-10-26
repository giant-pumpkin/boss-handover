# Quote-to-Operations: HubSpot to Jobs

Slug `quote-to-operations-hubspot` · version 1 · status Draft · last reviewed 2026-04-01 · owner Yves

**Scope:** bases Data, Jobs, Inventory; tables Data > HS - Quotes
Data > Quote - Line Items
Data > Quotes (legacy, role unclear)
Jobs > HS - Quotes (synced from Data)
Jobs > HS - Quotes - LI (synced from Data)
Jobs > Quotes
Jobs > BOM
Jobs > BOM Resources
Jobs > Jobs
Jobs > Subscription Contracts
Jobs > Resources (synced from Inventory)
Jobs > Job Locations (synced from Locations)
Jobs > Customers (synced from Locations)
Jobs > Tasks
Jobs > Inventory (synced from Inventory)
Inventory > Resources (source of truth)

**External systems:** HubSpot

**Interfaces:** Interface Step 1: Quote Enrichment (exact name TBD, needs to be documented)
Interface Step 2: Job Creation (exact name TBD, needs to be documented)
Interface Step 3: Resource Allocation / BOM (exact name TBD, needs to be documented)

# Quote-to-Operations Workflow: HubSpot to Jobs

## Workflow Summary

This document describes the end-to-end lifecycle of a commercial quote originating in HubSpot, flowing through the Data base as a staging layer, and arriving in the Jobs base where it is decomposed into executable operational objects (Quotes, BOMs, BOM Resources, Jobs, Subscription Contracts, and Inventory associations).

---

## Phase 0: Resource Catalog Preparation (Inventory to HubSpot)

The Resources table in the Inventory base is the master product catalog. A subset of resources is flagged for HubSpot sync. A HubSpot workflow imports these flagged resources as HubSpot Products, keyed on a shared SKU ID.

This establishes a single source of truth: the BD team can only select SKUs in HubSpot that originate from the Airtable product catalog. No orphan products can be quoted.

## Phase 1: Quote Creation and Approval (HubSpot)

The BD team creates quotes in HubSpot by selecting from the imported SKU catalog. Each quote contains line items with SKU, quantity, unit price, billing terms, duration, and category (Hardware, Software, Service).

Once the quote reaches an approved status in HubSpot, a HubSpot workflow pushes the quote record into Airtable.

Landing zone: Data > HS - Quotes (tblhX7SNxLUje9Rac), Data > Quote - Line Items (tblpZg6JsXtzkb0li)

## Phase 2: Hydration and Line Item Association (Data Base)

An automation in the Data base detects new HS - Quotes records and hydrates them: populating derived fields and associating line items from Quote - Line Items. The sys_line_items_created checkbox on HS - Quotes confirms all line items have been associated.

## Phase 3: Sync to Jobs Base

HS - Quotes and its line items sync from Data to Jobs. The Trigger checkbox on HS - Quotes (Jobs side) and the sys_quote_request_sent flag control the automation flow. Once the synced HS - Quote arrives in Jobs, an automation creates a corresponding record in the Quotes table.

## Phase 4: Quote Normalization (Jobs Base)

The synced HS - Quote triggers creation of a native Quote record in Jobs > Quotes (tbldE1r6MKSgebujM). Source = HubSpot. The system then auto-creates a master BOM (type = Quote) and BOM Resources (one per line item, SKU-matched). The sys_bom_created checkbox confirms completion. Alert - No SKU match flag raised if no matching Resource is found.

## Phase 5: Quote Enrichment (Jobs Base, Interface Step 1)

Manual enrichment via interface: Airtable Customer mapping, projected locations (Job location link, free text, or doc attachment), contract start date, subscription contract creation (auto-triggered for software-category lines). Stage - Enrich tracks progress.

## Phase 6: Job Creation (Jobs Base, Interface Step 2)

Admin creates Jobs (one per location). Each Job auto-gets a BOM (type = Job) and is linked to the Quote. Jobs can be scheduled without a location assigned.

## Phase 7: Resource Allocation (Jobs Base, Interface Step 3)

Admin allocates resources to each Job's BOM. Job-level BOM Resources link back to master BOM via Parent field. Delta and MRP % complete formulas show allocation progress.

## Phase 8: Operational Execution

Jobs progress through statuses. Tasks created, partners assigned, inventory reserved/installed, subscription contracts activate, job reports/delivery notes captured, Sync checkbox triggers inventory flow back to Inventory base.

## Exception paths

- HubSpot push fails silently: No reconciliation mechanism exists. Approved quotes can stall without visibility.
- SKU match fails (Alert - No SKU match): BOM Resource created without Resource link. No queue or recovery path documented.
- Quote revised after push: No versioning or amendment mechanism described. Unclear if new record or update.
- Partial automation failure (sys\_bom\_line\_created): If automation errors mid-batch, some line items get BOM Resources and others don't. No monitoring for stale unprocessed records.
- Admin creates fewer jobs than location scope: No enforcement, only informational formulas (Locations - Done %, Check - Locations).

## Known gaps

- HubSpot-to-Airtable is one-directional and brittle, no reconciliation
- SKU matching failure mode has no recovery path
- Contract start date is manual with no guardrails
- No quote versioning or amendment handling
- Location scope loosely validated
- BOM tally is informational, not enforced
- No rollback or undo capability
- Multi-currency handling is implicit
- Data base Quotes table (tblbGkzCmn5IGDype) is orphaned from this workflow, role unclear
- Planning - Job - BOM Resources link field undocumented in narration
- Interface names not formally captured
