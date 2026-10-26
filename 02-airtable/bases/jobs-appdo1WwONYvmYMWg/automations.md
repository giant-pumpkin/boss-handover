# Jobs base automations

Live list from the Airtable API, 2026-10-26 (36 automations, 27 deployed). Where the in-Airtable registry had a description it is appended. Open any automation at `https://airtable.com/appdo1WwONYvmYMWg/workflows/<id>`.

| ID | Name | Deployed | Trigger | What it does | Registry notes |
| --- | --- | --- | --- | --- | --- |
| `wfl7TBX9yH1KV5QtD` | Interface - Button - Create WO PDF | on | button · Jobs | DocsAutomator: work order, GP/TEM-006 (Apple), Royal Streaming, Giant Pumpkin variants |  |
| `wfld0DPxrxcnpqiCm` | Interface - Button - Create job report PDF | on | button · Jobs | DocsAutomator: GP/TEM-014, GP/TEM-004, GP/TEM-008 (PM), RS/TEM-002 by branch |  |
| `wflsW0LoP8zU6XBzv` | Send job SN to Inventory (Sync) | on | conditions · Jobs › `sync` = true | four branches by job type → Inventory-base webhooks (Installation, Installation set to Pre-sale to disable, Collect, Delivery) |  |
| `wflrxk2H2RcD1mDWe` | Send Slack - Fulfilled quotes | off | enters view · Quotes | Slack |  |
| `wfl4KzuOzqq8paJip` | Send Slack - Task is Done | on | enters view · Tasks | Slack next task |  |
| `wfl1h5RlE4FbGPMWj` | GP - Jobs - Installation - Tasks | on | conditions · Jobs type Installation, scheduled | creates task fields |  |
| `wflkueIIHNWvDNz3h` | FS - Ma - PM - Close job | on | conditions · Ma - Jobs (completion field set) | timestamp, close job, DocsAutomator GP/TEM-008 PM report |  |
| `wflOPEPm3UesQF7bU` | Create MA jobs - Ma Jobs | on | conditions · Jobs status Tentative/Scheduled and type Ma - Preventive | creates Ma - Jobs checklist record |  |
| `wflO3zgLqJdbxi3Xf` | Send mail - Ma schedule | on | button · Jobs | emails customer schedule / re-schedule, Slack |  |
| `wflP7jVHqgTJhbymI` | FS - Installation - Best Buy - Close job | off | conditions · Jobs (USA) | legacy |  |
| `wflVIitLoi2cS5ffJ` | FS - Installation - KFC - Close job | off | conditions · Jobs (KFC) | legacy |  |
| `wflzaGcmtVUMsTDyv` | Quotes - Set customer on BOM line items | on | conditions · Quotes | copies customer to BOM resources |  |
| `wflSSIGp06h7fTI94` | Create delivery note from image | on | conditions · Jobs (delivery-note image attached) | script |  |
| `wflzER5l1wFgSGB1a` | Create MA jobs - Jobs | on | conditions · Job locations › `Ma - Package - Add new` not empty | one Unscheduled job per package item for that store |  |
| `wfl04P70Ev9d9ghVR` | GP - Jobs - Un-installation - Tasks | on | conditions · Jobs type Un-installation, scheduled | task fields |  |
| `wfl2jYQflf610Wpms` | Inventory availability - Installed SNs added to Job | on | conditions · Jobs (serials present, status Installed/Done/…, flag) | script + update |  |
| `wflraoNuk70HIQcj7` | Inventory availability - Installed SNs added to Job (button trigger) | on | button · Jobs | same, manual |  |
| `wflnPHfyND6q0b4Ij` | Write schedule log | on | conditions · Jobs (log checkbox) | Jobs - Schedule log row |  |
| `wflxtEuUdQo3TSI4p` | House keeping - Clear unlinked logs | on | cron monthly 1st | deletes orphan logs |  |
| `wfl5OR5tv0oPPJAym` | DEV - Create Job/Job BOM from Quote | on | button · Quotes | creates job + BOM |  |
| `wflwUYiFyi9982B9Z` | DEV - Link Job BOM item to Master BOM item | on | record updated · BOM resources | matches SKU to quote BOM line, flags if none |  |
| `wfl3hEEkq2QTmnj0T` | DEV - Create BOM from Quote | off | button · Quotes |  |  |
| `wflkssvulh8vZozlU` | Create delivery note for BoostJuice | off | button · Jobs | customer-specific |  |
| `wfl5N8tRuC2awLldK` | DEV - Create Quote from HS | off | conditions · HS - Quotes (copy) | creates Airtable-native Quote | **Description:** Fires when TriggerCreateQuote is TRUE, SysQuoteRequestSent is FALSE, and no Quote is linked. Creates a Quote record populated from the HS - Quotes fields, then marks SysQuoteRequestSent = TRUE to prevent re-triggering. |
| `wflVotEzFzdYxmUnP` | DEV - Create Master BOM and line items from HS | on | conditions · Quotes status = Ready for BOM | creates BOM + BOM resources from HS line items | **Description:** Fires when a Quote reaches Ready for BOM stage. Creates a Master BOM record linked to the quote, advances quote stage to Enrich, then iterates HubSpot quote line items to create BOM resource records matched by SKU. |
| `wfluNitKVrYWiqjpc` | DEV - Create contract from software Master BOM items | on | conditions · BOM resources status = Ready for contract | creates subscription contract |  |
| `wflKrZ6ig0r96M4NV` | Interface - Button - Generate Esign Delivery note | on | button · Jobs | DocsAutomator GP/TEM-016 or RS/TEM-003 e-signature delivery note |  |
| `wflH8RMNifoYw6zgA` | DEV - Job reports - Auto-generate | off | conditions · Jobs | DocsAutomator GP/TEM-004 | **Description:** Fires when a Job reaches Done status with installation images, SN, and job type of Installation or Rework. Sends a Slack notification to the assigned user, then conditionally calls DocsAutomator API to generate a PDF job report (KFC brand only). |
| `wflaU1S3GUrJHUfRD` | DEV - Link contract to corresponding Master BOM item | on | record created · Subscription contracts | links to BOM resource |  |
| `wflHc5DTQ4dUSYVjd` | Interface - Button - Create Delivery Note (Manual Signature) | on | button · Jobs | DocsAutomator GP/TEM-017 (Titanium heading for Chagee / Zus Coffee) or GP/TEM-015 |  |
| `wflqLnOhIgG6VBF2m` | Sync base to AirDiff | on | cron daily 00:00 Asia/Bangkok | script pushes the base to AirDiff <!-- TODO: what AirDiff is used for, account owner --> |  |
| `wflZLTTvPyjwt0RYH` | Job - Updated 'Dated - Completed' | on | record updated · Jobs › Status | stamps completion date |  |
| `wfltj9gsfIIglOu59` | DEV - Job reports - Auto-generate (Apple) | off | conditions · Jobs (Apple) | DocsAutomator GP/TEM-004 |  |
| `wflGHYuN6sAVLDLBJ` | Tickbox - Create job report PDF | on | conditions · Jobs (report checkbox) | same branches as the button version |  |
| `wflcn5iSrF9B6wjF3` | Notify change in scheduled date | on | record updated · Jobs › Date scheduled | Slack |  |
| `wflnTgCcNvSazbBVk` | Send Slack - Invoice Job | off | enters view · Jobs | Slack |  |
