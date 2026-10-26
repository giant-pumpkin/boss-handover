# Airtable

Observed in the Airtable UI on 2026-10-26.

| | |
| --- | --- |
| What we use it for | the operations database: inventory, jobs, maintenance, tickets mirror, quotes mirror, master data |
| URL | https://airtable.com/workspaces/wspIPo8kyzUAuEbrw |
| Organization | Giant Pumpkin |
| Workspace | "Giant Pumpkin", `wspIPo8kyzUAuEbrw`, **Business plan** |
| Owners | Chris Lower (chris@), Sebastian Svensson (sebastian@), Sky Chew (sky@), Yves Peirlinck (yves@, left early 2026 but still an owner) |
| Billing | <!-- TODO: card holder and renewal; Business plan is per-seat --> |
| Support | Airtable in-app support chat |
| API keys in use | my PAT `AT_PAT` (droplet, scripts, n8n credential "Airtable PAT (Digital Team)"), PATs hard-coded in the interface extensions, the Fillout and Freshdesk connections |

## Collaborators (18, workspace level)

| Role | People |
| --- | --- |
| Owner | Chris Lower, Sebastian Svensson, Sky Chew, Yves Peirlinck |
| Creator | Pitchayut Lertniratwong (me), Ruj Samalapa |
| Editor | Mark Moreto, Wannasiri Sonthijit, Patcharanat Suraphanphairoj, Phongphot Photwithundilok, Mild Wachiraya, Phongrapat Ploddee |
| Commenter | Krittiyanee Mingsaksri, Vitit Rattanachinchai (royalstreaming.com) |
| Read only | Illia Strikhar (toptal.com), Chanissara Lohanakakul, Kelly Willis, Natamon Shenton-Phelps |

Plus 14 base-level collaborators not in the workspace list. Exportable as CSV from the workspace Share dialog.

At handoff: my role (Creator) must pass to the successor; Yves and the two external accounts (Toptal, Royal Streaming) should be reviewed.

## Bases in the workspace (14)

| Base | ID | Status |
| --- | --- | --- |
| Jobs | `appdo1WwONYvmYMWg` | live, documented |
| Locations | `appmFizJaAn7yKKVu` | live, master data |
| Inventory | `appRor1ipbYAb4K7z` | live |
| Tickets | `apprGGdynxDTZMZmO` | live |
| Data | `app8H7IMW8gHyQzzn` | live (the "Quotes" base) |
| Monitoring | `appQT3lKdh9bdw1zo` | live, fed by the CMS scraper |
| Inventory (New) | `app9sYIeT64NByl3x` | <!-- TODO: what is it, opened last month --> |
| Customer - Proposed | `appRIn8tNiCniPcRl` | design draft for the customer model, ~5 months old |
| Portal | `app7ZTTbGMGma5aGm` | not opened in a year |
| LabOps | `appwNet4Ke0OMwgkV` | not opened in a year |
| Development, Formula Playground, Project Tracker | `appAjpJl54WGM7PUY`, `appWEJihXKmDS9i7b`, `appa63rf0LW34MPvt` | scratch |
| Inventory - Rollback, Jobs (July 7, 2026), Jobs (July 10, 2026) | `appiPOr403M6daN7o`, `appakq8TD1oJz6wIC`, `app5pzCrNVuoI9tAh` | **snapshots** taken before risky changes; safe to delete once confirmed |

The six live bases are documented in [02-airtable/](../02-airtable/).

## What breaks if it is cancelled

Everything operational: job creation, maintenance scheduling, inventory, subscriptions, ticket reporting, every pipeline in `03`.
