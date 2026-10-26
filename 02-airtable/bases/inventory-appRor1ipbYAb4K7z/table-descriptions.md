# Inventory: table descriptions

From the `Documentation - Base - Structure` registry, 2026-10-26. See also [`schema.json`](schema.json).

## Attributes (`tblUUZEsKbUgQ2URA`)

### Purpose

Extend resource properties dynamically with custom metadata. Attributes act as a flexible schema layer that defines specifications and properties applicable across resources without hardcoding fields into Resources or Inventory.

### Key data

Attributes contain: Name (human label), Symbol (code reference), Group (category grouping), Status, Notes, and links to Specs. Each attribute record represents a single property type (e.g. 'Display size', 'Connection type', 'Brightness'). Specs records pair attribute definitions with concrete values.

### Relationship

One Attribute -> many Specs (Specs references back to Attribute). One Attribute -> many Resources (indirectly, through Specs). No direct inventory link; attributes inform resource classification and spec documentation.

### Scale

Typically 30,50 attribute definitions covering hardware specs, display properties, connectivity options, and environmental ratings. Grows as product portfolio expands or new spec dimensions are documented.

### Lifecycle

- Created: When a new specification dimension is identified (manual or inferred from Resources)
- Active: Referenced by one or more Specs records
- Archived: Flagged inactive when no longer used, Specs records remain intact (historical reference)

### Role in system

(Reference layer for technical metadata). Attributes normalize spec documentation and prevent duplication of spec property names across Resources. Enables spec sheets and quote generation to pull formatted values consistently. Acts as a vocabulary layer between raw product data (Resources) and downstream consumers (Quotes, Specs, Documentation).

### Data consolidation scope

Not applicable. Attributes are native to this base; no cross-base consolidation occurs.

### Data flow model

Resources -> Specs -> Attributes (reverse lookup). Documentation process: identify new spec dimension -> create Attribute -> link Specs to it. Quote generation: pull Specs grouped by Attribute, format values for PDF.

### System role

Enabler. Attributes do not drive operational workflows but anchor technical documentation integrity. Used heavily in quote PDF generation and spec sheet construction.

## Brand owners (`tblNot7erUUbArpLG`)

### Purpose

Represent corporate entities that own brands. Brand owners are the ownership abstraction above brands themselves.

### Key data

Each record contains: Brand owner name, Customer links, Subscription contract references. Brand owners are minimal identity records.

### Relationship

One Brand owner <- many Brands. One Brand owner <- many Customers. One Brand owner <- many Subscription contracts (reference).

### Scale

Typically 5-50 brand owners depending on portfolio diversity.

### Lifecycle

- Active: Operating
- Inactive: No longer active
- Archived: Historical reference

### Role in system

(Ownership taxonomy). Brand owners provide ownership segmentation above brands for commercial relationship management.

### Data consolidation scope

Not applicable. Brand owners are native to this base; no syncing.

### Data flow model

Brand owners <- Brands (ownership hierarchy). Customers <- Brand owners (relationship). Subscription contracts <- Brand owners (billing segmentation).

### System role

Enabler. Brand owners provide ownership taxonomy but are not core to operations.

## Brands (`tblzULqbssoVRTeG6`)

### Purpose

Represent commercial brand identities in the system. Brands are product/service brands that customers deploy and subscribe to.

### Key data

Each record contains: Brand name, Brand owner, Countries, Inventory count (deployed), Subscription count. Brands are commercial identities.

### Relationship

One Brand <- one Brand owner. One Brand -> many Inventory items (deployed). One Brand -> many Subscriptions (indirect). One Brand <- many Customers (commercial relationship).

### Scale

Typically 5-50 brands depending on portfolio.

### Lifecycle

- Active: Brand operating
- Inactive: No longer sold
- Archived: Historical reference

### Role in system

(Commercial identity). Brands represent the commercial product lines deployed in the field. Used for revenue reporting and customer relationship segmentation.

### Data consolidation scope

Not applicable. Brands are native to this base; synced to Locations and Tickets bases for reporting.

### Data flow model

Brand owners -> Brands (ownership). Inventory <- Brands (deployed). Subscriptions <- Brands (service delivery). Revenue reporting <- Brands (segmentation).

