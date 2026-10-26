# 05 — Third-party services

One file per service, all on the same template ([_template.md](_template.md)). The table below is the master list; keep it in sync with the files.

| Service | Purpose | Admin login held by | Billing | Doc |
| --- | --- | --- | --- | --- |
| Airtable | operations database | Business plan; owners Chris, Seb, Sky, Yves | | [airtable.md](airtable.md) |
| HubSpot | CRM, quotes (being replaced by ConnectIQ Phase 1) | portal 244131765; Super Admins Seb + me | | [hubspot.md](hubspot.md) |
| Freshdesk | support ticketing | giantpumpkin-help.freshdesk.com; admins Mark, Seb, Sky | | [freshdesk.md](freshdesk.md) |
| Xero | accounting (Singapore org) | finance | | [xero.md](xero.md) |
| ApprovalMax | PO / bill approvals on top of Xero (Advanced plan) | Seb (owner) | | [approvalmax.md](approvalmax.md) |
| DocsAutomator | document generation from Airtable | | | [docsautomator.md](docsautomator.md) |
| Fillout (Zite) | field forms writing to Airtable | Yves's organization, free plan | none | [fillout.md](fillout.md) |
| CMS Asia / IXM Aqua / Signage Player Europe | signage content management | | | [cms-signage.md](cms-signage.md) |
| DigitalOcean | droplet hosting | | | [digitalocean.md](digitalocean.md) |
| Google Workspace | Sheets, Looker Studio, service accounts | | | [google-workspace.md](google-workspace.md) |
| Supabase | Postgres for pipelines and ConnectIQ | | | [supabase.md](supabase.md) |
| Vercel | ConnectIQ hosting | Sky | | [vercel.md](vercel.md) |
| Resend | ConnectIQ email | Sky | | [vercel.md](vercel.md) |
| AirDiff | daily snapshot/diff of the Jobs base (`wflqLnOhIgG6VBF2m`) | | | [airdiff.md](airdiff.md) |
| TargetR | signage player telemetry pulled into Inventory base every 30 min (`wflBANYMhf5P5djxI`) and PoP webhook | | | [targetr.md](targetr.md) |
| Workable | HR; employee list pulled monthly into the Data base | HR, not me | | [workable.md](workable.md) |
| Slack | alerts from ~12 automations | | | [slack.md](slack.md) |
| Coupler.io | retired | | cancel? | [../03-data-pipelines/deprecated/](../03-data-pipelines/deprecated/) |
