# Airtable sync topology

Generated 2026-10-26 from the `Documentation - Base - Structure` table (`tbldD6iYBnufCyTaf` in the Data base). One row per table per base. **Synced** tables are read-only mirrors of a view in another base unless marked bidirectional; edit them at the source.

| Base | ID |
| --- | --- |
| Jobs | `appdo1WwONYvmYMWg` |
| Data | `app8H7IMW8gHyQzzn` |
| Monitoring | `appQT3lKdh9bdw1zo` |
| Inventory | `appRor1ipbYAb4K7z` |
| Tickets | `apprGGdynxDTZMZmO` |
| Locations | `appmFizJaAn7yKKVu` |

## Locations (`appmFizJaAn7yKKVu`) — see [bases/locations-appmFizJaAn7yKKVu/](bases/locations-appmFizJaAn7yKKVu/)

| Table | ID | Synced from | Direction | Description |
| --- | --- | --- | --- | --- |
| Arrangements | `tbl3iaef3xXCKE5UT` | native | — | Display configurations at a location. Stores installation area, orientation, and number of displays. Multiple arrangements can exist per location. |
| Brand owners | `tblomN4KFzhzTeZyB` | native | — | Entities owning or operating a brand in a specific market (e.g. franchisees like CRG). Combined with brand and country to define a customer. |
| Brands | `tbllTcNIfg7TkJMUO` | native | — | Master list of brand identities (e.g. KFC, Apple). Used as one component in defining a customer. |
| Countries | `tblcveZqTa63GVMNm` | native | — | Master list of countries with ISO3 codes. Code is used as a standardized prefix in customer identifiers. |
| Customers | `tblu9pLBFjxYX9RwL` | native | — | Core master entity representing a commercial customer. Customer ID is a composite of Country (ISO3), Brand, Brand Owner, and optionally Storefront (e.g. THA - KFC - CRG). Central reference entity used across all operational bases. |
| Import locations | `tblzc37sUyhDG502U` | native | — | Staging table for bulk location ingestion. Records are validated and then pushed into the Locations table via automation. |
| Location types | `tbl8xmUZdqPdLSvrN` | native | — | Lookup table classifying location types. Links to Locations table. |
| Locations | `tblaMnDYwMhf8fk7d` | native | — | Central operational endpoint storing all physical installation locations. Consolidates data from Jobs, Inventory, Tickets, and Subscriptions. One customer maps to many locations. Single point of truth for operational history, asset deployment, and support activity. |
| Regions | `tbl36FUpxfS4rEWLd` | native | — | Non-administrative geographic groupings within a country (e.g. Northeast Thailand, South). Enables flexible geographic segmentation beyond formal administrative divisions. |
| Stores | `tblcnY2DjETb7ixwI` | native | — | Specific store concepts or formats under a brand. Optional component in defining a customer. |
| Subdivisions | `tblZRwcVwuj5LbewW` | native | — | Formal administrative areas (states, provinces). Hierarchy: Country > Region > Subdivision. Provides structured geographic hierarchy for location classification. |
| Inventory | `tbl4iIahvNOg0bhJq` | Inventory › Inventory (`tblp7sqsv25DVYs7T`, view Sync to Locations) | Bidirectional | Bidirectional sync from Inventory base. Surfaces installed asset data within the Locations base for operational consolidation. |
| Jobs | `tbl6c4QsHZx3ZAq3n` | Jobs › Jobs (`tblwHj9cO37wp1fVx`, view Sync to Locations) | Bidirectional | Bidirectional sync from Jobs base. Enables linking locations to jobs for consolidated operational visibility within the Locations base. |
| Tickets | `tblwn1jUAokpYOuxd` | Tickets › Tickets (`tbl7Y9QHzO1TyWZDl`, view Sync to Locations) | Inbound | Outbound sync from Tickets base. Surfaces live ticket data within the Locations base for support visibility at the location level. |

## Inventory (`appRor1ipbYAb4K7z`) — see [bases/inventory-appRor1ipbYAb4K7z/](bases/inventory-appRor1ipbYAb4K7z/)

