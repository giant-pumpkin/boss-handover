# Job types and statuses

Options as of 2026-10-26 from the Jobs table (`appdo1WwONYvmYMWg` / `tblwHj9cO37wp1fVx`). Full lifecycle, including which automation fires for which type: [02-airtable/bases/jobs-appdo1WwONYvmYMWg/job-lifecycle.md](../02-airtable/bases/jobs-appdo1WwONYvmYMWg/job-lifecycle.md).

## Job type (`fldk5E1PkIy1ZrM1e`)

| Type | Meaning | Moves inventory on `sync`? |
| --- | --- | --- |
| Installation | deploy hardware at a site; the only type that creates a subscription | yes, out to site |
| Un-installation | remove hardware from a site | yes, back to stock <!-- confirm --> |
| Delivery | ship goods without installing | <!-- --> |
| Collect | pick up goods from a site | <!-- --> |
| Rework | return visit to fix an earlier job | <!-- --> |
| Survey | pre-install site survey | no |
| Pre-sale | pre-sale visit | no |
| Account setup | software/account provisioning, no site visit | no |
| Ma - Preventive | PM visit under a maintenance package | no |
| Ma - Reactive | RM call-out under a maintenance package | no |
| Ma - Audit | maintenance audit visit | no |

<!-- TODO: fill the "moves inventory" column from job-lifecycle.md section on the four sync branches -->

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
