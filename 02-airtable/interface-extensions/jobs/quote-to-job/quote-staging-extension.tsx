import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  initializeBlock,
  useBase,
  useRecords,
  useCustomProperties,
} from '@airtable/blocks/interface/ui';
import { Table } from '@airtable/blocks/interface/models';

// ==================== Types & Config ====================

interface ContractData {
  salesIds: string[];
  customerId: string;
  customerDisplay: string;
  service: string;
  subscriptionTypeId: string;
  subscriptionTypeDisplay: string;
  durationFoc: string;
  startDate: string;
  invoiceFrequency: string;
  unitsStart: number | string;
  unitsCurrent: number | string;
  currency: string;
  ppuMonth: number | string;
  pplMonth: number | string;
}

function emptyContract(): ContractData {
  return { salesIds: [], customerId: '', customerDisplay: '', service: '', subscriptionTypeId: '', subscriptionTypeDisplay: '', durationFoc: '', startDate: '', invoiceFrequency: '', unitsStart: '', unitsCurrent: '', currency: '', ppuMonth: '', pplMonth: '' };
}

interface ContractEntry {
  id: string;
  label: string;
  color: string;
  data: ContractData;
}

interface BOMResourceItem {
  id: string;
  resourceId: string;
  resourceName: string;
  modelName: string;
  quantity: number;
  contractId?: string;
}

const CONTRACT_COLORS = ['#7c3aed','#2563eb','#059669','#ea580c','#dc2626','#0891b2','#ca8a04','#be185d'];

interface JobRow {
  id: string;
  locationId: string;
  locationDisplay: string;
  service: string;
  partnerId: string;
  partnerDisplay: string;
  type: string;
  status: string;
  dateScheduled: string;
  assignedToIds: string[];
  bomResources: BOMResourceItem[];
}

function createEmptyRow(): JobRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    locationId: '', locationDisplay: '', service: '', partnerId: '', partnerDisplay: '',
    type: '', status: '', dateScheduled: '', assignedToIds: [], bomResources: [],
  };
}

type Stage = 'needs_customer' | 'needs_allocation' | 'ready' | 'done' | 'exempt';

const CONTRACT_SERVICE_OPTIONS = ['Digital signage', 'Music streaming'];
const DURATION_FOC_OPTIONS = ['1', '2', '3', '4', '5', '6', '7'];
const INVOICE_FREQ_OPTIONS = ['Monthly', 'Annually'];
const CURRENCY_OPTIONS = ['THB', 'USD'];

const F = {
  hq_quoteId: 'fldknQwGzwI1VngxQ',
  hq_quoteNumber: 'fldxPrvWs1LJH4YgZ',
  hq_quoteStatus: 'fldbOMc45bUlfodQI',
  hq_status: 'flde1WYO61rqWSgfJ',
  hq_quoteType: 'fldee1UAEbbBRZNw8',
  hq_quoteService: 'fldOkbdzsb75CTmsk',
  hq_dealName: 'fld04192O7AGeoSHZ',
  hq_buyerCompanyName: 'fldQAyRuARPpOVZQ8',
  hq_publicUrl: 'fldQxytU98niDmqu0',
  hq_allocatedJobs: 'fldcxtVQn8aTaK6hm',
  hq_jobsOpened: 'fldD8PSiUVsxr6Dx6',
  hq_allocProgress: 'fld9UI8iTHD89mOC5',
  hq_jobsLink: 'flduqcUClFQMG8uMY',
  hq_customerAT: 'fldxsduX5imgE5hNW',
  hq_quoteTitle: 'fldednnLaxvKeH26Z',
  hq_currency: 'fld7opmszZ9yOy3PP',
  hq_created: 'fldxhSXasW6iV6Psw',
  job_location: 'flddTDwVWOq7fc1Je',
  job_bom: 'fldMsBGHYoDkBxvBM',
  job_service: 'fldexkzrV3Z1z270B',
  job_partner: 'fldw2W2UmvTJiIuSY',
  job_type: 'fldk5E1PkIy1ZrM1e',
  job_status: 'fld7q5wjIg47nltes',
  job_dateScheduled: 'fld19en5UMabiUnqG',
  job_assignedTo: 'fld9PbrU1Lw8IvCzy',
  job_hsQuotes: 'fldr7l2cjqxoR7qQV',
  job_id: 'fldcbFW9pJzt3ZIVh',
  br_resources: 'fldJWgcTlCdXLJca0',
  br_quantity: 'fldX9nW8yWPagrPTt',
  br_bom: 'fldUq5csjuSb50Ay1',
  loc_id: 'fldH1vrhUnKiwwpCA',
  loc_name: 'fldqsL7TAKvXlgXiD',
  loc_customer: 'fld50gjrLkGm9UAWa',
  loc_address: 'fldFKRQqqgq6ciM3N',
  loc_country: 'fld2HASuI5dQ03JFG',
  res_name: 'fld736xl5W3Mahu9I',
  res_model: 'fldJZ1YhZgDDU9Fw2',
  ptr_name: 'fldpNi9OwkPGLN03a',
  cust_id: 'fldVUI3Tf7Zt8kB8E',
  cty_name: 'fld1mAL19wYygGhIK',
  hq_exempt: 'fldyLxmoOjcVjqP2q',
  hq_manualQuote: 'fldpiLqG7dDc2tkJ5',
  hq_depositInvoiced: 'fldGbdcsSuLqaPlks',
  hq_depositPaid: 'fld0lxt7D45SMp2UJ',
  job_locationName: 'fldsBkE8JNcCKnAPm',
};

const SERVICE_OPTIONS = ['Digital signage', 'Music streaming'];
const JOB_TYPE_OPTIONS = ['Installation', 'Delivery', 'Rework', 'Survey', 'Un-installation', 'Ma - Audit', 'Ma - Preventive', 'Ma - Reactive', 'Collect', 'Account setup', 'Pre-sale'];
const STATUS_OPTIONS = ['Scheduled', 'Tentative'];
const SERVICE_MAP: Record<string, string> = { 'Digital Signage': 'Digital signage', 'Music Streaming': 'Music streaming' };
const OPS_TYPES = new Set(['Installation', 'Player Box', 'Display', 'Maintenance', 'Delivery']);

const JOB_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  'Collect': { bg: '#fce4ec', color: '#880e4f' },
  'Delivery': { bg: '#c4ecff', color: '#0d47a1' },
  'Installation': { bg: '#d0e2ff', color: '#1a3a6b' },
  'Rework': { bg: '#c4ecff', color: '#0d47a1' },
  'Survey': { bg: '#e0f2f1', color: '#00695c' },
  'Un-installation': { bg: '#fce4ec', color: '#880e4f' },
  'Ma - Audit': { bg: '#e3f2fd', color: '#1565c0' },
  'Ma - Preventive': { bg: '#e3f2fd', color: '#1565c0' },
  'Ma - Reactive': { bg: '#ffd66b', color: '#5d4037' },
  'Account setup': { bg: '#e0f7fa', color: '#00695c' },
  'Pre-sale': { bg: '#e8f5e9', color: '#2e7d32' },
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  'Done': { bg: '#d4edda', color: '#1b5e20' },
  'Incomplete': { bg: '#f8d7da', color: '#b71c1c' },
  'Installed': { bg: '#d0f0ee', color: '#00695c' },
  'Scheduled': { bg: '#ffeeba', color: '#7c6200' },
  'Tentative': { bg: '#d6ddf0', color: '#3949ab' },
  'Unscheduled': { bg: '#f8d7e5', color: '#880e4f' },
  'Cancelled': { bg: '#f8d7da', color: '#b71c1c' },
};

// ==================== Design Tokens ====================

const D = {
  bgPage: '#f8f8f7', bgSurface: '#ffffff', bgHover: '#fafaf9',
  borderPrimary: '#d4d4d1', borderSubtle: '#e2e2df', borderHover: '#b8b8b5',
  textPrimary: '#1a1a1a', textSecondary: '#5c5c5a', textMuted: '#8c8c8a',
  textFaint: '#a3a3a0', textDisabled: '#d4d4d2',
  orange: '#ea580c', orangeBg: '#fff7ed', orangeText: '#c2410c',
  purple: '#7c3aed', purpleBg: '#f5f3ff', purpleText: '#6d28d9',
  green: '#059669', greenBg: '#ecfdf5', greenText: '#047857',
  grayDot: '#9ca3af', grayText: '#6b7280', grayBg: '#f3f4f6',
  blue: '#2563eb', blueBg: '#eff6ff', greenProgress: '#10b981', amber: '#d97706', amberBg: '#fffbeb', amberText: '#92400e',
  btnPrimary: '#1a1a1a', redRequired: '#ef4444', redHoverBg: '#fef2f2',
  tagNeutralBg: '#f3f3f1', tagNeutralText: '#5c5c5a',
};

const FONT = "'IBM Plex Sans', system-ui, -apple-system, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', monospace";

const STAGES: Record<Stage, { label: string; dot: string; countBg: string; countColor: string; tagBg: string; tagColor: string; accent: string; bg: string }> = {
  needs_customer: { label: 'Needs Customer', dot: D.orange, countBg: D.orangeBg, countColor: D.orange, tagBg: D.orangeBg, tagColor: D.orangeText, accent: D.orange, bg: D.orangeBg },
  needs_allocation: { label: 'Needs Allocation', dot: D.purple, countBg: D.purpleBg, countColor: D.purple, tagBg: D.purpleBg, tagColor: D.purpleText, accent: D.purple, bg: D.purpleBg },
  ready: { label: 'Ready', dot: D.green, countBg: D.greenBg, countColor: D.green, tagBg: D.greenBg, tagColor: D.greenText, accent: D.green, bg: D.greenBg },
  done: { label: 'Done', dot: D.grayDot, countBg: D.grayBg, countColor: D.grayText, tagBg: D.grayBg, tagColor: D.grayText, accent: D.grayDot, bg: D.grayBg },
  exempt: { label: 'Exempt', dot: D.textPrimary, countBg: D.tagNeutralBg, countColor: D.textPrimary, tagBg: D.tagNeutralBg, tagColor: D.textPrimary, accent: D.textPrimary, bg: D.tagNeutralBg },
};

const STAGE_ORDER: Stage[] = ['needs_customer', 'needs_allocation', 'ready', 'done', 'exempt'];

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

function computeStage(record: any, table: Table): string {
  const statusA = gfStr(record, table, F.hq_quoteStatus);
  const statusB = gfStr(record, table, F.hq_status);
  const status = statusA || statusB;
  if (status.toUpperCase() !== 'ACCEPTED') return 'skip';
  const types = gfVal(record, table, F.hq_quoteType) as any[] | null;
  if (!types || types.length === 0) return 'skip';
  if (!types.some((t: any) => OPS_TYPES.has(t.name || t))) return 'skip';
  const exempt = gfVal(record, table, F.hq_exempt);
  if (exempt) return 'exempt';
  const customer = gfVal(record, table, F.hq_customerAT);
  if (!customer || (Array.isArray(customer) && customer.length === 0)) return 'needs_customer';
  const allocated = gfVal(record, table, F.hq_allocatedJobs) as number | null;
  if (!allocated || allocated <= 0) return 'needs_allocation';
  const opened = gfVal(record, table, F.hq_jobsOpened) as number | null;
  if ((opened ?? 0) >= allocated) return 'done';
  return 'ready';
}

// ==================== REST API ====================

const AIRTABLE_PAT = 'YOUR_PAT_HERE';

async function airtableApiCreate(
  baseId: string, tableId: string, fields: Record<string, any>, token: string,
): Promise<string> {
  const resp = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (resp.status === 429) {
    await new Promise(r => setTimeout(r, 2000));
    return airtableApiCreate(baseId, tableId, fields, token);
  }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `Airtable API error ${resp.status}`);
  }
  const data = await resp.json();
  return data.id;
}

async function airtableApiBatchCreate(
  baseId: string, tableId: string, recordFields: Record<string, any>[], token: string,
): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < recordFields.length; i += 10) {
    const batch = recordFields.slice(i, i + 10);
    const resp = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: batch.map(fields => ({ fields })) }),
    });
    if (resp.status === 429) {
      await new Promise(r => setTimeout(r, 2000));
      i -= 10;
      continue;
    }
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `Airtable API error ${resp.status}`);
    }
    const data = await resp.json();
    ids.push(...data.records.map((r: any) => r.id));
  }
  return ids;
}

// ==================== Font & Animation Loading ====================