### System role

Core. Brands are essential for commercial reporting and relationship management.

## Consumable Movements (`tbl96hSKIBANAMqfa`)

### Purpose

Log consumption and movement of non-serialized consumable items. Consumable Movements provides an audit trail of quantity changes without individual unit tracking, complementing Inventory's serialized asset model.

### Key data

Each movement record contains: Resource (consumable SKU), Quantity (signed amount), Movement type (in/out/adjustment), Stock location (origin/destination), Country, and optional reference (job, project). Signed quantities enable net consumption calculation. No end-state derivation; movements are pure event logs.

### Relationship

One Resource (consumable) → many Movements. One Stock location → many Movements (for consumption tracking per warehouse). One Consumable Movements → one Job (optional, for job-specific consumption). One Country → many Movements (for geographic consumption reporting).

### Scale

Grows with consumable SKU count and job frequency. Typical scale: 500,2000+ movements per month for 10,20 active consumables across multiple locations.

### Lifecycle

- Created: At point of consumption, stock receipt, or inventory adjustment
- Active: Immutable after creation (append-only log semantics)
- Archived: Never; movements remain permanently for audit trail

### Role in system

(Audit and consumption layer). Consumables bypass the Inventory lifecycle model; Movements provide the only record of their quantity state. Enables per-location and per-job consumable cost attribution, stock reorder triggers, and historical consumption analysis.

### Data consolidation scope

Not applicable. Consumable Movements are native to the Inventory base; no cross-base syncing occurs.

### Data flow model

Resources (is\_consumable flag) → Jobs → Consumable Movements (created on consumption). Stock locations feed origin/destination for movements. No reverse lookups; movements drive stock queries and cost reporting.

### System role

Recorder. Consumable Movements do not trigger downstream automations but enable analytics, reorder logic, and cost allocation. Used in revenue recognition (COGS per job) and inventory valuation reporting.

## Countries (`tblzCLUEgLNXzjD18`)

### Purpose

Geographic and jurisdictional reference layer. Countries define regional boundaries for inventory, customers, and reporting.

### Key data

Each record contains: Name, Country code, Regions, Subdivisions, Brand assignments. Countries are the top-level geographic classifier.

### Relationship

One Country -> many Locations. One Country -> many Stock locations. One Country -> many Consumable Movements. One Country <- Customer assignment.

### Scale

Typically 5-50 countries depending on operating footprint.

### Lifecycle

- Active: Operating in territory
- Inactive: No longer operational
- Archived: Historical reference

### Role in system

(Reference/taxonomy). Countries provide geographic segmentation for cost allocation, regional compliance, and reporting. Used for currency selection and reorder scoping.

### Data consolidation scope

Not applicable. Countries are native to this base; no syncing.

### Data flow model

Locations -> Countries (geographic assignment). Stock locations -> Countries. Consumable Movements -> Countries (consumption attribution).

### System role

Enabler. Provides geographic taxonomy but does not execute operations.

## Customers (`tblxGzxvDjhH7NX1N`)

### Purpose

Customer identity and relationship layer. Customers define brand ownership and commercial entities that own subscriptions.

### Key data

Each record contains: Name, Brand owner, Country, Service eligibility, Contact details, Subscription contract count, Active subscription rollup. Customers are the commercial anchors.

### Relationship

One Customer -> many Locations. One Customer -> many Subscription contracts. One Customer -> many Subscriptions (indirect). One Customer <- Brand assignment.

### Scale

Typically 20-500+ customers depending on market coverage.

### Lifecycle

- Active: Ongoing relationship
- Inactive: No new contracts
- Archived: Historical reference

### Role in system

(Commercial layer). Customers aggregate subscriptions for billing, reporting, and commercial relationship management. All revenue flows through customer aggregation.

### Data consolidation scope

Not applicable. Customers are native to this base; synced to Locations and Tickets bases for reporting.

### Data flow model

Subscription contracts -> Customers (owner reference). Locations -> Customers (relationship). Revenue reporting <- Customers (aggregation point).

### System role

Core. Customers are essential for commercial operations and revenue recognition.

## Delivery notes (`tblzn0AD1zje8ZmEA`)

### Purpose

Document physical asset handoff between shipper and receiver. Delivery notes provide proof of shipment and receipt for logistics compliance.

