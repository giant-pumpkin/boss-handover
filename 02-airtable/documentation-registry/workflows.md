# Documented workflows

From `Documentation - Workflows` (`tblINNYKKKgFdFvlL`). The three fully written ones are in their own files; the rest are stubs that were never filled in.

| Workflow | Slug | Bases | Status | Priority | Last reviewed | Doc |
| --- | --- | --- | --- | --- | --- | --- |
| Maintenance Package Lifecycle | maintenance-lifecycle | Jobs | Active | High | 2026-04-02 | [maintenance-lifecycle.md](workflows/maintenance-lifecycle.md) |
| Quote-to-Operations: HubSpot to Jobs | quote-to-operations-hubspot | Data, Jobs, Inventory | Draft | High | 2026-04-01 | [quote-to-operations-hubspot.md](workflows/quote-to-operations-hubspot.md) |
| Subscription Lifecycle: Contract Allocation to Subscription | subscription-lifecycle | Inventory | Draft | High | 2026-04-02 | [subscription-lifecycle.md](workflows/subscription-lifecycle.md) |
| Device monitoring and health |  |  |  | Medium |  | stub |
|  |  |  |  |  |  | Device status ingestion from Signage Scraper and Device Portal Scraper feeds device health data, which connects to inventory status and ticket creation. |
| Inventory lifecycle |  |  |  | High |  | stub |
|  |  |  |  |  |  | Resource procurement, stock location, reservation, job allocation, installation, and operational status sync. Flows through Inventory base and synced copies in  |
| Job execution and close-out |  |  |  | High |  | stub |
|  |  |  |  |  |  | Scheduled job through field service assignment, pre-installation tasks, on-site execution, sign-off, report generation, inventory sync, and delivery notes. |
| Location onboarding |  |  |  | Medium |  | stub |
|  |  |  |  |  |  | New locations synced from Locations base to Jobs and Data. Requires customer linking, address enrichment, connectivity, and customer-specific (KFC, CK) configur |
| OoS enrichment on tickets |  |  |  |  |  | stub |
| Quote generation (Airtable-native) |  |  |  | Medium |  | stub |
|  |  |  |  |  |  | Native quoting path using BOM Resources directly, bypassing HubSpot intermediary. Used for certain customers or regions outside HS integration. |
| Ticket-to-job escalation |  |  |  | Medium |  | stub |
|  |  |  |  |  |  | Tickets arrive from Freshdesk, link to jobs, trigger job creation, and feed priority/SLA back into job-level incident alerts. |
| Tickets - Compensation |  |  |  |  |  | stub |
