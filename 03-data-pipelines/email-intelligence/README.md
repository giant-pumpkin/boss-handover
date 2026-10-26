# email-intelligence (designed, not built)

Pipeline to read the manager's Gmail (tens of thousands of mixed Thai/English emails), extract quotations, planned jobs, incidents and plan changes with the Claude API (text PDFs via pdfplumber, scanned PDFs/images via vision), and upsert into Airtable or Supabase for a dashboard.

Status 2026-10-26: context document only (`claude_code_context.md` from `~/coding/email-scraper`). No code.

Decision pending: Airtable vs Supabase as the store.