| Table | ID | Synced from | Direction | Description |
| --- | --- | --- | --- | --- |
| Attributes | `tblUUZEsKbUgQ2URA` | native | — | Attribute definitions used for structuring product and resource specifications. Groups and classifies spec dimensions (e.g. display size, resolution). Linked to the Specs table. |
| Consumable Movements | `tbl96hSKIBANAMqfa` | native | — | Stock movement table for consumable resources, distinct from serialized inventory lifecycle. Tracks inbound/outbound quantities by resource, stock location, country, and project with signed quantity logic. |
| Countries | `tblzCLUEgLNXzjD18` | native | — | Geographic reference data. Links to stock locations, locations, customers, and consumable movements. Used for geographic filtering and country-level reporting across the base. |
| Delivery notes | `tblzn0AD1zje8ZmEA` | native | — | Delivery documentation table linking inventory items to delivery address, recipient, and generated delivery note attachments. Used for outbound shipment tracking and documentation. |
| Import inventory | `tblD6rNbSiu12OG0o` | native | — | Staging and import table used to ingest inventory data into the operational model. Handles serial number normalization, duplicate detection, device model matching, and controlled import via checkbox trigger. |
| Inventory | `tblp7sqsv25DVYs7T` | native | — | Master record for each physical asset. Tracks serial number, lifecycle status, install/stock location, subscription links, monitoring links, ticket associations, and job context. Core operational table. |
| Inventory log | `tblZdnCl0LIyKSr1B` | native | — | Event and history layer for inventory changes. Captures state snapshots including location, status, arrangement, and subscription context at the point of each logged action. Triggered via checkbox on the Inventory table. |
| Licences | `tblEcCphC0pdfOxGj` | native | — | License-level records for software entitlement tracking. Aggregates active subscription counts by customer and tracks cost per license. Distinct from subscription contracts; supports license cost modeling and billing verification. |
| Resources | `tbl3eqL9QVNgZfNgZ` | native | — | SKU and resource master defining product types, categories, brands, specs, and service classification. Flags whether an item is consumable or player-related. Referenced by Inventory, Subscriptions, and Quotes. |
| Scan - Input | `tblyTY0ftMostdUl9` | native | — | Raw scan entry or scan session intake table. Captures scan code, action type, and links to resulting Scan - Line items. Acts as the session header for barcode scanning workflows. |
| Scan - Line items | `tblgZUnyuVZwLEk8c` | native | — | Normalized scanned records tied to inventory and resource matching. Each line item links a scan session to a specific inventory unit, with resolved status, location, and assignment fields. |
| Sets | `tblRKsQAUhleUehVS` | native | — | Grouping mechanism for bundling multiple inventory items into a kit or set relationship. Linked to locations and inventory items. Supports multi-unit deployment tracking. |
| Specs | `tblyxnYFYWLxgeT0W` | native | — | Technical specification records linked to resources via attributes. Stores spec values with associated symbols and categories. Used for quote PDFs and product enrichment. |
| Stock locations | `tblYuICPpfVdM7KRd` | native | — | Warehouse and stock-holding locations used before deployment or for spare stock management. Linked to inventory items and countries. Supports pre-deployment staging and spare stock workflows. |
| Subscription contracts | `tblhn4CJZbi57C8WP` | native | — | Commercial container defining contract duration, start/end logic, renewal behavior, pricing, and contract-level assignment. Parent record linking customers, inventory, and subscriptions. |
| Subscription types | `tblKuzC0cNODVv9Zm` | native | — | Normalized classification of subscription offerings. Defines duration, service type, auto-renew behavior, and license type. Linked to resources and subscription contracts. |
| Subscriptions | `tblyNA73D9jldeEir` | native | — | Instantiated recurring service records linked to inventory items, subscription contracts, locations, and status lifecycle. Tracks active, expired, terminated, and auto-renewed states. |
| TargetR - PoP | `tblXAOl3ZEW1PuJc7` | native | — | TargetR proof-of-play or deployment grouping layer. Associates screen IDs to custom item IDs (MAC address) and timestamps. Used for TargetR monitoring event correlation and bracket/slot tracking. |
| TargetR - Status | `tbl5VPIqFKPN3PHfK` | native | — | Player monitoring and status table for TargetR-connected units. Tracks online/offline status, last contact timestamp, MAC address, local IP, and WiFi SSID. Linked to Inventory via MAC address. |
| Brand owners | `tblNot7erUUbArpLG` | Locations › Brand owners (`tblomN4KFzhzTeZyB`, view Sync to Inventory) | Inbound | Owner-level commercial reference table. Used by customers and contracts to identify the legal or commercial entity above the brand layer. |
| Brands | `tblzULqbssoVRTeG6` | Locations › Brands (`tbllTcNIfg7TkJMUO`, view Sync to Inventory) | Inbound | Brand reference layer used by customers, locations, contracts, and inventory. Links to import inventory and pre-assigned brand records for asset allocation workflows. |
| Customers | `tblxGzxvDjhH7NX1N` | Locations › Customers (`tblu9pLBFjxYX9RwL`, view Sync to Inventory) | Inbound | Customer master table linking brand, brand owner, country, and commercial identity. Central reference for subscription contracts, locations, and revenue aggregation. |
| Jobs | `tbly4d48VQIfgJaBH` | Jobs › Jobs (`tblwHj9cO37wp1fVx`, view Sync to Inventory) | Bidirectional | Synced execution context table used by inventory for installation, job assignment, and state mutation. Tracks job type, status, scheduled/actual dates, partner, and linked inventory items. |
| Locations | `tblChlR6D4roiK14y` | Jobs › Job locations (`tbl5Nj3zs3nxKPdEv`, view Sync to Inventory) | Inbound | Installed-state destination and consolidation point for inventory, jobs, subscriptions, and operational documents. Tracks customer, country, status, connectivity, and site-specific configuration. |
| Quotes | `tblqn6Sj7Ync4tPQZ` | Jobs › Quotes (`tbldE1r6MKSgebujM`, view Sync to Inventory) | Inbound | Commercial source records feeding planning, BOM logic, and execution context. Links to jobs, tracks location and inventory counts, and carries deal-level metadata from the sales process. |
| Tickets | `tblqkXYEpx9X2wHXJ` | Tickets › Tickets (`tbl7Y9QHzO1TyWZDl`, view Sync to Inventory) | Inbound | Support and incident linkage table connecting inventory items into the operational support flow. Tracks ticket subject, status, priority, SLA compliance, and location context. |

