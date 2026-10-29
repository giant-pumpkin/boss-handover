# Fillout (now part of "Zite")

Observed 2026-10-26. The product has been rebranded: `build.fillout.com` now redirects to `app.zite.com`, and forms are the "Fillout" half of a Zite account.

| | |
| --- | --- |
| What we use it for | field forms that write straight into Airtable: PM checklists and installation reports filled by technicians |
| URL | https://app.zite.com/home/32457-workspace |
| Organization | "Yves Peirlinck's organization" (Yves created it; I am a member) |
| Plan / tier | **Free** on both Zite and Fillout; usage: 24 submissions this month, 9 forms total, workspaces 0/1 |
| Admin account | <!-- TODO: Yves's login — must be transferred, he has left --> |
| Billing | none |

## Forms in the shared workspace

| Form | ID | Created by | Airtable target |
| --- | --- | --- | --- |
| **Ma - PM - Jobs** | `1vgSPRsizwus` | Yves, 2 years ago | Jobs base › `Ma - Jobs` (`tblyPl0fsMSDW2uGQ`) |
| Job - Installation - KFC | `ugeZMBmrYPus` | Yves | Jobs base › `Jobs` |
| Job - Installation - Apple | `29MQQeFxfjus` | me, 6 months ago | Jobs base › `Jobs` |
| Job - Survey | `m1WDn9Jymvus` | Yves | Airtable connected, no table shown <!-- confirm --> |
| Ma - PM - Jobs (copy) | `gnXXAxcGCwus` | me, 4 months ago | copy for testing |

Plus "My form" in my private space: a one-off Moss used to load inventory items into the warehouse; no longer used. Adding members is free on this plan; the organization is mine and Yves's with three members. Each form's Airtable connection is under Integrate → Your connections and uses an Airtable login/PAT of its creator. <!-- TODO: whose -->

## Where it is wired in

**Start job button.** On the Jobs table the `Open job form` button field (surfaced as **Start job** on the dispatch list and on every Jobs X partner page) is an *Open URL* button: it builds the public Fillout URL for the right form and appends the job's **record ID** as a query parameter (`…?id=rec…`). That is the only link between a submission and the job; the form has no login and no Airtable lookup of its own. Photos, videos and serials written on the form go to the Airtable job record, not to Fillout, so there is nothing to retrieve from Fillout later.

Technicians open the form link on site; a submission creates or updates the Airtable record, which the Jobs-base automations (`FS - Ma - PM - Close job`, job-report PDFs) then pick up.

## Risks

- The organization belongs to a departed employee's account.
- Free plan limits are close to usage; a paid plan or a move of the forms to Airtable's own forms may be needed.

## What breaks if it is cancelled

Field reporting for PM visits and installations; PM job closure stops creating reports.
