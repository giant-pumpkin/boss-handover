# DocsAutomator

| | |
| --- | --- |
| What we use it for | PDF generation from Airtable records: work orders, job reports, delivery notes (manual and e-signature) |
| URL | https://www.docsautomator.co <!-- confirm --> |
| Plan / tier | <!-- TODO --> |
| Admin account (email) | <!-- TODO --> |
| Billing | <!-- TODO --> |
| API key (name only) | hard-coded in the Jobs-base automation scripts <!-- TODO: confirm, rotate --> |

## Where it is wired in

All in the Jobs base (`appdo1WwONYvmYMWg`), as `customScript` steps that call the DocsAutomator API. Full list in [02-airtable/bases/jobs-appdo1WwONYvmYMWg/automations.md](../02-airtable/bases/jobs-appdo1WwONYvmYMWg/automations.md).

| Template code | Document | Automation(s) |
| --- | --- | --- |
| GP/TEM-004 | Job report – Installation | `wfld0DPxrxcnpqiCm`, `wflGHYuN6sAVLDLBJ`, DEV auto-generate (off) |
| GP/TEM-006 | Work order – Installation – Apple | `wfl7TBX9yH1KV5QtD` |
| GP/TEM-008 | Job report – Ma – Preventive | `wflkueIIHNWvDNz3h`, `wfld0DPxrxcnpqiCm` |
| GP/TEM-014 | Job report – Installation (newer) | `wfld0DPxrxcnpqiCm`, `wflGHYuN6sAVLDLBJ` |
| GP/TEM-015 | Delivery note (Giant Pumpkin heading) | `wflHc5DTQ4dUSYVjd` |
| GP/TEM-016 | Delivery note – e-signature | `wflKrZ6ig0r96M4NV` |
| GP/TEM-017 | Delivery note – Titanium Synergy heading (Chagee, Zus Coffee) | `wflHc5DTQ4dUSYVjd` |
| RS/TEM-002 | Job report – Installation (Royal Streaming) | `wfld0DPxrxcnpqiCm`, `wflGHYuN6sAVLDLBJ` |
| RS/TEM-003 | Delivery note – e-signature (Royal Streaming) | `wflKrZ6ig0r96M4NV` |

Templates are Google Docs. The source documents are in the shared Drive folder **DocsAutomator templates**: https://drive.google.com/drive/folders/1_qgkauatSDjoZcu3is8Ke4948RuMxMZk — edit the Doc there, then re-sync the template in DocsAutomator so it picks up the new placeholders.

## Gotchas / limits we have hit

- **Template choice by customer.** The delivery-note automation (`wflHc5DTQ4dUSYVjd`) picks GP/TEM-017 (Titanium Synergy heading) for Chagee and Zus Coffee and GP/TEM-015 otherwise. The condition that keys on *customer from location name* works for Chagee but not for Zus Coffee; for Zus it has to key on the `customer string` field, or the note falls back to the Giant Pumpkin heading.
- **The script only needs two inputs**: the Airtable record ID and the DocsAutomator document (template) ID.
- **E-signature flow**: the customer must be flagged *is Esign eligible* and have a default signer email; a location-level *Location contact esign* email overrides it. DocsAutomator replaces the unsigned attachment with the signed PDF when the customer signs; signing status is only visible in the DocsAutomator dashboard.
- Cost is in the hundreds of USD per month; it is the single most expensive add-on in the Jobs base.

## What breaks if it is cancelled

Every PDF button on the Jobs interface, and PM job closure (`FS - Ma - PM - Close job`).