### Key data

Each record contains: Inventory items, Delivery address, Recipient name, Delivery date, Shipment images, Signature. Delivery notes are logistics artifacts.

### Relationship

One Delivery note -> many Inventory items. One Delivery note <- one Job (implicit).

### Scale

Grows with shipment frequency. Typically dozens to hundreds per month.

### Lifecycle

- Created: Prior to shipment
- Executed: Signed by recipient
- Archived: Historical reference

### Role in system

(Logistics compliance). Delivery notes provide proof of delivery for compliance and dispute resolution. Used in installation workflows.

### Data consolidation scope

Not applicable. Delivery notes are native to this base; used for compliance documentation.

### Data flow model

Jobs -> Delivery notes (shipment documentation). Inventory -> Delivery notes (item list). Images/signatures -> delivery proof.

### System role

Supporting. Delivery notes enhance logistics compliance but are not core to operational state.

## Import inventory (`tblD6rNbSiu12OG0o`)

### Purpose

Staging layer for inventory ingestion from external sources. Import inventory holds raw or cleaned data before validation and creation of official Inventory records.

### Key data

Each record contains: Serial number, Device model (Resource link), Location (installation and stock), Installation area, Status, Duplicate flag, SEA flag, Brand pre-assignment. Import staging holds staging records.

### Relationship

One Import inventory -> one or many Inventory (created result). One Import inventory <- external source (BOM, RFQ, delivery manifest).

### Scale

Temporary staging. Typically hundreds to thousands of records per import batch.

### Lifecycle

- Created: Data ingested
- Processing: Validation underway
- Imported: Official Inventory created, linked
- Duplicate: Flagged, not imported
- Error: Validation failed, flagged for manual review
- Archived: Batch complete, historical reference

### Role in system

(Data ingestion). Import inventory provides a safe staging layer for data import. Prevents invalid data from polluting official Inventory.

### Data consolidation scope

Not applicable. Import inventory is native to this base; no syncing.

### Data flow model

External source -> Import inventory (staging). Import inventory -> Inventory (validation and creation). Errors -> manual review queue.

### System role

Supporting. Import inventory enables safe data onboarding but is not core once data is imported.

## Inventory (`tblp7sqsv25DVYs7T`)

### Purpose

Central physical asset registry. Inventory is the unit-level record of deployment across the system, representing actual hardware and virtual assets in the field.

### Key data

Each record contains: Resource (SKU link), Serial number, Status (lifecycle state), Location (installation and stock), Subscription contract references, and installation date. Inventory units are the primary anchors for subscriptions, tickets, and jobs.

### Relationship

One Resource -> many Inventory. One Inventory -> one Location (installation). One Inventory -> many Subscriptions. One Inventory -> many Tickets. One Inventory -> many Jobs (implied via subscription contract).

### Scale

Typically hundreds to thousands of units depending on deployment footprint. Each unit carries full lifecycle state.

### Lifecycle

- Created: Imported or added manually
- Available: In stock, ready for deployment
- In transit: Physically in motion to installation
- Installed: At final location, actively deployed
- Subscribed: Has active subscription contract
- Spare: Flagged as backup unit on-site
- Defect: Marked for repair/replacement
- Archived: End-of-life, no longer tracked

### Role in system

(Core operational unit). Inventory is the system's primary fact table. Every operational flow (Jobs, Subscriptions, Tickets) converges on inventory. Serves as the anchor for subscription billing, compliance reporting, and asset management.

### Data consolidation scope

Not applicable. Inventory is native to this base; no cross-base consolidation.

### Data flow model

Resources -> Inventory (creation). Jobs -> Inventory (status mutation). Inventory -> Subscriptions (upon installation). Inventory -> Tickets (issue tracking). Subscriptions use Inventory as foreign key for all lookups.

### System role

Core. Cannot be replaced; everything downstream depends on accurate inventory state.

## Inventory log (`tblZdnCl0LIyKSr1B`)

### Purpose

Event/history log for inventory state transitions. Inventory log provides an audit trail of changes without full event sourcing.

### Key data

Each record contains: Inventory (reference), Status (previous state), Location (previous and current), Installation date, Subscription type, Subscription contract (at time of change), Created timestamp. Log is append-only.