## Data (`app8H7IMW8gHyQzzn`) — see [bases/quotes-app8H7IMW8gHyQzzn/](bases/quotes-app8H7IMW8gHyQzzn/)

| Table | ID | Synced from | Direction | Description |
| --- | --- | --- | --- | --- |
| Date range | `tbltxjiJgbUfajgaJ` | native | — | Time dimension table providing standardized date keys for linking datasets to reporting periods. |
| Device Portal Scraper | `tblgyESkug0TcBVHK` | native | — | Raw ingestion table capturing external system data for monitoring and reconciliation. Acts as a staging layer before normalization. |
| Documentation - Automations | `tblqUMQCesQgeeaIp` | native | — | Automation registry documenting all workflow automations across bases. Captures trigger type, reads/writes, side effects, idempotency status, business impact, and links to related workflows. |
| Documentation - Base - Structure | `tbldD6iYBnufCyTaf` | native | — | Live registry of all cross-base sync relationships. Source of truth for system graph topology. One record per table per base, with sync direction, source/destination mapping, and table-level descriptions. |
| Documentation - Fields | `tblHG3NOPuDoLUm9H` | native | — | Registry of field-level metadata across all six bases. One record per field per base, capturing field name, type, description, link targets, lookup/rollup dependencies, and trigger/validation logic. |
| Documentation - Workflows | `tblINNYKKKgFdFvlL` | native | — | Registry of documented operational workflows across the Giant Pumpkin Airtable system. Each record describes one end-to-end business process, with scope mapping, markdown documentation, exception paths, known gaps, and links to related automations and tables. |
| Employees | `tblzRNXv6tFfHDs0K` | native | — | HR dataset tracking employee lifecycle, including hiring, termination, and organizational attributes. Used for headcount and operational reporting. |
| HS - Quotes | `tblhX7SNxLUje9Rac` | native | — | Commercial data ingestion table syncing quote information from HubSpot CRM. |
| Quote - Line Items | `tblpZg6JsXtzkb0li` | native | — |  |
| Signage Scraper | `tblC3p1fkNrxk4tMO` | native | — | Raw ingestion table capturing external system data for monitoring and reconciliation. Acts as a staging layer before normalization. |
| Subscriptions - Date range | `tblfA08VVwMAme3V3` | native | — | Time-based aggregation layer for subscription analytics, enabling churn, new, and active subscription calculations across periods. |
| Terminated Employees | `tblzUch1Ra0jrgqbH` | native | — | HR dataset tracking employee lifecycle, including hiring, termination, and organizational attributes. Used for headcount and operational reporting. |
| Customers | `tblXwqwgUigjEKIHK` | Locations › Customers (`tblu9pLBFjxYX9RwL`, view Sync to Data) | Inbound | Master data table for customers and brands. Serves as a linking layer between locations, subscriptions, and commercial data. |
| Locations | `tblqL7FwSviDdnXC3` | Locations › Locations (`tblaMnDYwMhf8fk7d`, view Sync to Data) | Inbound |  |
| Quotes | `tblbGkzCmn5IGDype` | Jobs › Quotes (`tbldE1r6MKSgebujM`, view Sync to Data) | Inbound |  |
| Subscriptions | `tbloG2fLQls9ESIrY` | Inventory › Subscriptions (`tblyNA73D9jldeEir`, view Sync to Data) | Inbound | Central subscription dataset aggregating contract, inventory, and lifecycle data. Used for revenue tracking, churn analysis, and operational reporting. |

