# Airtable Interface Improvements

Custom Airtable interface extensions built as single `.tsx` files using `@airtable/blocks/interface/ui`.

## Key Conventions

- All field references use hardcoded field IDs via a central `const F = { ... }` object
- REST API calls use `returnFieldsByFieldId=true` on all requests
- PAT is hardcoded per extension file
- SDK for reads/updates on configured tables; REST API for creates, searches, and unconfigured tables
- See `.claude/skills/airtable-extension-guide.md` for the full SDK vs REST decision matrix and UI patterns

## Project Structure

- `jobs/quote-to-job/` — Quote staging and job creation extensions
- Each extension is a self-contained `.tsx` file with all components inline

## Critical Rules

- Never use `onBlur` for dropdown close — use mousedown click-outside pattern
- Never pass `null` to `useRecords()` — it crashes
- REST linked records use `["recXXX"]`, SDK uses `[{id: "recXXX"}]` — never mix
- Use `position: fixed` + `getBoundingClientRect()` for dropdowns inside scrollable tables
- SDK `createRecordAsync` is unreliable for non-synced tables — prefer REST
- SDK `createRecordAsync` is required for synced tables — REST is blocked by sandbox