### Relationship

One Inventory -> many Inventory log entries. One Inventory log <- one Inventory record (reference).

### Scale

Grows with inventory mutation frequency. Typically hundreds to thousands of entries per month.

### Lifecycle

- Created: On state change trigger
- Retained: Permanent, never deleted (audit trail)

### Role in system

(Auditability). Inventory log provides historical traceability of inventory state changes. Currently under-modeled compared to full event sourcing but provides basic audit trail.

### Data consolidation scope

Not applicable. Inventory log is native to this base; no syncing.

### Data flow model

Inventory (state change) -> Inventory log (append). Log queries enable historical analysis and debugging.

### System role

Supporting. Inventory log enables auditability and debugging but is not core to operational flow.

## Jobs (`tbly4d48VQIfgJaBH`)

### Purpose

Orchestrate deployment execution. Jobs drive the installation workflow, mutate inventory state, and trigger subscription creation.

### Key data

Each record contains: Location, BOM (bill of materials), Status (Scheduled/In progress/Completed), Date scheduled/actual, Partner, Inventory pre-assignments, Subscription contract reference. Jobs are the primary execution units.

### Relationship

One Job -> one Location (target). One Job -> many Inventory items (reserved/assigned). One Job -> one Quote (source). One Job -> one Subscription contract (created result).

### Scale

Hundreds to thousands of jobs per year depending on deployment velocity.

### Lifecycle

- Created: From quote approval
- Scheduled: Assigned execution date
- In progress: Active deployment
- Completed: All inventory installed, subscriptions created
- Cancelled: Not executed

### Role in system

(Core orchestrator). Jobs are the primary state mutation engine. Upon completion, Jobs create inventory links, assign locations, and trigger subscription contract creation. Without Jobs, nothing moves in the system.

### Data consolidation scope

Not applicable. Jobs are native to this base; synced to Locations and Tickets bases for reporting.

### Data flow model

Quotes -> Jobs (execution staging). Jobs -> Inventory (location assignment, status mutation). Jobs -> Subscription contracts (upon completion). Jobs -> Tickets (issue escalation).

### System role

Core. Jobs are non-negotiable. All deployments flow through them.

## Licences (`tblEcCphC0pdfOxGj`)

### Purpose

Software license entitlement tracking separate from subscription abstraction. Licences represent license units and associated costs independent of subscription contract mechanics.

### Key data

Each record represents one license type: Service ID, Service (software service type), Active count (active licenses), CPU/month (cost), Cost by customer (KFC, Apple, Others), Status, Assignee (license manager).

### Relationship

One Licence → many Subscriptions (indirect, via Subscription types). One Licence → many Subscription types (license types eligible). Service/software type tracked separately from hardware subscriptions.

### Scale

Small: 5,15 active license types.

### Lifecycle

- Created: New license offering
- Active: In use (active subscriptions)
- Inactive: End-of-life

### Role in system

(Software licensing and cost tracking layer). Licences track software entitlements and associated costs separately from hardware subscriptions, enabling transparent software cost attribution.

### Data consolidation scope

Not applicable. Licences are native to Inventory base.

### Data flow model

Licenses defined for software services. Subscription types link to licenses. Active subscriptions tracked per license type. Costs calculated and reported per license.

### System role

Software cost tracking. Licences enable transparent tracking of software licensing costs and active license counts per customer segment.

## Locations (`tblChlR6D4roiK14y`)

### Purpose

Final consolidation point of all operational data. Locations aggregate inventory, jobs, subscriptions, and tickets for each customer site.

### Key data

Each record contains: Name, Customer, Country, Brand owner, Address, Contact, Inventory count (by status), Jobs (status), Subscriptions (active count), Tickets (open count), Images (floor plan, arrangement). Locations are the operational endpoints.

### Relationship

One Location -> many Inventory items. One Location -> many Jobs. One Location -> many Subscriptions (indirect). One Location -> many Tickets.

### Scale

Typically tens to thousands of locations depending on footprint.

### Lifecycle

- Created: Site opened/added
- Active: Operational, receiving updates
- Inactive: No longer active
- Archived: Historical reference

### Role in system

