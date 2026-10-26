# Tickets: table descriptions

From the `Documentation - Base - Structure` registry, 2026-10-26. See also [`schema.json`](schema.json).

## Agents (`tblKaHbVK8L9U1LT1`)

### Agents

### Purpose
Map Freshdesk agent names to Airtable collaborator accounts for ticket assignment synchronization. Bridges external Freshdesk user identity with internal Airtable user identity.

### Key data
Name from Freshdesk, mapped Airtable user (collaborator), notes, status (Todo/In progress/Done), time blocks.

### Relationship
No direct links (mapping table)

### Scale
10-20 agent records covering active support team members. Grows slowly as team composition changes.

### Lifecycle
- Created when new agent added to Freshdesk
- Freshdesk name populated
- Airtable user mapped to corresponding collaborator
- Status set to Done when mapping active
- Status changed to Todo/In progress when mapping needs update

### Role in system
Reference layer (Mapping table). Agents enable assignment field synchronization between Freshdesk tickets and Airtable ticket records, ensuring agent assignment visibility across both systems.

## Compensation (`tbl8mdLvZrXTaU8lK`)

### Compensation

### Purpose
Define compensation rate rules that determine when and how much compensation applies to tickets based on creation time, daypart, and day-of-week criteria.

### Key data
Name, type (Default/Override), daypart classification, days of week (multi-select), time window (From/To hours), amount (THB currency), status, year filter, link to Weeks for Override type, ticket count.

### Relationship
One Compensation → many Tickets (single-record preferred link)
One Compensation → many Weeks (for Override type)

### Scale
5-10 active compensation rules covering standard daypart categories plus seasonal/promotional overrides. Override rules typically created 2-4 times per year for special periods.

### Lifecycle
- Default rules created during initial compensation system setup
- Override rules created for special periods (holidays, promotions, high-traffic events)
- Time window and daypart defined
- Days of week configured
- Amount set based on operational cost/contract
- Weeks linked for Override type to define specific calendar applicability
- Tickets automatically linked when creation timestamp falls within rule criteria

### Role in system
Reference layer (Configuration table). Compensation records provide the rule engine for automated compensation eligibility determination. Tickets query this table based on their creation timestamp to identify applicable compensation rate.

## Customers (`tblKL04W1YLy6q3SP`)

### Customers

### Purpose
Represent customer entities for ticket and SLA association. Synced from Locations base to provide stable customer reference data within Tickets base.

### Key data
Sync from Locations base: ID, Brand, Brand owner, Legal name, contact details (finance and service desk), country, service types, status. Native fields: SLA links, Ticket links, Location links.

### Relationship
One Customer → many SLA records
One Customer → many Tickets
One Customer → many Locations (reverse sync)

### Scale
20-30 active customer records covering major brand owners (KFC, CRG, RD, QSA). Synced dataset size matches Locations base customer count.

### Lifecycle
- Synced automatically from Locations base when new customer record created
- Updates propagate from source to sync target
- SLA records created post-sync for new customers
- Tickets linked as incidents occur
- Status field managed in source base

### Role in system
Reference layer (Synced table). Customers provide normalized customer identity for ticket categorization and SLA lookup. Sync architecture ensures customer data consistency between Tickets and Locations operational contexts.

## Jobs (`tblalOqkup0XIxdVa`)

### Jobs

### Purpose
Represent field service work orders linked to ticket-reported issues. Synced from Jobs base to provide visibility into installation, maintenance, and reactive service work triggered by tickets.

### Key data
Sync from Jobs base: ID, Job type, Location link, Brand/Brand owner, scheduled/actual dates, status, inventory link. Native fields: Ticket links, ticket status rollup, open ticket count.

### Relationship
One Job → many Tickets (reverse link)
One Location → many Jobs

### Scale
50-100 active jobs per month. Subset of jobs linked to tickets (reactive maintenance, rework). Installation and pre-sale jobs typically not ticket-linked.

### Lifecycle
- Synced automatically from Jobs base when job record created
- Tickets linked manually or via automation when job addresses ticket-reported issue
- Status updates propagate from source
- Completion status tracked via synced Status field

### Role in system
Operational layer (Synced table). Jobs provide visibility into field service response to ticket-reported issues, enabling tracking of ticket-to-resolution workflow when physical intervention required. Sync architecture avoids data duplication while maintaining ticket-job association.

## Locations (`tbljrW84qbQIoYUBX`)

### Locations

### Purpose
Represent physical venue locations for ticket association and operational context. Synced from Locations base to provide venue reference data within Tickets base.

### Key data
Sync from Locations base: ID, Name, Location code, Address, Brand/Brand owner, Contact details, Opening hours, Province/Region, Installation date, KFC-specific attributes, images. Native fields: Ticket links, Job links, Customer link, ticket count rollups.

