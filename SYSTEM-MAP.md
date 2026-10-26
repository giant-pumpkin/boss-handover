# System map

How data moves between the systems I own or touch. Boxes are systems; arrows are the pipelines in [03-data-pipelines](03-data-pipelines/) or Airtable automations in [02-airtable](02-airtable/).

```mermaid
flowchart LR
    subgraph Sales
        HS[HubSpot<br/>deals · quotes · products]
    end

    subgraph Airtable
        INV[(Inventory base<br/>appRor1ipbYAb4K7z<br/>Resources · Inventory · Subscriptions)]
        QUO[(Quotes base<br/>app8H7IMW8gHyQzzn<br/>HS - Quotes · Invoices)]
        JOB[(Jobs base<br/>appdo1WwONYvmYMWg<br/>Jobs · MA packages · BOM)]
        TIX[(Tickets base<br/>apprGGdynxDTZMZmO<br/>Tickets · SLA · Compensation)]
        LOC[(Locations base<br/>appmFizJaAn7yKKVu<br/>Customers · Brands · Sites — master data)]
        MON[(Monitoring base<br/>appQT3lKdh9bdw1zo<br/>CMS status)]
    end

    subgraph Support
        FD[Freshdesk]
    end

    subgraph Finance
        XERO[Xero]
        AM[ApprovalMax]
    end

    subgraph Droplet["DigitalOcean droplet (watermelon)"]
        N8N[n8n]
        CRON[cron / sync_scripts]
    end

    subgraph Supabase
        SB1[(data-pipeline<br/>odpdnucjvgingrrwaaiv<br/>prototype only)]
        SB2[(ConnectIQ<br/>zkqbmzffoimylkvyqypl)]
    end

    subgraph Reporting
        SH[Google Sheets]
        LS[Looker Studio<br/>Support dashboard]
        OPS[Operations dashboard<br/>office screen]
    end

    subgraph Signage["Signage CMS"]
        CMS[CMS Asia / IXM Aqua<br/>Signage Player]
    end

    LOC -- "synced tables" --> INV
    LOC -- "synced tables" --> JOB
    LOC -- "synced tables" --> QUO
    LOC -- "synced tables" --> TIX
    LOC -- "Append Location to Freshdesk" --> FD
    INV -- "synced tables" --> MON
    INV -- "Resources synced as products" --> HS
    HS -- "hubspot-to-airtable (15 min)<br/>+ Airtable automation Sync HS Quotes (15 min)" --> QUO
    QUO -- "Quotes-to-Job interface<br/>(manual handover)" --> JOB
    JOB -- "sync tick → wflsW0LoP8zU6XBzv" --> INV
    INV -- "wflzWWNSCGdhtHrbv creates subscription" --> INV
    FD -- "Freshdesk automations → webhook" --> TIX
    JOB -- "jobs-to-sheets" --> SH
    TIX -- "tickets-to-sheets" --> SH
    QUO -- "hs-quotes-to-sheets" --> SH
    SH --> LS
    JOB --> OPS
    XERO -- "xero-to-airtable (not yet live)" --> QUO
    XERO <--> AM
    CMS -. "abandoned scrapers" .-> QUO
    N8N -.-> CRON
    SB2 -. "Phase 2 will replace Airtable" .-> JOB

    classDef todo stroke-dasharray: 5 5
```

## Reading the map

- **Source of truth per domain:** products and inventory → Inventory base; quotes → HubSpot (mirrored to Quotes base); jobs and maintenance → Jobs base; tickets → Freshdesk (mirrored to Tickets base); invoices → Xero. ConnectIQ (`SB2`) is becoming the source of truth for CRM in Phase 1 and will take jobs/inventory in Phase 2.
- **Human gates** are the manual steps that nothing automates: creating jobs from the Quotes-to-Job page, typing serial numbers on the job, ticking `sync`. See [07-business-logic/subscription-lifecycle.md](07-business-logic/subscription-lifecycle.md).
- **Dashed arrows** are planned or not yet in production.

ConnectIQ Supabase ref: `zkqbmzffoimylkvyqypl`. Full table-level sync map: [02-airtable/sync-topology.md](02-airtable/sync-topology.md).