(Operational endpoint). Locations are the final consolidated view of all operational data for a site. All site-level reporting and field service activities flow through locations.

### Data consolidation scope

Not applicable. Locations are native to this base; synced to Jobs and Tickets bases for site-level views.

### Data flow model

Inventory -> Locations (installation assignment). Jobs -> Locations (deployment targets). Subscriptions -> Locations (license aggregation). Tickets -> Locations (issue tracking).

### System role

Core. Locations are the primary operational endpoint for field service and site management.

## Quotes (`tblqn6Sj7Ync4tPQZ`)

### Purpose

Define scope and budget for deployments. Quotes are the commercial input layer capturing scope, quantities, and subscription terms before execution.

### Key data

Each record contains: Customer, Service, Locations (count), Jobs (count), BOM (bill of materials), Inventory count, Subscription contract terms (start date). Quotes freeze deployment plans.

### Relationship

One Quote -> one Customer. One Quote -> many Jobs (execution). One Quote -> many Inventory items (eventually). One Quote -> one or many Locations.

### Scale

Typically dozens to hundreds of quotes per year depending on sales velocity.

### Lifecycle

- Created: Sales proposal
- Accepted: Customer approval
- In execution: Jobs running
- Completed: All jobs done, subscriptions active
- Archived: Historical reference

### Role in system

(Commercial input). Quotes define deployment scope and drive job creation. They are the bridge between sales and execution.

### Data consolidation scope

Not applicable. Quotes are native to this base; synced to Jobs base for execution tracking.

### Data flow model

Customers -> Quotes (commercial source). Quotes -> Jobs (execution driver). Quotes -> Inventory (scope definition). BOM in Quotes -> SKU allocation.

### System role

Core. Quotes are non-negotiable for commercial deployments.

## Resources (`tbl3eqL9QVNgZfNgZ`)

### Purpose

Master product catalog and SKU registry. Resources define all resource types, classes, and properties available in the system.

### Key data

Each record contains: ID (SKU), Brand, Category, Type, Image, Links to Specs, Links to Inventory instances, Subscription type compatibility, BOM identifier. Resources normalize product definitions.

### Relationship

One Resource -> many Inventory units. One Resource -> many Specs (technical definitions). One Resource -> many Subscription types (service eligibility).

### Scale

Typically 50-500+ distinct resource definitions covering hardware players, displays, accessories, and services.

### Lifecycle

- Created: New product model identified
- Active: In use, can be ordered and deployed
- Deprecated: No longer sold but existing units remain tracked
- Archived: Obsolete, historical reference only

### Role in system

(Reference/classification layer). Resources do not drive workflows but anchor inventory classification, BOM logic, and subscription mapping. Acts as a normalization layer across the system.

### Data consolidation scope

Not applicable. Resources are native to this base; no syncing occurs.

### Data flow model

Resources <- external (product master data). Resources -> Inventory (SKU assignment). Resources -> Specs (spec set definition). Resources -> Subscription types (service mapping).

### System role

Enabler. Provides taxonomic foundation for classification but does not execute operations.

## Scan - Input (`tblyTY0ftMostdUl9`)

### Purpose

Capture barcode/serial number scan inputs. Scan - Input is the raw scan ingestion layer that feeds downstream processing.

### Key data

Each record contains: Label (human context), Scan code (barcode), Action (scan type), Line items (count), Scan data (raw input text). Scan - Input is raw ingestion.

### Relationship

One Scan - Input -> many Scan - Line items (processed results). One Scan - Input <- scanner (external source).

### Scale

Varies with scanning frequency. Typically tens to hundreds of scans per week.

### Lifecycle

- Created: Scan captured
- Processing: Line items being generated
- Completed: All items processed
- Error: Processing failed
- Archived: Historical

### Role in system

(Scan ingestion). Scan - Input provides the raw input layer for barcode processing. Used for inventory receipts, location checks, and asset verification.

### Data consolidation scope

Not applicable. Scan - Input is native to this base; no syncing.

### Data flow model

Scanner -> Scan - Input (raw capture). Scan - Input -> Scan - Line items (parsing and matching). Scan - Line items -> Inventory (update).

### System role

Optional. Scanning enhances inventory verification but is not core to baseline operations.