### Relationship
One Location → many Tickets
One Location → many Jobs
One Location → one Customer

### Scale
200-300 location records covering active QSR and retail venues across Thailand and regional markets. Synced dataset size matches source Locations base.

### Lifecycle
- Synced automatically from Locations base when new location created
- Updates propagate from source to sync target
- Tickets linked as location-specific incidents occur
- Jobs linked for field service work
- Customer link established via automation or manual assignment

### Role in system
Reference layer (Synced table). Locations provide geographical and operational context for tickets, enabling location-based filtering, regional SLA application, and venue-specific incident history tracking. Sync architecture maintains single source of truth in Locations base while exposing location data to ticket operations.

## Menu items (`tblBkzDATbdxYdoZo`)

### Menu items

### Purpose
Represent the reference catalog of QSR menu items tracked for out-of-stock monitoring. Serves as a controlled vocabulary for OOS item decomposition.

### Key data
Bilingual name pair (Thai/English), status (Active/Inactive), count of linked OOS items. ID formula derives from English name field.

### Relationship
One Menu item → many OOS items

### Scale
30-50 active menu items for KFC Thailand operations. Catalog grows slowly as new promotional items or permanent menu additions are introduced.

### Lifecycle
- Created manually when new menu item introduced to operational tracking
- English and Thai names populated
- Status set to Active
- Linked to OOS items as out-of-stock incidents occur
- Status changed to Inactive when item permanently discontinued

### Role in system
Reference layer (Lookup table). Menu items provide normalized naming and enable consistent aggregation of out-of-stock incidents across locations and time periods.

## OOS items (`tbl7imdzfTzQLIICs`)

### OOS items

### Purpose
Decompose out-of-stock menu item requests from parent tickets into individually tracked remediation tasks. Each record represents a single menu item unavailability period at a specific location screen, with start/end timestamps and request type classification (Add/Remove/Extend).

### Key data
Link to parent Ticket, link to Menu item reference, start/end datetime pair, request type (Add/Remove/Extend), OOS screen location (FOH/Centerline positions), status (Todo/Done/On hold), assignee, notes field for resolution details, derived fields from parent ticket (brand owner, region, province, daypart, SLA).

### Relationship
One Ticket → many OOS items
One Menu item → many OOS items

### Scale
Typically 1-5 OOS items per out-of-stock ticket. High-volume QSR locations may generate 20-30 OOS item records per week during peak promotional periods or supply chain disruptions.

### Lifecycle
- Created automatically when OOS enquiry ticket is submitted via Fillout form
- Menu item link populated from temporary text field via automation matching
- Start date captured from ticket creation timestamp
- Assignee set based on brand owner and region
- Status progresses from Todo → Done when item availability restored
- End date recorded when status changes to Done
- Notes field populated with resolution details or supply chain feedback

### Role in system
Decomposition layer (Detail table). OOS items break down aggregate ticket-level out-of-stock reports into granular, screen-specific, item-specific tracking records. This enables operational teams to monitor individual menu item availability periods and aggregate OOS metrics by item, location, daypart, and brand owner.

## SLA (`tblSxD2sxiCGtUnBb`)

### SLA

### Purpose
Define resolution time thresholds for ticket categories based on Customer and Service line combinations. Each SLA record establishes a duration target (in minutes) against which ticket performance is measured.

### Key data
Link to Customer, service line identifier (1/2/3 or short code), OOS flag (boolean), duration target (hours and minutes), derived brand/brand owner from customer link, ticket count rollups (total, resolved, resolved within SLA), calculated SLA compliance percentage.

### Relationship
One Customer → many SLA records (one per service line)
One SLA → many Tickets

### Scale
10-15 active SLA records covering major customers across service lines. Each brand owner typically has 2-3 service line tiers (First/Second/Third line) with distinct duration targets.

### Lifecycle
- Created when new customer onboarded or service line added
- Duration target set based on contractual agreement
- OOS flag set for out-of-stock specific SLA variants
- Tickets linked automatically based on Customer + Service line match
- SLA compliance metrics derived from linked ticket resolution timestamps
- Status changed to Expired when contract terminates

### Role in system
Reference layer (Configuration table). SLA records drive ticket duration monitoring, compensation eligibility, and service performance reporting. The table translates contractual service level agreements into operational duration thresholds.

## Ticket log (`tbleP7GMbY1P3ERFv`)

### Ticket log

### Purpose
Capture audit trail of ticket status transitions. Each record represents a single status change event on a parent ticket.

### Key data
ID, created timestamp, modified by (collaborator), status value at time of change, link to parent Incident (ticket).

### Relationship
One Ticket → many Ticket log entries

