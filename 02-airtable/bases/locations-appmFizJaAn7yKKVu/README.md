# Locations base (`appmFizJaAn7yKKVu`)

**Master data base.** Customers, brands, brand owners, countries and every physical site live here and are synced *out* to the Inventory, Jobs, Data, Tickets and Monitoring bases. Edit customers and locations here, nowhere else.

| Table | ID | Notes |
| --- | --- | --- |
| Locations | `tblaMnDYwMhf8fk7d` | 96 fields; the operational endpoint everything consolidates on |
| Customers | `tblu9pLBFjxYX9RwL` | Customer ID = Country (ISO3) - Brand - Brand owner [- Storefront], e.g. `THA - KFC - CRG` |
| Brands, Brand owners, Stores | `tbllTcNIfg7TkJMUO`, `tblomN4KFzhzTeZyB`, `tblcnY2DjETb7ixwI` | the three components of a customer |
| Countries, Regions, Subdivisions | `tblcveZqTa63GVMNm`, `tbl36FUpxfS4rEWLd`, `tblZRwcVwuj5LbewW` | geography |
| Location types, Arrangements | `tbl8xmUZdqPdLSvrN`, `tbl3iaef3xXCKE5UT` | display arrangements per site |
| Jobs, Inventory, Tickets | `tbl6c4QsHZx3ZAq3n`, `tbl4iIahvNOg0bhJq`, `tblwn1jUAokpYOuxd` | synced in from the other bases (Jobs and Inventory bidirectional) |
| Import locations | `tblzc37sUyhDG502U` | staging table for the Import automation |

Automations: [automations.md](automations.md) (3, including `Append Location to Freshdesk`). Sync map: [../../sync-topology.md](../../sync-topology.md). `schema.json` exported 2026-10-26. No webhooks.

Customer ID rules belong in [07-business-logic/customer-id-convention.md](../../../07-business-logic/customer-id-convention.md).
