import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  initializeBlock,
  useBase,
  useRecords,
  useCustomProperties,
} from '@airtable/blocks/interface/ui';
import { Table } from '@airtable/blocks/interface/models';

// ==================== Types & Config ====================

const BASE_ID = 'appRor1ipbYAb4K7z';
const AIRTABLE_PAT = 'YOUR_PAT_HERE';

const INVENTORY_STATUS_OPTIONS = [
  'Available', 'Defect', 'Delivered', 'Demo', 'Expired',
  'In production', 'In transit', 'Incomplete', 'Installed',
  'Lost', 'Pending', 'Swapped',
];

const F = {
  // Inventory
  inv_id: 'fldRulI38gZjGK43c',
  inv_sn: 'fldnYrQs3tIM8dy9T',
  inv_status: 'fldtg97LlgkiDAdhf',
  inv_resource: 'fldYhWO3ElHmgLmQ9',
  inv_resourceName: 'fldgFXQej3NzmM1BV',
  inv_locationInstallation: 'fldwAwIh1u5d5b436',
  inv_locationNameTH: 'fldOJAIYBcMaSd5l9',
  inv_subscriptions: 'fld7sLAgJyb6mufUI',
  inv_subContract: 'fldnHDPByKS87tZac',
  inv_subContractAddNew: 'fldOUlb0lN9Ogcheg',
  inv_latestContract: 'fldOG4XwGM46zPsKE',
  inv_subStatus: 'fldncH6s9X4o8FwtF',
  inv_customer: 'fld4SDWfpTsf8lHkN',
  inv_locationCode: 'fld87v5V7fU6Zex9u',
  inv_service: 'fldldaUFs3T2zKOyT',
  inv_installationDate: 'fldQgj8bijkjlQpuq',
  inv_spare: 'fldUgkOu7Gc1rY6gR',
  // Subscriptions
  sub_id: 'fldHd1UM8vPnkvUPk',
  sub_inventory: 'fldAzhmWmuhSX6ppN',
  sub_contract: 'fldozqn9HeQyxCKso',
  sub_startDate: 'fld95WxbXtbHfktSU',
  sub_endDate: 'fldSO7ONdpFqVJnte',
  sub_status: 'fld22c3r9LiQw6j4F',
  sub_terminated: 'fldqTkAThyYVy7u8A',
  sub_lastModifiedTerminated: 'fldeaJ5ciLHSChypF',
  sub_recordId: 'fld2Jpl8HzwBb1FHX',
  sub_contractId: 'fldbEAlohazqNFcpn',
  // Subscription contracts
  sc_id: 'fldEswoFzNMW0oeB2',
  sc_contractId: 'fldtKlJGUTEMkiEn0',
  sc_customer: 'fld5RFdhYpNbyG8d7',
  sc_subscriptions: 'fld6YpOjUOd96wqXF',
  sc_service: 'fldTt2XUOs2WWdpF4',
  sc_status: 'fldKSFjioM9w55uIT',
  sc_recordId: 'fldrpcxqYnz6ScDnR',
  // Locations
  loc_id: 'fldP5AY9gGZ1cLsQU',
  loc_code: 'fld3mnT5enEve3Lgk',
  loc_name: 'fldWQUJSEWvp4cWFs',
  loc_recordId: 'fldnMJUluP73zSEvl',
};

type SwapStepStatus = 'pending' | 'active' | 'done' | 'error';

interface SwapStep {
  label: string;
  status: SwapStepStatus;
}

// ==================== Design Tokens ====================

const D = {
  bgPage: '#f8f8f7', bgSurface: '#ffffff', bgHover: '#fafaf9',
  borderPrimary: '#d4d4d1', borderSubtle: '#e2e2df', borderHover: '#b8b8b5',
  textPrimary: '#1a1a1a', textSecondary: '#5c5c5a', textMuted: '#8c8c8a',
  textFaint: '#a3a3a0', textDisabled: '#d4d4d2',
  orange: '#ea580c', orangeBg: '#fff7ed', orangeText: '#c2410c',
  purple: '#7c3aed', purpleBg: '#f5f3ff', purpleText: '#6d28d9',
  green: '#059669', greenBg: '#ecfdf5', greenText: '#047857',
  blue: '#2563eb', blueBg: '#eff6ff',
  amber: '#d97706', amberBg: '#fffbeb', amberText: '#92400e',
  btnPrimary: '#1a1a1a', redRequired: '#ef4444', redHoverBg: '#fef2f2',
};

const FONT = "'IBM Plex Sans', system-ui, -apple-system, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', monospace";

// ==================== Helpers ====================

function gfStr(record: any, table: Table | null | undefined, fieldId: string): string {
  try {
    if (!table || !record) return '';
    const field = table.getFieldIfExists(fieldId);
    return field ? (record.getCellValueAsString(field) || '') : '';
  } catch { return ''; }
}

function gfVal(record: any, table: Table | null | undefined, fieldId: string): any {
  try {
    if (!table || !record) return null;
    const field = table.getFieldIfExists(fieldId);
    return field ? record.getCellValue(field) : null;
  } catch { return null; }
}

