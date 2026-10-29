# Glossary

GP-internal vocabulary. Alphabetical. If a term is in a doc and not here, add it.

| Term | Meaning |
| --- | --- |
| **ADR / DR** | Architecture Decision Record / Decision Record in the ConnectIQ docs. DR-10, DR-12, DR-35, DR-36, DR-41 gate Phase 2. See [06-connectiq](06-connectiq/). |
| **BOM** | Bill of materials on a job: the Resources (products) and quantities to deploy. Created from the job-creation interface extension. |
| **Big G / lil g** | <!-- TODO: define. Giant Pumpkin the company vs …? --> |
| **CIQ / ConnectIQ** | Giant Pumpkin's internal platform replacing HubSpot (Phase 1, Sky) and later Airtable (Phase 2, me). `connectiq.giant-pumpkin.com`. |
| **CMS / DP** | Content management system for signage (CMS Asia, "Signage Player" by Visual Art / IXM Aqua) and Display Player — the player hardware/software running on screens. See [05-third-party-services/cms-signage.md](05-third-party-services/cms-signage.md). |
| **CRG / QSA / RD** | KFC Thailand's three franchisees (Central Restaurants Group, QSR of Asia, Restaurant Development). ~96% of location-linked tickets. |
| **Customer ID convention** | <!-- TODO: how customer IDs are formed and deduped; see 07-business-logic/customer-id-convention.md --> |
| **Cycle (MAC-YYYY - N)** | Maintenance cycle = a 4-month calendar slot. N=1 Jan–Apr, 2 May–Aug, 3 Sep–Dec. Records carry no dates. |
| **Deposit gate** | Rule that supplier POs for a job should not be approved until the customer's deposit is paid. Implemented as an approval step in ApprovalMax, not an integration. |
| **DS002 / DS005 / DS014 / DS016** | My numbering for the n8n "data sync" workflows that exported Airtable to Google Sheets: DS002 jobs, DS005 contracts and subscriptions, DS014 tickets and OOS items, DS016 HS quotes. All archived; replaced by the `*-to-sheets.py` scripts. |
| **FoC** | Free-of-charge months at the start of a subscription (1–7). |
| **Handover** | Sales → deployment handoff of an accepted quote. Happens on the Quotes-to-Job interface page. |
| **HS** | HubSpot. `HS - Quotes` is the Airtable mirror table. |
| **Installed vs Done** | Job statuses. `Installed` = field work finished, waiting on signed delivery note/photos. `Done` = closed. Not every job is an installation, so the name is misleading. |
| **IXM Aqua** | Visual Art's Signage Player API/backend (`connect.as01.signageplayer.app`). GP's `gpapi` user is read-only. |
| **Job types** | Installation, Reactive (RM), Preventive (PM), swap, removal, … <!-- TODO: full list in 07-business-logic/job-types-and-statuses.md --> |
| **LISA box** | <!-- TODO: define (a player/device that needs a subscription contract, like displays) --> |
| **MA / PM / RM** | Maintenance Agreement. PM = preventive visit, RM = reactive call-out. One visit per store per contract year; an unused RM becomes a PM after the 4-month cut-off. |
| **MPA- / MPI-** | Maintenance Package / Maintenance Package Item record IDs in the Jobs base. |
| **PAT** | Airtable Personal Access Token. Several are hard-coded in interface extensions and droplet scripts. Must be rotated at handoff. |
| **POC** | <!-- TODO: proof of concept (ConnectIQ operations prototype) or point of contact? Define. --> |
| **Pool allocation** | Inventory units are allocated to a client "pool" before deployment; a unit deployed to a client must be unallocated or in that client's pool. |
| **Quad** | Quarter-like cohort of a store's first install (Year + Quad). Drives which MA cycle a package starts in. |
| **Provisioning order** | What an Airtable "Subscription contract" really is: terms stapled to a BOM line so the automation can create subscription rows. The commercial contract is the HubSpot quote. |
| **Quote Staging** | The five-stage Quotes-to-Job pipeline: Needs Customer → Needs Allocation → Ready → Done → Exempt. |
| **Resources** | The products table in the Inventory base (`tbl3eqL9QVNgZfNgZ`). Synced to HubSpot as products. The name is historical. |
| **SN - Normalised / 14-char rule** | Samsung serials are 15 characters on the device and 14 in Airtable; every match drops the 15th character. Implemented in three places. |
| **Sky** | Sky Chew, colleague building the ConnectIQ CRM side (Phase 1). |
| **sync tick** | The `sync` checkbox on a job (`fldhTpGWsywbFFSU7`) that sends serial numbers to the Inventory base. The main human gate in the lifecycle. |
| **V1 / V2** | Maintenance contract generation. V1 (2024) = 3 PM visits; V2 and everything from 2025 = 1 PM + 2 RM. |
| **Watermelon** | The DigitalOcean droplet (`Watermelon-ubuntu-sgp1`, 168.144.43.182) hosting n8n, the sync scripts and the ConnectIQ docs site. |
