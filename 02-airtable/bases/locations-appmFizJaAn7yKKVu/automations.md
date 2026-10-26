# Locations base automations

Live list from the Airtable API, 2026-10-26 (3 automations, 3 deployed). Where the in-Airtable registry had a description it is appended. Open any automation at `https://airtable.com/appmFizJaAn7yKKVu/workflows/<id>`.

| ID | Name | Deployed | Trigger | What it does | Registry notes |
| --- | --- | --- | --- | --- | --- |
| `wflmnOO4d61TRxFaB` | Import locations | on | conditions · Import locations (checkbox) | creates Location |  |
| `wfl8FqcAweVkQFozQ` | Update field "Resource Summary" | on | record updated · Locations | script |  |
| `wflM2xcFAQViCSw6F` | Append Location to Freshdesk | on | record created · Locations | script pushes the new location to Freshdesk |  |
