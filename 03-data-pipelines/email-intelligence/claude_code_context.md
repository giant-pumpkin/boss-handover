# Project Context: GP Email Intelligence Pipeline

## Who I Am

I'm a data analyst at Giant Pumpkin (GP), a digital signage management company based in Bangkok. We operate across Southeast Asia and Mexico, serving clients including KFC Thailand, Boost Juice, and Apple resellers. I work with Python, Airtable, Supabase, and will be running this locally on a MacBook Air.

## The Problem

Due to the startup nature of GP, customer/sales record-keeping is very disorganized. Discussions about job dates, quotations, incidents, and plan changes happen via email. My manager wants a system that can read through her entire email feed (tens of thousands of emails) and surface structured information into a dashboard.

## What We're Building

An automated pipeline that:

1. **Fetches emails** from a Gmail account via the Gmail API (batch processing)
2. **Processes attachments** — text PDFs via pdfplumber, scanned/image-only PDFs via pdf2image → Claude vision, image attachments direct to Claude vision
3. **Extracts structured data** using the Claude API (Sonnet) — each email thread + its attachments get sent to Claude with a structured extraction prompt
4. **Upserts results** into a database (Airtable or Supabase — still deciding, ask me)
5. **Powers a dashboard** the manager can check for summaries

## Data Categories to Extract

- **Quotations** — pricing discussions, quote documents, supplier quotes
- **Planned Jobs** — scheduled installations, maintenance, site visits with dates
- **Incidents** — hardware failures, client complaints, site issues
- **Changes in Plans** — reschedules, cancellations, scope changes
- Other categories TBD as we see real data

## Key Technical Decisions Made

- **Claude API is the extraction brain** — emails are messy, unstructured, mixed Thai+English, no consistent format. Rule-based parsing won't work.
- **Vision input for scanned PDFs** — many attachments are scanned documents with no text layer. Pipeline detects this (try text extraction first, if mostly empty → render as images) and sends to Claude's vision endpoint.
- **Batch processing model** — initial backfill of historical emails, then ongoing cron job for new emails only (track last-processed timestamp or message ID).
- **Cost-conscious** — Sonnet for extraction (cheap), vision inputs cost more so we detect and only use when needed.

## Emails Are

- Mixed Thai and English (ask me to confirm)
- From various clients, suppliers, field teams
- Include attachments: PDFs (text and scanned), images (site photos, screenshots of LINE/WhatsApp chats), Excel files
- No consistent format across senders

## Infrastructure Available

- Running locally on MacBook Air (macOS)
- Airtable (team already uses heavily)
- Supabase (being adopted as part of ConnectIQ migration)
- Google Workspace (Gmail, Drive)
- Anthropic API access

## Project Structure (Proposed)

```
gp-email-intel/
├── README.md
├── .env.example
├── .gitignore
├── requirements.txt
├── config.py              # env vars, constants
├── gmail_client.py        # Gmail API auth + batch fetch
├── attachment_handler.py  # PDF/image detection + processing
├── extractor.py           # Claude API structured extraction
├── db_client.py           # Airtable or Supabase upsert
├── pipeline.py            # Main orchestration
└── prompts/
    └── extraction.py      # Extraction prompt templates
```

## What to Do First

1. Initialize git repo
2. Scaffold project structure
3. Set up Gmail API auth (OAuth2 credentials)
4. Build a proof-of-concept: fetch 10-20 emails, extract structured data, print results
5. Then iterate: add attachment handling, database upsert, dashboard

## Questions Still Open (Ask Me)

- Airtable vs Supabase vs both as the data backend?
- Primary email language (Thai, English, or mixed)?
- Exact schema/fields for each data category?
- How to identify which emails are GP-work-relevant vs noise?