## Scan - Line items (`tblgZUnyuVZwLEk8c`)

### Purpose

Normalize and match scanned items to system records. Scan - Line items parse raw scan input and match against Inventory and Resources.

### Key data

Each record contains: Scan (raw input reference), Scanned by (user), Type (barcode/serial/tag), Inventory (matched record), Resource (matched SKU), Location (scan location), Status, Spare flag, Internal flag. Scan - Line items are structured results.

### Relationship

One Scan - Line item <- one Scan - Input. One Scan - Line item -> one Inventory (matched). One Scan - Line item -> one Resource (matched SKU).

### Scale

Grows with scanning frequency. Typically hundreds to thousands per month if scanning is active.

### Lifecycle

- Created: Scan line parsed
- Matched: Inventory/Resource matched
- Unmatched: Could not find record
- Verified: User confirmed match
- Archived: Historical

### Role in system

(Scan processing). Scan - Line items provide the structured interface between raw scans and system records. Enable inventory verification and location validation.

### Data consolidation scope

Not applicable. Scan - Line items are native to this base; no syncing.

### Data flow model

Scan - Input -> Scan - Line items (parsing). Scan - Line items -> Inventory (matching and update). Location checks <- Scan - Line items.

### System role

Optional. Scanning provides verification but is not core.

## Sets (`tblRKsQAUhleUehVS`)

### Purpose

Logical grouping of multiple inventory units into installable kits. Sets bundle components as a single deployable unit while preserving individual unit tracking.

### Key data

Each record contains: Name, Location (installation), Inventory (member units), Status (rollup from members). Sets define multi-unit arrangements.

### Relationship

One Set -> many Inventory items. One Set -> one Location. One Inventory -> many Sets (optional, can be member of multiple kits).

### Scale

Varies by deployment type. Typically 10-100+ sets depending on multi-unit installation prevalence.

### Lifecycle

- Created: Upon multi-unit deployment requirement
- Active: Members installed and active
- Partial: Some members missing or spare
- Archived: Set no longer relevant

### Role in system

(Logical grouping). Sets do not drive workflows but enable bundled management of related units. Used for floor plan documentation and multi-display orchestration.

### Data consolidation scope

Not applicable. Sets are native to this base; no syncing.

### Data flow model

Sets -> Inventory (bundling reference). Locations -> Sets (optional reference for layout documentation).

### System role

Optional. Sets enhance operational clarity but are not critical to core workflows.

## Specs (`tblyxnYFYWLxgeT0W`)

### Purpose

Store technical specifications and attribute values. Specs pair Attributes with concrete values for each resource, creating a flexible spec schema.

### Key data

Each record contains: Value (spec value), Attribute (reference), Resources (applicable to), Quote visibility flag, Status. Specs are value pairings.

### Relationship

One Spec <- one or many Attributes (many Specs -> one Attribute). One Spec -> many Resources. One Spec -> one or many Quotes (via Resource).

### Scale

Grows with product portfolio. Typically 100-500+ specs depending on hardware variety.

### Lifecycle

- Created: New spec value defined
- Active: In use, visible in quotes
- Hidden: Not visible to customers
- Archived: Obsolete

### Role in system

(Technical documentation). Specs are the operational spec database. Used in quote PDF generation, spec sheet construction, and product documentation.

### Data consolidation scope

Not applicable. Specs are native to this base; no syncing.

### Data flow model

Attributes -> Specs (value assignment). Resources <- Specs (spec set). Quotes <- Specs (PDF generation). Documentation <- Specs (spec sheets).

### System role

Enabler. Specs power documentation and customer-facing spec generation.

## Stock locations (`tblYuICPpfVdM7KRd`)

### Purpose

Represent physical warehouse and stock holding locations. Stock locations are the origin/destination points for inventory movement and storage before installation.

### Key data

Each record contains: Name, Country, Region, Status, Inventory count. Stock locations are referenced for in-transit tracking and consumable movement origin.

### Relationship

One Stock location -> many Inventory items (while in stock). One Stock location -> many Consumable Movements (consumption tracking).

### Scale

Typically 5-30 locations depending on distribution network. Each location holds multiple SKUs.

### Lifecycle

- Active: Operational warehouse, receiving and shipping stock
- Inactive: Closed or dormant, no new stock
- Archived: Historical reference only

