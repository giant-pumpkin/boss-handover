# Airtable Interface Extension Development Guide

## Architecture

Extensions use `@airtable/blocks/interface/ui` and `@airtable/blocks/interface/models`. Entry point is always `initializeBlock({ interface: () => <App /> })`. Each extension is a single `.tsx` file.

## SDK vs REST API — When to Use Which

### Use SDK for:
- **Reading configured tables** — `useRecords(table)` gives reactive, live-updating data without a PAT
- **Updating existing records** on non-synced tables — `table.updateRecordAsync(recordId, fields)`
- **Creating records on synced tables** — REST is blocked by the extension sandbox proxy on synced tables; SDK `createRecordAsync` is the only option
- **Accessing base metadata** — `useBase()` for tables, collaborators, base ID
- **User-configurable table mapping** — `useCustomProperties()` with hardcoded table IDs as defaults

### Use REST API for:
- **Creating records on non-synced tables** — SDK `createRecordAsync` queues locally and is unreliable (~80% success); REST is immediate and returns the record ID
- **Searching/filtering records** — SDK has no query/filter API; REST supports `filterByFormula`
- **Reading unconfigured tables** — `useRecords(null)` crashes; load via REST in `useEffect`
- **Batch operations** — REST supports batch create (10 per request) with auto-retry on 429

### Critical Format Differences

| Context | Linked record format | Example |
|---------|---------------------|---------|
| SDK write | Array of objects | `[{id: "recXXX"}]` |
| REST API write | Array of plain strings | `["recXXX"]` |
| SDK read (`getCellValue`) | `[{id: "recXXX", name: "..."}]` | — |
| REST API read | `[{id: "recXXX"}]` or `["recXXX"]` | depends on field config |

Using `[{id: "recXXX"}]` in a REST call produces `[object Object]` errors. Using `["recXXX"]` in SDK writes silently fails.

## SDK Patterns

### Hooks
```tsx
const base = useBase();
const records = useRecords(table); // table must not be null
const { customPropertyValueByKey } = useCustomProperties([
  { key: 'myTable', label: 'My Table', type: 'table', defaultValue: base.tables.find(t => t.id === 'tblXXX') },
]);
```

### Field Access
```tsx
// Safe field access — returns null if field not exposed in interface config
const field = table.getFieldIfExists(fieldId);
const value = field ? record.getCellValue(field) : null;
const str = field ? record.getCellValueAsString(field) : '';
```

### SDK Writes
```tsx
// Update (works on non-synced tables)
await table.updateRecordAsync(recordId, { [fieldId]: newValue });

// Create (prefer REST for non-synced; required for synced)
const newId = await table.createRecordAsync({ [fieldId]: value });
```

## REST API Patterns

### Setup
```tsx
const AIRTABLE_PAT = 'YOUR_PAT_HERE'; // hardcoded per extension
const headers = { Authorization: `Bearer ${AIRTABLE_PAT}` };
```

### Reading with Filter
```tsx
const escaped = query.replace(/"/g, '\\"');
const formula = `SEARCH(LOWER("${escaped}"),LOWER({${FIELD_ID}}))`;
const fields = [FIELD_A, FIELD_B].map(f => `fields[]=${encodeURIComponent(f)}`).join('&');
const url = `https://api.airtable.com/v0/${baseId}/${tableId}?returnFieldsByFieldId=true&filterByFormula=${encodeURIComponent(formula)}&maxRecords=10&${fields}`;
const resp = await fetch(url, { headers });
```

Always use `returnFieldsByFieldId=true` — all field references use hardcoded field IDs, not names.

### Creating Records
```tsx
// Single create
const resp = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { [fieldId]: value } }),
});
const { id } = await resp.json(); // returns new record ID

// Batch create (max 10 per request)
const resp = await fetch(url, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ records: batch.map(fields => ({ fields })) }),
});
```

### Rate Limiting
Airtable returns 429 on rate limit. Auto-retry with 2s delay:
```tsx
if (resp.status === 429) {
  await new Promise(r => setTimeout(r, 2000));
  // retry
}
```

### Pagination
```tsx
let offset: string | undefined;
do {
  const url = `...${offset ? `&offset=${offset}` : ''}`;
  const data = await fetch(url, { headers }).then(r => r.json());
  results.push(...data.records);
  offset = data.offset;
} while (offset);
```

## UI Component Patterns

### Dropdowns — Fixed Positioning
Dropdowns inside `overflow: auto` table containers get clipped. Use `position: fixed` with `getBoundingClientRect()`:

```tsx
const rect = triggerRef.current.getBoundingClientRect();
// Position dropdown at rect.left, rect.bottom in fixed coordinates
```

### Dropdowns — Close on Click Outside
`onBlur` does not work reliably in Airtable's extension iframe. Use mousedown listener:

```tsx
useEffect(() => {
  if (!isOpen) return;
  const handler = (e: MouseEvent) => {
    if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, [isOpen]);
```

### Tooltips
HTML `title` attribute does not render in Airtable extensions. Use CSS group-hover:

```tsx
<div style={{ position: 'relative' }} className="group">
  <span>Hover me</span>
  <div style={{ position: 'absolute', display: 'none', /* ... */ }}
       className="group-hover:block">
    Tooltip text
  </div>
</div>
```
(Or implement with inline styles using onMouseEnter/onMouseLeave state.)

### Spreadsheet-Style Bulk Editing
- Table with `overflow-x: auto` wrapper
- Inline editing in each cell (inputs/dropdowns render directly in `<td>`)
- Row validation with red borders on invalid cells
- "X/Y valid" counter, submit button disabled until all rows valid
- Duplicate-row button copies all fields from the row above

## Synced Table Gotchas

1. Extension sandbox blocks REST create/patch on synced tables — must use SDK
2. Synced linked fields (e.g., Customer on a synced Subscription Contracts table) cannot be set via REST PATCH even after record creation — include them in the initial SDK `createRecordAsync` call
3. Some fields on synced tables are sync-locked and cannot be written to at all

## Common Pitfalls

1. **`useRecords(null)` crashes** — always guard or use REST for unconfigured tables
2. **`getFieldIfExists` returns null** — fields not added to the interface config panel are invisible; use parsing fallbacks
3. **Field IDs not names** — all references are hardcoded field IDs; use a central `const F = { ... }` object
4. **SDK create is unreliable** — `createRecordAsync` queues locally; data lost on tab close. Use REST for non-synced tables.
5. **429 rate limiting** — batch creates need retry logic with 2s delays