## Jobs (`appdo1WwONYvmYMWg`) — see [bases/jobs-appdo1WwONYvmYMWg/](bases/jobs-appdo1WwONYvmYMWg/)

| Table | ID | Synced from | Direction | Description |
| --- | --- | --- | --- | --- |
| BOM | `tblMoXmjtWVO8Wyz7` | native | — | Bill of Materials table defining the resource scope for quotes and jobs. Each BOM record links a Quote to its constituent BOM resources (line items), and connects to the Jobs that execute that scope. Aggregates inventory counts, job breakdowns by type, subscription context, and resource quantities. Acts as the bridge between commercial quoting and operational execution planning. |
| BOM Resources | `tblAHbCtXG4w9tzSF` | native | — | Line-item detail table for BOMs. Each record represents a specific resource at a defined quantity within a BOM, linking the resource catalog to commercial and operational contexts. Manages subscription contract associations, inventory tracking (earmarked, installed, available), quote PDF generation fields, and planning-level job-to-BOM resource mappings. Acts as the granular execution layer between what was quoted and what gets deployed. |
| FS - Partners | `tblkK66QqEkfAKb2S` | native | — | Stores external field service partner organizations, including contact, geographic, workforce, and job linkage data, and acts as the coordination layer for grouping workers and managing outsourced execution across jobs. |
| FS - Workers | `tblR0LJqaeb44207J` | native | — | Stores external field service worker records linked to installation partners, including identity, compliance, and permit data, and serves as the assignable workforce layer for operational execution. |
| Jobs | `tblwHj9cO37wp1fVx` | native | — | Operational table managing job scheduling, execution, and status tracking for installations and maintenance workflows. |
| Jobs - Schedule log | `tblNa1qGfpvOaNn9m` | native | — | Stores a historical audit trail of scheduling changes made to Jobs records, capturing schedule snapshots and timestamps so rescheduling history, timing shifts, and planning volatility can be traced over time. |
| Ma - Cycles | `tblWRW1I8yCMdvdgq` | native | — | Reference scheduling table that standardizes preventive maintenance cadence into reusable cycle buckets. Linked to Ma - Items to group template-driven preventive maintenance work into predefined execution cycles for planning and operational control. |
| Ma - Items | `tblLHrvLMfFtwFy03` | native | — | Atomic maintenance template table linked to Ma - Packages. Each record defines a maintenance obligation by type, validity period, and optional cycle assignment, and serves as the executable rule set used by automation to create maintenance jobs for attached locations. |
| Ma - Jobs | `tblyPl0fsMSDW2uGQ` | native | — | Maintenance-specific extension table derived from Jobs, created automatically for scheduled maintenance jobs so structured maintenance inspection data, evidence, and report controls can be captured without widening the core Jobs table. |
| Ma - Packages | `tblolQwuQPsrlk49C` | native | — | Maintenance package template table defining recurring or reactive maintenance scope for linked customers, BOM context, and job locations. Packages act as the parent template layer from which linked maintenance items drive automated maintenance job creation. |
| Quotes | `tbldE1r6MKSgebujM` | native | — | Converts hydrated commercial quote input into operationally usable scope inside the Jobs base by normalizing customer, location, and execution context so quotes can drive BOM creation, job generation, and execution readiness. |
| Tasks | `tblh1SjKm6XTlBY8q` | native | — | The Tasks table is the execution decomposition layer beneath Jobs. It breaks a job into smaller assignable work units across defined delivery phases, tracks ownership and progress at both task and subtask level, and feeds completion data back into the parent job so operational follow-through can be monitored in a structured way. |
| Countries | `tblPY2wcrdWOvYnkd` | Locations › Countries (`tblcveZqTa63GVMNm`, view Sync to Jobs) | Inbound | Data table within the system. Requires further classification based on usage and relationships. |
| Customers | `tblhzcjYQk0NJCv9v` | Locations › Customers (`tblu9pLBFjxYX9RwL`, view Sync to Jobs) | Inbound | Master data table for customers and brands. Serves as a linking layer between locations, subscriptions, and commercial data. |
| Date range | `tblhyM9iJjtpORMjy` | Data › Date range (`tbltxjiJgbUfajgaJ`, view Sync to Jobs) | Inbound | Time dimension table providing standardized date keys for linking datasets to reporting periods. |
| HS - Quotes | `tblRSXCmjroNPaO5j` | Data › HS - Quotes (`tblhX7SNxLUje9Rac`, view Sync to Jobs) | Inbound | Commercial data ingestion table syncing quote and pricing information from external CRM. Used to derive contracts and subscription structures. |
| Inventory | `tblIYO0rNMG36bUmL` | Inventory › Inventory (`tblp7sqsv25DVYs7T`, view Sync to Jobs) | Bidirectional | Inventory dataset tracking physical assets and their status across lifecycle stages, including installation and subscription linkage. |
| Locations | `tbl5Nj3zs3nxKPdEv` | Locations › Locations (`tblaMnDYwMhf8fk7d`, view Sync to Jobs) | Bidirectional | Provides the synced master dataset of customer locations used in Jobs, including site identity, geographic, contact, and operational context, and serves as the core reference layer for planning and execution activities. |
| Quote - Line Items | `tbleeXRLEcGTrnwaE` | Data › Quote - Line Items (`tblpZg6JsXtzkb0li`, view Sync to Jobs) | Inbound | Stores the synced line-item detail of accepted HubSpot quotes so each quoted SKU, quantity, billing parameter, and financial metric can be consumed downstream in Jobs for quote normalization, BOM creation, subscription interpretation, and operational planning. |
| Resources | `tbl6eFWh1yj7wjiGL` | Inventory › Resources (`tbl3eqL9QVNgZfNgZ`, view Sync to Jobs) | Inbound | Contains the synced master catalog of products and services used in Jobs for quote interpretation, BOM construction, and operational planning, including SKU identity, classification, and inventory context. |
| Stock locations | `tblI14XGWho2lhvVC` | Inventory › Stock locations (`tblYuICPpfVdM7KRd`, view Sync to Jobs) | Inbound | Represents the synced set of warehouse or stockholding locations from which inventory is sourced, and is used in Jobs to support BOM planning, resource allocation, and inventory sourcing decisions. |
| Subscription contracts | `tbl8uHwls1HZbjYun` | Inventory › Subscription contracts (`tblhn4CJZbi57C8WP`, view Sync to Jobs) | Inbound | Central subscription dataset aggregating contract, inventory, and lifecycle data. Used for revenue tracking, churn analysis, and operational reporting. |
| Subscription types | `tblVD2FwbJEZNYjVv` | Inventory › Subscription types (`tblKuzC0cNODVv9Zm`, view Sync to Jobs) | Inbound | Central subscription dataset aggregating contract, inventory, and lifecycle data. Used for revenue tracking, churn analysis, and operational reporting. |
| Tickets | `tblL6BV68MtM3ZkdJ` | Tickets › Tickets (`tbl7Y9QHzO1TyWZDl`, view Sync to Jobs) | Inbound | Support ticket dataset syncing external service desk data. Used for issue tracking, SLA monitoring, and operational support workflows. |

