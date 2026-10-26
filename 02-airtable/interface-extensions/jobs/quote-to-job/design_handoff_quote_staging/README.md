# Handoff: Quote Staging Extension — UI Redesign

## Overview

This is a design handoff for the **Quote Staging** Airtable custom interface extension used by Giant Pumpkin's deployment team. The extension manages the workflow of turning accepted HubSpot quotes into operational Airtable jobs.

## About the Design Files

The files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and behavior, not production code to copy directly. The task is to **recreate this UI as an Airtable custom interface extension** using React + the `@airtable/blocks/interface` SDK, matching the existing codebase patterns in `quote-staging-extension.tsx`.

## Fidelity

**High-fidelity.** The mockup uses final colors, typography, spacing, and interactive states. Recreate the UI pixel-perfectly using the Airtable SDK's built-in components where available, and custom-styled React components where not.

---

## Architecture

This is a **single-page** Airtable custom interface extension. No routing. All state is local React state.

### Layout: Three Zones

```
┌─────────────────────────────────────────────────┐
│  TOP BAR: title + search                         │
├─────────────────────────────────────────────────┤
│  STAGE TABS: 4 horizontal tabs with counts       │
├──────────────────┬──────────────────────────────┤
│  QUOTE LIST      │  DETAIL PANEL                │
│  (cards, scrolls)│  (stage-specific action UI)  │
│  width: 380px    │  flex: 1                     │
│  when selected;  │  slides in on selection       │
│  100% when not   │                              │
└──────────────────┴──────────────────────────────┘
```

When no quote is selected, the quote list fills the full width with no detail panel.

---

## Stage Logic (computed in JS, not a formula field)

```
if Quote Status ≠ "Accepted" → skip (don't show in queue)
if Quote Type (HS) has none of [Installation, Hardware, Maintenance, Delivery] → skip
if Customer (AT) is empty → "needs_customer"
if Allocated Jobs is empty or 0 → "needs_allocation"
if Jobs Opened >= Allocated Jobs → "done"
else → "ready"
```

---

## Design Tokens

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| bg-page | `#f8f8f7` | Page background |
| bg-surface | `#ffffff` | Cards, panels, header |
| bg-hover | `#fafaf9` | Input backgrounds, hover states |
| border-primary | `#e8e8e6` | Card borders, dividers, input borders |
| border-subtle | `#f3f3f1` | Inner dividers (table rows, dropdown items) |
| border-hover | `#d0d0ce` | Card border on hover |
| text-primary | `#1a1a1a` | Headings, deal names, primary text |
| text-secondary | `#5c5c5a` | Quote numbers, labels, secondary text |
| text-muted | `#8c8c8a` | Company names, helper text, descriptions |
| text-faint | `#a3a3a0` | Separators, progress labels, placeholders |
| text-disabled | `#d4d4d2` | Delete icons (default state) |
| accent-orange | `#ea580c` | "Needs Customer" stage |
| accent-orange-bg | `#fff7ed` | "Needs Customer" tag/card bg |
| accent-orange-text | `#c2410c` | "Needs Customer" tag text |
| accent-purple | `#7c3aed` | "Needs Allocation" stage |
| accent-purple-bg | `#f5f3ff` | "Needs Allocation" tag/card bg |
| accent-purple-text | `#6d28d9` | "Needs Allocation" tag text |
| accent-green | `#059669` | "Ready" stage + done state |
| accent-green-bg | `#ecfdf5` | "Ready" tag/card bg, job chips |
| accent-green-text | `#047857` | "Ready" tag text |
| accent-gray | `#9ca3af` | "Done" stage dot |
| accent-gray-text | `#6b7280` | "Done" stage text |
| accent-gray-bg | `#f3f4f6` | "Done" tag/card bg |
| blue-primary | `#2563eb` | Active toggle, wizard current step |
| blue-bg | `#eff6ff` | Active toggle background |
| green-progress | `#10b981` | Progress bars, completed wizard steps |
| btn-primary-bg | `#1a1a1a` | Primary buttons (Create Job, Continue) |
| btn-primary-hover | opacity 0.9 | Primary button hover |
| red-required | `#ef4444` | Required field asterisks, delete hover |
| red-hover-bg | `#fef2f2` | Delete button hover background |
| tag-neutral-bg | `#f3f3f1` | Inactive count badges, type chips in header |
| tag-neutral-text | `#5c5c5a` | Type chip text in detail header |