function useDesignSetup() {
  useEffect(() => {
    if (!document.querySelector('link[data-qs-fonts]')) {
      const link = document.createElement('link');
      link.setAttribute('data-qs-fonts', '');
      link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (!document.querySelector('style[data-qs-anims]')) {
      const style = document.createElement('style');
      style.setAttribute('data-qs-anims', '');
      style.textContent = `
        @keyframes qs-fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes qs-slideIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
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
const IconExternal = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
);
const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
);
const IconTrash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
);
const IconCheck = ({ size = 22, color = D.green }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
);
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={D.orange} strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
);
const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={D.purple} strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
);
const IconBan = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={D.amber} strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M4.93 4.93l14.14 14.14" /></svg>
);
const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
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

// ==================== AssignedToCell ====================

function AssignedToCell({ selectedIds, collaboratorOptions, onChange }: {
  selectedIds: string[];
  collaboratorOptions: { id: string; label: string; email?: string; pic?: string }[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const updatePos = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 200) });
    }
  };

  const available = collaboratorOptions.filter(
    c => !selectedIds.includes(c.id) && (c.label.toLowerCase().includes(search.toLowerCase()) || (c.email || '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div ref={ref}>
      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {selectedIds.map(id => {
            const c = collaboratorOptions.find(x => x.id === id);
            return (
              <span key={id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                background: D.blueBg, color: D.blue, borderRadius: 4, fontSize: 11, fontFamily: FONT,
              }}>
                {c?.label || id}
                <button type="button" onClick={() => onChange(selectedIds.filter(i => i !== id))}
                  style={{ background: 'none', border: 'none', color: D.redRequired, cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>
              </span>
            );
          })}
        </div>
      )}
      <input ref={inputRef} type="text" value={search}
        onChange={(e) => { setSearch(e.target.value); updatePos(); setOpen(true); }}
        onFocus={() => { updatePos(); setOpen(true); }}
        placeholder={selectedIds.length > 0 ? 'Add more...' : 'Search team members...'}
        style={{
          width: '100%', boxSizing: 'border-box' as const, padding: '8px 12px',
          fontSize: 12, fontFamily: FONT, border: `1px solid ${D.borderPrimary}`,
          borderRadius: 7, outline: 'none', color: D.textPrimary,
        }}
      />
      {open && (
        <div style={{
          position: 'fixed', zIndex: 50, background: D.bgSurface,
          border: `1px solid ${D.borderPrimary}`, borderRadius: 7,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxHeight: 180, overflowY: 'auto',
          top: pos.top, left: pos.left, width: pos.width,
        }}>
          {available.map(c => (
            <div key={c.id} onClick={() => { onChange([...selectedIds, c.id]); setSearch(''); }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = D.bgHover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              style={{
                padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: `1px solid ${D.borderSubtle}`,
              }}>
              {c.pic && <img src={c.pic} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />}
              <div>
                <div style={{ fontSize: 12, fontFamily: FONT, color: D.textPrimary }}>{c.label}</div>
                {c.email && <div style={{ fontSize: 10, color: D.textMuted }}>{c.email}</div>}
              </div>
            </div>
          ))}
          {available.length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: D.textMuted }}>No results</div>}
        </div>
      )}
    </div>
  );
}

// ==================== ContractForm ====================

const contractFieldLabel: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: D.textSecondary, fontFamily: FONT, marginBottom: 3 };
const contractInput: React.CSSProperties = { width: '100%', padding: '5px 8px', fontSize: 12, fontFamily: FONT, border: `1px solid ${D.borderPrimary}`, borderRadius: 6, background: D.bgSurface, color: D.textPrimary, outline: 'none', boxSizing: 'border-box' as const };
const contractSelect: React.CSSProperties = { ...contractInput, appearance: 'auto' as const };

function ContractForm({
  contract, onChange, customerOptions, subscriptionTypeOptions, collaboratorOptions,
  showErrors, missingFields,
}: {
  contract: ContractData;
  onChange: (c: ContractData) => void;
  customerOptions: { id: string; label: string }[];
  subscriptionTypeOptions: { id: string; label: string }[];
  collaboratorOptions: { id: string; label: string }[];
  showErrors?: boolean;
  missingFields?: string[];
}) {
  const update = (partial: Partial<ContractData>) => onChange({ ...contract, ...partial });
  const err = (field: string) => showErrors && missingFields?.includes(field);
  const reqLabel = (label: string, field: string) => (
    <div style={{ ...contractFieldLabel, color: err(field) ? D.redRequired : D.textSecondary }}>
      {label} <span style={{ color: D.redRequired }}>*</span>
    </div>
  );
  const errBorder = (field: string) => err(field) ? `1px solid ${D.redRequired}` : `1px solid ${D.borderPrimary}`;
  return (
    <div style={{ padding: '10px 12px', background: D.purpleBg, borderRadius: 6, border: `1px solid ${D.purple}20` }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div>
          {reqLabel('Sales', 'sales')}
          <select value={contract.salesIds[0] || ''} onChange={(e: any) => update({ salesIds: e.target.value ? [e.target.value] : [] })} style={{ ...contractSelect, border: errBorder('sales') }}>
            <option value="">Select...</option>
            {collaboratorOptions.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          {reqLabel('Customer', 'customer')}
          <SearchDropdown value={contract.customerId} displayValue={contract.customerDisplay} options={customerOptions}
            onSelect={(id: string, label: string) => update({ customerId: id, customerDisplay: label })} placeholder="Search..." />
        </div>
        <div>
          {reqLabel('Service', 'service')}
          <select value={contract.service} onChange={(e: any) => update({ service: e.target.value })} style={{ ...contractSelect, border: errBorder('service') }}>
            <option value="">Select...</option>
            {CONTRACT_SERVICE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          {reqLabel('Subscription type', 'subscriptionType')}
          <SearchDropdown value={contract.subscriptionTypeId} displayValue={contract.subscriptionTypeDisplay} options={subscriptionTypeOptions}
            onSelect={(id: string, label: string) => update({ subscriptionTypeId: id, subscriptionTypeDisplay: label })} placeholder="Search..." />
        </div>
        <div>
          <div style={contractFieldLabel}>Duration FoC (M)</div>
          <select value={contract.durationFoc} onChange={(e: any) => update({ durationFoc: e.target.value })} style={contractSelect}>
            <option value="">Select...</option>
            {DURATION_FOC_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          {reqLabel('Start date', 'startDate')}
          <input type="date" value={contract.startDate} onChange={(e: any) => update({ startDate: e.target.value })} style={{ ...contractInput, border: errBorder('startDate') }} />
        </div>
        <div>
          {reqLabel('Invoice frequency', 'invoiceFrequency')}
          <select value={contract.invoiceFrequency} onChange={(e: any) => update({ invoiceFrequency: e.target.value })} style={{ ...contractSelect, border: errBorder('invoiceFrequency') }}>
            <option value="">Select...</option>
            {INVOICE_FREQ_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          {reqLabel('Units - Start', 'unitsStart')}
          <input type="number" min="0" value={contract.unitsStart} onChange={(e: any) => update({ unitsStart: e.target.value === '' ? '' : Number(e.target.value) })} style={{ ...contractInput, border: errBorder('unitsStart') }} />
        </div>
        <div>
          {reqLabel('Currency', 'currency')}
          <select value={contract.currency} onChange={(e: any) => update({ currency: e.target.value })} style={{ ...contractSelect, border: errBorder('currency') }}>
            <option value="">Select...</option>
            {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div style={{ ...contractFieldLabel, color: err('ppuOrPpl') ? D.redRequired : D.textSecondary }}>
            PPU/month <span style={{ color: D.redRequired }}>*</span>
          </div>
          <input type="number" min="0" step="0.01" value={contract.ppuMonth} onChange={(e: any) => update({ ppuMonth: e.target.value === '' ? '' : Number(e.target.value) })} style={{ ...contractInput, border: errBorder('ppuOrPpl') }} />
        </div>
        <div>
          <div style={{ ...contractFieldLabel, color: err('ppuOrPpl') ? D.redRequired : D.textSecondary }}>
            PPL/month <span style={{ color: D.redRequired }}>*</span>
          </div>
          <input type="number" min="0" step="0.01" value={contract.pplMonth} onChange={(e: any) => update({ pplMonth: e.target.value === '' ? '' : Number(e.target.value) })} style={{ ...contractInput, border: errBorder('ppuOrPpl') }} />
        </div>
      </div>
      {showErrors && !!(missingFields?.length) && (
        <p style={{ fontSize: 11, fontFamily: FONT, color: D.redRequired, margin: '8px 0 0' }}>
          {missingFields.includes('ppuOrPpl') ? 'Fill in either PPU/month or PPL/month. ' : ''}
          {missingFields.filter(f => f !== 'ppuOrPpl').length > 0 ? 'Please fill all required fields.' : ''}
        </p>
      )}
    </div>
  );
}

// ==================== ContractEditModal ====================

function ContractEditModal({
  contract, onSave, onClose, customerOptions, subscriptionTypeOptions, collaboratorOptions,
  defaults,
}: {
  contract: ContractEntry | null;
  onSave: (c: ContractEntry) => void;
  onClose: () => void;
  customerOptions: { id: string; label: string }[];
  subscriptionTypeOptions: { id: string; label: string }[];
  collaboratorOptions: { id: string; label: string }[];
  defaults?: Partial<ContractData>;
}) {
  const isNew = !contract;
  const [label, setLabel] = useState(contract?.label || '');
  const [color, setColor] = useState(contract?.color || CONTRACT_COLORS[0]);
  const [data, setData] = useState<ContractData>(contract?.data || { ...emptyContract(), ...defaults });
  const [showErrors, setShowErrors] = useState(false);

  const missingFields: string[] = [];
  if (!data.salesIds.length) missingFields.push('sales');
  if (!data.customerId) missingFields.push('customer');
  if (!data.service) missingFields.push('service');
  if (!data.subscriptionTypeId) missingFields.push('subscriptionType');
  if (!data.startDate) missingFields.push('startDate');
  if (!data.invoiceFrequency) missingFields.push('invoiceFrequency');
  if (data.unitsStart === '' || data.unitsStart === undefined) missingFields.push('unitsStart');
  if (!data.currency) missingFields.push('currency');
  if ((data.ppuMonth === '' || data.ppuMonth === undefined) && (data.pplMonth === '' || data.pplMonth === undefined)) missingFields.push('ppuOrPpl');
  const isValid = missingFields.length === 0;

  const handleSave = () => {
    if (!isValid) { setShowErrors(true); return; }
    const entry: ContractEntry = {
      id: contract?.id || `contract-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: label || `Contract ${new Date().toLocaleTimeString()}`,
      color,
      data,
    };
    onSave(entry);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ background: D.bgSurface, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', width: '100%', maxWidth: 640, maxHeight: '90vh', margin: '0 16px', padding: 20, fontFamily: FONT, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: D.textPrimary, fontFamily: FONT, margin: 0 }}>
            {isNew ? 'New Contract' : 'Edit Contract'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.textMuted, padding: 2 }}>
            <IconClose />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <div style={contractFieldLabel}>Label</div>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. HQ Digital Signage" style={contractInput} autoFocus />
          </div>
          <div>
            <div style={contractFieldLabel}>Color</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {CONTRACT_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  style={{
                    width: 22, height: 22, borderRadius: '50%', background: c,
                    border: color === c ? '2px solid #1a1a1a' : '2px solid transparent',
                    cursor: 'pointer', padding: 0, boxSizing: 'border-box',
                  }} />
              ))}
            </div>
          </div>
        </div>

        <ContractForm contract={data} onChange={setData}
          customerOptions={customerOptions} subscriptionTypeOptions={subscriptionTypeOptions}
          collaboratorOptions={collaboratorOptions}
          showErrors={showErrors} missingFields={missingFields} />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = D.bgHover; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = D.bgSurface; }}
            style={{ padding: '8px 16px', fontSize: 12, fontFamily: FONT, background: D.bgSurface, color: D.textPrimary, border: `1px solid ${D.borderPrimary}`, borderRadius: 7, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave}
            style={{ padding: '8px 16px', fontSize: 12, fontFamily: FONT, background: D.btnPrimary, color: '#ffffff', border: 'none', borderRadius: 7, cursor: 'pointer' }}>
            {isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== ContractPanel ====================

function ContractPanel({
  contracts, onAdd, onEdit, onDelete, allRows,
}: {
  contracts: ContractEntry[];
  onAdd: () => void;
  onEdit: (c: ContractEntry) => void;
  onDelete: (id: string) => void;
  allRows: JobRow[];
}) {
  const [collapsed, setCollapsed] = useState(false);

  const getAssignedCount = (contractId: string) => {
    let count = 0;
    for (const row of allRows) {
      for (const res of row.bomResources) {
        if (res.contractId === contractId) count++;
      }
    }
    return count;
  };

  return (
    <div style={{ background: D.bgSurface, borderRadius: 8, border: `1px solid ${D.borderPrimary}`, padding: '12px 16px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: D.textPrimary, fontFamily: FONT }}>
            Contracts ({contracts.length})
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={D.textMuted} strokeWidth="2.5"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <button onClick={onAdd}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = D.purpleBg; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          style={{
            background: 'transparent', border: `1px solid ${D.purple}`, borderRadius: 6, padding: '4px 10px',
            fontSize: 11, fontFamily: FONT, fontWeight: 500, color: D.purple, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
          <IconPlus /> Add Contract
        </button>
      </div>

      {!collapsed && contracts.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {contracts.map(c => {
            const count = getAssignedCount(c.id);
            return (
              <div key={c.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                  border: `1px solid ${c.color}30`, borderRadius: 7, background: `${c.color}08`,
                  cursor: 'pointer', minWidth: 140,
                }}
                onClick={() => onEdit(c)}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontFamily: FONT, fontWeight: 500, color: D.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: FONT, color: D.textMuted }}>
                    {c.data.service || 'No service'} · {count} resource{count !== 1 ? 's' : ''}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = D.redRequired; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = D.textFaint; }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.textFaint, padding: 2, flexShrink: 0 }}>
                  <IconTrash />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!collapsed && contracts.length === 0 && (
        <p style={{ fontSize: 12, fontFamily: FONT, color: D.textMuted, margin: '10px 0 0' }}>
          No contracts yet. Create one and drag it onto BOM resources to assign.
        </p>
      )}

      {collapsed && contracts.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          {contracts.map(c => (
            <div key={c.id} style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== BOMModal ====================

function BOMModal({
  bomResources, resourceOptions, contracts,
  onSave, onClose, onCreateContract, onEditContract,
}: {
  bomResources: BOMResourceItem[];
  resourceOptions: { id: string; label: string; model: string }[];
  contracts: ContractEntry[];
  onSave: (items: BOMResourceItem[]) => void;
  onClose: () => void;
  onCreateContract: () => void;
  onEditContract: (c: ContractEntry) => void;
}) {
  const [items, setItems] = useState<BOMResourceItem[]>([...bomResources]);
  const [newResourceId, setNewResourceId] = useState('');
  const [newResourceDisplay, setNewResourceDisplay] = useState('');
  const [newQty, setNewQty] = useState<number | string>(1);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [assignModeContractId, setAssignModeContractId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newResourceId || !newQty || Number(newQty) < 1) return;
    const opt = resourceOptions.find(r => r.id === newResourceId);
    setItems([...items, {
      id: `bom-${Date.now()}`,
      resourceId: newResourceId,
      resourceName: opt?.label || 'Unknown',
      modelName: opt?.model || opt?.label || 'Unknown',
      quantity: Number(newQty),
    }]);
    setNewResourceId('');
    setNewResourceDisplay('');
    setNewQty(1);
  };

  const assignContract = (itemId: string, contractId: string) => {
    setItems(items.map(i => i.id === itemId ? { ...i, contractId } : i));
  };

  const removeContract = (itemId: string) => {
    setItems(items.map(i => i.id === itemId ? { ...i, contractId: undefined } : i));
  };

  const handleDragStart = (e: React.DragEvent, contractId: string) => {
    e.dataTransfer.setData('text/plain', contractId);
    e.dataTransfer.effectAllowed = 'link';
  };

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'link';
    setDragOverId(itemId);
  };

  const handleDragLeave = () => { setDragOverId(null); };

  const handleDrop = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    const contractId = e.dataTransfer.getData('text/plain');
    if (contractId && contracts.find(c => c.id === contractId)) {
      assignContract(itemId, contractId);
    }
    setDragOverId(null);
  };

  const handleResourceClick = (itemId: string) => {
    if (assignModeContractId) {
      assignContract(itemId, assignModeContractId);
      setAssignModeContractId(null);
    }
  };

  const addBtnStyle: React.CSSProperties = {
    background: D.btnPrimary, color: '#fff', border: 'none', borderRadius: 7,
    padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: (!newResourceId || !newQty || Number(newQty) < 1) ? 'not-allowed' : 'pointer',
    opacity: (!newResourceId || !newQty || Number(newQty) < 1) ? 0.5 : 1,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)',
    }}>
      <div style={{
        background: D.bgSurface, borderRadius: 10,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        width: '100%', maxWidth: 720, maxHeight: '90vh', margin: '0 16px', padding: 20, overflow: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, fontFamily: FONT, color: D.textPrimary, margin: 0 }}>Edit BOM Resources</h3>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.textMuted, padding: 4 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = D.textPrimary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = D.textMuted)}>
            <IconClose />
          </button>
        </div>

        {/* Contract shelf */}
        {contracts.length > 0 && (
          <div style={{
            padding: '10px 12px', background: D.purpleBg, borderRadius: 7,
            border: `1px solid ${D.purple}15`, marginBottom: 12,
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, fontFamily: FONT, color: D.purple, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
              Contracts — drag onto resources below {assignModeContractId && '(click mode active)'}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {contracts.map(c => (
                <div key={c.id} draggable
                  onDragStart={(e) => handleDragStart(e, c.id)}
                  onClick={() => setAssignModeContractId(assignModeContractId === c.id ? null : c.id)}
                  onDoubleClick={() => onEditContract(c)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
                    borderRadius: 6, cursor: 'grab',
                    background: assignModeContractId === c.id ? `${c.color}20` : D.bgSurface,
                    border: `1.5px solid ${assignModeContractId === c.id ? c.color : D.borderPrimary}`,
                    userSelect: 'none',
                  }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontFamily: FONT, fontWeight: 500, color: D.textPrimary }}>{c.label}</span>
                </div>
              ))}
              <button onClick={onCreateContract}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                  borderRadius: 6, border: `1.5px dashed ${D.borderHover}`, background: 'transparent',
                  cursor: 'pointer', fontSize: 11, fontFamily: FONT, color: D.textMuted,
                }}>
                <IconPlus /> New
              </button>
            </div>
          </div>
        )}

        {contracts.length === 0 && (
          <div style={{
            padding: '10px 12px', background: D.purpleBg, borderRadius: 7,
            border: `1px solid ${D.purple}15`, marginBottom: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11, fontFamily: FONT, color: D.textMuted }}>No contracts created yet</span>
            <button onClick={onCreateContract}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                borderRadius: 6, border: `1px solid ${D.purple}`, background: 'transparent',
                cursor: 'pointer', fontSize: 11, fontFamily: FONT, color: D.purple, fontWeight: 500,
              }}>
              <IconPlus /> Create Contract
            </button>
          </div>
        )}

        {/* Add resource */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <SearchDropdown value={newResourceId} displayValue={newResourceDisplay} options={resourceOptions}
              onSelect={(id, label) => { setNewResourceId(id); setNewResourceDisplay(label); }}
              placeholder="Search resource..." />
          </div>
          <input type="number" min="1" value={newQty}
            onChange={(e) => { const val = e.target.value; setNewQty(val === '' ? '' : parseInt(val) || 0); }}
            style={{ ...contractInput, width: 80 }} placeholder="Qty" />
          <button onClick={handleAdd} disabled={!newResourceId || !newQty || Number(newQty) < 1} style={addBtnStyle}>
            <IconPlus />
          </button>
        </div>

        {/* Resource list with drop targets */}
        {items.length > 0 ? (
          <div style={{ marginBottom: 16 }}>
            {items.map((item) => {
              const assignedContract = item.contractId ? contracts.find(c => c.id === item.contractId) : null;
              const isDragOver = dragOverId === item.id;
              return (
                <div key={item.id}
                  onDragOver={(e) => handleDragOver(e, item.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, item.id)}
                  onClick={() => handleResourceClick(item.id)}
                  style={{
                    border: `1.5px solid ${isDragOver ? D.purple : D.borderPrimary}`,
                    borderRadius: 7, marginBottom: 8, overflow: 'hidden',
                    background: isDragOver ? D.purpleBg : 'transparent',
                    transition: 'border-color 0.15s, background 0.15s',
                    cursor: assignModeContractId ? 'pointer' : 'default',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: isDragOver ? D.purpleBg : D.bgPage, padding: '8px 12px', gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 12, fontFamily: FONT, color: D.textPrimary, fontWeight: 500 }}>{item.resourceName}</span>
                    <span style={{ fontSize: 12, fontFamily: MONO, color: D.textMuted, minWidth: 40, textAlign: 'center' as const }}>×{item.quantity}</span>

                    {assignedContract ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                        borderRadius: 10, background: `${assignedContract.color}15`,
                        border: `1px solid ${assignedContract.color}30`, fontSize: 10, fontFamily: FONT,
                        color: assignedContract.color, fontWeight: 500,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: assignedContract.color }} />
                        {assignedContract.label}
                        <button onClick={(e) => { e.stopPropagation(); removeContract(item.id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: assignedContract.color, padding: 0, marginLeft: 2, fontSize: 12, lineHeight: 1 }}>
                          ×
                        </button>
                      </span>
                    ) : (
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, border: `1px dashed ${D.borderHover}`,
                        fontSize: 10, fontFamily: FONT, color: D.textFaint,
                      }}>
                        {isDragOver ? 'Drop here' : 'No contract'}
                      </span>
                    )}

                    <button onClick={(e) => { e.stopPropagation(); setItems(items.filter(x => x.id !== item.id)); }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = D.redRequired; }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.redRequired, padding: 2 }}>
                      <IconTrash />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: 12, fontFamily: FONT, color: D.textMuted, marginBottom: 16 }}>No resources added yet.</p>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ background: D.bgSurface, color: D.textPrimary, border: `1px solid ${D.borderPrimary}`, borderRadius: 7, fontSize: 12, fontFamily: FONT, fontWeight: 500, padding: '8px 16px', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = D.bgHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = D.bgSurface)}>
            Cancel
          </button>
          <button onClick={() => onSave(items)} disabled={items.length === 0}
            style={{ background: D.btnPrimary, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontFamily: FONT, fontWeight: 500, padding: '8px 16px', cursor: items.length === 0 ? 'not-allowed' : 'pointer', opacity: items.length === 0 ? 0.5 : 1 }}>
            Save ({items.length})
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== Custom Properties ====================