// ==================== REST API ====================

async function airtableApiGet(
  baseId: string, tableId: string, recordId: string, token: string,
): Promise<any> {
  const resp = await fetch(
    `https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}?returnFieldsByFieldId=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (resp.status === 429) {
    await new Promise(r => setTimeout(r, 2000));
    return airtableApiGet(baseId, tableId, recordId, token);
  }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `Airtable API error ${resp.status}`);
  }
  return resp.json();
}

async function airtableApiPatch(
  baseId: string, tableId: string, recordId: string, fields: Record<string, any>, token: string,
): Promise<any> {
  const resp = await fetch(
    `https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    },
  );
  if (resp.status === 429) {
    await new Promise(r => setTimeout(r, 2000));
    return airtableApiPatch(baseId, tableId, recordId, fields, token);
  }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `Airtable API error ${resp.status}`);
  }
  return resp.json();
}

// ==================== Font & Animation Loading ====================

function useDesignSetup() {
  useEffect(() => {
    if (!document.querySelector('link[data-is-fonts]')) {
      const link = document.createElement('link');
      link.setAttribute('data-is-fonts', '');
      link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (!document.querySelector('style[data-is-anims]')) {
      const style = document.createElement('style');
      style.setAttribute('data-is-anims', '');
      style.textContent = `
        @keyframes is-fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes is-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `;
      document.head.appendChild(style);
    }
  }, []);
}

// ==================== SVG Icons ====================

const IconSearch = ({ size = 13, color = D.textFaint }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
);
const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
);
const IconCheck = ({ size = 16, color = D.green }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
);
const IconSwap = ({ size = 20, color = D.textMuted }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M7 16l-4-4 4-4" /><path d="M3 12h18" />
    <path d="M17 8l4 4-4 4" /><path d="M21 12H3" />
  </svg>
);
const IconWarning = ({ size = 14, color = D.amber }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ==================== SearchDropdown ====================

function SearchDropdown({ value, displayValue, options, onSelect, placeholder, disabled, icon }: {
  value: string; displayValue: string; options: { id: string; label: string }[];
  onSelect: (id: string, label: string) => void; placeholder: string; disabled?: boolean; icon?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      updatePos();
    }
  }, [open]);

  const updatePos = () => {
    const el = inputRef.current || boxRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 220) });
    }
  };

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {icon && (
        <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}>
          <IconSearch />
        </div>
      )}
      {open ? (
        <input
          ref={inputRef} type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); updatePos(); }}
          onFocus={() => { setSearch(''); updatePos(); }}
          placeholder={placeholder} disabled={disabled}
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            padding: icon ? '9px 12px 9px 30px' : '8px 12px',
            fontSize: 12, fontFamily: FONT, border: `1px solid ${D.borderPrimary}`,
            borderRadius: 7, background: icon ? D.bgHover : '#fff', outline: 'none',
            color: D.textPrimary, opacity: disabled ? 0.5 : 1,
          }}
        />
      ) : (
        <div
          ref={boxRef}
          onClick={() => { if (!disabled) { setSearch(''); setOpen(true); } }}
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            padding: icon ? '9px 12px 9px 30px' : '8px 12px',
            fontSize: 12, fontFamily: FONT, border: `1px solid ${D.borderPrimary}`,
            borderRadius: 7, background: icon ? D.bgHover : '#fff',
            color: displayValue ? D.textPrimary : D.textMuted,
            opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer',
            wordBreak: 'break-word' as const, minHeight: 33,
          }}>
          {displayValue || placeholder}
        </div>
      )}
      {open && !disabled && filtered.length > 0 && (
        <div style={{
          position: 'fixed', zIndex: 50, background: D.bgSurface,
          border: `1px solid ${D.borderPrimary}`, borderRadius: 7,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxHeight: 200, overflowY: 'auto',
          top: pos.top, left: pos.left, width: pos.width,
        }}>
          {filtered.map(o => (
            <div key={o.id}
              onClick={() => { onSelect(o.id, o.label); setOpen(false); setSearch(''); }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = D.bgHover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              style={{
                padding: '9px 12px', fontSize: 12, fontFamily: FONT, color: D.textPrimary,
                cursor: 'pointer', borderBottom: `1px solid ${D.borderSubtle}`,
                background: value === o.id ? D.blueBg : 'transparent',
              }}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== Info Row ====================

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0' }}>
      <span style={{ fontSize: 11, color: D.textMuted, fontFamily: FONT }}>{label}</span>
      <span style={{ fontSize: 12, color: value ? D.textPrimary : D.textFaint, fontFamily: mono ? MONO : FONT, fontWeight: 500, textAlign: 'right' as const, maxWidth: '60%', wordBreak: 'break-word' as const }}>
        {value || '—'}
      </span>
    </div>
  );
}

// ==================== Status Pill ====================

const STATUS_PILL_COLORS: Record<string, { bg: string; color: string }> = {
  'Active': { bg: '#d4edda', color: '#1b5e20' },
  'Terminated': { bg: '#f8d7da', color: '#b71c1c' },
  'Expired': { bg: '#ffeeba', color: '#7c6200' },
  'Scheduled': { bg: '#d6ddf0', color: '#3949ab' },
  'Available': { bg: '#d4edda', color: '#1b5e20' },
  'Installed': { bg: '#d0f0ee', color: '#00695c' },
  'In transit': { bg: '#ffeeba', color: '#7c6200' },
  'Pending': { bg: '#ffeeba', color: '#7c6200' },
  'Defect': { bg: '#f8d7da', color: '#b71c1c' },
  'Swapped': { bg: '#f8d7e5', color: '#880e4f' },
  'In production': { bg: '#e3f2fd', color: '#1565c0' },
  'Demo': { bg: '#e8f5e9', color: '#2e7d32' },
  'Delivered': { bg: '#c4ecff', color: '#0d47a1' },
  'Incomplete': { bg: '#f8d7da', color: '#b71c1c' },
  'Lost': { bg: '#f8d7da', color: '#b71c1c' },
};

function StatusPill({ value }: { value: string }) {
  const c = STATUS_PILL_COLORS[value] || { bg: '#f3f3f1', color: '#5c5c5a' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 500, fontFamily: FONT,
      background: c.bg, color: c.color,
    }}>
      {value}
    </span>
  );
}

// ==================== Swap Execution ====================

interface SwapParams {
  oldInventoryRecordId: string;
  newInventoryRecordId: string;
  oldSubscriptionRecordId: string;
  contractRecordId: string;
  oldLocationId: string | null;
  swapDate: string;
  oldNewStatus: string;
  newNewStatus: string;
  inventoryTableId: string;
  subscriptionsTableId: string;
}

async function executeSwap(
  params: SwapParams,
  onStepUpdate: (stepIndex: number, status: SwapStepStatus, message?: string) => void,
): Promise<void> {
  const {
    oldInventoryRecordId, newInventoryRecordId, oldSubscriptionRecordId,
    contractRecordId, oldLocationId, swapDate, oldNewStatus, newNewStatus,
    inventoryTableId, subscriptionsTableId,
  } = params;

  // Step 0: Terminate old subscription (checkbox only)
  onStepUpdate(0, 'active');
  await airtableApiPatch(BASE_ID, subscriptionsTableId, oldSubscriptionRecordId, {
    [F.sub_terminated]: true,
  }, AIRTABLE_PAT);
  onStepUpdate(0, 'done');

  // Step 1: Clear old inventory location
  onStepUpdate(1, 'active');
  await airtableApiPatch(BASE_ID, inventoryTableId, oldInventoryRecordId, {
    [F.inv_locationInstallation]: [],
  }, AIRTABLE_PAT);
  onStepUpdate(1, 'done');

  // Step 2: Clear old installation date
  onStepUpdate(2, 'active');
  await airtableApiPatch(BASE_ID, inventoryTableId, oldInventoryRecordId, {
    [F.inv_installationDate]: null,
  }, AIRTABLE_PAT);
  onStepUpdate(2, 'done');

  // Step 3: Update old inventory status
  onStepUpdate(3, 'active');
  await airtableApiPatch(BASE_ID, inventoryTableId, oldInventoryRecordId, {
    [F.inv_status]: oldNewStatus,
  }, AIRTABLE_PAT);
  onStepUpdate(3, 'done');

  // Step 4: Set new inventory location (before automation trigger)
  onStepUpdate(4, 'active');
  if (oldLocationId) {
    await airtableApiPatch(BASE_ID, inventoryTableId, newInventoryRecordId, {
      [F.inv_locationInstallation]: [oldLocationId],
    }, AIRTABLE_PAT);
  }
  onStepUpdate(4, 'done');

  // Step 5: Set new installation date
  onStepUpdate(5, 'active');
  await airtableApiPatch(BASE_ID, inventoryTableId, newInventoryRecordId, {
    [F.inv_installationDate]: swapDate,
  }, AIRTABLE_PAT);
  onStepUpdate(5, 'done');

  // Step 6: Snapshot new inventory subscriptions
  onStepUpdate(6, 'active');
  const newInvBefore = await airtableApiGet(BASE_ID, inventoryTableId, newInventoryRecordId, AIRTABLE_PAT);
  const existingSubIds = new Set(
    ((newInvBefore.fields[F.inv_subscriptions] || []) as string[]).map((id: string) => id)
  );
  onStepUpdate(6, 'done');

  // Step 7: Unmark new inventory as spare
  onStepUpdate(7, 'active');
  await airtableApiPatch(BASE_ID, inventoryTableId, newInventoryRecordId, {
    [F.inv_spare]: false,
  }, AIRTABLE_PAT);
  onStepUpdate(7, 'done');

  // Step 8: Trigger automation
  onStepUpdate(8, 'active');
  await airtableApiPatch(BASE_ID, inventoryTableId, newInventoryRecordId, {
    [F.inv_subContractAddNew]: [contractRecordId],
  }, AIRTABLE_PAT);
  onStepUpdate(8, 'done');

  // Step 9: Poll for new subscription
  onStepUpdate(9, 'active');
  let newSubId: string | null = null;
  const maxAttempts = 15;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const newInvAfter = await airtableApiGet(BASE_ID, inventoryTableId, newInventoryRecordId, AIRTABLE_PAT);
    const currentSubs = (newInvAfter.fields[F.inv_subscriptions] || []) as string[];
    const freshIds = currentSubs.filter((id: string) => !existingSubIds.has(id));
    if (freshIds.length > 0) {
      newSubId = freshIds[0];
      break;
    }
  }
  if (!newSubId) {
    throw new Error('Automation did not create a new subscription within 30 seconds. Check Airtable automations.');
  }
  onStepUpdate(9, 'done');

  // Step 10: Set subscription start date
  onStepUpdate(10, 'active');
  await airtableApiPatch(BASE_ID, subscriptionsTableId, newSubId, {
    [F.sub_startDate]: swapDate,
  }, AIRTABLE_PAT);
  onStepUpdate(10, 'done');

  // Step 11: Set old subscription termination date
  onStepUpdate(11, 'active');
  await airtableApiPatch(BASE_ID, subscriptionsTableId, oldSubscriptionRecordId, {
    [F.sub_lastModifiedTerminated]: swapDate,
  }, AIRTABLE_PAT);
  onStepUpdate(11, 'done');

  // Step 12: Set new inventory status
  onStepUpdate(12, 'active');
  await airtableApiPatch(BASE_ID, inventoryTableId, newInventoryRecordId, {
    [F.inv_status]: newNewStatus,
  }, AIRTABLE_PAT);
  onStepUpdate(12, 'done');
}

// ==================== Progress Panel ====================

function SwapProgressPanel({ steps, error }: { steps: SwapStep[]; error?: string }) {
  return (
    <div style={{
      background: D.bgSurface, border: `1px solid ${D.borderPrimary}`, borderRadius: 10,
      padding: 20, animation: 'is-fadeIn 0.3s ease',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: D.textPrimary, fontFamily: FONT, marginBottom: 12 }}>
        Swap Progress
      </div>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
          <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {step.status === 'done' && <IconCheck size={16} color={D.green} />}
            {step.status === 'active' && (
              <div style={{
                width: 14, height: 14, border: `2px solid ${D.blue}`, borderTopColor: 'transparent',
                borderRadius: '50%', animation: 'is-spin 0.8s linear infinite',
              }} />
            )}
            {step.status === 'pending' && (
              <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${D.borderPrimary}` }} />
            )}
            {step.status === 'error' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={D.redRequired} strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            )}
          </div>
          <span style={{
            fontSize: 12, fontFamily: FONT,
            color: step.status === 'done' ? D.textMuted : step.status === 'active' ? D.blue : step.status === 'error' ? D.redRequired : D.textFaint,
            fontWeight: step.status === 'active' ? 500 : 400,
          }}>
            {step.label}
          </span>
        </div>
      ))}
      {error && (
        <div style={{
          marginTop: 12, padding: '10px 14px', background: D.redHoverBg,
          borderRadius: 8, border: `1px solid ${D.redRequired}20`,
          fontSize: 12, fontFamily: FONT, color: D.redRequired,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ==================== Main Component ====================

interface ResolvedTables {
  inventoryTable: Table;
  subscriptionsTable: Table;
  subscriptionContractsTable: Table;
  locationsTable: Table;
}

const SWAP_STEP_LABELS = [
  'Terminate old subscription',
  'Clear old inventory location',
  'Clear old installation date',
  'Update old inventory status',
  'Set new inventory location',
  'Set new installation date',
  'Snapshot new inventory subscriptions',
  'Unmark new inventory as spare',
  'Trigger new subscription creation',
  'Waiting for automation...',
  'Set subscription start date',
  'Set old subscription termination date',
  'Set new inventory status',
];

function InventorySwapInner({ tables }: { tables: ResolvedTables }) {
  useDesignSetup();

  const { inventoryTable, subscriptionsTable } = tables;

  const inventoryRecords = useRecords(inventoryTable);

  // Selection state
  const [oldInvId, setOldInvId] = useState('');
  const [oldInvDisplay, setOldInvDisplay] = useState('');
  const [newInvId, setNewInvId] = useState('');
  const [newInvDisplay, setNewInvDisplay] = useState('');
  const [swapDate, setSwapDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [oldNewStatus, setOldNewStatus] = useState('Available');
  const [newNewStatus, setNewNewStatus] = useState('Installed');

  // Latest subscription + contract fetched via REST
  const [fetchedSubContract, setFetchedSubContract] = useState<{
    subId: string; subDisplay: string; contractId: string; contractDisplay: string;
  } | null>(null);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [swapSteps, setSwapSteps] = useState<SwapStep[]>([]);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapComplete, setSwapComplete] = useState(false);

  // Build inventory options for search
  const inventoryOptions = useMemo(() => {
    if (!inventoryRecords) return [];
    return inventoryRecords.map(r => {
      const id = gfStr(r, inventoryTable, F.inv_id);
      const resourceName = gfStr(r, inventoryTable, F.inv_resourceName);
      const label = [id, resourceName].filter(Boolean).join(' — ');
      return { id: r.id, label: label || r.id };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [inventoryRecords, inventoryTable]);

  // Find selected records
  const oldInvRecord = useMemo(() => inventoryRecords?.find(r => r.id === oldInvId) || null, [inventoryRecords, oldInvId]);
  const newInvRecord = useMemo(() => inventoryRecords?.find(r => r.id === newInvId) || null, [inventoryRecords, newInvId]);

  // All subscription record IDs from the inventory (for REST fetch)
  const subRecordIds = useMemo(() => {
    if (!oldInvRecord) return [] as string[];
    const subLinks = gfVal(oldInvRecord, inventoryTable, F.inv_subscriptions) as any[] | null;
    return (subLinks || []).map((s: any) => s.id as string).filter(Boolean);
  }, [oldInvRecord, inventoryTable]);

  // Fetch all subscriptions via REST, find the one with the latest (highest) contract ID
  useEffect(() => {
    if (subRecordIds.length === 0) {
      setFetchedSubContract(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const subRecords = await Promise.all(
          subRecordIds.map(id => airtableApiGet(BASE_ID, subscriptionsTable.id, id, AIRTABLE_PAT))
        );
        if (cancelled) return;

        let bestSub: any = null;
        let bestContractId = '';
        let bestContractDisplay = '';
        for (const sub of subRecords) {
          const contractLinks = sub.fields[F.sub_contract] as string[] | undefined;
          const cId = contractLinks?.[0];
          if (!cId) continue;
          const contractRec = await airtableApiGet(BASE_ID, 'tblhn4CJZbi57C8WP', cId, AIRTABLE_PAT);
          if (cancelled) return;
          const contractName = (contractRec.fields[F.sc_id] || cId) as string;
          if (!bestSub || contractName > bestContractDisplay) {
            bestSub = sub;
            bestContractId = cId;
            bestContractDisplay = contractName;
          }
        }
        if (cancelled) return;
        if (bestSub) {
          const subName = bestSub.fields[F.sub_id] || bestSub.id;
          setFetchedSubContract({
            subId: bestSub.id, subDisplay: subName,
            contractId: bestContractId, contractDisplay: bestContractDisplay,
          });
        } else {
          setFetchedSubContract(null);
        }
      } catch {
        if (!cancelled) setFetchedSubContract(null);
      }
    })();
    return () => { cancelled = true; };
  }, [subRecordIds.join(','), subscriptionsTable.id]);

  // Derive old inventory details
  const oldInvDetails = useMemo(() => {
    if (!oldInvRecord) return null;
    const invId = gfStr(oldInvRecord, inventoryTable, F.inv_id);
    const sn = gfStr(oldInvRecord, inventoryTable, F.inv_sn);
    const status = gfStr(oldInvRecord, inventoryTable, F.inv_status);
    const resourceName = gfStr(oldInvRecord, inventoryTable, F.inv_resourceName);
    const customer = gfStr(oldInvRecord, inventoryTable, F.inv_customer);
    const service = gfStr(oldInvRecord, inventoryTable, F.inv_service);

    const locationLink = gfVal(oldInvRecord, inventoryTable, F.inv_locationInstallation) as any[] | null;
    const rawLocId = locationLink?.[0]?.id;
    const locationId: string | null = typeof rawLocId === 'string' ? rawLocId : null;
    const locationName = locationLink?.[0]?.name || gfStr(oldInvRecord, inventoryTable, F.inv_locationNameTH) || gfStr(oldInvRecord, inventoryTable, F.inv_locationCode);

    const activeSubStatus = gfStr(oldInvRecord, inventoryTable, F.inv_subStatus);

    return {
      invId, sn, status, resourceName, customer, service,
      locationId, locationName,
      activeSubId: fetchedSubContract?.subId || '',
      activeSubDisplay: fetchedSubContract?.subDisplay || '',
      activeSubStatus: activeSubStatus.includes('Active') ? 'Active' : activeSubStatus,
      contractRecordId: fetchedSubContract?.contractId || '',
      contractDisplay: fetchedSubContract?.contractDisplay || '',
    };
  }, [oldInvRecord, inventoryTable, fetchedSubContract]);

  // Derive new inventory details
  const newInvDetails = useMemo(() => {
    if (!newInvRecord) return null;
    const invId = gfStr(newInvRecord, inventoryTable, F.inv_id);
    const sn = gfStr(newInvRecord, inventoryTable, F.inv_sn);
    const status = gfStr(newInvRecord, inventoryTable, F.inv_status);
    const resourceName = gfStr(newInvRecord, inventoryTable, F.inv_resourceName);
    const subStatus = gfStr(newInvRecord, inventoryTable, F.inv_subStatus);
    return { invId, sn, status, resourceName, subStatus };
  }, [newInvRecord, inventoryTable]);

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!oldInvId) errors.push('Select old inventory');
    if (!newInvId) errors.push('Select new inventory');
    if (oldInvId && newInvId && oldInvId === newInvId) errors.push('Old and new inventory cannot be the same');
    if (oldInvDetails && !oldInvDetails.activeSubId) errors.push('Old inventory has no active subscription');
    if (oldInvDetails && !oldInvDetails.contractRecordId) errors.push('No subscription contract found on old inventory');
    if (!swapDate) errors.push('Swap date is required');
    if (!oldNewStatus) errors.push('Select status for old inventory');
    return errors;
  }, [oldInvId, newInvId, oldInvDetails, swapDate, oldNewStatus]);

  const canExecute = validationErrors.length === 0 && !isExecuting && !swapComplete;

  // Warnings (non-blocking)
  const warnings = useMemo(() => {
    const w: string[] = [];
    if (newInvDetails?.subStatus && newInvDetails.subStatus.includes('Active')) {
      w.push('New inventory already has an active subscription');
    }
    if (oldInvDetails && !oldInvDetails.locationId) {
      w.push('Old inventory has no location — location transfer will be skipped');
    }
    return w;
  }, [oldInvDetails, newInvDetails]);

  const handleExecuteSwap = async () => {
    if (!canExecute || !oldInvDetails) return;

    setIsExecuting(true);
    setSwapError(null);
    setSwapSteps(SWAP_STEP_LABELS.map(label => ({ label, status: 'pending' })));

    try {
      await executeSwap(
        {
          oldInventoryRecordId: oldInvId,
          newInventoryRecordId: newInvId,
          oldSubscriptionRecordId: oldInvDetails.activeSubId,
          contractRecordId: oldInvDetails.contractRecordId,
          oldLocationId: oldInvDetails.locationId,
          swapDate,
          oldNewStatus,
          newNewStatus,
          inventoryTableId: inventoryTable.id,
          subscriptionsTableId: subscriptionsTable.id,
        },
        (stepIndex, status) => {
          setSwapSteps(prev => prev.map((s, i) => i === stepIndex ? { ...s, status } : s));
        },
      );
      setSwapComplete(true);
    } catch (err: any) {
      setSwapSteps(prev => {
        const failedIdx = prev.findIndex(s => s.status === 'active');
        return prev.map((s, i) => i === (failedIdx >= 0 ? failedIdx : prev.length - 1) ? { ...s, status: 'error' } : s);
      });
      setSwapError(err.message || 'An error occurred during the swap');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReset = () => {
    setOldInvId(''); setOldInvDisplay('');
    setNewInvId(''); setNewInvDisplay('');
    setSwapDate(new Date().toISOString().split('T')[0]);
    setOldNewStatus('Available'); setNewNewStatus('Installed');
    setSwapSteps([]); setSwapError(null); setSwapComplete(false);
  };

  // Styles
  const cardStyle: React.CSSProperties = {
    background: D.bgSurface, border: `1px solid ${D.borderPrimary}`, borderRadius: 10,
    padding: 20, animation: 'is-fadeIn 0.3s ease',
  };
  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: D.textMuted, fontFamily: FONT,
    textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 12,
  };

  return (
    <div style={{
      minHeight: '100vh', background: D.bgPage, padding: '24px 32px',
      fontFamily: FONT, color: D.textPrimary,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: FONT }}>Inventory Swap</h1>
        <p style={{ fontSize: 12, color: D.textMuted, margin: '4px 0 0', fontFamily: FONT }}>
          Swap an installed inventory item with a replacement — transfers subscription, location, and status.
        </p>
      </div>

      {/* Two-column selection */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 16, marginBottom: 20 }}>
        {/* Old Inventory Column */}
        <div>
          <div style={sectionHeaderStyle}>Old Inventory (Swapping Out)</div>
          <SearchDropdown
            value={oldInvId} displayValue={oldInvDisplay}
            options={inventoryOptions}
            onSelect={(id, label) => { setOldInvId(id); setOldInvDisplay(label); setSwapComplete(false); setSwapSteps([]); setSwapError(null); }}
            placeholder="Search inventory by ID or SN..." icon
          />
          {oldInvDetails && (
            <div style={{ ...cardStyle, marginTop: 12 }}>
              <InfoRow label="ID" value={oldInvDetails.invId} mono />
              <InfoRow label="SN" value={oldInvDetails.sn} mono />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                <span style={{ fontSize: 11, color: D.textMuted }}>Status</span>
                <StatusPill value={oldInvDetails.status} />
              </div>
              <InfoRow label="Resource" value={oldInvDetails.resourceName} />
              <InfoRow label="Location" value={oldInvDetails.locationName} />
              <InfoRow label="Customer" value={oldInvDetails.customer} />
              <InfoRow label="Service" value={oldInvDetails.service} />
              <div style={{ borderTop: `1px solid ${D.borderSubtle}`, marginTop: 8, paddingTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                  <span style={{ fontSize: 11, color: D.textMuted }}>Subscription</span>
                  {oldInvDetails.activeSubStatus ? (
                    <StatusPill value={oldInvDetails.activeSubStatus} />
                  ) : (
                    <span style={{ fontSize: 12, color: D.redRequired, fontWeight: 500 }}>None</span>
                  )}
                </div>
                <InfoRow label="Contract" value={oldInvDetails.contractDisplay} mono />
              </div>
            </div>
          )}
        </div>

        {/* Swap Icon */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 24 }}>
          <IconSwap size={24} color={D.textFaint} />
        </div>

        {/* New Inventory Column */}
        <div>
          <div style={sectionHeaderStyle}>New Inventory (Swapping In)</div>
          <SearchDropdown
            value={newInvId} displayValue={newInvDisplay}
            options={inventoryOptions}
            onSelect={(id, label) => { setNewInvId(id); setNewInvDisplay(label); setSwapComplete(false); setSwapSteps([]); setSwapError(null); }}
            placeholder="Search inventory by ID or SN..." icon
          />
          {newInvDetails && (
            <div style={{ ...cardStyle, marginTop: 12 }}>
              <InfoRow label="ID" value={newInvDetails.invId} mono />
              <InfoRow label="SN" value={newInvDetails.sn} mono />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                <span style={{ fontSize: 11, color: D.textMuted }}>Status</span>
                <StatusPill value={newInvDetails.status} />
              </div>
              <InfoRow label="Resource" value={newInvDetails.resourceName} />
              {newInvDetails.subStatus && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                  <span style={{ fontSize: 11, color: D.textMuted }}>Subscription</span>
                  <StatusPill value={newInvDetails.subStatus} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Swap Configuration */}
      {oldInvId && newInvId && (
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={sectionHeaderStyle}>Swap Configuration</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: D.textMuted, marginBottom: 4, fontFamily: FONT }}>
                Swap Date
              </label>
              <input
                type="date" value={swapDate}
                onChange={e => setSwapDate(e.target.value)}
                disabled={isExecuting}
                style={{
                  width: '100%', boxSizing: 'border-box' as const,
                  padding: '8px 12px', fontSize: 12, fontFamily: FONT,
                  border: `1px solid ${D.borderPrimary}`, borderRadius: 7,
                  background: '#fff', color: D.textPrimary, outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: D.textMuted, marginBottom: 4, fontFamily: FONT }}>
                Old Inventory Status
              </label>
              <select
                value={oldNewStatus}
                onChange={e => setOldNewStatus(e.target.value)}
                disabled={isExecuting}
                style={{
                  width: '100%', boxSizing: 'border-box' as const,
                  padding: '8px 12px', fontSize: 12, fontFamily: FONT,
                  border: `1px solid ${D.borderPrimary}`, borderRadius: 7,
                  background: '#fff', color: D.textPrimary, outline: 'none',
                }}
              >
                {INVENTORY_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: D.textMuted, marginBottom: 4, fontFamily: FONT }}>
                New Inventory Status
              </label>
              <select
                value={newNewStatus}
                onChange={e => setNewNewStatus(e.target.value)}
                disabled={isExecuting}
                style={{
                  width: '100%', boxSizing: 'border-box' as const,
                  padding: '8px 12px', fontSize: 12, fontFamily: FONT,
                  border: `1px solid ${D.borderPrimary}`, borderRadius: 7,
                  background: '#fff', color: D.textPrimary, outline: 'none',
                }}
              >
                {INVENTORY_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && oldInvId && newInvId && (
        <div style={{
          marginBottom: 20, padding: '12px 16px', background: D.amberBg,
          borderRadius: 8, border: `1px solid ${D.amber}20`,
        }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
              <IconWarning size={13} />
              <span style={{ fontSize: 12, fontFamily: FONT, color: D.amberText }}>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Validation Errors (only when both selected) */}
      {oldInvId && newInvId && validationErrors.length > 0 && (
        <div style={{
          marginBottom: 20, padding: '12px 16px', background: D.redHoverBg,
          borderRadius: 8, border: `1px solid ${D.redRequired}20`,
        }}>
          {validationErrors.map((e, i) => (
            <div key={i} style={{ fontSize: 12, fontFamily: FONT, color: D.redRequired, padding: '2px 0' }}>
              {e}
            </div>
          ))}
        </div>
      )}

      {/* Summary Preview */}
      {oldInvDetails && newInvDetails && canExecute && (
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={sectionHeaderStyle}>Swap Preview</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: D.orangeText, marginBottom: 6 }}>Old Inventory</div>
              <div style={{ fontSize: 12, color: D.textSecondary, lineHeight: 1.8 }}>
                <div>Terminate subscription: <span style={{ fontFamily: MONO, fontWeight: 500 }}>{oldInvDetails.activeSubDisplay}</span></div>
                {oldInvDetails.locationName && <div>Clear location: {oldInvDetails.locationName}</div>}
                <div>Clear installation date</div>
                <div>Set status → <StatusPill value={oldNewStatus} /></div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: D.greenText, marginBottom: 6 }}>New Inventory</div>
              <div style={{ fontSize: 12, color: D.textSecondary, lineHeight: 1.8 }}>
                <div>Link to contract: <span style={{ fontFamily: MONO, fontWeight: 500 }}>{oldInvDetails.contractDisplay}</span></div>
                {oldInvDetails.locationName && <div>Set location: {oldInvDetails.locationName}</div>}
                <div>Set installation date: {swapDate}</div>
                <div>Set start date: {swapDate}</div>
                <div>Set status → <StatusPill value={newNewStatus} /></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Execute Button */}
      {oldInvId && newInvId && !swapComplete && (
        <button
          onClick={handleExecuteSwap}
          disabled={!canExecute}
          style={{
            width: '100%', padding: '12px 24px',
            fontSize: 13, fontWeight: 600, fontFamily: FONT,
            background: canExecute ? D.btnPrimary : D.textDisabled,
            color: '#fff', border: 'none', borderRadius: 8,
            cursor: canExecute ? 'pointer' : 'not-allowed',
            marginBottom: 20,
          }}
        >
          {isExecuting ? 'Executing Swap...' : 'Execute Swap'}
        </button>
      )}

      {/* Progress Panel */}
      {swapSteps.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SwapProgressPanel steps={swapSteps} error={swapError || undefined} />
        </div>
      )}

      {/* Success Message */}
      {swapComplete && (
        <div style={{
          ...cardStyle, marginBottom: 20,
          background: D.greenBg, borderColor: `${D.green}40`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <IconCheck size={20} color={D.green} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: D.greenText }}>Swap Complete</div>
            <div style={{ fontSize: 12, color: D.textSecondary, marginTop: 2 }}>
              {oldInvDetails?.invId} → {newInvDetails?.invId} successfully swapped.
            </div>
          </div>
          <button
            onClick={handleReset}
            style={{
              marginLeft: 'auto', padding: '6px 16px', fontSize: 12, fontWeight: 500,
              fontFamily: FONT, background: D.bgSurface, color: D.textPrimary,
              border: `1px solid ${D.borderPrimary}`, borderRadius: 6, cursor: 'pointer',
            }}
          >
            New Swap
          </button>
        </div>
      )}
    </div>
  );
}

// ==================== Custom Properties ====================

function getCustomProperties(base: ReturnType<typeof useBase>) {
  return [
    { key: 'inventoryTable', label: 'Inventory', type: 'table' as const, defaultValue: base.tables.find((t: any) => t.id === 'tblp7sqsv25DVYs7T') },
    { key: 'subscriptionsTable', label: 'Subscriptions', type: 'table' as const, defaultValue: base.tables.find((t: any) => t.id === 'tblyNA73D9jldeEir') },
    { key: 'subscriptionContractsTable', label: 'Subscription Contracts', type: 'table' as const, defaultValue: base.tables.find((t: any) => t.id === 'tblhn4CJZbi57C8WP') },
    { key: 'locationsTable', label: 'Locations', type: 'table' as const, defaultValue: base.tables.find((t: any) => t.id === 'tblChlR6D4roiK14y') },
  ];
}

// ==================== App Wrapper ====================

function InventorySwapApp(): React.ReactElement {
  const base = useBase();
  const { customPropertyValueByKey } = useCustomProperties(
    useCallback((b: ReturnType<typeof useBase>) => getCustomProperties(b), [])
  );

  const tables = {
    inventoryTable: customPropertyValueByKey.inventoryTable as Table | undefined,
    subscriptionsTable: customPropertyValueByKey.subscriptionsTable as Table | undefined,
    subscriptionContractsTable: customPropertyValueByKey.subscriptionContractsTable as Table | undefined,
    locationsTable: customPropertyValueByKey.locationsTable as Table | undefined,
  };

  const missing = Object.entries(tables).filter(([, v]) => !v).map(([k]) => k);

  if (missing.length > 0) {
    return (
      <div style={{ height: '100vh', background: D.bgPage, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
        <div style={{ background: D.bgSurface, borderRadius: 12, padding: 32, maxWidth: 420, border: `1px solid ${D.borderPrimary}`, textAlign: 'center' as const }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: D.textPrimary, margin: '0 0 8px' }}>Configuration Required</p>
          <p style={{ fontSize: 12, color: D.textMuted, margin: 0 }}>
            Missing tables: {missing.join(', ')}. Add them to the interface data sources, then select them in the properties panel.
          </p>
        </div>
      </div>
    );
  }

  return <InventorySwapInner tables={tables as ResolvedTables} />;
}

// ==================== Error Boundary ====================

class ErrorBoundary extends React.Component<Record<string, any>, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[InventorySwap] Crash:', error, info.componentStack);
  }
  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: MONO, background: D.bgPage, minHeight: '100vh' }}>
          <h2 style={{ color: D.redRequired, fontSize: 16, margin: '0 0 12px' }}>Extension crashed</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: D.textSecondary, background: D.bgSurface, padding: 16, borderRadius: 8, border: `1px solid ${D.borderPrimary}` }}>
            {this.state.error.message}{'\n'}{this.state.error.stack}
          </pre>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

initializeBlock({ interface: () => <ErrorBoundary><InventorySwapApp /></ErrorBoundary> });