## Tickets (`apprGGdynxDTZMZmO`) — see [bases/tickets-apprGGdynxDTZMZmO/](bases/tickets-apprGGdynxDTZMZmO/)

| Table | ID | Synced from | Direction | Description |
| --- | --- | --- | --- | --- |
| Agents | `tblKaHbVK8L9U1LT1` | native | — | Map Freshdesk agent names to Airtable collaborator accounts for ticket assignment synchronization. Bridges external Freshdesk user identity with internal Airtable user identity, enabling agent assignment visibility across both systems. |
| Compensation | `tbl8mdLvZrXTaU8lK` | native | — | Define compensation rate rules that determine when and how much compensation applies to tickets based on creation time, daypart, and day-of-week criteria. Rules operate in Default or Override mode, with Override type supporting week-specific applicability for seasonal or promotional periods. |
| Menu items | `tblBkzDATbdxYdoZo` | native | — | Represent the reference catalog of QSR menu items tracked for out-of-stock monitoring. Provides controlled vocabulary for OOS item decomposition with bilingual naming (Thai/English) and active/inactive status management. |
| OOS items | `tbl7imdzfTzQLIICs` | native | — | Decompose out-of-stock menu item requests from parent tickets into individually tracked remediation tasks. Each record represents a single menu item unavailability period at a specific location screen, with start/end timestamps and request type classification (Add/Remove/Extend). Status progresses from Todo to Done as items return to availability. |
| SLA | `tblSxD2sxiCGtUnBb` | native | — | Define resolution time thresholds for ticket categories based on Customer and Service line combinations. Each record establishes a duration target (in minutes) against which ticket performance is measured, with automatic SLA compliance percentage calculation from linked ticket resolution timestamps. |
| Ticket log | `tbleP7GMbY1P3ERFv` | native | — | Capture audit trail of ticket status transitions. Each record represents a single status change event with timestamp, user, and status value, providing complete lifecycle reconstruction capability for compliance and process analysis. |
| Tickets | `tbl7Y9QHzO1TyWZDl` | native | — | Decompose service requests into structured incident records tracked from creation to resolution. Serves as central intake and lifecycle tracking for customer-reported issues, operational failures, and service requests across digital signage and music streaming service lines. Links to SLA, Compensation, OOS items, Jobs, Locations, Customers, and audit log. |
| Weeks | `tbl5v4LXUdI1nAxwg` | native | — | Represent weekly calendar periods for compensation override scoping. Each record defines a specific week number + year pair with start/end dates, enabling precise temporal scoping of time-bound compensation rules. |
| Customers | `tblKL04W1YLy6q3SP` | Locations › Customers (`tblu9pLBFjxYX9RwL`, view Sync to Tickets) | Inbound | Represent customer entities for ticket and SLA association. Synced from Locations base to provide stable customer reference data within Tickets base. Native fields support SLA assignment, ticket linking, and reverse location relationships. |
| Jobs | `tblalOqkup0XIxdVa` | Jobs › Jobs (`tblwHj9cO37wp1fVx`, view Sync to Tickets) | Inbound | Synced from Jobs base to provide visibility into installation, maintenance, and reactive service work triggered by tickets. Native fields track ticket associations and open ticket counts. |
| Locations | `tbljrW84qbQIoYUBX` | Inventory › Locations (internal) (`tblChlR6D4roiK14y`, view Sync to Tickets) | Inbound | Represent physical venue locations for ticket association and operational context. Synced from Locations base to provide venue reference data within Tickets base. Native fields support ticket linking, job association, and customer relationships. |