function getCustomProperties(base: ReturnType<typeof useBase>) {
  return [
    { key: 'hsQuotesTable', label: 'HS - Quotes', type: 'table' as const, defaultValue: base.tables.find((t: any) => t.id === 'tblRSXCmjroNPaO5j') },
    { key: 'locationsTable', label: 'Locations', type: 'table' as const, defaultValue: base.tables.find((t: any) => t.id === 'tbl5Nj3zs3nxKPdEv') },
    { key: 'bomTable', label: 'BOM', type: 'table' as const, defaultValue: base.tables.find((t: any) => t.id === 'tblMoXmjtWVO8Wyz7') },
    { key: 'bomResourcesTable', label: 'BOM Resources', type: 'table' as const, defaultValue: base.tables.find((t: any) => t.id === 'tblAHbCtXG4w9tzSF') },
    { key: 'jobsTable', label: 'Jobs', type: 'table' as const, defaultValue: base.tables.find((t: any) => t.id === 'tblwHj9cO37wp1fVx') },
    { key: 'resourcesTable', label: 'Resources', type: 'table' as const, defaultValue: base.tables.find((t: any) => t.id === 'tbl6eFWh1yj7wjiGL') },
    { key: 'customersTable', label: 'Customers', type: 'table' as const, defaultValue: base.tables.find((t: any) => t.id === 'tblhzcjYQk0NJCv9v') },
    { key: 'partnersTable', label: 'Partners', type: 'table' as const, defaultValue: base.tables.find((t: any) => t.id === 'tblkK66QqEkfAKb2S') },
  ];
}

// ==================== Detail Panel ====================

