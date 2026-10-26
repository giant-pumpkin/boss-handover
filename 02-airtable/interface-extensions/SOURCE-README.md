# GP - Airtable Custom Interfaces

Custom Airtable interface extensions built as single `.tsx` files using `@airtable/blocks/interface/ui`. Each extension is self-contained with inline components, hardcoded field IDs, and a mix of SDK and REST API calls depending on the use case.

## Project Structure

```
jobs/
  job-creation-page/     # Job creation wizard and bulk creator
    create-job-combined.tsx
  quote-to-job/          # Quote staging and handover to jobs
    quote-staging-extension.tsx
  dashboards/            # Job dashboards
    jobs-dashboard.tsx
inventory/
  inventory-swap.tsx     # Inventory swap extension
```

## Getting Started

### 1. Creating a Custom Interface Page

1. Open your Airtable base and go to **Interfaces**
2. Create a new interface or open an existing one
3. Add a **Custom extension** layout block to a page
4. Paste the contents of a `.tsx` file into the code editor
5. Configure the required tables in the extension's settings panel — any table the extension reads via SDK hooks (`useRecords`) must be added here

### 2. Editing a Custom Interface Page

1. Open the interface in edit mode (pencil icon)
2. Click the custom extension block and select **Edit extension**
3. Make changes in the code editor — the preview updates live
4. Field IDs are hardcoded in a `const F = { ... }` object at the top of each file — update these if copying to a different base

### 3. Airtable SDK vs. REST API

Extensions use a hybrid approach. The choice depends on the operation and whether the target table is synced.

| Operation | SDK | REST API |
|-----------|-----|----------|
| Read configured tables | `useRecords(table)` — reactive, live-updating | Not needed |
| Read unconfigured tables | `useRecords(null)` crashes — don't use | `fetch` with PAT in `useEffect` |
| Create records (non-synced) | Unreliable — queues locally, ~80% success | Preferred — immediate, returns record ID |
| Create records (synced) | Required — REST blocked by sandbox | Blocked by extension sandbox |
| Update records | `updateRecordAsync` | Either works |
| Search / filter | No query API available | `filterByFormula` |
| Batch operations | One at a time | Up to 10 per request |

**Key rules:**
- All REST calls use `returnFieldsByFieldId=true` — fields are referenced by ID, not name
- REST linked records use `["recXXX"]`; SDK uses `[{id: "recXXX"}]` — mixing them silently fails
- PAT is hardcoded per extension file

## UI Patterns

- **Dropdowns** use `position: fixed` with `getBoundingClientRect()` to escape `overflow: auto` containers
- **Click-outside close** uses a `mousedown` document listener — `onBlur` does not work in Airtable's extension iframe
- **Tooltips** use CSS hover state or `onMouseEnter`/`onMouseLeave` — the HTML `title` attribute doesn't render in extensions