## Monitoring (`appQT3lKdh9bdw1zo`) — see [bases/monitoring-appQT3lKdh9bdw1zo/](bases/monitoring-appQT3lKdh9bdw1zo/)

| Table | ID | Synced from | Direction | Description |
| --- | --- | --- | --- | --- |
| Brand owners | `tblUDdMyIG5CJOEPQ` | Locations › Brand owners (`tblomN4KFzhzTeZyB`, view Sync to Monitoring) | Inbound |  |
| Brands | `tbl0pAi4fZA0XhnGM` | Locations › Brands (`tbllTcNIfg7TkJMUO`, view Sync to Monitoring) | Inbound |  |
| Customers | `tblXHHHjzhIPEAsAc` | Locations › Customers (`tblu9pLBFjxYX9RwL`, view Sync to Monitoring) | Inbound |  |
| Device Portal Scraper | `tblNYWtOVRYGzZnj7` | Data › Device Portal Scraper (`tblgyESkug0TcBVHK`, view Audio - Sync to Monitor) | Inbound |  |
| Inventory | `tblUzyBNnI3JU4z5M` | Inventory › Inventory (`tblp7sqsv25DVYs7T`, view Sync to Monitoring) | Inbound |  |
| Locations | `tblITuNdlHo7zofcV` | Locations › Locations (`tblaMnDYwMhf8fk7d`, view Sync to Monitoring) | Inbound |  |
| Signage Scraper | `tblNYWtOVRYGzZnj7` | Data › Signage Scraper (`tblC3p1fkNrxk4tMO`, view Signage - Sync to Monitor) | Inbound |  |
| Subscription contracts | `tblMnBOv8zi5UuVey` | Inventory › Subscription contracts (`tblhn4CJZbi57C8WP`, view Sync to Monitoring) | Inbound |  |