### Scale
3-10 log entries per ticket depending on lifecycle complexity. High-touch tickets with multiple Pending cycles may generate 15-20 log entries.

### Lifecycle
- Created automatically when ticket status field changes
- Status value captured from ticket at moment of change
- Modified by populated with user who triggered status change
- Created timestamp provides audit timestamp
- Immutable after creation

### Role in system
Audit layer (History table). Ticket log provides complete status transition history for compliance, dispute resolution, and process analysis. The table enables reconstruction of ticket lifecycle timeline and identification of process bottlenecks.

## Tickets (`tbl7Y9QHzO1TyWZDl`)

### Tickets

### Purpose
Decompose service requests into structured incident records tracked from creation to resolution. The table serves as the central intake and lifecycle tracking mechanism for customer-reported issues, operational failures, and service requests across both digital signage and music streaming service lines.

### Key data
Created timestamp (with override capability for import), normalized subject and description fields, categorization by type/priority/source/enquiry, agent assignment (internal and external), status progression tracking, SLA assignment with duration monitoring, outbound links to location/customer/job/compensation records, OOS item decomposition for menu availability tracking, and audit metadata (created by, last modified, resolution timestamp).

### Relationship
One Location → many Tickets
One Customer → many Tickets  
One SLA → many Tickets
One Compensation → many Tickets (single-record preferred)
One Ticket → many OOS items
One Ticket → many Jobs
One Ticket → many Ticket log entries
One Ticket → one Parent (self-link for sub-tickets)

### Scale
Several hundred tickets per month across service lines. Active tickets held in Open/Pending states typically number 20-50 concurrently. Resolution rates tracked per brand owner (CRG, RD, QSA) against SLA thresholds. Compensation triggering logic applies to subset of tickets falling into defined time windows and daypart categories.

### Lifecycle
- Created via form submission, Freshdesk sync, manual entry, or internal escalation
- Agent assigned automatically or manually based on source/service line/brand owner
- Status progresses through Open → Pending (awaiting response) → Resolved (issue fixed) → Closed (confirmed complete) or Abandoned/Deleted
- SLA assigned based on Customer + Service line combination, duration tracked in minutes against threshold
- Compensation optionally linked if ticket created in defined time/daypart window
- OOS items decomposed for menu availability tracking when applicable (QSR-specific)
- Jobs linked for field service dispatch when installation/maintenance work required

### Role in system
Operational intake layer with bridge functionality. The table acts as the initial point of contact for service requests, then fans out to decomposition tables (OOS items), operational execution (Jobs), and audit/tracking layers (Ticket log, Compensation). It consolidates data from multiple external sources (Freshdesk, Fillout forms, phone/email/chat) and exposes it to internal operational views and reporting interfaces.

### Data consolidation scope

### Inbound sync sources
- Freshdesk ticket data via automation sync (Ticket ID, Status, Subject, Description, Source)
- Fillout form submissions for KFC OOS reporting
- Manual creation via Airtable interface for phone/email/chat intake

### Outbound sync targets
- Jobs base (via Sync to Jobs view) for field service dispatch
- Inventory base (via Sync to Inventory view) for asset-related incidents
- Locations base (via Sync to Locations view) for location-level incident aggregation

### Data flow model
Intake → Decomposition/Bridge → Resolution. Tickets are created from external systems or forms, decomposed into actionable sub-entities (OOS items for menu tracking, Jobs for field work), linked to reference data (SLA, Compensation, Agent), and tracked through resolution lifecycle with audit trail capture in Ticket log.

### System role
Primary operational layer (Bridge table). Tickets sit between intake sources (Freshdesk, forms, manual entry) and execution layers (Jobs for field work, OOS items for menu tracking). The table routes issues to appropriate operational resources while maintaining full audit history and SLA compliance tracking.

## Weeks (`tbl5v4LXUdI1nAxwg`)

### Weeks

### Purpose
Represent weekly calendar periods for compensation override scoping. Each record defines a specific week number + year pair with start/end dates.

### Key data
Week number (integer), year (single-select), start/end date pair, status (Todo/In progress/Done), duration (days), calculated week numbers from dates, link to Compensation records.

### Relationship
One Week → many Compensation records (Override type only)

### Scale
52 records per year, with subset linked to active compensation overrides. Typically 10-20 weeks per year have compensation override rules attached.

### Lifecycle
- Created in batch at year rollover
- Week number and year populated
- Start/end dates set based on Monday-start week calendar
- Status progresses as week moves from future → current → past
- Compensation links added when override rules created for specific calendar periods

### Role in system
Reference layer (Temporal lookup). Weeks provide the calendar framework for time-bound compensation override rules, enabling precise temporal scoping of special compensation periods.
