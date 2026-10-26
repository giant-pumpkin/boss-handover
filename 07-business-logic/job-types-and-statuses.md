# Job types and statuses

## Types

| Type | Meaning | Moves inventory? | Which Inventory automation fires on sync |
| --- | --- | --- | --- |
| Installation | | yes, out to site | `wfl1YUiIjdVT3b66E` (also creates the subscription) |
| Swap | | yes, out and back | <!-- --> |
| Removal | | yes, back | |
| Preventive maintenance (PM) | MA visit | no | — |
| Reactive maintenance (RM) | call-out | no | — |
<!-- TODO complete from the Jobs base single-select -->

## Statuses

| Status | Meaning |
| --- | --- |
| Unscheduled | created, no date |
| Tentative | |
| Scheduled | |
| Installed | field work done, waiting on signed delivery note / photos (misnamed for non-installs) |
| Done | closed |
| Cancelled | |
<!-- TODO complete -->