### Typography

| Element | Font | Size | Weight | Color | Extra |
|---------|------|------|--------|-------|-------|
| Page title | IBM Plex Sans | 15px | 700 | #1a1a1a | letter-spacing: -0.02em |
| Stage tab | IBM Plex Sans | 12px | 600 | varies | — |
| Quote number (list) | IBM Plex Mono | 11px | 600 | #5c5c5a | — |
| Deal name (list) | IBM Plex Sans | 13px | 600 | #1a1a1a | letter-spacing: -0.01em, ellipsis |
| Company (list) | IBM Plex Sans | 11px | 400 | #8c8c8a | — |
| Type tag | IBM Plex Sans | 9px | 500 | varies | padding: 2px 7px |
| Detail heading | IBM Plex Sans | 16px | 700 | #1a1a1a | letter-spacing: -0.02em |
| Detail quote number | IBM Plex Mono | 10px | 400 | #8c8c8a | — |
| Stage badge | IBM Plex Sans | 10px | 600 | varies | pill shape |
| Section heading | IBM Plex Sans | 14px | 600 | #1a1a1a | — |
| Body text | IBM Plex Sans | 12px | 400 | #8c8c8a | — |
| Form label | IBM Plex Sans | 11px | 500 | #5c5c5a | — |
| Form input | IBM Plex Sans | 12px | 400 | #1a1a1a | — |
| Button primary | IBM Plex Sans | 12-13px | 600 | #fff | — |
| Button secondary | IBM Plex Sans | 12px | 500 | #5c5c5a | — |
| Progress label | IBM Plex Mono | 10px | 400 | #a3a3a0 | — |
| BOM qty | IBM Plex Mono | 12px | 400 | #1a1a1a | centered |

### Spacing & Radii

| Token | Value |
|-------|-------|
| page-padding | 28px horizontal |
| card-padding | 14px 16px |
| card-gap | 6px |
| card-radius | 10px |
| input-radius | 7px |
| button-radius | 8px |
| tag-radius | 4-5px |
| badge-radius | 8-10px (pill) |
| selection-bar | 3px wide, inset 10px from top/bottom |
| progress-bar-height | 4px |
| wizard-step-size | 26px circle |
| wizard-step-line | 32px × 2px |

---

## Screens & Components

