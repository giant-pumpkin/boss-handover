# freshdesk-to-airtable

## 1. Ticket ingest (live)

Freshdesk automation on ticket create → webhook → Airtable automation `wfluuR1cEWU3jmbW7` "Ingest - Freshdesk - Create ticket" in the Tickets base. Enrichment via Freshdesk API `?include=stats`. Problems listed in [02-airtable/bases/tickets-apprGGdynxDTZMZmO/](../../02-airtable/bases/tickets-apprGGdynxDTZMZmO/).

## 2. Timestamp backfill (one-off)

`backfill.py` + `ticket_timestamps.csv` (from `~/coding/freshdesk-backfill`): pulled historical ticket timestamps to fix SLA calculations. Run once <!-- date -->.

## 3. Location-picker sidebar app (in development, started 2026-10-07)

Private Freshdesk `ticket_sidebar` app (`~/coding/freshdesk-location-picker`): reads the ticket's Project/Client, queries Locations `tbljrW84qbQIoYUBX` filtered by customer, lets the agent multi-select sites, writes record IDs to a hidden ticket field that the ingest webhook forwards.

Why: Freshdesk has no multi-select ticket field; the current Yes/No "multiple locations?" fork causes cross-client mis-picks. KFC's three franchisees are ~96% of location-linked tickets.

Dev notes: FDK 10.1.9 needs Node 24.11 (`nvm use 24.11`); install with `npm install https://cdn.freshdev.io/fdk/latest-v24.tgz -g`, not `npm install fdk`.

Status: <!-- TODO -->