### Role in system

(Logistics reference). Stock locations anchor inventory movement logistics and consumable consumption attribution. Used for cost allocation and reorder triggering.

### Data consolidation scope

Not applicable. Stock locations are native to this base; no syncing.

### Data flow model

Inventory (before installation) <- Stock location. Consumable Movements reference Stock location for origin/destination. Jobs may reference Stock location for material pickup.

### System role

Enabler. Supports logistics workflows but does not directly drive operational state changes.

## Subscription contracts (`tblhn4CJZbi57C8WP`)

### Purpose

Commercial container for recurring service obligations. Subscription contracts define the terms, duration, and financial structure of all subscriptions attached to it.

### Key data

Each record contains: Customer, Service, Subscription type, Duration (months), Start date, End date (formula), Status, Inventory count (units under contract), PPU/month (pricing), Currency, Auto-renewal flag. Contracts are the canonical source of subscription state.

### Relationship

One Subscription contract -> many Subscriptions (1:1 per unit initially, but can consolidate). One Subscription contract -> many Inventory items (installed units). One Subscription contract -> one Customer.

### Scale

Typically hundreds of contracts. Each contract may govern 1 to 100+ subscriptions depending on installation scope.

### Lifecycle

- Created: Upon first installation or manual creation
- Active: Subscriptions exist, within term
- Expiring: Approaching end date, renewal process may trigger
- Expired: End date passed, subscriptions terminated
- Renewed: New contract created via auto-renewal, old one archived
- Terminated: Manually ended before expiration

### Role in system

(Commercial/billing layer). Subscription contracts are the source of truth for service terms. Drives monthly recurring revenue (MRR) calculations and renewal workflows.

### Data consolidation scope

Not applicable. Subscription contracts are native to this base; synced copies exist in Tickets base for reporting.

### Data flow model

Jobs -> Subscription contracts (created upon installation). Subscriptions <- Subscription contracts (created for each unit). Billing/revenue <- Subscription contracts (MRR rollup).

### System role

Core. Subscription contracts are the primary billing and term reference. No operational flow bypasses them.

## Subscription types (`tblKuzC0cNODVv9Zm`)

### Purpose

Standardize subscription behavior and service mappings. Subscription types define service eligibility and default duration for a resource class.

### Key data

Each record contains: Service, Duration (months default), Auto-renewal, License type (CMS/player/service), FoC (Free-of-Charge) flag. Subscription types are the vocabulary layer between resources and subscriptions.

### Relationship

One Subscription type -> many Subscriptions. One Subscription type -> many Resources (eligibility). One Subscription type <- Subscription contract (reference).

### Scale

Typically 10-50 distinct subscription types covering different service bundles and license models.

### Lifecycle

- Created: New service bundle defined
- Active: In use, subscriptions can be created
- Deprecated: No longer sold but existing subscriptions remain
- Archived: Historical reference

### Role in system

(Configuration/taxonomy). Subscription types normalize service definitions and map resources to service bundles. Do not execute operations but enable consistent classification.

### Data consolidation scope

Not applicable. Subscription types are native to this base; no syncing.

### Data flow model

Subscription types <- Resource (eligibility mapping). Subscriptions -> Subscription types (service reference). Subscription contracts -> Subscription types (term definition).

### System role

Enabler. Subscription types provide service taxonomy but do not drive workflows directly.

## Subscriptions (`tblyNA73D9jldeEir`)

### Purpose

Active recurring revenue records. Each subscription is a time-dependent license linked to a specific inventory unit and subscription type.

### Key data

Each record contains: Inventory (unit), Subscription contract, Subscription type, Start date, End date (formula), Days left (formula), Status (Active/Expired/Terminated), Auto-renewed flag. Subscriptions are immutable after creation unless manually terminated.

### Relationship

One Subscription -> one Inventory. One Subscription -> one Subscription contract. One Subscription -> one Subscription type. Many Subscriptions <- one Subscription contract.

### Scale

Scales with inventory deployment. Typically 100-10,000+ active subscriptions across the system at any time.

### Lifecycle