### 1. Top Bar
- Left: "Quote Staging" title (15px/700) + count badge ("15 quotes" in #f3f3f1 pill)
- Right: Search input with magnifying glass icon, 220px wide, #fafaf9 bg

### 2. Stage Tabs
- Horizontal row of 4 tab buttons, flush under the top bar
- Each tab: colored dot (7px circle) + label + count badge
- Active tab: text #1a1a1a, 2px bottom border in stage color, count badge in stage color bg
- Inactive tab: text #8c8c8a, no border, count badge in #f3f3f1
- Clicking a tab filters the quote list to that stage and deselects any quote

### 3. Quote List (left area)
- Vertical stack of cards, 6px gap, scrollable
- **Card structure:**
  - Top row: quote number (mono, 11px) + progress bar (if allocated > 0): 48px wide, 4px tall
  - Deal name: 13px/600, single line ellipsis
  - Company + currency: 11px muted
  - Type tags: 9px pills in stage-colored bg
- **Selected state:** card bg = stage light color, border = stage accent color, 3px accent bar on left edge (inset 10px top/bottom)
- **Hover state:** border darkens to #d0d0ce, subtle box-shadow
- When no quote selected: list fills 100% width. When selected: 380px, detail panel takes remaining space.

### 4. Detail Panel (right area)
- Slides in with animation (translateX 12px → 0, 0.2s ease)
- **Header section** (sticky top):
  - Quote number (mono, 10px) + stage badge (pill)
  - Deal name (16px/700, ellipsis)
  - Company + currency (12px muted)
  - Action buttons: "Open quote" (external link) + close (×)
  - Type chips + progress bar (if applicable)
- **Body section** (scrollable): renders stage-specific UI below

---

## Stage-Specific Detail Views

### Stage: Needs Customer
- Icon: people icon (stroke #ea580c)
- Heading: "Map Customer"
- Helper text showing HubSpot company name in bold
- Search input: "Search Airtable customers..."
- Dropdown results list immediately below (populated from Customers table)
- **Action:** On select, calls `updateRecordAsync` on HS-Quotes to set `Customer (AT)` field

### Stage: Needs Allocation
- Icon: grid icon (stroke #7c3aed)
- Heading: "How many jobs?"
- Helper text: "Read the quote and decide how many jobs (locations) this needs."
- Quick-pick buttons: 1-5 (40×40px, rounded, hover purple)
- Divider line + freeform number input
- **Action:** On select/enter, calls `updateRecordAsync` on HS-Quotes to set `Allocated Jobs` field

### Stage: Ready
- Shows a **3-step wizard** for job creation
- **Overview (step 0):** "X jobs remaining" + list of already-created jobs as green mono pills + "Create job N of M" button
- **Wizard stepper:** 3 circles (26px) connected by lines (32px). Completed = green ✓, current = blue, future = gray.

#### Step 1: Location
- Toggle: "Search existing" / "Create new" (blue active state)
- **Existing mode:** Search input + dropdown results from Job Locations table (filtered by customer)
- **New mode:** Form with Location name (required), Customer (search), Address (textarea)
- Nav: ← Back | Continue to BOM →

#### Step 2: Bill of Materials
- Add row: search resource input + quantity input (50px) + "+" button (dark)
- Table with columns: Resource | Qty | Delete
  - Header: 10px uppercase labels, #fafaf9 bg
  - Rows: 12px text, mono qty, red delete icon on hover
- Nav: ← Back | Continue to Details →

#### Step 3: Job Details
- 2-column grid of form fields:
  - **Service** (select): Digital signage, Music streaming, Test. Pre-filled from quote's `Quote Service (HS)` mapped value.
  - **Partner** (search dropdown): from Partners table
  - **Job Type** (select): Installation, Delivery, Rework, Survey, Un-installation, Ma - Audit, Ma - Preventive, Ma - Reactive, Collect, Account setup, Pre-sale
  - **Status** (select): Unscheduled, Tentative, Scheduled, Installed, Done, Incomplete, Cancelled
  - **Date Scheduled** (date picker)
  - **Assigned to** (multi-select collaborator search): from base.activeCollaborators
- All fields marked required (red asterisk)
- Nav: ← Back | Create Job N

### Stage: Done
- Centered layout
- Green checkmark in circle (48px, #ecfdf5 bg)
- "All N jobs created" heading
- "This quote is fully staged." subtext
- Row of existing job ID pills (green mono)

---

## Interactions & Behavior

| Interaction | Behavior |
|-------------|----------|
| Click stage tab | Filter list to that stage, deselect current quote, reset wizard |
| Type in search | Filter visible quotes by quote number, company, or deal name |
| Click quote card | Select it, open detail panel (380px list + flex detail), reset wizard to step 0 |
| Click × on detail panel | Deselect quote, detail panel closes, list expands to 100% |
| Click customer suggestion | `updateRecordAsync` on quote → Customer (AT) field. Quote moves to "Needs Allocation" |
| Click allocation number | `updateRecordAsync` on quote → Allocated Jobs field. Quote moves to "Ready" |
| Click "Create job" | Start wizard at step 1 |
| Wizard Back | Go to previous step (or step 0 overview) |
| Wizard Next | Validate current step, advance to next |
| Toggle location mode | Switch between search existing / create new form |
| Add BOM resource | Append to local bomResources array (local state, not persisted until job creation) |
| Delete BOM resource | Remove from local array |
| "Create Job" (step 3) | Execute record creation chain (see below), reset wizard, progress auto-updates |

### Record Creation Chain (on "Create Job")

```
1. Location (only if "create new" mode)
   → locationsTable.createRecordAsync({ name, customerId, address, countryId })

2. BOM (empty shell)
   → bomTable.createRecordAsync({})

3. BOM Resources (one per resource line)
   → bomResourcesTable.createRecordAsync({ resourceId, quantity, bomId })

4. Job
   → jobsTable.createRecordAsync({
       location, bom, service, partner, jobType, status,
       dateScheduled, assignedTo, hsQuotes: [quoteRecordId]
     })
```

After step 4, the inverse link auto-populates Jobs Opened count on the quote → Allocation Progress updates → stage logic re-evaluates.

### Animations

| Element | Animation |
|---------|-----------|
| Detail panel enter | translateX(12px) → 0, opacity 0 → 1, 0.2s ease |
| Stage content enter | translateY(6px) → 0, opacity 0 → 1, 0.2s ease |
| Card hover | border-color transition 0.15s, box-shadow fade in |
| Button hover | background transition 0.15s or opacity 0.9 |
| Progress bar | width transition 0.3s |

---

## State Management

```typescript
interface ExtensionState {
  selectedId: string | null;       // Selected quote record ID
  activeStage: Stage;              // Current tab filter
  searchQuery: string;             // Search input value
  wizardStep: 0 | 1 | 2 | 3;     // 0 = overview, 1-3 = wizard steps
  locationMode: 'existing' | 'new';

  // Step 1 state
  selectedLocationId: string;
  newLocation: { name: string; customerId: string; address: string; countryId: string };

  // Step 2 state
  bomResources: Array<{ id: string; resourceId: string; resourceName: string; quantity: number }>;

  // Step 3 state
  jobService: string;
  jobPartnerId: string;
  jobType: string;
  jobStatus: string;
  jobDateScheduled: string;
  jobAssignedToIds: string[];

  // UI state
  isCreating: boolean;
  error: string;
}
```

---

## Service Mapping

| Quote Service (HS) | Jobs Service field |
|--------------------|--------------------|
| Digital Signage | Digital signage |
| Music Streaming | Music streaming |

---

## Files

| File | Description |
|------|-------------|
| `Quote Staging v2.dc.html` | Interactive HTML prototype — open in browser to click through all states |
| `quote-staging-handover.md` | Original technical handover with all Airtable table/field IDs |
| `quote-staging-extension.tsx` | Existing (buggy) implementation — use for field ID reference and SDK patterns |
| `HS - Quotes-Grid view (2).csv` | Sample data export showing real quote records |

---

## Notes for Implementation

1. **This is an Airtable custom interface extension**, not a standalone web app. Use `@airtable/blocks/interface/ui` SDK (`initializeBlock`, `useBase`, `useRecords`, `useCustomProperties`).
2. **All table/field IDs** are documented in `quote-staging-handover.md` — use the `F` constant object pattern from the existing TSX.
3. **Countries table is currently broken** — see the "Current Bug" section in the handover doc. Either fix it or keep it commented out with the country dropdown hidden.
4. **IBM Plex Sans/Mono** — import from Google Fonts. The Airtable extension environment supports external font loading.
5. **Search dropdowns** need click-outside-to-close behavior and fixed positioning (to escape overflow:hidden parents). See the `SearchDropdown` component in the existing TSX for the pattern.
6. **Stage logic runs in JS** — no new formula fields needed on the HS-Quotes table.
7. **The `Assigned to` field** uses `multipleCollaborators` type — populate options from `base.activeCollaborators`.
