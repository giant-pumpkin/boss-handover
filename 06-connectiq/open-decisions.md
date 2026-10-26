# Open decisions gating Phase 2

| DR | Question | Who | Before | Evidence needed / my view |
| --- | --- | --- | --- | --- |
| DR-10 | What does a subscription hang off (object vs item)? | Sky | M6 | object |
| DR-11 | Handover timing (assignment table ships M5, screen deferred to S3) | Sky + ops | S3 | |
| DR-12 | What creates the object — quote confirmation or handover? | Sky + ops | S1 | decide together with DR-41 |
| DR-35 | Phase 2 strictly after Phase 1 cutover | Sky | — | assumed yes |
| DR-36 | Retire Airtable fully | ops + Sky | S5 | |
| DR-41 | Object grain: one per site / per assignment / per system per site | Sky + ops | S1 | need count of sites with >1 system — <!-- TODO query Airtable --> |

My near-term job was decisions and spec, not building. <!-- TODO: your recommendation on each, written down -->
