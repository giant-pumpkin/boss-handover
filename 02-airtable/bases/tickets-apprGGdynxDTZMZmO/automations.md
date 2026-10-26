# Tickets base automations

Live list from the Airtable API, 2026-10-26 (16 automations, 10 deployed). Where the in-Airtable registry had a description it is appended. Open any automation at `https://airtable.com/apprGGdynxDTZMZmO/workflows/<id>`.

| ID | Name | Deployed | Trigger | What it does | Registry notes |
| --- | --- | --- | --- | --- | --- |
| `wfluuR1cEWU3jmbW7` | Ingest - Freshdesk - Create ticket | on | webhook from Freshdesk | timestamps via Freshdesk API (key hard-coded), find location, dedupe, create |  |
| `wfl6nosC5ibK6cawo` | Ingest - Freshdesk - Update ticket | on | webhook from Freshdesk | update location on existing ticket |  |
| `wfleviVSFYpDfLhWQ` | Set timestamp on "Resolve" | on | conditions · Tickets status Resolved/Closed | stamps resolved time |  |
| `wflNMYD4t7InG2ofL` | Write log - Tick box | on | conditions · Tickets (checkbox) | Ticket log row |  |
| `wflXKlzAQKEpMVEwV` | Write log / Send Slack - Status change | off | record updated · Tickets › Status |  |  |
| `wflyjmP05dyZ6Ui2i` | Housekeeping - Abandoned calls | on | cron every 12 h since 2024-08-20 | closes abandoned tickets |  |
| `wflVADMc0rQQusL1D` | Assign SLA | on | enters view · Tickets | links SLA record by customer + service line |  |
| `wflqF4IRfJUP0XLet` | Notify - Pagem - Mail | on | enters view · Tickets | Gmail to Pagem <!-- TODO who --> |  |
| `wflfrRNAO4S9bOtoH` | Assign ticket compensation | on | record created · Tickets | Default or Override compensation rule |  |
| `wfldEdwsgFTsdRYuh` | Ingest - Freshdesk - Delete ticket | on | webhook from Freshdesk | marks deleted |  |
| `wflGvkKmSuwZtSSbE` | Mail - Helpdesk on "Close" - QSA | off | enters view · Tickets | Gmail |  |
| `wflR0YpBlVUPsHUmq` | Mail - Helpdesk on "Close" - RD | off | enters view · Tickets | Gmail |  |
| `wflqtlwpiqFyuPXBG` | Mail - Helpdesk on "Close" - CRG | off | enters view · Tickets | Gmail |  |
| `wflctozTCcDBKvapv` | Assign ticket compensation - From trigger | on | conditions · Tickets (checkbox) | re-run compensation |  |
| `wflnFM1FcLr9Xfyvl` | Automation 1 | off | record created | empty, delete |  |
| `wfl0Cdm16JF9DQZGT` | Automation 2 | off | record updated | empty, delete |  |