function DetailPanel({
  quote, hsQuotesTable, locationsTable, bomTable, bomResourcesTable,
  jobsTable, resourcesTable, customersTable, partnersTable, base,
  locations, resources, customers, partners, onClose,
  customerOptionsRest, subscriptionTypeOptions,
}: {
  quote: any; hsQuotesTable: Table; locationsTable: Table; bomTable: Table;
  bomResourcesTable: Table; jobsTable: Table; resourcesTable: Table;
  customersTable: Table; partnersTable: Table; base: ReturnType<typeof useBase>;
  locations: any[] | null; resources: any[] | null; customers: any[] | null;
  partners: any[] | null; onClose: () => void;
  customerOptionsRest: { id: string; label: string }[];
  subscriptionTypeOptions: { id: string; label: string }[];
}) {
  const stage = computeStage(quote, hsQuotesTable) as Stage;
  const stageCfg = STAGES[stage] || STAGES.needs_customer;
  const quoteNum = gfStr(quote, hsQuotesTable, F.hq_quoteNumber);
  const deal = gfStr(quote, hsQuotesTable, F.hq_dealName);
  const company = gfStr(quote, hsQuotesTable, F.hq_buyerCompanyName);
  const publicUrl = gfStr(quote, hsQuotesTable, F.hq_publicUrl);
  const manualQuoteAttachments = gfVal(quote, hsQuotesTable, F.hq_manualQuote) as any[] | null;
  const manualQuoteUrl = manualQuoteAttachments?.[0]?.url || '';
  const quoteTitle = gfStr(quote, hsQuotesTable, F.hq_quoteTitle);
  const currency = gfStr(quote, hsQuotesTable, F.hq_currency);
  const serviceObj = gfVal(quote, hsQuotesTable, F.hq_quoteService) as any | null;
  const types = (gfVal(quote, hsQuotesTable, F.hq_quoteType) as any[] | null) ?? [];
  const customerAT = gfVal(quote, hsQuotesTable, F.hq_customerAT) as any[] | null;
  const allocated = gfVal(quote, hsQuotesTable, F.hq_allocatedJobs) as number | null;
  const opened = gfVal(quote, hsQuotesTable, F.hq_jobsOpened) as number | null;
  const existingJobs = gfVal(quote, hsQuotesTable, F.hq_jobsLink) as any[] | null;
  const jobsRemaining = Math.max(0, (allocated ?? 0) - (opened ?? 0));
  const [depositInvoiced, setDepositInvoiced] = useState(false);
  const [depositPaid, setDepositPaid] = useState(false);
  useEffect(() => {
    if (!AIRTABLE_PAT || AIRTABLE_PAT === 'YOUR_PAT_HERE') return;
    fetch(`https://api.airtable.com/v0/${base.id}/${hsQuotesTable.id}/${quote.id}?returnFieldsByFieldId=true`, {
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
    }).then(r => r.json()).then(data => {
      setDepositInvoiced(!!data.fields?.[F.hq_depositInvoiced]);
      setDepositPaid(!!data.fields?.[F.hq_depositPaid]);
    }).catch(() => {});
  }, [quote.id]);
  const hasCustomer = customerAT && customerAT.length > 0;

  // Bulk job creation state
  const [rows, setRows] = useState<JobRow[]>([]);
  const [contracts, setContracts] = useState<ContractEntry[]>([]);
  const [contractModalEdit, setContractModalEdit] = useState<ContractEntry | null | 'new'>(null);
  const [bomModalRowId, setBomModalRowId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creatingProgress, setCreatingProgress] = useState(0);
  const [creatingTotal, setCreatingTotal] = useState(0);
  const [creatingPhase, setCreatingPhase] = useState<'jobs' | 'contracts'>('jobs');
  const [error, setError] = useState('');
  const [showInvalidRows, setShowInvalidRows] = useState(false);
  const [editingAlloc, setEditingAlloc] = useState(false);
  const [editAllocValue, setEditAllocValue] = useState<number | string>('');
  const [attachExpanded, setAttachExpanded] = useState(false);
  const [attachSearch, setAttachSearch] = useState('');
  const [attachResults, setAttachResults] = useState<{ id: string; jobId: string; locationName: string; jobType: string; dateScheduled: string }[]>([]);
  const [attachLoading, setAttachLoading] = useState(false);
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const attachTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [linkedJobDetails, setLinkedJobDetails] = useState<{ id: string; jobId: string; type: string; status: string; dateScheduled: string; location: string }[]>([]);
  const [linkedRefreshKey, setLinkedRefreshKey] = useState(0);

  const fetchLinkedJobDetails = async (jobIds?: string[]) => {
    const ids = jobIds ?? (existingJobs ?? []).map((j: any) => j.id || j);
    if (!ids.length || !AIRTABLE_PAT || AIRTABLE_PAT === 'YOUR_PAT_HERE') { setLinkedJobDetails([]); return; }
    try {
      const formula = `OR(${ids.map((id: string) => `RECORD_ID()='${id}'`).join(',')})`;
      const fields = [F.job_id, F.job_type, F.job_status, F.job_dateScheduled, F.job_location].map(f => `fields[]=${encodeURIComponent(f)}`).join('&');
      const sort = `sort[0][field]=${encodeURIComponent(F.job_dateScheduled)}&sort[0][direction]=desc`;
      const url = `https://api.airtable.com/v0/${base.id}/${jobsTable.id}?returnFieldsByFieldId=true&filterByFormula=${encodeURIComponent(formula)}&${fields}&${sort}`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } });
      if (!resp.ok) { setLinkedJobDetails([]); return; }
      const data = await resp.json();
      setLinkedJobDetails(data.records.map((r: any) => {
        const fl = r.fields;
        const typeVal = fl[F.job_type];
        const statusVal = fl[F.job_status];
        return {
          id: r.id,
          jobId: fl[F.job_id] || r.id.slice(0, 10),
          type: typeof typeVal === 'string' ? typeVal : (typeVal?.name || ''),
          status: typeof statusVal === 'string' ? statusVal : (statusVal?.name || ''),
          dateScheduled: fl[F.job_dateScheduled] || '',
          location: ((fl[F.job_location] as any[] | undefined) ?? []).map((l: any) => {
            const locId = typeof l === 'string' ? l : l.id;
            const locRec = (locations ?? []).find((loc: any) => loc.id === locId);
            return locRec ? (gfStr(locRec, locationsTable, F.loc_id) || locRec.name || locId) : locId;
          }).join(', '),
        };
      }));
    } catch { setLinkedJobDetails([]); }
  };

  useEffect(() => { setLinkedJobDetails([]); fetchLinkedJobDetails(); }, [quote.id, linkedRefreshKey]);

  useEffect(() => {
    setRows([]);
    setContracts([]);
    setContractModalEdit(null);
    setBomModalRowId(null);
    setIsCreating(false);
    setError('');
  }, [quote.id]);

  const defaultService = serviceObj ? (SERVICE_MAP[serviceObj.name || ''] || '') : '';

  const contractDefaults = useMemo((): Partial<ContractData> => {
    const svc = defaultService;
    const salesMap: Record<string, string> = {
      'Digital signage': 'Rattinand Jaruwongwat',
      'Music streaming': 'Vitit Rattanachinchai',
    };
    const salesName = salesMap[svc] || '';
    const salesCollab = salesName ? base.activeCollaborators.find((c: any) => (c.name || '').toLowerCase() === salesName.toLowerCase()) : null;
    const custId = customerAT?.[0]?.id || '';
    const custName = customerAT?.[0]?.name || '';
    return {
      service: svc,
      salesIds: salesCollab ? [salesCollab.id] : [],
      customerId: custId,
      customerDisplay: custName,
      currency: currency || '',
    };
  }, [defaultService, customerAT, base.activeCollaborators, currency]);

  const locationOptions = (locations ?? []).map(loc => ({ id: loc.id, label: gfStr(loc, locationsTable, F.loc_id) || loc.id }));
  const resourceOptions = (resources ?? []).map(res => {
    const name = gfStr(res, resourcesTable, F.res_name);
    const model = gfStr(res, resourcesTable, F.res_model);
    return { id: res.id, label: name || res.id, model: model || name || res.id };
  });
  const partnerOptions = (partners ?? []).map(p => ({ id: p.id, label: gfStr(p, partnersTable, F.ptr_name) || p.id }));
  const customerOptions = (customers ?? []).map(c => ({ id: c.id, label: gfStr(c, customersTable, F.cust_id) || c.id }));
  const collaboratorOptions = base.activeCollaborators.map(c => ({ id: c.id, label: c.name || c.email || c.id, email: c.email, pic: c.profilePicUrl }));
  const collaboratorOptionsSimple = base.activeCollaborators.map(c => ({ id: c.id, label: c.name || c.email || c.id }));

  const handleSetCustomer = async (custId: string) => {
    try {
      await hsQuotesTable.updateRecordAsync(quote.id, { [F.hq_customerAT]: [{ id: custId }] });
    } catch (err) { setError(`Failed to set customer: ${err instanceof Error ? err.message : 'Unknown error'}`); }
  };

  const handleRemoveCustomer = async () => {
    try {
      await hsQuotesTable.updateRecordAsync(quote.id, { [F.hq_customerAT]: [] });
    } catch (err) { setError(`Failed to remove customer: ${err instanceof Error ? err.message : 'Unknown error'}`); }
  };

  const handleSetAllocated = async (n: number) => {
    try {
      await hsQuotesTable.updateRecordAsync(quote.id, { [F.hq_allocatedJobs]: Math.max(1, n) });
    } catch (err) { setError(`Failed to set allocated jobs: ${err instanceof Error ? err.message : 'Unknown error'}`); }
  };

  const handleRemoveAllocated = async () => {
    try {
      await hsQuotesTable.updateRecordAsync(quote.id, { [F.hq_allocatedJobs]: 0 });
    } catch (err) { setError(`Failed to remove allocation: ${err instanceof Error ? err.message : 'Unknown error'}`); }
  };

  const handleToggleExempt = async (value: boolean) => {
    try {
      await hsQuotesTable.updateRecordAsync(quote.id, { [F.hq_exempt]: value });
    } catch (err) { setError(`Failed to update exempt status: ${err instanceof Error ? err.message : 'Unknown error'}`); }
  };

  const handleAttachSearch = (query: string) => {
    setAttachSearch(query);
    if (attachTimerRef.current) clearTimeout(attachTimerRef.current);
    if (!query.trim() || !AIRTABLE_PAT || AIRTABLE_PAT === 'YOUR_PAT_HERE') {
      setAttachResults([]);
      return;
    }
    setAttachLoading(true);
    attachTimerRef.current = setTimeout(async () => {
      try {
        const escaped = query.replace(/"/g, '\\"');
        const formula = `OR(SEARCH(LOWER("${escaped}"),LOWER({${F.job_id}})),SEARCH(LOWER("${escaped}"),LOWER({${F.job_location}})))`;
        const fields = [F.job_id, F.job_location, F.job_type, F.job_dateScheduled].map(f => `fields[]=${encodeURIComponent(f)}`).join('&');
        const sort = `sort[0][field]=${encodeURIComponent(F.job_dateScheduled)}&sort[0][direction]=desc`;
        const maxRecords = customerAT?.[0]?.id ? 50 : 10;
        const url = `https://api.airtable.com/v0/${base.id}/${jobsTable.id}?returnFieldsByFieldId=true&filterByFormula=${encodeURIComponent(formula)}&maxRecords=${maxRecords}&${fields}&${sort}`;
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } });
        if (!resp.ok) { setAttachResults([]); setAttachLoading(false); return; }
        const data = await resp.json();

        const custId = customerAT?.[0]?.id;
        const customerLocIds = custId ? new Set(
          (locations ?? [])
            .filter(loc => {
              const custLink = gfVal(loc, locationsTable, F.loc_customer) as any[] | null;
              return custLink?.some((c: any) => c.id === custId);
            })
            .map(loc => loc.id)
        ) : null;

        const mapped = data.records.map((r: any) => {
          const fl = r.fields;
          const locIds = fl[F.job_location] as any[] | undefined;
          const locNames = (locIds ?? []).map((l: any) => {
            const locRec = (locations ?? []).find((loc: any) => loc.id === (l.id || l));
            return locRec ? (gfStr(locRec, locationsTable, F.loc_id) || locRec.name || l.id || l) : (l.id || l);
          }).join(', ');
          const typeVal = fl[F.job_type];
          return {
            id: r.id,
            jobId: fl[F.job_id] || r.id.slice(0, 10),
            locationName: locNames,
            jobType: typeof typeVal === 'string' ? typeVal : (typeVal?.name || ''),
            dateScheduled: fl[F.job_dateScheduled] || '',
            _locIds: (locIds ?? []).map((l: any) => l.id || l),
          };
        });

        const filtered = customerLocIds
          ? mapped.filter((r: any) => r._locIds.some((id: string) => customerLocIds.has(id))).slice(0, 10)
          : mapped.slice(0, 10);

        setAttachResults(filtered.map(({ _locIds, ...rest }: any) => rest));
      } catch { setAttachResults([]); }
      setAttachLoading(false);
    }, 400);
  };

  const getJobLinkedQuotes = async (jobRecordId: string): Promise<string[]> => {
    const url = `https://api.airtable.com/v0/${base.id}/${jobsTable.id}/${jobRecordId}?returnFieldsByFieldId=true`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } });
    if (!resp.ok) return [];
    const data = await resp.json();
    const linked = data.fields?.[F.job_hsQuotes] as any[] | undefined;
    return (linked ?? []).map((r: any) => typeof r === 'string' ? r : r.id);
  };

  const patchJobQuotes = async (jobRecordId: string, quoteIds: string[]) => {
    const url = `https://api.airtable.com/v0/${base.id}/${jobsTable.id}/${jobRecordId}`;
    const resp = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { [F.job_hsQuotes]: quoteIds } }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }
  };

  const handleAttachQuote = async (jobRecordId: string) => {
    setAttachingId(jobRecordId);
    try {
      const existingIds = await getJobLinkedQuotes(jobRecordId);
      if (existingIds.includes(quote.id)) {
        setAttachingId(null);
        return;
      }
      await patchJobQuotes(jobRecordId, [...existingIds, quote.id]);
      const updatedIds = [...linkedJobDetails.map(j => j.id), jobRecordId];
      await fetchLinkedJobDetails([...new Set(updatedIds)]);
    } catch (err) {
      setError(`Failed to attach quote: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    setAttachingId(null);
  };

  const handleDetachQuote = async (jobRecordId: string) => {
    setAttachingId(jobRecordId);
    try {
      const existingIds = await getJobLinkedQuotes(jobRecordId);
      await patchJobQuotes(jobRecordId, existingIds.filter(id => id !== quote.id));
      const updatedIds = linkedJobDetails.map(j => j.id).filter(id => id !== jobRecordId);
      if (updatedIds.length) { await fetchLinkedJobDetails(updatedIds); } else { setLinkedJobDetails([]); }
    } catch (err) {
      setError(`Failed to detach quote: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    setAttachingId(null);
  };

  const handleSaveContract = (entry: ContractEntry) => {
    setContracts(prev => {
      const idx = prev.findIndex(c => c.id === entry.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = entry;
        return updated;
      }
      return [...prev, entry];
    });
    setContractModalEdit(null);
  };

  const handleDeleteContract = (contractId: string) => {
    setContracts(prev => prev.filter(c => c.id !== contractId));
    setRows(prev => prev.map(r => ({
      ...r,
      bomResources: r.bomResources.map(b => b.contractId === contractId ? { ...b, contractId: undefined } : b),
    })));
  };

  // Bulk table helpers
  const updateRow = (rowId: string, updates: Partial<JobRow>) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, ...updates } : r));
    setShowInvalidRows(false);
  };
  const addRow = () => { if (rows.length < jobsRemaining) setRows([...rows, createEmptyRow()]); };
  const removeRow = (rowId: string) => { setRows(rows.filter(r => r.id !== rowId)); };
  const duplicateRow = (rowId: string) => {
    if (rows.length >= jobsRemaining) return;
    const source = rows.find(r => r.id === rowId);
    if (!source) return;
    const newRow: JobRow = { ...source, id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, bomResources: source.bomResources.map(b => ({ ...b, id: `bom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` })) };
    const idx = rows.findIndex(r => r.id === rowId);
    const updated = [...rows];
    updated.splice(idx + 1, 0, newRow);
    setRows(updated);
  };
  const isBomRequired = (type: string) => type === 'Delivery' || type === 'Installation';
  const getRowErrors = (row: JobRow): string[] => {
    const errors: string[] = [];
    if (!row.locationId) errors.push('Location');
    if (!row.service) errors.push('Service');
    if (!row.partnerId) errors.push('Partner');
    if (!row.type) errors.push('Job Type');
    if (!row.status) errors.push('Status');
    if (row.status !== 'Tentative' && !row.dateScheduled) errors.push('Date');
    if (row.assignedToIds.length === 0) errors.push('Assigned To');
    if (isBomRequired(row.type) && row.bomResources.length === 0) errors.push('BOM');
    return errors;
  };
  const isRowValid = (row: JobRow) => getRowErrors(row).length === 0;
  const validCount = rows.filter(isRowValid).length;
  const allValid = validCount === rows.length;

  const handleCreateAllJobs = async () => {
    if (!allValid) {
      setShowInvalidRows(true);
      setError('All rows must be valid before creating. Please fix the highlighted rows.');
      return;
    }
    if (!AIRTABLE_PAT || AIRTABLE_PAT === 'YOUR_PAT_HERE') {
      setError('Airtable PAT not configured. Update AIRTABLE_PAT in the source code.');
      return;
    }

    setIsCreating(true);
    setError('');
    setCreatingPhase('jobs');
    setCreatingTotal(rows.length);
    setCreatingProgress(0);
    let created = 0;
    const baseId = base.id;

    const contractToBomResourceIds: Record<string, string[]> = {};

    try {
      // Pass 1: Create jobs and BOM resources
      for (const row of rows) {
        let bomId: string | null = null;
        if (row.bomResources.length > 0) {
          bomId = await airtableApiCreate(baseId, bomTable.id, {}, AIRTABLE_PAT);

          const resourceFields = row.bomResources.map((r) => ({
            [F.br_resources]: [r.resourceId],
            [F.br_quantity]: r.quantity,
            [F.br_bom]: [bomId],
          }));
          const bomResourceIds = await airtableApiBatchCreate(baseId, bomResourcesTable.id, resourceFields, AIRTABLE_PAT);

          for (let i = 0; i < row.bomResources.length; i++) {
            const res = row.bomResources[i];
            if (res.contractId && bomResourceIds[i]) {
              if (!contractToBomResourceIds[res.contractId]) contractToBomResourceIds[res.contractId] = [];
              contractToBomResourceIds[res.contractId].push(bomResourceIds[i]);
            }
          }
        }

        const jobFields: Record<string, any> = {
          [F.job_location]: [row.locationId],
          [F.job_service]: row.service,
          [F.job_partner]: [row.partnerId],
          [F.job_type]: row.type,
          [F.job_status]: row.status,
          [F.job_assignedTo]: row.assignedToIds.map((id: string) => ({ id })),
          [F.job_hsQuotes]: [quote.id],
        };
        if (bomId) jobFields[F.job_bom] = [bomId];
        if (row.dateScheduled) jobFields[F.job_dateScheduled] = row.dateScheduled;
        await airtableApiCreate(baseId, jobsTable.id, jobFields, AIRTABLE_PAT);

        created++;
        setCreatingProgress(created);
      }

      // Pass 2: Create contracts linked to all their BOM resources
      const contractsToCreate = contracts.filter(c => contractToBomResourceIds[c.id]?.length > 0);
      if (contractsToCreate.length > 0) {
        setCreatingPhase('contracts');
        setCreatingTotal(contractsToCreate.length);
        setCreatingProgress(0);

        const cTable = base.getTableByIdIfExists('tbl8uHwls1HZbjYun');
        if (cTable) {
          let contractsCreated = 0;
          for (const entry of contractsToCreate) {
            const bomResIds = contractToBomResourceIds[entry.id];
            const cd = entry.data;
            const sdkFields: Record<string, any> = {
              'fldc1tYD5uevsTOCM': cd.salesIds.map((id: string) => ({ id })),
              'fldluLY6LK76MlUag': cd.customerId ? [{ id: cd.customerId }] : undefined,
              'fldcL0yJLU286gNVn': cd.service ? { name: cd.service } : undefined,
              'fldwEzUjsPxtQpHqv': cd.subscriptionTypeId ? [{ id: cd.subscriptionTypeId }] : undefined,
              'fldjYj7fvWC13ajCe': cd.durationFoc ? { name: cd.durationFoc } : undefined,
              'fldtqhlIjfNCObdX6': cd.startDate || undefined,
              'fldAf1ZemSoX2DXef': cd.invoiceFrequency ? { name: cd.invoiceFrequency } : undefined,
              'fldQxf9gFabJi38rZ': cd.unitsStart !== '' ? Number(cd.unitsStart) : undefined,
              'fld5qFaXIl5IMbsTz': cd.unitsCurrent !== '' ? Number(cd.unitsCurrent) : undefined,
              'fldkI8mf1LXCxUiq2': cd.currency ? { name: cd.currency } : undefined,
              'fldW7f4snXRg9MOkR': cd.ppuMonth !== '' ? Number(cd.ppuMonth) : undefined,
              'fldyt9NXnb66VefSx': cd.pplMonth !== '' ? Number(cd.pplMonth) : undefined,
              'fldbBPPVyJBWuLNgM': bomResIds.map(id => ({ id })),
            };
            Object.keys(sdkFields).forEach(k => { if (sdkFields[k] === undefined) delete sdkFields[k]; });
            await cTable.createRecordAsync(sdkFields);
            contractsCreated++;
            setCreatingProgress(contractsCreated);
          }
        }
      }

      setRows([]);
      setContracts([]);
      setShowInvalidRows(false);
    } catch (err) {
      setError(`Failed after creating ${created}/${rows.length} jobs: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '6px 8px',
    fontSize: 12, fontFamily: FONT, border: `1px solid ${D.borderPrimary}`,
    borderRadius: 7, outline: 'none', color: D.textPrimary, background: '#fff',
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'auto' as any };

  const thStyle: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left' as const, fontSize: 10, fontWeight: 600,
    fontFamily: FONT, color: D.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.04em',
  };

  const bomModalRow = bomModalRowId ? rows.find(r => r.id === bomModalRowId) : null;

  const attachBlock = (
    <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${D.borderSubtle}` }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT, color: D.textPrimary, margin: '0 0 12px' }}>Linked jobs</h3>
      {linkedJobDetails.length > 0 && (
        <div style={{ margin: '0 10px 12px' }}>
          <p style={{ fontSize: 11, fontFamily: FONT, color: D.textMuted, margin: '0 0 6px' }}>Attached jobs</p>
          <div style={{ border: `1px solid ${D.borderPrimary}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '28px 110px 2fr 1fr 1fr 90px 52px', gap: '0 8px', fontSize: 10, fontFamily: FONT, fontWeight: 600, color: D.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.04em', padding: '6px 10px', background: D.bgHover, borderBottom: `1px solid ${D.borderPrimary}` }}>
              <span>#</span><span>Job ID</span><span>Location</span><span>Type</span><span>Status</span><span>Scheduled</span><span></span>
            </div>
            {linkedJobDetails.map((j, idx) => {
              const isBusy = attachingId === j.id;
              return (
              <div key={j.id} style={{ display: 'grid', gridTemplateColumns: '28px 110px 2fr 1fr 1fr 90px 52px', gap: '0 8px', padding: '7px 10px', borderBottom: `1px solid ${D.borderSubtle}`, alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontFamily: MONO, color: D.textMuted }}>{idx + 1}</span>
                <span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 500, color: D.green }}>{j.jobId}</span>
                <span style={{ fontSize: 10, fontFamily: FONT, color: D.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{j.location || '—'}</span>
                <div>{j.type ? (() => { const tc = JOB_TYPE_COLORS[j.type] || { bg: '#f5f5f5', color: '#757575' }; return <span style={{ fontSize: 10, fontFamily: FONT, fontWeight: 500, padding: '2px 8px', borderRadius: 10, background: tc.bg, color: tc.color, whiteSpace: 'nowrap' as const, display: 'inline-block' }}>{j.type}</span>; })() : <span style={{ fontSize: 10, color: D.textMuted }}>—</span>}</div>
                <div>{j.status ? (() => { const sc = STATUS_COLORS[j.status] || { bg: '#f5f5f5', color: '#757575' }; return <span style={{ fontSize: 10, fontFamily: FONT, fontWeight: 500, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' as const, display: 'inline-block' }}>{j.status}</span>; })() : <span style={{ fontSize: 10, color: D.textMuted }}>—</span>}</div>
                <span style={{ fontSize: 10, fontFamily: MONO, color: D.textSecondary }}>{j.dateScheduled || '—'}</span>
                <button onClick={() => handleDetachQuote(j.id)} disabled={isBusy}
                  style={{ fontSize: 10, fontFamily: FONT, fontWeight: 500, padding: '3px 8px', borderRadius: 4, border: `1px solid ${D.borderPrimary}`, background: 'white', color: D.textMuted, cursor: isBusy ? 'wait' : 'pointer' }}>
                  {isBusy ? '...' : 'Detach'}
                </button>
              </div>
              );
            })}
          </div>
        </div>
      )}
      <button onClick={() => { setAttachExpanded(!attachExpanded); if (!attachExpanded) { setAttachSearch(''); setAttachResults([]); } }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
          fontSize: 11, fontWeight: 500, fontFamily: FONT, color: D.textMuted,
          background: 'none', border: '1px solid transparent', borderRadius: 6,
          cursor: 'pointer', transition: 'all 0.15s', width: '100%',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = D.blue; e.currentTarget.style.borderColor = D.blue; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = D.textMuted; e.currentTarget.style.borderColor = 'transparent'; }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
        Attach to existing job
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 'auto', transform: attachExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {attachExpanded && (
        <div style={{ marginTop: 10, padding: '0 10px' }}>
          <input type="text" value={attachSearch} onChange={(e) => handleAttachSearch(e.target.value)}
            placeholder="Search by Job ID or location..."
            style={{
              width: '100%', boxSizing: 'border-box', padding: '9px 12px',
              fontSize: 12, fontFamily: FONT, border: `1px solid ${D.borderPrimary}`,
              borderRadius: 7, background: '#fff', outline: 'none', color: D.textPrimary,
            }} />
          {attachLoading && (
            <p style={{ fontSize: 11, fontFamily: FONT, color: D.textMuted, margin: '8px 0 0' }}>Searching...</p>
          )}
          {!attachLoading && attachSearch.trim() && attachResults.length === 0 && (
            <p style={{ fontSize: 11, fontFamily: FONT, color: D.textMuted, margin: '8px 0 0' }}>No jobs found.</p>
          )}
          {attachResults.length > 0 && (
            <div style={{ marginTop: 8, border: `1px solid ${D.borderPrimary}`, borderRadius: 7, overflow: 'hidden' }}>
              {attachResults.map((job) => {
                const isAttached = (existingJobs ?? []).some((j: any) => j.id === job.id);
                const isBusy = attachingId === job.id;
                return (
                  <div key={job.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderBottom: `1px solid ${D.borderSubtle}`,
                    fontSize: 12, fontFamily: FONT,
                    background: isAttached ? D.greenBg : 'transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                      {isAttached && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={D.green} strokeWidth="2.5" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontWeight: 500, color: D.textPrimary, wordBreak: 'break-word' as const }}>
                          {[job.locationName, job.jobType, job.dateScheduled].filter(Boolean).join(' — ') || job.jobId}
                        </span>
                        <div style={{ fontSize: 10, color: D.textMuted, marginTop: 2, fontFamily: MONO }}>{job.jobId}</div>
                      </div>
                    </div>
                    {isAttached ? (
                      <button onClick={() => handleDetachQuote(job.id)} disabled={isBusy}
                        style={{
                          flexShrink: 0, marginLeft: 12, padding: '5px 12px', fontSize: 11, fontWeight: 500,
                          fontFamily: FONT, color: D.redRequired, background: 'transparent',
                          border: `1px solid ${D.redRequired}`, borderRadius: 6, cursor: isBusy ? 'not-allowed' : 'pointer',
                          opacity: isBusy ? 0.5 : 1,
                        }}>
                        {isBusy ? 'Detaching...' : 'Detach'}
                      </button>
                    ) : (
                      <button onClick={() => handleAttachQuote(job.id)} disabled={isBusy}
                        style={{
                          flexShrink: 0, marginLeft: 12, padding: '5px 12px', fontSize: 11, fontWeight: 500,
                          fontFamily: FONT, color: '#fff', background: D.blue,
                          border: 'none', borderRadius: 6, cursor: isBusy ? 'not-allowed' : 'pointer',
                          opacity: isBusy ? 0.5 : 1,
                        }}>
                        {isBusy ? 'Attaching...' : 'Attach'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      flex: 1, borderLeft: `1px solid ${D.borderPrimary}`, background: D.bgSurface,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      animation: 'qs-slideIn 0.2s ease',
    }}>
      {/* ── Header ── */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid #f0f0ee', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 10, fontFamily: MONO, color: D.textMuted }}>{quoteNum}</span>
              <span style={{ fontSize: 10, fontWeight: 600, fontFamily: FONT, padding: '2px 9px', borderRadius: 10, background: stageCfg.bg, color: stageCfg.accent }}>{stageCfg.label}</span>
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT, color: D.textPrimary, margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {quoteTitle || 'Untitled'}
            </h2>
            {deal && <p style={{ fontSize: 12, fontFamily: FONT, color: D.textSecondary, margin: '2px 0 0' }}>{deal}</p>}
            <p style={{ fontSize: 12, fontFamily: FONT, color: D.textMuted, margin: '2px 0 0' }}>{company}{currency ? ` · ${currency}` : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {manualQuoteUrl && (
              <a href={manualQuoteUrl} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                fontSize: 11, fontWeight: 500, fontFamily: FONT, color: D.textSecondary,
                background: '#fff', border: `1px solid ${D.borderPrimary}`, borderRadius: 6,
                textDecoration: 'none', whiteSpace: 'nowrap',
              }}>
                View manually signed quote <IconExternal />
              </a>
            )}
            {publicUrl && (
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                fontSize: 11, fontWeight: 500, fontFamily: FONT, color: D.textSecondary,
                background: '#fff', border: `1px solid ${D.borderPrimary}`, borderRadius: 6,
                textDecoration: 'none', whiteSpace: 'nowrap',
              }}>
                Open quote <IconExternal />
              </a>
            )}
            <button onClick={() => handleToggleExempt(stage !== 'exempt')}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = D.amber; (e.currentTarget as HTMLElement).style.color = D.amber; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = D.borderPrimary; (e.currentTarget as HTMLElement).style.color = D.textMuted; }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                fontSize: 11, fontWeight: 500, fontFamily: FONT, color: D.textMuted,
                background: '#fff', border: `1px solid ${D.borderPrimary}`, borderRadius: 6,
                cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}>
              <IconBan />
              {stage === 'exempt' ? 'Remove exemption' : 'Mark as exempt'}
            </button>
            <button onClick={onClose} style={{
              width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: `1px solid ${D.borderPrimary}`, borderRadius: 6,
              cursor: 'pointer', color: D.textMuted,
            }}>
              <IconClose />
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, flexWrap: 'wrap' }}>
          {types.map((t: any) => (
            <span key={t.name || t} style={{ fontSize: 10, fontWeight: 500, fontFamily: FONT, padding: '3px 8px', borderRadius: 5, background: D.tagNeutralBg, color: D.tagNeutralText }}>
              {t.name || t}
            </span>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 14, height: 14, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: depositInvoiced ? D.green : '#fff', border: `1.5px solid ${depositInvoiced ? D.green : D.borderPrimary}`,
              }}>
                {depositInvoiced && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: 10, fontFamily: FONT, color: D.textMuted }}>Invoiced</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 14, height: 14, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: depositPaid ? D.green : '#fff', border: `1.5px solid ${depositPaid ? D.green : D.borderPrimary}`,
              }}>
                {depositPaid && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: 10, fontFamily: FONT, color: D.textMuted }}>Paid</span>
            </div>
            {allocated != null && allocated > 0 && (<>
              <div style={{ width: 80, height: 4, background: D.borderPrimary, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: D.greenProgress, borderRadius: 2, width: `${Math.min(100, ((opened ?? 0) / allocated) * 100)}%`, transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: 10, fontFamily: MONO, color: D.textFaint }}>{opened ?? 0}/{allocated} jobs</span>
            </>)}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
            <p style={{ fontSize: 12, fontFamily: FONT, color: D.redRequired, margin: 0 }}>{error}</p>
          </div>
        )}

        {/* ═══ Needs Customer ═══ */}
        {stage === 'needs_customer' && (
          <div style={{ animation: 'qs-fadeIn 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <IconUsers />
              <h3 style={{ fontSize: 14, fontWeight: 600, fontFamily: FONT, color: D.textPrimary, margin: 0 }}>Map Customer</h3>
            </div>
            <p style={{ fontSize: 12, fontFamily: FONT, color: D.textMuted, margin: '0 0 14px' }}>
              HubSpot company: <strong style={{ color: D.textPrimary }}>{company}</strong>
            </p>
            <SearchDropdown value="" displayValue="" options={customerOptions}
              onSelect={(id) => handleSetCustomer(id)} placeholder="Search Airtable customers..." icon />
            {attachBlock}

          </div>
        )}

        {/* ═══ Needs Allocation ═══ */}
        {stage === 'needs_allocation' && (
          <div style={{ animation: 'qs-fadeIn 0.2s ease' }}>
            {hasCustomer && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: D.bgHover, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 600, fontFamily: FONT, color: D.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Customer</span>
                  <div style={{ fontSize: 12, fontWeight: 500, fontFamily: FONT, color: D.textPrimary, marginTop: 2 }}>{customerAT![0].name || customerAT![0].id}</div>
                </div>
                <button onClick={handleRemoveCustomer}
                  onMouseEnter={(e) => { const el = e.currentTarget; el.style.color = D.redRequired; el.style.background = D.redHoverBg; }}
                  onMouseLeave={(e) => { const el = e.currentTarget; el.style.color = D.textMuted; el.style.background = 'transparent'; }}
                  style={{ fontSize: 11, fontFamily: FONT, color: D.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 4, transition: 'all 0.15s' }}>
                  Remove
                </button>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <IconGrid />
              <h3 style={{ fontSize: 14, fontWeight: 600, fontFamily: FONT, color: D.textPrimary, margin: 0 }}>How many jobs?</h3>
            </div>
            <p style={{ fontSize: 12, fontFamily: FONT, color: D.textMuted, margin: '0 0 14px' }}>Read the quote and decide how many jobs (locations) this needs.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => handleSetAllocated(n)}
                  onMouseEnter={(e) => { const el = e.currentTarget; el.style.background = D.purpleBg; el.style.borderColor = D.purple; el.style.color = D.purple; }}
                  onMouseLeave={(e) => { const el = e.currentTarget; el.style.background = '#fff'; el.style.borderColor = D.borderPrimary; el.style.color = D.textPrimary; }}
                  style={{
                    width: 40, height: 40, borderRadius: 8, border: `1px solid ${D.borderPrimary}`,
                    background: '#fff', fontSize: 14, fontWeight: 600, fontFamily: FONT,
                    color: D.textPrimary, cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  {n}
                </button>
              ))}
              <div style={{ width: 1, height: 20, background: D.borderPrimary, margin: '0 2px' }} />
              <input type="number" min="1" placeholder="..."
                value={editAllocValue === '' ? '' : editAllocValue}
                onChange={(e) => setEditAllocValue(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                style={{ width: 56, padding: '9px 8px', fontSize: 13, fontFamily: FONT, border: `1px solid ${editAllocValue !== '' ? D.blue : D.borderPrimary}`, borderRadius: 7, background: '#fff', outline: 'none', color: D.textPrimary, textAlign: 'center' as const, transition: 'border-color 0.15s' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = Number(editAllocValue);
                    if (val > 0) { handleSetAllocated(val); setEditAllocValue(''); }
                  }
                }}
              />
              {editAllocValue !== '' && Number(editAllocValue) > 0 && (
                <button onClick={() => { handleSetAllocated(Number(editAllocValue)); setEditAllocValue(''); }}
                  style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: D.greenBg, border: `1px solid ${D.green}`, borderRadius: 7, cursor: 'pointer', padding: 0, transition: 'all 0.15s' }}>
                  <IconCheck size={16} color={D.green} />
                </button>
              )}
            </div>
            {attachBlock}

          </div>
        )}

        {/* ═══ Ready ═══ */}
        {stage === 'ready' && (
          <div style={{ animation: 'qs-fadeIn 0.2s ease' }}>
            {/* Customer + Allocation info */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {hasCustomer && (
                <div style={{ flex: 1, padding: '10px 14px', background: D.bgHover, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 600, fontFamily: FONT, color: D.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Customer</span>
                    <div style={{ fontSize: 12, fontWeight: 500, fontFamily: FONT, color: D.textPrimary, marginTop: 2 }}>{customerAT![0].name || customerAT![0].id}</div>
                  </div>
                  <button onClick={handleRemoveCustomer}
                    onMouseEnter={(e) => { const el = e.currentTarget; el.style.color = D.redRequired; el.style.background = D.redHoverBg; }}
                    onMouseLeave={(e) => { const el = e.currentTarget; el.style.color = D.textMuted; el.style.background = 'transparent'; }}
                    style={{ fontSize: 11, fontFamily: FONT, color: D.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 4, transition: 'all 0.15s' }}>
                    Clear
                  </button>
                </div>
              )}
              {allocated != null && allocated > 0 && (
                <div style={{ flex: 1, padding: '10px 14px', background: D.bgHover, borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, fontFamily: FONT, color: D.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Allocated Jobs</span>
                    <button onClick={handleRemoveAllocated}
                      onMouseEnter={(e) => { const el = e.currentTarget; el.style.color = D.redRequired; el.style.background = D.redHoverBg; }}
                      onMouseLeave={(e) => { const el = e.currentTarget; el.style.color = D.textMuted; el.style.background = 'transparent'; }}
                      style={{ fontSize: 11, fontFamily: FONT, color: D.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 4, transition: 'all 0.15s' }}>
                      Clear
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <input type="number" min="1"
                      value={editingAlloc ? editAllocValue : allocated}
                      onChange={(e) => { setEditingAlloc(true); setEditAllocValue(e.target.value === '' ? '' : parseInt(e.target.value) || 0); }}
                      onFocus={() => { if (!editingAlloc) { setEditingAlloc(true); setEditAllocValue(allocated); } }}
                      style={{ width: 48, padding: '4px 6px', fontSize: 12, fontWeight: 500, fontFamily: MONO, border: `1px solid ${editingAlloc ? D.blue : D.borderPrimary}`, borderRadius: 5, textAlign: 'center' as const, outline: 'none', color: D.textPrimary, background: '#fff' }}
                    />
                    {editingAlloc && (
                      <>
                        <button onClick={() => {
                          const val = Number(editAllocValue);
                          if (val > 0) { handleSetAllocated(val); setEditingAlloc(false); }
                        }}
                          style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: D.greenBg, border: 'none', borderRadius: 4, cursor: 'pointer', color: D.green, padding: 0 }}>
                          <IconCheck size={14} color={D.green} />
                        </button>
                        <button onClick={() => { setEditingAlloc(false); setEditAllocValue(''); }}
                          style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: D.redHoverBg, border: 'none', borderRadius: 4, cursor: 'pointer', color: D.redRequired, padding: 0 }}>
                          <IconClose />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, fontFamily: FONT, color: D.textPrimary, margin: 0 }}>
                {jobsRemaining} job{jobsRemaining !== 1 ? 's' : ''} remaining to be created/attached
              </h3>
              {rows.length > jobsRemaining && (
                <span style={{ fontSize: 11, fontFamily: FONT, color: D.redRequired, fontWeight: 500 }}>
                  {rows.length - jobsRemaining} row{rows.length - jobsRemaining !== 1 ? 's' : ''} over allocation
                </span>
              )}
            </div>
            {attachBlock}

            <div style={{ borderTop: `1px solid ${D.borderPrimary}`, marginTop: 24, marginBottom: 16 }} />

            <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT, color: D.textPrimary, margin: '0 0 12px' }}>Create jobs</h3>

            <ContractPanel
              contracts={contracts}
              onAdd={() => setContractModalEdit('new')}
              onEdit={(c) => setContractModalEdit(c)}
              onDelete={handleDeleteContract}
              allRows={rows}
            />

            {/* Bulk Job Creation Table */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontFamily: FONT, color: D.textMuted, margin: 0 }}>
                Each row becomes a separate job with its own BOM.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, fontFamily: FONT, color: allValid ? D.green : D.textMuted }}>{validCount}/{rows.length} valid</span>
                <button onClick={handleCreateAllJobs} disabled={isCreating || rows.length > jobsRemaining}
                  style={{
                    background: rows.length > jobsRemaining ? D.redRequired : D.green, color: '#ffffff', border: 'none', borderRadius: 7,
                    padding: '8px 16px', fontSize: 12, fontWeight: 500, fontFamily: FONT,
                    cursor: (isCreating || rows.length > jobsRemaining) ? 'not-allowed' : 'pointer',
                    opacity: (isCreating || rows.length > jobsRemaining) ? 0.5 : 1,
                  }}
                  onMouseEnter={(e: any) => { if (!isCreating && rows.length <= jobsRemaining) e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={(e: any) => { e.currentTarget.style.opacity = (isCreating || rows.length > jobsRemaining) ? '0.5' : '1'; }}>
                  {isCreating ? 'Creating...' : rows.length > jobsRemaining ? 'Too many rows' : `Create ${rows.length} Job${rows.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>

            {isCreating && (
              <div style={{ marginBottom: 16, padding: 14, background: D.blueBg, border: `1px solid ${D.blue}`, borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT, color: D.blue }}>
                    {creatingPhase === 'jobs' ? 'Creating jobs' : 'Creating contracts'}... {creatingProgress}/{creatingTotal}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: MONO, color: D.textMuted }}>
                    {creatingTotal > 0 ? Math.round((creatingProgress / creatingTotal) * 100) : 0}%
                  </span>
                </div>
                <div style={{ width: '100%', height: 6, background: D.borderPrimary, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, background: D.blue,
                    width: creatingTotal > 0 ? `${(creatingProgress / creatingTotal) * 100}%` : '0%',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <p style={{ fontSize: 10, fontFamily: FONT, color: D.textMuted, margin: '6px 0 0' }}>
                  Do not close this tab while jobs are being created.
                </p>
              </div>
            )}

            {rows.length === 0 ? (
              <div style={{ border: `1px solid ${D.borderPrimary}`, borderRadius: 8, padding: '32px 24px', textAlign: 'center' as const }}>
                <p style={{ fontSize: 13, fontFamily: FONT, color: D.textMuted, margin: '0 0 12px' }}>No jobs yet. Add a row to start creating jobs.</p>
                <button onClick={addRow} disabled={rows.length >= jobsRemaining}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                    fontSize: 12, fontWeight: 500, fontFamily: FONT, color: '#fff', background: D.blue,
                    border: 'none', borderRadius: 7, cursor: rows.length >= jobsRemaining ? 'not-allowed' : 'pointer',
                    opacity: rows.length >= jobsRemaining ? 0.5 : 1,
                  }}>
                  <IconPlus /> Add row
                </button>
              </div>
            ) : (
            <div style={{ overflowX: 'auto', border: `1px solid ${D.borderPrimary}`, borderRadius: 8 }}>
              <table style={{ width: '100%', minWidth: 1200, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: D.bgPage }}>
                    <th style={{ ...thStyle, width: 32 }}>#</th>
                    <th style={{ ...thStyle, minWidth: 160 }}>Location</th>
                    <th style={{ ...thStyle, minWidth: 140 }}>Service</th>
                    <th style={{ ...thStyle, minWidth: 160 }}>Partner</th>
                    <th style={{ ...thStyle, minWidth: 140 }}>Job Type</th>
                    <th style={{ ...thStyle, minWidth: 120 }}>Status</th>
                    <th style={{ ...thStyle, minWidth: 130 }}>Date</th>
                    <th style={{ ...thStyle, minWidth: 160 }}>Assigned To</th>
                    <th style={{ ...thStyle, minWidth: 140 }}>BOM</th>
                    <th style={{ ...thStyle, width: 72 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const rowErrors = showInvalidRows ? getRowErrors(row) : [];
                    const errSet = new Set(rowErrors);
                    const errBorder = (field: string) => errSet.has(field) ? `2px solid ${D.redRequired}` : undefined;
                    return (
                    <tr key={row.id} style={{ background: rowErrors.length > 0 ? D.redHoverBg : D.bgSurface, borderTop: idx > 0 ? `1px solid ${rowErrors.length > 0 ? D.redRequired : D.borderPrimary}` : undefined }}>
                      <td style={{ padding: '8px 12px', fontSize: 10, fontFamily: FONT, color: D.textFaint, verticalAlign: 'top', paddingTop: 12 }}>{idx + 1}</td>
                      <td style={{ padding: '8px 12px', verticalAlign: 'top', border: errBorder('Location') }}>
                        <SearchDropdown value={row.locationId} displayValue={row.locationDisplay} options={locationOptions}
                          onSelect={(id, label) => updateRow(row.id, { locationId: id, locationDisplay: label })} placeholder="Location..." />
                      </td>
                      <td style={{ padding: '8px 12px', verticalAlign: 'top', border: errBorder('Service') }}>
                        <select value={row.service} onChange={(e) => updateRow(row.id, { service: e.target.value })} style={selectStyle}>
                          <option value="">Select...</option>
                          {SERVICE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '8px 12px', verticalAlign: 'top', border: errBorder('Partner') }}>
                        <SearchDropdown value={row.partnerId} displayValue={row.partnerDisplay} options={partnerOptions}
                          onSelect={(id, label) => updateRow(row.id, { partnerId: id, partnerDisplay: label })} placeholder="Partner..." />
                      </td>
                      <td style={{ padding: '8px 12px', verticalAlign: 'top', border: errBorder('Job Type') }}>
                        <select value={row.type} onChange={(e) => updateRow(row.id, { type: e.target.value })} style={selectStyle}>
                          <option value="">Select...</option>
                          {JOB_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '8px 12px', verticalAlign: 'top', border: errBorder('Status') }}>
                        <select value={row.status} onChange={(e) => updateRow(row.id, { status: e.target.value })} style={selectStyle}>
                          <option value="">Select...</option>
                          {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '8px 12px', verticalAlign: 'top', border: errBorder('Date') }}>
                        <input type="date" value={row.dateScheduled} onChange={(e) => updateRow(row.id, { dateScheduled: e.target.value })} style={inputStyle} />
                      </td>
                      <td style={{ padding: '8px 12px', verticalAlign: 'top', border: errBorder('Assigned To') }}>
                        <AssignedToCell selectedIds={row.assignedToIds} collaboratorOptions={collaboratorOptions}
                          onChange={(ids) => updateRow(row.id, { assignedToIds: ids })} />
                      </td>
                      <td style={{ padding: '8px 12px', verticalAlign: 'top', border: errBorder('BOM') }}>
                        <button onClick={() => setBomModalRowId(row.id)}
                          style={{
                            width: '100%', padding: '6px 8px', fontSize: 12, fontFamily: FONT,
                            borderRadius: 7, cursor: 'pointer',
                            border: `1px solid ${row.bomResources.length > 0 ? D.green : D.borderPrimary}`,
                            background: row.bomResources.length > 0 ? D.greenBg : D.bgSurface,
                            color: row.bomResources.length > 0 ? D.green : D.textMuted,
                            textAlign: 'left' as const,
                          }}
                          onMouseEnter={(e) => { if (row.bomResources.length === 0) e.currentTarget.style.borderColor = D.borderHover; }}
                          onMouseLeave={(e) => { if (row.bomResources.length === 0) e.currentTarget.style.borderColor = D.borderPrimary; }}>
                          {row.bomResources.length > 0
                            ? row.bomResources.map((b) => {
                                const bc = b.contractId ? contracts.find(c => c.id === b.contractId) : null;
                                return (
                                  <div key={b.id} style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span>{b.quantity}x {b.modelName}</span>
                                    {bc && <span style={{ width: 6, height: 6, borderRadius: '50%', background: bc.color, display: 'inline-block', flexShrink: 0 }} />}
                                  </div>
                                );
                              })
                            : 'Edit'}
                        </button>
                      </td>
                      <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => duplicateRow(row.id)} title="Duplicate row"
                            disabled={rows.length >= jobsRemaining}
                            style={{ background: 'none', border: 'none', cursor: rows.length >= jobsRemaining ? 'not-allowed' : 'pointer', color: D.textFaint, padding: 4, opacity: rows.length >= jobsRemaining ? 0.3 : 1 }}
                            onMouseEnter={(e) => { if (rows.length < jobsRemaining) e.currentTarget.style.color = D.blue; }}
                            onMouseLeave={(e) => (e.currentTarget.style.color = D.textFaint)}>
                            <IconCopy />
                          </button>
                          <button onClick={() => removeRow(row.id)} title="Remove row"
                            style={{
                              background: 'none', border: 'none', padding: 4,
                              color: D.textFaint, cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = D.redRequired; }}
                            onMouseLeave={(e) => (e.currentTarget.style.color = D.textFaint)}>
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}

            <button onClick={addRow} disabled={rows.length >= jobsRemaining}
              style={{
                marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none',
                cursor: rows.length >= jobsRemaining ? 'not-allowed' : 'pointer',
                fontSize: 12, fontFamily: FONT, color: rows.length >= jobsRemaining ? D.textDisabled : D.textMuted, padding: 0,
                opacity: rows.length >= jobsRemaining ? 0.5 : 1,
              }}
              onMouseEnter={(e) => { if (rows.length < jobsRemaining) e.currentTarget.style.color = D.textSecondary; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = rows.length >= jobsRemaining ? D.textDisabled : D.textMuted; }}>
              <IconPlus /> Add row {rows.length >= jobsRemaining && `(max ${jobsRemaining})`}
            </button>

            {/* BOM Modal */}
            {bomModalRow && (
              <BOMModal bomResources={bomModalRow.bomResources} resourceOptions={resourceOptions}
                contracts={contracts}
                onSave={(items) => { updateRow(bomModalRowId!, { bomResources: items }); setBomModalRowId(null); }}
                onClose={() => setBomModalRowId(null)}
                onCreateContract={() => setContractModalEdit('new')}
                onEditContract={(c) => setContractModalEdit(c)} />
            )}

            <div style={{ height: 800 }} />

            {/* Contract Edit Modal */}
            {contractModalEdit !== null && (
              <ContractEditModal
                contract={contractModalEdit === 'new' ? null : contractModalEdit}
                onSave={handleSaveContract}
                onClose={() => setContractModalEdit(null)}
                customerOptions={customerOptionsRest}
                subscriptionTypeOptions={subscriptionTypeOptions}
                collaboratorOptions={collaboratorOptionsSimple}
                defaults={contractModalEdit === 'new' ? contractDefaults : undefined} />
            )}

          </div>
        )}

        {/* ═══ Done ═══ */}
        {stage === 'done' && (
          <div style={{ animation: 'qs-fadeIn 0.2s ease' }}>
            <div style={{ textAlign: 'center' as const, padding: '24px 0' }}>
              <div style={{ width: 48, height: 48, background: D.greenBg, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <IconCheck />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, fontFamily: FONT, color: D.textPrimary, margin: '0 0 4px' }}>
                All {allocated} job{(allocated ?? 0) > 1 ? 's' : ''} created
              </h3>
              <p style={{ fontSize: 12, fontFamily: FONT, color: D.textMuted, margin: '0 0 14px' }}>This quote is fully staged.</p>
            </div>

            {allocated != null && allocated > 0 && (
              <div style={{ padding: '10px 14px', background: D.bgHover, borderRadius: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, fontFamily: FONT, color: D.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Allocated Jobs</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <input type="number" min="1"
                    value={editingAlloc ? editAllocValue : allocated}
                    onChange={(e) => { setEditingAlloc(true); setEditAllocValue(e.target.value === '' ? '' : parseInt(e.target.value) || 0); }}
                    onFocus={() => { if (!editingAlloc) { setEditingAlloc(true); setEditAllocValue(allocated); } }}
                    style={{ width: 48, padding: '4px 6px', fontSize: 12, fontWeight: 500, fontFamily: MONO, border: `1px solid ${editingAlloc ? D.blue : D.borderPrimary}`, borderRadius: 5, textAlign: 'center' as const, outline: 'none', color: D.textPrimary, background: '#fff' }}
                  />
                  {editingAlloc && (
                    <>
                      <button onClick={() => {
                        const val = Number(editAllocValue);
                        if (val > 0) { handleSetAllocated(val); setEditingAlloc(false); }
                      }}
                        style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: D.greenBg, border: 'none', borderRadius: 4, cursor: 'pointer', color: D.green, padding: 0 }}>
                        <IconCheck size={14} color={D.green} />
                      </button>
                      <button onClick={() => { setEditingAlloc(false); setEditAllocValue(''); }}
                        style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: D.redHoverBg, border: 'none', borderRadius: 4, cursor: 'pointer', color: D.redRequired, padding: 0 }}>
                        <IconClose />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {attachBlock}

          </div>
        )}

        {/* ═══ Exempt ═══ */}
        {stage === 'exempt' && (
          <div style={{ animation: 'qs-fadeIn 0.2s ease' }}>
            <div style={{ textAlign: 'center' as const, padding: '24px 0' }}>
              <div style={{ width: 48, height: 48, background: D.amberBg, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <IconBan />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, fontFamily: FONT, color: D.textPrimary, margin: '0 0 4px' }}>
                Exempt from staging
              </h3>
              <p style={{ fontSize: 12, fontFamily: FONT, color: D.textMuted, margin: 0 }}>This quote has been marked as exempt and won't appear in the staging workflow.</p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

// ==================== Main App ====================

interface ResolvedTables {
  hsQuotesTable: Table; locationsTable: Table; bomTable: Table;
  bomResourcesTable: Table; jobsTable: Table; resourcesTable: Table;
  customersTable: Table; partnersTable: Table;
}

function QuoteStagingInner({ tables, base }: { tables: ResolvedTables; base: ReturnType<typeof useBase> }): React.ReactElement {
  useDesignSetup();

  const quotes = useRecords(tables.hsQuotesTable);
  const locations = useRecords(tables.locationsTable);
  const resources = useRecords(tables.resourcesTable);
  const customers = useRecords(tables.customersTable);
  const partners = useRecords(tables.partnersTable);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tabStage, setTabStage] = useState<Stage>('needs_customer');
  const [searchQuery, setSearchQuery] = useState('');

  // REST API options for contract creation
  const [customerOptionsRest, setCustomerOptionsRest] = useState<{ id: string; label: string }[]>([]);
  const [subscriptionTypeOptions, setSubscriptionTypeOptions] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    if (!AIRTABLE_PAT || AIRTABLE_PAT === 'YOUR_PAT_HERE') return;
    const baseId = base.id;
    const loadOptions = async (tableId: string, fieldName: string) => {
      const results: { id: string; label: string }[] = [];
      let offset: string | undefined;
      do {
        const url = `https://api.airtable.com/v0/${baseId}/${tableId}?fields[]=${encodeURIComponent(fieldName)}${offset ? `&offset=${offset}` : ''}`;
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } });
        if (!resp.ok) break;
        const data = await resp.json();
        for (const rec of data.records) {
          results.push({ id: rec.id, label: rec.fields[fieldName] || rec.id });
        }
        offset = data.offset;
      } while (offset);
      return results;
    };
    loadOptions('tblBjI9HEpZz8lFmY', 'ID').then(setCustomerOptionsRest);
    loadOptions('tblVD2FwbJEZNYjVv', 'ID').then(setSubscriptionTypeOptions);
  }, [base.id]);

  const selectedQuote = selectedId ? (quotes ?? []).find(q => q.id === selectedId) : null;
  const selectedQuoteStage = selectedQuote ? computeStage(selectedQuote, tables.hsQuotesTable) : null;

  const activeStage: Stage = (selectedQuoteStage && selectedQuoteStage !== 'skip')
    ? selectedQuoteStage as Stage
    : tabStage;

  const stageCounts = useMemo(() => {
    const counts: Record<Stage, number> = { needs_customer: 0, needs_allocation: 0, ready: 0, done: 0, exempt: 0 };
    (quotes ?? []).forEach(q => {
      const s = computeStage(q, tables.hsQuotesTable);
      if (s !== 'skip' && s in counts) counts[s as Stage]++;
    });
    return counts;
  }, [quotes, tables.hsQuotesTable]);

  const filteredQuotes = useMemo(() => {
    let list = (quotes ?? []).filter(q => computeStage(q, tables.hsQuotesTable) === activeStage);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        gfStr(r, tables.hsQuotesTable, F.hq_quoteNumber).toLowerCase().includes(q) ||
        gfStr(r, tables.hsQuotesTable, F.hq_buyerCompanyName).toLowerCase().includes(q) ||
        gfStr(r, tables.hsQuotesTable, F.hq_dealName).toLowerCase().includes(q) ||
        gfStr(r, tables.hsQuotesTable, F.hq_quoteTitle).toLowerCase().includes(q)
      );
    }
    return list;
  }, [quotes, tables.hsQuotesTable, activeStage, searchQuery]);

  const totalCount = useMemo(() => {
    return (quotes ?? []).filter(q => computeStage(q, tables.hsQuotesTable) !== 'skip').length;
  }, [quotes, tables.hsQuotesTable]);

  const stageCfg = STAGES[activeStage];

  const handleTabClick = (stage: Stage) => {
    setTabStage(stage);
    setSelectedId(null);
    setSearchQuery('');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: FONT, color: D.textPrimary }}>

      {/* ── Top Bar ── */}
      <div style={{ background: D.bgSurface, borderBottom: `1px solid ${D.borderPrimary}`, padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: D.textPrimary, margin: 0, letterSpacing: '-0.02em' }}>Quote Staging</h1>
          <span style={{ fontSize: 11, fontWeight: 500, color: D.textMuted, background: D.tagNeutralBg, padding: '3px 10px', borderRadius: 10 }}>
            {totalCount} quotes
          </span>
        </div>
        <div style={{ position: 'relative', width: 220 }}>
          <div style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <IconSearch />
          </div>
          <input type="text" placeholder="Search quotes..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box' as const, padding: '6px 10px 6px 28px',
              fontSize: 12, fontFamily: FONT, border: `1px solid ${D.borderPrimary}`, borderRadius: 7,
              background: D.bgHover, outline: 'none', color: D.textPrimary,
            }}
          />
        </div>
      </div>

      {/* ── Stage Tabs ── */}
      <div style={{ background: D.bgSurface, borderBottom: `1px solid ${D.borderPrimary}`, padding: '0 28px', display: 'flex', gap: 0, flexShrink: 0 }}>
        {STAGE_ORDER.map(s => {
          const cfg = STAGES[s];
          const isActive = s === activeStage;
          return (
            <button key={s} onClick={() => handleTabClick(s)}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = D.textPrimary; }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = D.textMuted; }}
              style={{
                padding: '11px 18px', fontSize: 12, fontWeight: 600, fontFamily: FONT,
                color: isActive ? D.textPrimary : D.textMuted, background: 'none', border: 'none',
                borderBottom: `2px solid ${isActive ? cfg.dot : 'transparent'}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                transition: 'all 0.15s',
              }}>
              <span style={{ width: 7, height: 7, borderRadius: 4, background: cfg.dot, flexShrink: 0 }} />
              {cfg.label}
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 8,
                background: isActive ? cfg.countBg : D.tagNeutralBg,
                color: isActive ? cfg.countColor : D.textMuted,
              }}>
                {stageCounts[s]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

        {/* Quote List */}
        <div style={{
          width: selectedQuote ? 380 : '100%', flexShrink: 0, overflowY: 'auto',
          padding: '20px 0 20px 28px', transition: 'width 0.2s',
        }}>
          {filteredQuotes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 20 }}>
              {filteredQuotes.map(q => {
                const isSelected = q.id === selectedId;
                const qNum = gfStr(q, tables.hsQuotesTable, F.hq_quoteNumber);
                const qTitle = gfStr(q, tables.hsQuotesTable, F.hq_quoteTitle) || 'Untitled';
                const qDeal = gfStr(q, tables.hsQuotesTable, F.hq_dealName);
                const qCompany = gfStr(q, tables.hsQuotesTable, F.hq_buyerCompanyName);
                const qCurrency = gfStr(q, tables.hsQuotesTable, F.hq_currency);
                const qTypes = (gfVal(q, tables.hsQuotesTable, F.hq_quoteType) as any[] | null) ?? [];
                const qAlloc = gfVal(q, tables.hsQuotesTable, F.hq_allocatedJobs) as number | null;
                const qOpened = gfVal(q, tables.hsQuotesTable, F.hq_jobsOpened) as number | null;
                const showProgress = qAlloc != null && qAlloc > 0;

                return (
                  <div key={q.id}
                    onClick={() => setSelectedId(q.id)}
                    onMouseEnter={(e) => { if (!isSelected) { const el = e.currentTarget; el.style.borderColor = D.borderHover; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; } }}
                    onMouseLeave={(e) => { if (!isSelected) { const el = e.currentTarget; el.style.borderColor = D.borderPrimary; el.style.boxShadow = 'none'; } }}
                    style={{
                      padding: '14px 16px', background: isSelected ? stageCfg.bg : D.bgSurface,
                      border: `1px solid ${isSelected ? stageCfg.accent : D.borderPrimary}`,
                      borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
                    }}>
                    {isSelected && (
                      <div style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: '0 2px 2px 0', background: stageCfg.accent }} />
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 600, color: D.textSecondary }}>{qNum || q.id.slice(0, 10)}</span>
                      {showProgress && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 48, height: 4, background: D.borderPrimary, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: D.greenProgress, borderRadius: 2, width: `${Math.min(100, ((qOpened ?? 0) / qAlloc!) * 100)}%` }} />
                          </div>
                          <span style={{ fontSize: 9, fontFamily: MONO, color: D.textFaint }}>{qOpened ?? 0}/{qAlloc}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: D.textPrimary, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
                      {qTitle}
                    </div>
                    {qDeal && (
                      <div style={{ fontSize: 11, color: D.textSecondary, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {qDeal}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: D.textMuted }}>{qCompany}</span>
                      {qCurrency && <>
                        <span style={{ fontSize: 10, color: D.textFaint }}>·</span>
                        <span style={{ fontSize: 10, fontFamily: MONO, color: D.textFaint }}>{qCurrency}</span>
                      </>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                      {qTypes.map((t: any) => (
                        <span key={t.name || t} style={{ fontSize: 9, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: stageCfg.tagBg, color: stageCfg.tagColor }}>
                          {t.name || t}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center' as const }}>
              <p style={{ fontSize: 13, fontFamily: FONT, color: D.textFaint }}>No quotes in this stage.</p>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedQuote && (
          <DetailPanel
            quote={selectedQuote}
            hsQuotesTable={tables.hsQuotesTable}
            locationsTable={tables.locationsTable}
            bomTable={tables.bomTable}
            bomResourcesTable={tables.bomResourcesTable}
            jobsTable={tables.jobsTable}
            resourcesTable={tables.resourcesTable}
            customersTable={tables.customersTable}
            partnersTable={tables.partnersTable}
            base={base}
            locations={locations}
            resources={resources}
            customers={customers}
            partners={partners}
            onClose={() => setSelectedId(null)}
            customerOptionsRest={customerOptionsRest}
            subscriptionTypeOptions={subscriptionTypeOptions}
          />
        )}
      </div>
    </div>
  );
}

// ==================== App Wrapper ====================

function QuoteStagingApp(): React.ReactElement {
  const base = useBase();
  const { customPropertyValueByKey } = useCustomProperties(
    useCallback((b: ReturnType<typeof useBase>) => getCustomProperties(b), [])
  );

  const tables = {
    hsQuotesTable: customPropertyValueByKey.hsQuotesTable as Table | undefined,
    locationsTable: customPropertyValueByKey.locationsTable as Table | undefined,
    bomTable: customPropertyValueByKey.bomTable as Table | undefined,
    bomResourcesTable: customPropertyValueByKey.bomResourcesTable as Table | undefined,
    jobsTable: customPropertyValueByKey.jobsTable as Table | undefined,
    resourcesTable: customPropertyValueByKey.resourcesTable as Table | undefined,
    customersTable: customPropertyValueByKey.customersTable as Table | undefined,
    partnersTable: customPropertyValueByKey.partnersTable as Table | undefined,
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

  return <QuoteStagingInner tables={tables as ResolvedTables} base={base} />;
}

// ==================== Error Boundary ====================

class ErrorBoundary extends React.Component<Record<string, any>, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[QuoteStaging] Crash:', error, info.componentStack);
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

initializeBlock({ interface: () => <ErrorBoundary><QuoteStagingApp /></ErrorBoundary> });
