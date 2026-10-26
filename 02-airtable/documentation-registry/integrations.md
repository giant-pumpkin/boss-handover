# Documented integrations

From `Documentation - Integrations` (`tbldOLA5Jet12VNM1`). Written before the Python HubSpot sync existed; check the Coupler entry against [03-data-pipelines/deprecated](../../03-data-pipelines/deprecated/).

## Coupler.io

- **Purpose:** Daily ETL sync of Airtable data sources to Google Sheets for use as Looker Studio data sources. Enables analytics and BI reporting on operational data via standardized data endpoint pattern.
- **Source System:** Airtable
- **Destination System:** Google Sheets
- **Primary Base:** Data
- **Tables Involved:** Views marked with DS-{numeric\_id} naming pattern across all bases (Data, Jobs, Inventory, Locations, Monitoring, Tickets). Each data source view syncs to a corresponding Sheet with identical naming.
- **Reads From:** Airtable views (via Coupler's Airtable connector, using base ID + view ID). Naming convention: DS-{numeric_id}
- **Writes To:** Google Sheets with identical names (DS-{numeric\_id}). These Sheets are configured as data sources in Looker Studio for BI and analytics reporting.
- **Sync Logic:** Coupler workflows are triggered on a daily schedule. Each workflow reads from a single Airtable view identified by its actual view ID (not name), extracts all records and fields, and appends or replaces data in the corresponding destination Sheet. The numeric identifier in the DS-{id} naming allows operational teams to match Airtable views, Coupler flows, and destination Sheets without relying on name-based linking.
- **Dependencies:** Coupler API credentials stored securely. Airtable personal access token with base/view read permissions. Google Sheets API permissions for write access to destination files. Looker Studio requires read access to the Sheets. All data source Sheets must be accessible by accounts using the Docs automator templates (same account set as the endpoint Sheets).
- **Failure Modes:** Coupler flow disabled or deleted without disabling corresponding Airtable view = orphaned data, Looker Studio dashboards begin to lag. Destination Sheet deleted or renamed = Coupler sync fails silently until manually verified. Airtable view modified (fields changed, filters altered) without updating Coupler configuration = Sheets receive unexpected schema changes. Daily quota exceeded = syncs queue or fail, no data update for that day.
- **Owner:** Boss
- **Last Verified:** 2026-04-02
- **External Documentation Link:** https://coupler.io/docs

## Setup Pattern

1. Create an Airtable view in any base
2. Name it following DS-{numeric_id} convention (e.g., DS-001, DS-042)
3. Configure the view as a data source (apply filters, select fields as needed for BI)
4. In Coupler, create a new workflow with:
   - Source: Airtable connector, base ID, view ID
   - Destination: Google Sheets, name sheet DS-{numeric_id} (matching Airtable view name)
   - Schedule: Daily (time configurable, typically overnight)
5. Test the sync manually, then enable daily scheduling
6. In Looker Studio, add the Sheet as a data source
7. Build dashboards and reports using the Sheets as endpoints

## Data Flow

Airtable View (DS-{id}) -> Coupler Workflow -> Google Sheet (DS-{id}) -> Looker Studio Dashboard

## Naming Convention

- Airtable view name: DS-{numeric_id}
- Coupler workflow: named to match the view name (operational clarity, not functional requirement)
- Google Sheet name: DS-{numeric_id}
- All three use the same numeric identifier for traceability, but the actual connection is via Coupler's configuration of base ID + view ID.

## Storage Location

All data source Sheets are created in Yves' Google account, located in the "data sources" folder at the root of Google Drive.

## Operational Notes

- The numeric ID is arbitrary but should be sequential or assigned from a central registry to avoid collisions.
- Sheets are stored in Yves' Google account under /Data sources. 
- Coupler runs during off-peak hours; configure schedule based on your timezone and load patterns.
- Monitor Coupler's dashboard for failed syncs; Airtable schema changes or permission issues are common causes.
- If a data source is no longer needed, disable the Coupler workflow first, then archive or delete the Airtable view and corresponding Sheet.

## Fillout

- **Purpose:** Form layer on top of Airtable. Provides job-specific mobile/desktop forms for field data capture that write directly back into Airtable and feed downstream automation and reporting.
- **Source System:** Fillout
- **Destination System:** Airtable (Jobs, Inventory)
- **Primary Base:** Jobs (appdo1WwONYvmYMWg)
- **Tables Involved:** - Jobs table (KFC installation jobs, MA preventive maintenance jobs)
- Inventory table (serial-number-backed display selection for KFC Samsung installations)
- **Reads From:** Jobs.record context (job-level button or view entry point), Inventory.serial numbers (for KFC Samsung installation jobs), Jobs.MA check structure (for preventive maintenance workflows)
- **Writes To:** - Airtable Jobs table fields (installation data, incident flags, maintenance check results)
- Airtable Inventory table fields (installed display selection by serial number)
- Image attachments to relevant Airtable records
- **Sync Logic:** Entry: Worker opens Fillout form from job-level button or shared Airtable interface/view. Fillout form exposes relevant data (e.g., serial-number-backed inventory records for KFC Samsung jobs, maintenance check structure for MA jobs). Worker completes form on desktop or mobile. Form inputs map directly to Airtable fields. On submit: data writes back into Airtable, uploaded images attach to records, incident flags or issue data can trigger alert state, support gains direct visibility into job-related evidence. For maintenance jobs, submission can trigger automated report generation through DocsAutomator.
- **Dependencies:** - Fillout account + API credentials for Airtable integration
- Airtable Jobs table with job-level Fillout button field (URL field pointing to job-specific form)
- Airtable Inventory table with serial numbers preloaded (for KFC Samsung jobs)
- Shared Airtable views/interfaces configured for field team access
- Downstream automations in Airtable to process form submissions (DocsAutomator for maintenance reports, incident escalation logic)
- Mobile network access for field teams (or offline-capable form mode if supported by Fillout)
- **Failure Modes:** For KFC Samsung installations, integration depends on inventory quality upstream. If serial numbers are not imported correctly from delivery manifests, the installation form loses part of its operational value (precise inventory-driven selection). Form schema drift: if Airtable field structure changes without updating Fillout form configuration, submitted data may fail to map correctly or write to wrong fields. Fillout button link breaks if form URL or job-level button field is deleted/changed. Worker submits form but Airtable automation fails to trigger downstream actions (report generation, alert escalation) due to misconfigured automation logic. Mobile network issues during field execution can prevent form submission, requiring offline-capable workflow or retry logic.
- **Owner:** Boss
- **Last Verified:** 2026-04-03

## Use Cases

### 1. KFC Installation Jobs

Fillout is used for KFC installation jobs because these jobs involve Samsung displays, and Samsung deliveries include manifests containing display serial numbers.

**Workflow:**
1. Samsung displays arrive at warehouse with manifest
2. Serial numbers batch uploaded into Airtable Inventory from delivery manifest
3. Installation job dispatched
4. Field worker opens Fillout form from job record (job-level button)
5. Worker selects installed displays by serial number (Fillout exposes serial-number-backed inventory records)
6. Worker uploads installation images
7. Worker uploads support-related images for later troubleshooting
8. Worker logs incidents directly during installation (if any)
9. Airtable receives submission and updates job
10. If incident logic triggered, job moved into alert state for support follow-up

**System value:**
- Reduces ambiguity in installed hardware identification through serial selection
- Gives support immediate access to visual evidence
- Enables issue escalation directly from the field

### 2. Preventive Maintenance Jobs

Fillout is used for preventive maintenance workflows tied to MA jobs.

**Workflow:**
1. MA job dispatched
2. Field worker opens Fillout form from job record
3. Worker completes required maintenance checks (form exposes checks from MA jobs structure):
   - Color discoloration
   - Black pixels
   - Dead pixels
   - Connectivity issues
   - Power socket issues
   - Ethernet socket issues
4. Worker records any defects or anomalies
5. Worker uploads supporting images where needed
6. Airtable receives form submission
7. Airtable automations trigger downstream reporting
8. DocsAutomator generates job report

**System value:**
- Ensures structured and consistent field data capture
- Connects execution data to automated reporting
- Improves mobile usability for field teams

## Access Model

Fillout forms are launched from Airtable-context dispatch workflows.

**Entry points:**
- Shared Airtable views
- Shared Airtable interfaces
- Job-level Fillout button (URL field) linked to the relevant job

**Design logic:**
Worker does not search for a form manually. They open the specific form directly from the job context.

## Data Flow

**Upstream context:**
- Jobs exist in Airtable
- Inventory exists in Airtable
- For KFC Samsung jobs, inventory serial numbers preloaded via manifest import
- MA jobs contain relevant maintenance check structure

**Execution layer:**
- Job-specific Fillout button opens correct form
- Technician completes form on desktop or mobile
- Form inputs map directly into Airtable fields

**Downstream effects:**
- Submitted form data writes back into Airtable
- Uploaded images become attached to relevant Airtable records
- Incident flags or issue data can set job into alert state
- Support gains direct visibility into job-related evidence and issues
- For maintenance jobs, submission can trigger automated report generation through DocsAutomator

## Constraints

- KFC installation use is specific because Samsung serial manifests make precise inventory-driven selection possible
- Integration depends on inventory quality upstream. If serials are not imported correctly, the installation form loses part of its operational value
- Fillout is not the system of record. Airtable remains the system of record, while Fillout acts as the structured input layer

## Integration Type

**Type:** Field execution form layer  
**Primary function:** Structured mobile/desktop job data capture into Airtable  
**Primary downstream consumers:** Jobs, support workflows, DocsAutomator job reports

## Pagem

- **Purpose:** Escalate qualifying support tickets from Airtable to support agents' mobile devices via Pagem paging service for immediate real-time notification.
- **Source System:** Freshdesk → Airtable Tickets base
- **Destination System:** Pagem mobile app (broadcast/hunting paging modes)
- **Primary Base:** Tickets (apprGGdynxDTZMZmO)
- **Tables Involved:** Tickets table
- **Reads From:** Tickets.Ticket - Subject, Tickets.Created, Tickets.Ticket - Source, Tickets.Record (full record context for email body)
- **Writes To:** page@pagem.com
No direct writes to Airtable; Pagem does not write back.
- **Sync Logic:** View filter qualification → automation trigger → email dispatch. OOS/non-OOS body variant chosen by conditional text in automation. No state sync; integration is fire-and-forget notification.
- **Dependencies:** - Airtable (view exists, automation runs, email service operational). 
- Pagem (group 4617-4618 exists, members provisioned, mobile apps active, group broadcast/hunting mode configured). 
- Freshdesk ticket sync to Airtable working. 
- Airtable email intergration
- **Failure Modes:** Wrong email subject breaks routing (must be exactly 4617-4618). View filter changes alter paging eligibility silently (Created is today with +07 timezone is timezone-dependent). Airtable email delivery failure breaks integration entirely. Pagem group membership errors or mode misconfiguration in Pagem results in wrong recipients or incorrect paging pattern. OOS/non-OOS wording consistency is fragile if edited without documentation. Sender identity (yves@giant-pumpkin.com) change affects trust or mail server routing.
- **Automations:** Notify via Pagem 
Automation condition: 
record enters view with filters (Ticket - Subject does not contain 'call', Created is today +07 timezone, Ticket - Source is not Chat). 
Output: email from yves@giant-pumpkin.com with subject line 4617-4618 and OOS/non-OOS body variants.
- **Owner:** Uses sebastian+pagem@giant-pumpkin.com
- **Last Verified:** 2026-04-02
- **External Documentation Link:** https://www.pagem.com

Email-mediated integration routing support tickets to on-call support groups in Pagem. 
Qualification occurs via view-level filters in Airtable. 
Routing key is the email subject (4617-4618, the Pagem group ID). 
Pagem interprets the subject and emails the group endpoint, then pages members via broadcast or hunting mode based on group configuration. 
The OOS/non-OOS distinction is semantic signaling in the email body to help operators immediately understand ticket severity without API changes.

## DocsAutomator

- **Purpose:** Template-based document generation and e-signature workflow. Generates formatted documents from Google Docs templates with field placeholders, supports conditional blocks and line-item expansion, and handles e-signature collection with signed PDF write-back to Airtable.
- **Source System:** Google Docs (template storage) → DocsAutomator API → Airtable (data source)
- **Destination System:** - Airtable (PDF documents + e-signature state)
- Google Mail (e-signature recipient)
- DocsAutomator  (template management)
- **Primary Base:** Jobs (appdo1WwONYvmYMWg)
- **Tables Involved:** - Jobs table (primary trigger, record links for linked data)
- Inventory table (line-item expansion for BOMs)
- **Reads From:** Jobs.Record ID (trigger), Jobs.linked fields (context), Inventory.linked records (line items for expansion), Jobs.Customer Email (e-signature recipient, can be overridden at Job level), Jobs field values (placeholders in document)
- **Writes To:** Airtable field(s) storing generated PDFs
- **Sync Logic:** - Document-only: Airtable automation triggers → POST to DocsAutomator API with record ID + template ID → DocsAutomator pulls data from Airtable, renders placeholders, generates PDF → PDF stored directly in Airtable field.

- E-signature: Airtable automation triggers → POST to Docs Automator API with record ID + template ID + e-signature flag → DocsAutomator generates document → DocsAutomator sends to customer email address (from Jobs.Customer Email, can be overridden by Jobs.Customer Email - Override) → Customer signs document → Docs Automator receives signed notification → Docs Automator retrieves signed PDF + certificate → DocsAutomator POSTs signed PDF back to Airtable to designated field → Airtable field updated asynchronously.

- Customer level (Locations base, Customers table): `Customer - Contact - Esign` (email field)
- **Location level (Locations base, Locations table):** `Location - Contact - Esign` (email field) - location-specific override
- **Job level (Jobs base, Jobs table): **`Contact - Esign - Normalised` (formula, returns location-level or customer-level esign email as string)
    - Intermediate lookup fields: `Customer - Contact - Esign` (lookup from Customer via Jobs link)
    - `Location - Contact - Esign` (lookup from Location)
- **Dependencies:** - Google Docs templates (in yves@giant-pumpkin account under /Document templates/GP and /Document templates/RS). 
- DocsAutomator account + API credentials. 
- Airtable automations configured to call Docs Automator API.
- Email fields.
- Inventory table linked to Jobs. 
- Airtable field(s) designated for PDF output. 
- DocsAutomator e-signature feature enabled (if using e-signature flow).
- **Failure Modes:** Placeholder mismatch: field name in Airtable does not match placeholder name in Google Docs, resulting in empty/unrendered placeholders. Template naming inconsistency between Google Docs file name, Docs Automator template setup, and Airtable automation annotation breaks closed-loop naming convention. Missing or wrong record ID in API call prevents Docs Automator from fetching data. Conditional block logic misconfigured, causing unintended sections to appear/disappear. Line-item expansion fails if Inventory link field is missing or contains no records. E-signature recipient email invalid or unavailable, causing delivery failure. Async write-back from Docs Automator fails if Airtable target field does not exist or is read-only. API rate limit or timeout on Docs Automator if document generation is slow. Airtable automation fails to trigger if record does not meet condition criteria.
- **Automations:** Airtable automations trigger API POST to DocsAutomator with record ID + template ID. 
Template ID derived from DocsAutomator template setup (closed-loop naming with script annotations). 
Two sub-workflows: 
- document-only: PDF generated, stored in Airtable field. 
- e-signature: document created, sent to customer email, signed PDF + certificate written back on completion.
- **Owner:** Boss
- **Last Verified:** 2026-04-02
- **External Documentation Link:** https://app.docsautomator.co/

## Templates

**Location:** Google Drive (yves@giant-pumpkin account) under `/Document templates/GP` and `/Document templates/RS`

| Template ID | Name | Purpose | Trigger Table | Output Behavior |
|---|---|---|---|---|
| GP/TEM-000 | Blank / Base | Baseline template | any | document-only, PDF to field |
| GP/TEM-003 | Job Report | Detailed job summary with line items | Jobs | document-only, PDF to field |
| GP/TEM-004 | Installation Report | Post-install verification with photos/signatures | Jobs | e-signature, signed PDF + cert |

**Naming Convention:** Template name in Google Docs = DocsAutomator template ID = Airtable automation script annotation. This closed-loop naming ensures traceability and prevents silent mismatches.

## Placeholder Syntax

Google Docs uses `{FieldName}` syntax. Field names must match exactly to Airtable field names in the source table.

Examples:
- `{Job - Name}` renders Jobs table field "Job - Name"
- `{Customer - Phone}` renders linked Customers table field "Customer - Phone"
- Unmatched placeholders render as empty strings

## Conditional Blocks

Google Docs can define sections that appear/hide based on placeholder evaluation. Syntax TBD by Docs Automator config.

Example: "Show installation notes only if `{Installation - Status}` = 'Complete'"

## Line-Item Expansion

When a Job links to multiple Inventory records, placeholders like `{Inventory.SKU}` expand into a table/list in the output document, one row per linked record.

Requires Inventory link field to exist on Jobs and be populated.

## E-Signature Flow

When template is configured as e-signable in DocsAutomator:
1. DocsAutomator marks designated placeholders as e-signable zones
2. Document generated, sent to customer email from `{Customer Email}` (or override if `{Customer Email - Override}` populated)
3. Customer signs in Docs Automator UI or email link
4. Docs Automator receives completion event, attaches signing certificate
5. Signed PDF + certificate POSTed back to Airtable field (TBD which field per template)
6. Airtable field updated asynchronously (timestamp logged by Docs Automator)

## Configuration References

- **DocsAutomator Portal:** Template setup, field mapping, conditional logic, e-signature zones
- **Airtable Automation Annotations:** Script block calling API must be annotated with template name (e.g., `// Template: GP/TEM-003`) for debugging and traceability
- **Google Docs Folder Structure:**
  - `/Document templates/GP/` (Giant Pumpkin branded)
  - `/Document templates/RS/` (Royal Streaming branded)

## Freshdesk

