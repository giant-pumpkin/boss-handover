# Job types and statuses

Options as of 2026-10-26 from the Jobs table (`appdo1WwONYvmYMWg` / `tblwHj9cO37wp1fVx`). Full lifecycle, including which automation fires for which type: [02-airtable/bases/jobs-appdo1WwONYvmYMWg/job-lifecycle.md](../02-airtable/bases/jobs-appdo1WwONYvmYMWg/job-lifecycle.md).

## Job type (`fldk5E1PkIy1ZrM1e`)

| Type | Meaning | Moves inventory on `sync`? |
| --- | --- | --- |
| Installation | deploy hardware at a site; the only type that creates a subscription | **yes**: unit → `Installed`, `Location - Installation` = job location, stock location cleared, installation date = `Date - Scheduled`, contract attached → subscription created (`wfl1YUiIjdVT3b66E`, plus contract-date and warranty webhooks) |
| Un-installation | remove hardware from a site; creates the uninstall task checklist | **no**. The sync tick ignores it. Use a Collect job (or edit the unit by hand) to return units to stock |
| Delivery | ship goods without installing (e.g. Zus Coffee, where Titanium installs) | **yes**: unit → `Delivered`, `Location - Installation` = job location (`wfl3MhVWITaKix6QN`). No contract needed, no subscription |
| Collect | pick up goods from a site | **yes**: unit → `Available`, both locations and the installation date cleared (`wflKuBDk5Z6MYZzHq`). Payload is serials only |
| Rework | return visit to fix an earlier job | no |
| Survey | pre-install site survey | no |
| Pre-sale | pre-sale visit | only if `Alert - Report incident` is ticked: unit → `Incomplete` (`wfli2h0Tnt6I56dSM`). A leftover of a disabled Installation-incident branch, probably dead |
| Account setup | software/account provisioning, no site visit | no |
| Ma - Preventive | PM visit under a maintenance package | no |
| Ma - Reactive | RM call-out under a maintenance package | no |
| Ma - Audit | maintenance audit visit | no |

The tick does nothing for every other type. Source: the four branches of `wflsW0LoP8zU6XBzv`, [job-lifecycle.md](../02-airtable/bases/jobs-appdo1WwONYvmYMWg/job-lifecycle.md).

## Job type - Transit (`fldPYYCi10eP99Ujb`)

`Installation` or `Support`. <!-- TODO: what this field is for -->

## Service (`fldexkzrV3Z1z270B`)

`Digital signage` or `Music streaming`.

## Status (`fld7q5wjIg47nltes`)

| Status | Meaning |
| --- | --- |
| Unscheduled | created, no date |
| Tentative | date pencilled in; a PM job entering this state creates its Ma - Jobs checklist |
| Scheduled | confirmed date |
| Installed | field work finished, waiting on signed delivery note / photos. Misnamed for non-install types |
| Incomplete | visit happened but work not finished <!-- confirm --> |
| Done | closed |
| Cancelled | cancelled |