- Created: Upon installation (Job completion)
- Active: Within term and not terminated
- Expiring: Days left decreasing, <= 30 days
- Expired: End date passed, no longer billable
- Renewed: Auto-renewed, new subscription created
- Terminated: Manually cancelled before expiration

### Role in system

(Revenue tracking). Subscriptions are the unit-level billing records. Each subscription = one active license billable to the contract. Drives SaaS revenue recognition and reporting.

### Data consolidation scope

Not applicable. Subscriptions are native to this base; synced to Tickets base for revenue/analytics.

### Data flow model

Jobs -> Subscriptions (created on installation). Subscriptions <- Subscription contracts (parent reference). Days left updated nightly (formula). Auto-renewal -> new Subscription creation.

### System role

Core. Subscriptions are the unit-level billing atoms. Revenue reporting rolls up from here.

## TargetR - PoP (`tblXAOl3ZEW1PuJc7`)

### Purpose

Group players by network proximity or deployment grouping. TargetR - PoP represents point-of-presence clusters for player orchestration.

### Key data

Each record contains: customItemId, screenId (Inventory link), Label, Created timestamp. TargetR - PoP provides network grouping.

### Relationship

One TargetR - PoP -> many Inventory items (member screens). One TargetR - PoP <- TargetR API (external source).

### Scale

Varies by network topology. Typically tens to hundreds of PoP clusters.

### Lifecycle

- Created: Network cluster defined
- Active: Members online and managed together
- Archived: Network decommissioned

### Role in system

(Network topology). TargetR - PoP enables logical grouping of players for collaborative management and orchestration.

### Data consolidation scope

Not applicable. TargetR - PoP is native to this base; synced from external TargetR API.

### Data flow model

TargetR API -> TargetR - PoP (network sync). TargetR - PoP -> Inventory (member reference). Orchestration <- TargetR - PoP (grouping logic).

### System role

Optional. TargetR - PoP enhances player orchestration but is not core.

## TargetR - Status (`tbl5VPIqFKPN3PHfK`)

### Purpose

Monitor player health and connectivity status. TargetR - Status tracks real-time or near-real-time status of media players deployed in the field.

### Key data

Each record contains: MAC address (player ID), Label, Last online (timestamp), Time offline (minutes), WiFi SSID, Local IP, Status. Status records are near-real-time.

### Relationship

One TargetR - Status <- one Inventory (MAC address link). One TargetR - Status <- one TargetR - PoP (network grouping).

### Scale

Scales with player count. Typically updated hourly or daily.

### Lifecycle

- Created: Player provisioned
- Online: Actively communicating
- Offline: No recent heartbeat
- Archived: Player retired

### Role in system

(Monitoring layer). TargetR - Status provides visibility into player uptime and connectivity health. Used for SLA compliance and incident detection.

### Data consolidation scope

Not applicable. TargetR - Status is native to this base; synced from external TargetR API.

### Data flow model

TargetR API -> TargetR - Status (sync). Inventory <- TargetR - Status (health lookup). Tickets -> (created from status anomalies).

### System role

Supporting. TargetR - Status enables operational visibility and incident detection.

## Tickets (`tblqkXYEpx9X2wHXJ`)

### Purpose

Track operational issues and incidents. Tickets are support/incident records linked to inventory and locations for problem resolution.

### Key data

Each record contains: Subject, Priority, Status, Location, Inventory items, Description, Created date, SLA status, URL to external ticket system. Tickets are incident units.

### Relationship

One Ticket -> one Location. One Ticket -> many Inventory items (implicated). One Ticket <- external ticketing system (Freshdesk/AirTable sync).

### Scale

Typically tens to hundreds per month depending on incident frequency.

### Lifecycle

- Created: Issue reported
- Open: In progress
- Pending: Awaiting response
- Resolved: Fixed
- Closed: Archived

### Role in system

(Issue tracking). Tickets provide incident tracking and SLA compliance. All operational issues flow through tickets for visibility and escalation.

### Data consolidation scope

Not applicable. Tickets are native to this base; synced from external ticketing system via integration.

### Data flow model

Extenal ticketing -> Tickets (sync). Locations -> Tickets (site reference). Inventory -> Tickets (implicated items). Tickets -> Jobs (create maintenance job from ticket).

### System role

Core. Tickets are essential for operational incident management and SLA tracking.
