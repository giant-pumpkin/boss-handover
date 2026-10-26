import React, { useState, useCallback, useEffect, useRef } from 'react';

import {
  initializeBlock,
  useBase,
  useRecords,
  useCustomProperties,
} from '@airtable/blocks/interface/ui';
import { Table } from '@airtable/blocks/interface/models';

// ==================== Design Tokens ====================

const D = {
  bgPage: '#f8f8f7', bgSurface: '#ffffff', bgHover: '#fafaf9',
  borderPrimary: '#e8e8e6', borderSubtle: '#f3f3f1', borderHover: '#d0d0ce',
  textPrimary: '#1a1a1a', textSecondary: '#5c5c5a', textMuted: '#8c8c8a',
  textFaint: '#a3a3a0', textDisabled: '#d4d4d2',
  orange: '#ea580c', orangeBg: '#fff7ed', orangeText: '#c2410c',
  purple: '#7c3aed', purpleBg: '#f5f3ff', purpleText: '#6d28d9',
  green: '#059669', greenBg: '#ecfdf5', greenText: '#047857',
  grayDot: '#9ca3af', grayText: '#6b7280', grayBg: '#f3f4f6',
  blue: '#2563eb', blueBg: '#eff6ff', greenProgress: '#10b981',
  btnPrimary: '#1a1a1a', redRequired: '#ef4444', redHoverBg: '#fef2f2',
  tagNeutralBg: '#f3f3f1', tagNeutralText: '#5c5c5a',
};

const FONT = "'IBM Plex Sans', system-ui, -apple-system, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', monospace";

// ==================== Inline SVG Icons ====================

const IconPlus = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>);
const IconTrash = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>);
const IconCheck = ({ size = 22, color = D.green }: { size?: number; color?: string }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>);
const IconClose = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>);
const IconCopy = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>);
// ==================== Airtable REST API ====================

const AIRTABLE_PAT = 'YOUR_PAT_HERE';

async function airtableApiCreate(
  baseId: string,
  tableId: string,
  fields: Record<string, any>,
  token: string,
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
  baseId: string,
  tableId: string,
  recordFields: Record<string, any>[],
  token: string,
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

// ==================== Font Loading ====================

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
        @keyframes qs-pulse{0%,100%{opacity:1}50%{opacity:0.4}}
      `;
      document.head.appendChild(style);
    }
  }, []);
}

// ==================== Shared types & config ====================

const CONTRACT_SERVICE_OPTIONS = ['Digital signage', 'Music streaming'];
const DURATION_FOC_OPTIONS = ['1', '2', '3', '4', '5', '6', '7'];
const INVOICE_FREQ_OPTIONS = ['Monthly', 'Annually'];
const CURRENCY_OPTIONS = ['THB', 'USD'];

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

const SERVICE_OPTIONS = ['Digital signage', 'Music streaming'];
const JOB_TYPE_OPTIONS = ['Collect', 'Delivery', 'Installation', 'Rework', 'Survey', 'Un-installation', 'Ma - Audit', 'Ma - Preventive', 'Ma - Reactive', 'Account setup', 'Pre-sale'];
const STATUS_OPTIONS = ['Scheduled', 'Tentative'];

function createEmptyRow(): JobRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    locationId: '',
    locationDisplay: '',
    service: '',
    partnerId: '',
    partnerDisplay: '',
    type: '',
    status: '',
    dateScheduled: '',
    assignedToIds: [],
    bomResources: [],
  };
}

function getCustomProperties(base: ReturnType<typeof useBase>) {
  const locationsTable = base.tables.find(t => t.id === 'tbl5Nj3zs3nxKPdEv');
  const bomTable = base.tables.find(t => t.id === 'tblMoXmjtWVO8Wyz7');
  const bomResourcesTable = base.tables.find(t => t.id === 'tblAHbCtXG4w9tzSF');
  const jobsTable = base.tables.find(t => t.id === 'tblwHj9cO37wp1fVx');
  const resourcesTable = base.tables.find(t => t.id === 'tbl6eFWh1yj7wjiGL');
  const partnersTable = base.tables.find(t => t.id === 'tblkK66QqEkfAKb2S');

  return [
    { key: 'locationsTable', label: 'Locations', type: 'table' as const, defaultValue: locationsTable },
    { key: 'bomTable', label: 'BOM', type: 'table' as const, defaultValue: bomTable },
    { key: 'bomResourcesTable', label: 'BOM resources', type: 'table' as const, defaultValue: bomResourcesTable },
    { key: 'jobsTable', label: 'Jobs', type: 'table' as const, defaultValue: jobsTable },
    { key: 'resourcesTable', label: 'Resources', type: 'table' as const, defaultValue: resourcesTable },
    { key: 'partnersTable', label: 'Partners', type: 'table' as const, defaultValue: partnersTable },
  ];
}

interface SharedData {
  base: ReturnType<typeof useBase>;
  locationsTable: Table;
  bomTable: Table;
  bomResourcesTable: Table;
  jobsTable: Table;
  resourcesTable: Table;
  partnersTable: Table;
  locations: any[] | null;
  resources: any[] | null;
  partners: any[] | null;
  customerOptions: { id: string; label: string }[];
  subscriptionTypeOptions: { id: string; label: string }[];
  collaboratorOptions: { id: string; label: string }[];
}

// ==================== Shared styles ====================

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  fontSize: 12,
  fontFamily: FONT,
  border: `1px solid ${D.borderPrimary}`,
  borderRadius: 7,
  background: D.bgSurface,
  color: D.textPrimary,
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'auto' as any,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  fontFamily: FONT,
  color: D.textSecondary,
  marginBottom: 4,
};

const dropdownMenuStyle: React.CSSProperties = {
  position: 'fixed',
  zIndex: 50,
  background: D.bgSurface,
  border: `1px solid ${D.borderPrimary}`,
  borderRadius: 7,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  maxHeight: 192,
  overflowY: 'auto',
};

const dropdownItemStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: 12,
  fontFamily: FONT,
  cursor: 'pointer',
  color: D.textPrimary,
};

const btnPrimaryStyle: React.CSSProperties = {
  background: D.btnPrimary,
  color: '#ffffff',
  border: 'none',
  borderRadius: 7,
  fontSize: 12,
  fontFamily: FONT,
  fontWeight: 500,
  padding: '8px 16px',
  cursor: 'pointer',
};

const btnSecondaryStyle: React.CSSProperties = {
  background: D.bgSurface,
  color: D.textPrimary,
  border: `1px solid ${D.borderPrimary}`,
  borderRadius: 7,
  fontSize: 12,
  fontFamily: FONT,
  fontWeight: 500,
  padding: '8px 16px',
  cursor: 'pointer',
};

// ==================== Reusable components ====================

function SearchDropdown({
  value,
  displayValue,
  options,
  onSelect,
  placeholder,
}: {
  value: string;
  displayValue: string;
  options: { id: string; label: string }[];
  onSelect: (id: string, label: string) => void;
  placeholder: string;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

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
    }
  }, [open]);

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  const boxRef = useRef<HTMLDivElement>(null);

  const updatePosFromBox = () => {
    const el = inputRef.current || boxRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 200) });
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {open ? (
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); updatePosFromBox(); }}
          onFocus={() => { setSearch(''); updatePosFromBox(); }}
          placeholder={placeholder}
          style={inputStyle}
        />
      ) : (
        <div
          ref={boxRef}
          onClick={() => { setSearch(''); setOpen(true); }}
          style={{
            ...inputStyle,
            cursor: 'pointer',
            color: displayValue ? D.textPrimary : D.textMuted,
            wordBreak: 'break-word' as const,
            minHeight: 30,
          }}>
          {displayValue || placeholder}
        </div>
      )}
      {open && (
        <div
          style={{ ...dropdownMenuStyle, top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          {value && (
            <div
              onClick={() => { onSelect('', ''); setOpen(false); setSearch(''); }}
              style={{ ...dropdownItemStyle, color: D.textMuted, fontStyle: 'italic', borderBottom: `1px solid ${D.borderPrimary}` }}
              onMouseEnter={(e) => (e.currentTarget.style.background = D.bgHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = '')}
            >
              Clear selection
            </div>
          )}
          {filtered.map((o) => (
            <div
              key={o.id}
              onClick={() => { onSelect(o.id, o.label); setOpen(false); setSearch(''); }}
              style={{
                ...dropdownItemStyle,
                background: value === o.id ? D.blueBg : undefined,
              }}
              onMouseEnter={(e) => { if (value !== o.id) e.currentTarget.style.background = D.bgHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = value === o.id ? D.blueBg : ''; }}
            >
              {o.label}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ ...dropdownItemStyle, color: D.textMuted, cursor: 'default' }}>No results</div>
          )}
        </div>
      )}
    </div>
  );
}

function AssignedToCell({
  selectedIds,
  collaboratorOptions,
  onChange,
}: {
  selectedIds: string[];
  collaboratorOptions: { id: string; label: string }[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const updatePos = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 180) });
    }
  };

  const available = collaboratorOptions.filter(
    c => !selectedIds.includes(c.id) && c.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
        {selectedIds.map(id => {
          const collab = collaboratorOptions.find(c => c.id === id);
          return (
            <span
              key={id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                padding: '2px 6px',
                background: D.blueBg,
                color: D.blue,
                borderRadius: 5,
                fontSize: 10,
                fontFamily: FONT,
              }}
            >
              {collab?.label || id}
              <button
                type="button"
                onClick={() => onChange(selectedIds.filter(i => i !== id))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: 0,
                  marginLeft: 2,
                  fontSize: 10,
                  fontFamily: FONT,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = D.redRequired)}
                onMouseLeave={(e) => (e.currentTarget.style.color = D.blue)}
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); updatePos(); setOpen(true); }}
        onFocus={() => { updatePos(); setOpen(true); }}
        placeholder={selectedIds.length > 0 ? 'Add more...' : 'Assign...'}
        style={inputStyle}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = D.borderHover)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = D.borderPrimary)}
      />
      {open && (
        <div
          style={{ ...dropdownMenuStyle, top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, maxHeight: 160 }}
        >
          {available.map(c => (
            <div
              key={c.id}
              onClick={() => { onChange([...selectedIds, c.id]); setSearch(''); }}
              style={dropdownItemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = D.bgHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = '')}
            >
              {c.label}
            </div>
          ))}
          {available.length === 0 && (
            <div style={{ ...dropdownItemStyle, color: D.textMuted, cursor: 'default' }}>No results</div>
          )}
        </div>
      )}
    </div>
  );
}

const contractFieldLabel: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: D.textSecondary, fontFamily: FONT, marginBottom: 3 };
const contractInput: React.CSSProperties = { width: '100%', padding: '5px 8px', fontSize: 12, fontFamily: FONT, border: `1px solid ${D.borderPrimary}`, borderRadius: 6, background: D.bgSurface, color: D.textPrimary, outline: 'none', boxSizing: 'border-box' as const };
const contractSelect: React.CSSProperties = { ...contractInput, appearance: 'auto' as const };

function ContractForm({
  contract,
  onChange,
  customerOptions,
  subscriptionTypeOptions,
  collaboratorOptions,
}: {
  contract: ContractData;
  onChange: (c: ContractData) => void;
  customerOptions: { id: string; label: string }[];
  subscriptionTypeOptions: { id: string; label: string }[];
  collaboratorOptions: { id: string; label: string }[];
}) {
  const update = (partial: Partial<ContractData>) => onChange({ ...contract, ...partial });
  return (
    <div style={{ padding: '10px 12px', background: D.purpleBg, borderRadius: 6, border: `1px solid ${D.purple}20` }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div>
          <div style={contractFieldLabel}>Sales</div>
          <select value={contract.salesIds[0] || ''} onChange={(e: any) => update({ salesIds: e.target.value ? [e.target.value] : [] })} style={contractSelect}>
            <option value="">Select...</option>
            {collaboratorOptions.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <div style={contractFieldLabel}>Customer</div>
          <SearchDropdown value={contract.customerId} displayValue={contract.customerDisplay} options={customerOptions}
            onSelect={(id: string, label: string) => update({ customerId: id, customerDisplay: label })} placeholder="Search..." />
        </div>
        <div>
          <div style={contractFieldLabel}>Service</div>
          <select value={contract.service} onChange={(e: any) => update({ service: e.target.value })} style={contractSelect}>
            <option value="">Select...</option>
            {CONTRACT_SERVICE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={contractFieldLabel}>Subscription type</div>
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
          <div style={contractFieldLabel}>Start date</div>
          <input type="date" value={contract.startDate} onChange={(e: any) => update({ startDate: e.target.value })} style={contractInput} />
        </div>
        <div>
          <div style={contractFieldLabel}>Invoice frequency</div>
          <select value={contract.invoiceFrequency} onChange={(e: any) => update({ invoiceFrequency: e.target.value })} style={contractSelect}>
            <option value="">Select...</option>
            {INVOICE_FREQ_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <div style={contractFieldLabel}>Units - Start</div>
          <input type="number" min="0" value={contract.unitsStart} onChange={(e: any) => update({ unitsStart: e.target.value === '' ? '' : Number(e.target.value) })} style={contractInput} />
        </div>
        <div>
          <div style={contractFieldLabel}>Units - Current</div>
          <input type="number" min="0" value={contract.unitsCurrent} onChange={(e: any) => update({ unitsCurrent: e.target.value === '' ? '' : Number(e.target.value) })} style={contractInput} />
        </div>
        <div>
          <div style={contractFieldLabel}>Currency</div>
          <select value={contract.currency} onChange={(e: any) => update({ currency: e.target.value })} style={contractSelect}>
            <option value="">Select...</option>
            {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div style={contractFieldLabel}>PPU/month</div>
          <input type="number" min="0" step="0.01" value={contract.ppuMonth} onChange={(e: any) => update({ ppuMonth: e.target.value === '' ? '' : Number(e.target.value) })} style={contractInput} />
        </div>
        <div>
          <div style={contractFieldLabel}>PPL/month</div>
          <input type="number" min="0" step="0.01" value={contract.pplMonth} onChange={(e: any) => update({ pplMonth: e.target.value === '' ? '' : Number(e.target.value) })} style={contractInput} />
        </div>
      </div>
    </div>
  );
}

// --- Contract Edit Modal ---
function ContractEditModal({
  contract,
  onSave,
  onClose,
  customerOptions,
  subscriptionTypeOptions,
  collaboratorOptions,
}: {
  contract: ContractEntry | null;
  onSave: (c: ContractEntry) => void;
  onClose: () => void;
  customerOptions: { id: string; label: string }[];
  subscriptionTypeOptions: { id: string; label: string }[];
  collaboratorOptions: { id: string; label: string }[];
}) {
  const isNew = !contract;
  const [label, setLabel] = useState(contract?.label || '');
  const [color, setColor] = useState(contract?.color || CONTRACT_COLORS[0]);
  const [data, setData] = useState<ContractData>(contract?.data || emptyContract());

  const handleSave = () => {
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
            <input
              type="text" value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. HQ Digital Signage" style={contractInput} autoFocus
            />
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
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <ContractForm contract={data} onChange={setData}
          customerOptions={customerOptions} subscriptionTypeOptions={subscriptionTypeOptions} collaboratorOptions={collaboratorOptions} />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={btnSecondaryStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = D.bgHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = D.bgSurface)}
          >Cancel</button>
          <button onClick={handleSave} style={btnPrimaryStyle}>{isNew ? 'Create' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

// --- Contract Panel (collapsible, above job table) ---
function ContractPanel({
  contracts, onAdd, onEdit, onDelete, bomResources,
}: {
  contracts: ContractEntry[];
  onAdd: () => void;
  onEdit: (c: ContractEntry) => void;
  onDelete: (id: string) => void;
  bomResources: BOMResourceItem[];
}) {
  const [collapsed, setCollapsed] = useState(false);

  const getAssignedCount = (contractId: string) => {
    let count = 0;
    for (const res of bomResources) {
      if (res.contractId === contractId) count++;
    }
    return count;
  };

  return (
    <div style={{ background: D.bgSurface, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '12px 16px', marginBottom: 16 }}>
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
          onMouseEnter={(e) => (e.currentTarget.style.background = D.purpleBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
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
                  <div style={{ fontSize: 12, fontFamily: FONT, fontWeight: 500, color: D.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</div>
                  <div style={{ fontSize: 10, fontFamily: FONT, color: D.textMuted }}>{c.data.service || 'No service'} · {count} resource{count !== 1 ? 's' : ''}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = D.redRequired)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = D.textFaint)}
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
          {contracts.map(c => <div key={c.id} style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />)}
        </div>
      )}
    </div>
  );
}

// --- BOM editor modal with contract drag-and-drop ---
function BOMModal({
  bomResources,
  resourceOptions,
  contracts,
  onSave,
  onClose,
  onCreateContract,
  onEditContract,
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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)',
    }}>
      <div style={{
        background: D.bgSurface, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        width: '100%', maxWidth: 720, maxHeight: '90vh', margin: '0 16px', padding: 20,
        fontFamily: FONT, overflow: 'auto',
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
                <div key={c.id} draggable onDragStart={(e) => handleDragStart(e, c.id)}
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
              onSelect={(id, label) => { setNewResourceId(id); setNewResourceDisplay(label); }} placeholder="Search resource..." />
          </div>
          <input type="number" min="1" value={newQty}
            onChange={(e) => { const val = e.target.value; setNewQty(val === '' ? '' : parseInt(val) || 0); }}
            style={{ ...inputStyle, width: 80 }} placeholder="Qty" />
          <button onClick={handleAdd} disabled={!newResourceId || !newQty || Number(newQty) < 1}
            style={{
              ...btnPrimaryStyle, padding: '6px 10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: (!newResourceId || !newQty || Number(newQty) < 1) ? 0.5 : 1,
              cursor: (!newResourceId || !newQty || Number(newQty) < 1) ? 'not-allowed' : 'pointer',
            }}>
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
                    <span style={{ fontSize: 12, fontFamily: MONO, color: D.textMuted, minWidth: 40, textAlign: 'center' }}>×{item.quantity}</span>

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
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = D.redRequired)}
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
          <button onClick={onClose} style={btnSecondaryStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = D.bgHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = D.bgSurface)}
          >Cancel</button>
          <button onClick={() => onSave(items)} disabled={items.length === 0}
            style={{ ...btnPrimaryStyle, opacity: items.length === 0 ? 0.5 : 1, cursor: items.length === 0 ? 'not-allowed' : 'pointer' }}
          >Save ({items.length})</button>
        </div>
      </div>
    </div>
  );
}

function SuccessScreen({ count, onReset }: { count: number; onReset: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 0' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 64, height: 64, background: D.greenBg, borderRadius: '50%', marginBottom: 16,
      }}>
        <IconCheck size={32} color={D.green} />
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 600, fontFamily: FONT, color: D.textPrimary, marginBottom: 8 }}>
        {count === 1 ? 'Job Created Successfully!' : `${count} Jobs Created Successfully!`}
      </h2>
      <p style={{ fontSize: 12, fontFamily: FONT, color: D.textMuted, marginBottom: 24 }}>
        {count === 1
          ? 'The job has been created with the associated location and BOM.'
          : `All ${count} jobs have been created with their associated locations and BOMs.`}
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button
          onClick={onReset}
          style={btnPrimaryStyle}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          {count === 1 ? 'Create Another Job' : 'Create More Jobs'}
        </button>
        <button
          onClick={() => {
            window.top!.location.href = 'https://airtable.com/appdo1WwONYvmYMWg/pagFBlunCBy8Vhhub?HI5v2=sfs8g8LIDGLNbBKUq';
          }}
          style={btnSecondaryStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = D.bgHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = D.bgSurface)}
        >
          Go to Deployment
        </button>
      </div>
    </div>
  );
}

// ==================== Single Job Tab ====================

function SingleJobTab({ data }: { data: SharedData }) {
  const { base, locationsTable, bomTable, bomResourcesTable, jobsTable, resourcesTable, partnersTable, locations, resources, partners, customerOptions, subscriptionTypeOptions, collaboratorOptions } = data;

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [bomResources, setBomResources] = useState<BOMResourceItem[]>([]);
  const [newResourceId, setNewResourceId] = useState('');
  const [newResourceQuantity, setNewResourceQuantity] = useState<number | string>(1);

  const [jobService, setJobService] = useState('');
  const [jobPartnerId, setJobPartnerId] = useState('');
  const [jobType, setJobType] = useState('');
  const [jobStatus, setJobStatus] = useState('');
  const [jobDateScheduled, setJobDateScheduled] = useState('');
  const [jobAssignedToIds, setJobAssignedToIds] = useState<string[]>([]);
  const [assignedToSearch, setAssignedToSearch] = useState('');
  const [showAssignedToDropdown, setShowAssignedToDropdown] = useState(false);

  const [locationSearch, setLocationSearch] = useState('');
  const [resourceSearch, setResourceSearch] = useState('');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showResourceDropdown, setShowResourceDropdown] = useState(false);
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);

  const [contracts, setContracts] = useState<ContractEntry[]>([]);
  const [contractModalEdit, setContractModalEdit] = useState<ContractEntry | null | 'new'>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const resourceDropdownRef = useRef<HTMLDivElement>(null);
  const partnerDropdownRef = useRef<HTMLDivElement>(null);
  const assignedToDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) setShowLocationDropdown(false);
      if (resourceDropdownRef.current && !resourceDropdownRef.current.contains(e.target as Node)) setShowResourceDropdown(false);
      if (partnerDropdownRef.current && !partnerDropdownRef.current.contains(e.target as Node)) setShowPartnerDropdown(false);
      if (assignedToDropdownRef.current && !assignedToDropdownRef.current.contains(e.target as Node)) setShowAssignedToDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddBomResource = () => {
    if (!newResourceId || !newResourceQuantity || newResourceQuantity < 1) return;
    const resource = resources?.find(r => r.id === newResourceId);
    if (!resource) return;
    const nameField = resourcesTable.getFieldIfExists('fld736xl5W3Mahu9I');
    const modelField = resourcesTable.getFieldIfExists('fldJZ1YhZgDDU9Fw2');
    const resourceName = nameField ? (resource.getCellValueAsString(nameField) || 'Unknown Resource') : 'Unknown Resource';
    const modelName = modelField ? (resource.getCellValueAsString(modelField) || resourceName) : resourceName;
    setBomResources([...bomResources, { id: `temp-${Date.now()}`, resourceId: newResourceId, resourceName, modelName, quantity: Number(newResourceQuantity) }]);
    setNewResourceId('');
    setNewResourceQuantity(1);
    setResourceSearch('');
  };

  const handleCreateJob = async () => {
    if (!jobService || !jobPartnerId || !jobType || !jobStatus || jobAssignedToIds.length === 0) { setError('Please fill in all required job fields'); return; }
    if (jobStatus !== 'Tentative' && !jobDateScheduled) { setError('Please fill in the scheduled date'); return; }
    if (!selectedLocationId) { setError('Please select a location first'); return; }
    const bomRequired = jobType === 'Delivery' || jobType === 'Installation';
    if (bomRequired && bomResources.length === 0) { setError('Please add at least one BOM resource'); return; }

    if (!AIRTABLE_PAT || AIRTABLE_PAT === 'YOUR_PAT_HERE') { setError('Airtable PAT not configured.'); return; }
    setIsCreating(true);
    setError('');
    const baseId = base.id;

    const contractToBomResourceIds: Record<string, string[]> = {};

    try {
      let bomId: string | null = null;
      if (bomResources.length > 0) {
        bomId = await airtableApiCreate(baseId, bomTable.id, {}, AIRTABLE_PAT);

        const resourceFields = bomResources.map((r) => ({
          'fldJWgcTlCdXLJca0': [r.resourceId],
          'fldX9nW8yWPagrPTt': r.quantity,
          'fldUq5csjuSb50Ay1': [bomId],
        }));
        const bomResourceIds = await airtableApiBatchCreate(baseId, bomResourcesTable.id, resourceFields, AIRTABLE_PAT);

        for (let i = 0; i < bomResources.length; i++) {
          const res = bomResources[i];
          if (res.contractId && bomResourceIds[i]) {
            if (!contractToBomResourceIds[res.contractId]) contractToBomResourceIds[res.contractId] = [];
            contractToBomResourceIds[res.contractId].push(bomResourceIds[i]);
          }
        }
      }

      const jobFields: Record<string, any> = {
        'flddTDwVWOq7fc1Je': [selectedLocationId],
        'fldexkzrV3Z1z270B': jobService,
        'fldw2W2UmvTJiIuSY': [jobPartnerId],
        'fldk5E1PkIy1ZrM1e': jobType,
        'fld7q5wjIg47nltes': jobStatus,
        'fld19en5UMabiUnqG': jobDateScheduled,
        'fld9PbrU1Lw8IvCzy': jobAssignedToIds.map((id: string) => ({ id })),
      };
      if (bomId) jobFields['fldMsBGHYoDkBxvBM'] = [bomId];
      await airtableApiCreate(baseId, jobsTable.id, jobFields, AIRTABLE_PAT);

      // Pass 2: Create contracts linked to all their BOM resources
      const contractsToCreate = contracts.filter(c => contractToBomResourceIds[c.id]?.length > 0);
      if (contractsToCreate.length > 0) {
        const cTable = base.getTableByIdIfExists('tbl8uHwls1HZbjYun');
        if (cTable) {
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
          }
        }
      }

      setCurrentStep(4);
    } catch (err) {
      setError(`Failed to create job: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(1); setSelectedLocationId(''); setBomResources([]); setNewResourceId(''); setNewResourceQuantity(1);
    setJobService(''); setJobPartnerId(''); setJobType(''); setJobStatus(''); setJobDateScheduled('');
    setJobAssignedToIds([]); setAssignedToSearch(''); setLocationSearch(''); setResourceSearch(''); setPartnerSearch('');
    setShowLocationDropdown(false); setShowResourceDropdown(false); setShowPartnerDropdown(false); setShowAssignedToDropdown(false);
    setContracts([]); setContractModalEdit(null); setError('');
  };

  const handleDeleteContract = (contractId: string) => {
    setContracts(contracts.filter(c => c.id !== contractId));
    setBomResources(bomResources.map(r => r.contractId === contractId ? { ...r, contractId: undefined } : r));
  };

  const [dragOverResId, setDragOverResId] = useState<string | null>(null);
  const [assignModeContractId, setAssignModeContractId] = useState<string | null>(null);

  if (currentStep === 4) {
    return <SuccessScreen count={1} onReset={handleReset} />;
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32, gap: 8 }}>
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 40, height: 40, borderRadius: '50%',
              fontWeight: 500, fontSize: 12, fontFamily: FONT,
              background: currentStep > step ? D.green : currentStep === step ? D.blue : D.borderPrimary,
              color: currentStep > step || currentStep === step ? '#ffffff' : D.textMuted,
            }}>
              {currentStep > step ? <IconCheck size={20} color="#ffffff" /> : step}
            </div>
            {step < 3 && <div style={{ height: 4, width: 48, borderRadius: 2, background: currentStep > step ? D.green : D.borderPrimary }} />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div style={{ marginBottom: 24, padding: 16, background: D.redHoverBg, border: `1px solid ${D.redRequired}`, borderRadius: 8 }}>
          <p style={{ fontSize: 12, fontFamily: FONT, color: D.redRequired, margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Step 1: Location */}
      {currentStep === 1 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 8, background: D.blueBg, borderRadius: 8 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={D.blue} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, fontFamily: FONT, color: D.textPrimary, margin: 0 }}>Step 1: Select Location</h2>
              <p style={{ fontSize: 12, fontFamily: FONT, color: D.textMuted, margin: '2px 0 0' }}>Choose an existing location</p>
            </div>
          </div>
          <div>
            <div style={{ position: 'relative' }} ref={locationDropdownRef}>
              <label style={labelStyle}>Select Existing Location</label>
              <input type="text" value={locationSearch}
                onChange={(e) => { setLocationSearch(e.target.value); setShowLocationDropdown(true); }}
                onFocus={() => setShowLocationDropdown(true)}
                placeholder="Search for a location..."
                style={{ ...inputStyle, padding: '8px 12px' }}
              />
              {showLocationDropdown && (
                <div style={{
                  position: 'absolute', zIndex: 10, width: '100%', marginTop: 4,
                  background: D.bgSurface, border: `1px solid ${D.borderPrimary}`,
                  borderRadius: 7, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  maxHeight: 240, overflowY: 'auto',
                }}>
                  {locations?.filter((location) => {
                    const idField = locationsTable.getFieldIfExists('fldH1vrhUnKiwwpCA');
                    const displayId = idField ? location.getCellValueAsString(idField) : location.id;
                    return displayId.toLowerCase().includes(locationSearch.toLowerCase());
                  }).map((location) => {
                    const idField = locationsTable.getFieldIfExists('fldH1vrhUnKiwwpCA');
                    const displayId = idField ? location.getCellValueAsString(idField) : location.id;
                    return (
                      <div key={location.id}
                        onClick={() => { setSelectedLocationId(location.id); setLocationSearch(displayId || location.id); setShowLocationDropdown(false); }}
                        style={{
                          padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontFamily: FONT, color: D.textPrimary,
                          background: selectedLocationId === location.id ? D.blueBg : undefined,
                        }}
                        onMouseEnter={(e) => { if (selectedLocationId !== location.id) e.currentTarget.style.background = D.bgHover; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = selectedLocationId === location.id ? D.blueBg : ''; }}
                      >{displayId || location.id}</div>
                    );
                  })}
                  {locations?.filter((location) => {
                    const idField = locationsTable.getFieldIfExists('fldH1vrhUnKiwwpCA');
                    const displayId = idField ? location.getCellValueAsString(idField) : location.id;
                    return displayId.toLowerCase().includes(locationSearch.toLowerCase());
                  }).length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, fontFamily: FONT, color: D.textMuted }}>No locations found</div>}
                </div>
              )}
              {selectedLocationId && <div style={{ marginTop: 8, fontSize: 12, fontFamily: FONT, color: D.green }}>Selected: {locationSearch}</div>}
            </div>
            {selectedLocationId && (
              <button
                onClick={() => setCurrentStep(2)}
                style={{ ...btnPrimaryStyle, width: '100%', marginTop: 16, padding: '8px 12px' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Continue to Job Details
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: BOM */}
      {currentStep === 3 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 8, background: D.purpleBg, borderRadius: 8 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={D.purple} strokeWidth="2"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, fontFamily: FONT, color: D.textPrimary, margin: 0 }}>Step 3: Create BOM{jobType !== 'Delivery' && jobType !== 'Installation' ? ' (Optional)' : ''}</h2>
              <p style={{ fontSize: 12, fontFamily: FONT, color: D.textMuted, margin: '2px 0 0' }}>
                {jobType !== 'Delivery' && jobType !== 'Installation'
                  ? 'Optionally add resources to the Bill of Materials'
                  : 'Add resources to the Bill of Materials'}
              </p>
            </div>
          </div>

          {/* Contract Panel */}
          <ContractPanel contracts={contracts} onAdd={() => setContractModalEdit('new')}
            onEdit={(c) => setContractModalEdit(c)} onDelete={handleDeleteContract} bomResources={bomResources} />

          <div style={{ background: D.bgPage, borderRadius: 8, padding: 16, border: `1px solid ${D.borderPrimary}` }}>
            <h3 style={{ fontSize: 12, fontWeight: 500, fontFamily: FONT, color: D.textSecondary, marginBottom: 12, marginTop: 0 }}>Add BOM Resource</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, position: 'relative' }} ref={resourceDropdownRef}>
                <input type="text" value={resourceSearch}
                  onChange={(e) => { setResourceSearch(e.target.value); setShowResourceDropdown(true); setNewResourceId(''); }}
                  onFocus={() => setShowResourceDropdown(true)}
                  placeholder="Search for a resource..."
                  style={{ ...inputStyle, padding: '8px 12px' }}
                />
                {showResourceDropdown && (
                  <div style={{
                    position: 'absolute', zIndex: 10, width: '100%', marginTop: 4,
                    background: D.bgSurface, border: `1px solid ${D.borderPrimary}`,
                    borderRadius: 7, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    maxHeight: 240, overflowY: 'auto',
                  }}>
                    {resources?.filter((resource) => {
                      const nameField = resourcesTable.getFieldIfExists('fld736xl5W3Mahu9I');
                      const name = nameField ? resource.getCellValueAsString(nameField) : resource.id;
                      return name.toLowerCase().includes(resourceSearch.toLowerCase());
                    }).map((resource) => {
                      const nameField = resourcesTable.getFieldIfExists('fld736xl5W3Mahu9I');
                      const name = nameField ? resource.getCellValueAsString(nameField) : resource.id;
                      return (
                        <div key={resource.id}
                          onClick={() => { setNewResourceId(resource.id); setResourceSearch(name || resource.id); setShowResourceDropdown(false); }}
                          style={{
                            padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontFamily: FONT, color: D.textPrimary,
                            background: newResourceId === resource.id ? D.blueBg : undefined,
                          }}
                          onMouseEnter={(e) => { if (newResourceId !== resource.id) e.currentTarget.style.background = D.bgHover; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = newResourceId === resource.id ? D.blueBg : ''; }}
                        >{name || resource.id}</div>
                      );
                    })}
                    {resources?.filter((resource) => {
                      const nameField = resourcesTable.getFieldIfExists('fld736xl5W3Mahu9I');
                      const name = nameField ? resource.getCellValueAsString(nameField) : resource.id;
                      return name.toLowerCase().includes(resourceSearch.toLowerCase());
                    }).length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, fontFamily: FONT, color: D.textMuted }}>No resources found</div>}
                  </div>
                )}
              </div>
              <div style={{ width: 96 }}>
                <input type="number" min="1" value={newResourceQuantity}
                  onChange={(e) => { const val = e.target.value; setNewResourceQuantity(val === '' ? '' : parseInt(val) || 0); }}
                  style={{ ...inputStyle, padding: '8px 12px' }}
                  placeholder="Qty"
                />
              </div>
              <button onClick={handleAddBomResource} disabled={!newResourceId || !newResourceQuantity || newResourceQuantity < 1}
                style={{
                  ...btnPrimaryStyle, padding: '6px 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: (!newResourceId || !newResourceQuantity || newResourceQuantity < 1) ? 0.5 : 1,
                  cursor: (!newResourceId || !newResourceQuantity || newResourceQuantity < 1) ? 'not-allowed' : 'pointer',
                }}>
                <IconPlus />
              </button>
            </div>
          </div>

          {/* Contract shelf for drag-and-drop */}
          {bomResources.length > 0 && contracts.length > 0 && (
            <div style={{
              padding: '10px 12px', background: D.purpleBg, borderRadius: 7,
              border: `1px solid ${D.purple}15`, marginTop: 12,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, fontFamily: FONT, color: D.purple, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                Drag contracts onto resources below {assignModeContractId && '(click mode active)'}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {contracts.map(c => (
                  <div key={c.id} draggable
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'link'; }}
                    onClick={() => setAssignModeContractId(assignModeContractId === c.id ? null : c.id)}
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
              </div>
            </div>
          )}

          {bomResources.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {bomResources.map((item) => {
                const assignedContract = item.contractId ? contracts.find(c => c.id === item.contractId) : null;
                const isDragOver = dragOverResId === item.id;
                return (
                  <div key={item.id}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'link'; setDragOverResId(item.id); }}
                    onDragLeave={() => setDragOverResId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const contractId = e.dataTransfer.getData('text/plain');
                      if (contractId && contracts.find(c => c.id === contractId)) {
                        setBomResources(bomResources.map(r => r.id === item.id ? { ...r, contractId } : r));
                      }
                      setDragOverResId(null);
                    }}
                    onClick={() => {
                      if (assignModeContractId) {
                        setBomResources(bomResources.map(r => r.id === item.id ? { ...r, contractId: assignModeContractId } : r));
                        setAssignModeContractId(null);
                      }
                    }}
                    style={{
                      border: `1.5px solid ${isDragOver ? D.purple : D.borderPrimary}`,
                      borderRadius: 7, marginBottom: 8, overflow: 'hidden',
                      background: isDragOver ? D.purpleBg : 'transparent',
                      transition: 'border-color 0.15s, background 0.15s',
                      cursor: assignModeContractId ? 'pointer' : 'default',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: isDragOver ? D.purpleBg : D.bgPage, padding: '8px 12px', gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 12, fontFamily: FONT, color: D.textPrimary, fontWeight: 500 }}>{item.resourceName}</span>
                      <span style={{ fontSize: 12, fontFamily: MONO, color: D.textMuted, minWidth: 40, textAlign: 'center' }}>×{item.quantity}</span>

                      {assignedContract ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                          borderRadius: 10, background: `${assignedContract.color}15`,
                          border: `1px solid ${assignedContract.color}30`, fontSize: 10, fontFamily: FONT,
                          color: assignedContract.color, fontWeight: 500,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: assignedContract.color }} />
                          {assignedContract.label}
                          <button onClick={(e) => { e.stopPropagation(); setBomResources(bomResources.map(r => r.id === item.id ? { ...r, contractId: undefined } : r)); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: assignedContract.color, padding: 0, marginLeft: 2, fontSize: 12, lineHeight: 1 }}>
                            ×
                          </button>
                        </span>
                      ) : (
                        <span style={{ padding: '2px 8px', borderRadius: 10, border: `1px dashed ${D.borderHover}`, fontSize: 10, fontFamily: FONT, color: D.textFaint }}>
                          {isDragOver ? 'Drop here' : 'No contract'}
                        </span>
                      )}

                      <button onClick={(e) => { e.stopPropagation(); setBomResources(bomResources.filter(r => r.id !== item.id)); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.redRequired, padding: 4 }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, paddingTop: 16, marginTop: 8 }}>
            <button
              onClick={() => setCurrentStep(2)}
              style={{ ...btnSecondaryStyle, flex: 1 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = D.bgHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = D.bgSurface)}
            >Back</button>
            <button onClick={handleCreateJob} disabled={isCreating || ((jobType === 'Delivery' || jobType === 'Installation') && bomResources.length === 0)}
              style={{
                ...btnPrimaryStyle, flex: 1,
                opacity: (isCreating || ((jobType === 'Delivery' || jobType === 'Installation') && bomResources.length === 0)) ? 0.5 : 1,
                cursor: (isCreating || ((jobType === 'Delivery' || jobType === 'Installation') && bomResources.length === 0)) ? 'not-allowed' : 'pointer',
              }}>
              {isCreating ? 'Creating...' : 'Create Job'}
            </button>
          </div>

          {contractModalEdit && (
            <ContractEditModal
              contract={contractModalEdit === 'new' ? null : contractModalEdit}
              onSave={(entry) => {
                setContracts(prev => {
                  const idx = prev.findIndex(c => c.id === entry.id);
                  return idx >= 0 ? prev.map(c => c.id === entry.id ? entry : c) : [...prev, entry];
                });
                setContractModalEdit(null);
              }}
              onClose={() => setContractModalEdit(null)}
              customerOptions={customerOptions}
              subscriptionTypeOptions={subscriptionTypeOptions}
              collaboratorOptions={collaboratorOptions}
            />
          )}
        </div>
      )}

      {/* Step 2: Job Details */}
      {currentStep === 2 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 8, background: D.greenBg, borderRadius: 8 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={D.green} strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, fontFamily: FONT, color: D.textPrimary, margin: 0 }}>Step 2: Job Details</h2>
              <p style={{ fontSize: 12, fontFamily: FONT, color: D.textMuted, margin: '2px 0 0' }}>Fill in job details</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Service <span style={{ color: D.redRequired }}>*</span></label>
              <select value={jobService} onChange={(e) => setJobService(e.target.value)} style={selectStyle}>
                <option value="">Select service...</option>
                {SERVICE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ position: 'relative' }} ref={partnerDropdownRef}>
              <label style={labelStyle}>Partner <span style={{ color: D.redRequired }}>*</span></label>
              <input type="text" value={partnerSearch}
                onChange={(e) => { setPartnerSearch(e.target.value); setShowPartnerDropdown(true); setJobPartnerId(''); }}
                onFocus={() => setShowPartnerDropdown(true)}
                placeholder="Search for a partner..."
                style={inputStyle}
              />
              {showPartnerDropdown && (
                <div style={{
                  position: 'absolute', zIndex: 10, width: '100%', marginTop: 4,
                  background: D.bgSurface, border: `1px solid ${D.borderPrimary}`,
                  borderRadius: 7, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  maxHeight: 240, overflowY: 'auto',
                }}>
                  {partners?.filter((partner) => {
                    const nameField = partnersTable.getFieldIfExists('fldpNi9OwkPGLN03a');
                    const name = nameField ? partner.getCellValueAsString(nameField) : partner.id;
                    return name.toLowerCase().includes(partnerSearch.toLowerCase());
                  }).map((partner) => {
                    const nameField = partnersTable.getFieldIfExists('fldpNi9OwkPGLN03a');
                    const name = nameField ? partner.getCellValueAsString(nameField) : partner.id;
                    return (
                      <div key={partner.id}
                        onClick={() => { setJobPartnerId(partner.id); setPartnerSearch(name || partner.id); setShowPartnerDropdown(false); }}
                        style={{
                          padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontFamily: FONT, color: D.textPrimary,
                          background: jobPartnerId === partner.id ? D.blueBg : undefined,
                        }}
                        onMouseEnter={(e) => { if (jobPartnerId !== partner.id) e.currentTarget.style.background = D.bgHover; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = jobPartnerId === partner.id ? D.blueBg : ''; }}
                      >{name || partner.id}</div>
                    );
                  })}
                  {partners?.filter((partner) => {
                    const nameField = partnersTable.getFieldIfExists('fldpNi9OwkPGLN03a');
                    const name = nameField ? partner.getCellValueAsString(nameField) : partner.id;
                    return name.toLowerCase().includes(partnerSearch.toLowerCase());
                  }).length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, fontFamily: FONT, color: D.textMuted }}>No partners found</div>}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Job Type <span style={{ color: D.redRequired }}>*</span></label>
              <select value={jobType} onChange={(e) => setJobType(e.target.value)} style={selectStyle}>
                <option value="">Select job type...</option>
                {JOB_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status <span style={{ color: D.redRequired }}>*</span></label>
              <select value={jobStatus} onChange={(e) => setJobStatus(e.target.value)} style={selectStyle}>
                <option value="">Select status...</option>
                {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date Scheduled {jobStatus !== 'Tentative' && <span style={{ color: D.redRequired }}>*</span>}</label>
              <input type="date" value={jobDateScheduled} onChange={(e) => setJobDateScheduled(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1', position: 'relative' }} ref={assignedToDropdownRef}>
              <label style={labelStyle}>Assigned to <span style={{ color: D.redRequired }}>*</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {jobAssignedToIds.map((userId) => {
                  const user = base.activeCollaborators.find(c => c.id === userId);
                  return (
                    <span key={userId} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '4px 8px', background: D.blueBg, color: D.blue,
                      borderRadius: 7, fontSize: 12, fontFamily: FONT,
                    }}>
                      {user?.name || userId}
                      <button type="button" onClick={() => setJobAssignedToIds(jobAssignedToIds.filter(id => id !== userId))}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontFamily: FONT }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = D.redRequired)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = D.blue)}
                      >×</button>
                    </span>
                  );
                })}
              </div>
              <input type="text" value={assignedToSearch}
                onChange={(e) => { setAssignedToSearch(e.target.value); setShowAssignedToDropdown(true); }}
                onFocus={() => setShowAssignedToDropdown(true)}
                placeholder="Search for collaborators..."
                style={inputStyle}
              />
              {showAssignedToDropdown && (
                <div style={{
                  position: 'absolute', zIndex: 10, width: '100%', marginTop: 4,
                  background: D.bgSurface, border: `1px solid ${D.borderPrimary}`,
                  borderRadius: 7, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  maxHeight: 240, overflowY: 'auto',
                }}>
                  {base.activeCollaborators.filter((c) => {
                    const nameMatch = c.name?.toLowerCase().includes(assignedToSearch.toLowerCase());
                    const emailMatch = c.email?.toLowerCase().includes(assignedToSearch.toLowerCase());
                    return (nameMatch || emailMatch) && !jobAssignedToIds.includes(c.id);
                  }).map((c) => (
                    <div key={c.id}
                      onClick={() => { setJobAssignedToIds([...jobAssignedToIds, c.id]); setAssignedToSearch(''); setShowAssignedToDropdown(false); }}
                      style={{
                        padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = D.bgHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      {c.profilePicUrl && <img src={c.profilePicUrl} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />}
                      <div>
                        <div style={{ fontSize: 12, fontFamily: FONT, color: D.textPrimary }}>{c.name}</div>
                        <div style={{ fontSize: 10, fontFamily: FONT, color: D.textMuted }}>{c.email}</div>
                      </div>
                    </div>
                  ))}
                  {base.activeCollaborators.filter((c) => {
                    const nameMatch = c.name?.toLowerCase().includes(assignedToSearch.toLowerCase());
                    const emailMatch = c.email?.toLowerCase().includes(assignedToSearch.toLowerCase());
                    return (nameMatch || emailMatch) && !jobAssignedToIds.includes(c.id);
                  }).length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, fontFamily: FONT, color: D.textMuted }}>No collaborators found</div>}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, paddingTop: 16, marginTop: 8 }}>
            <button
              onClick={() => setCurrentStep(1)}
              style={{ ...btnSecondaryStyle, flex: 1 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = D.bgHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = D.bgSurface)}
            >Back</button>
            <button onClick={() => setCurrentStep(3)}
              style={{ ...btnPrimaryStyle, flex: 1 }}>
              Continue to BOM
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== Bulk Job Tab ====================

function BulkJobTab({ data }: { data: SharedData }) {
  const { base, locationsTable, bomTable, bomResourcesTable, jobsTable, resourcesTable, partnersTable, locations, resources, partners, customerOptions, subscriptionTypeOptions, collaboratorOptions } = data;

  const [rows, setRows] = useState<JobRow[]>([createEmptyRow()]);
  const [contracts, setContracts] = useState<ContractEntry[]>([]);
  const [contractModalEdit, setContractModalEdit] = useState<ContractEntry | null | 'new'>(null);
  const [bomModalRowId, setBomModalRowId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creatingProgress, setCreatingProgress] = useState(0);
  const [creatingTotal, setCreatingTotal] = useState(0);
  const [creatingPhase, setCreatingPhase] = useState<'jobs' | 'contracts'>('jobs');
  const [createdCount, setCreatedCount] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showInvalidRows, setShowInvalidRows] = useState(false);

  useEffect(() => {
    if (!isCreating) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isCreating]);

  const locationOptions = (locations ?? []).map((loc) => {
    const idField = locationsTable.getFieldIfExists('fldH1vrhUnKiwwpCA');
    const label = idField ? loc.getCellValueAsString(idField) : loc.id;
    return { id: loc.id, label: label || loc.id };
  });

  const resourceOptions = (resources ?? []).map((res) => {
    const nameField = resourcesTable.getFieldIfExists('fld736xl5W3Mahu9I');
    const modelField = resourcesTable.getFieldIfExists('fldJZ1YhZgDDU9Fw2');
    const label = nameField ? res.getCellValueAsString(nameField) : res.id;
    let model = modelField ? res.getCellValueAsString(modelField) : '';
    if (!model && label) {
      const parts = label.split(' - ');
      model = parts.length >= 3 ? parts.slice(2).join(' - ') : label;
    }
    return { id: res.id, label: label || res.id, model: model || label || res.id };
  });

  const partnerOptions = (partners ?? []).map((p) => {
    const nameField = partnersTable.getFieldIfExists('fldpNi9OwkPGLN03a');
    const label = nameField ? p.getCellValueAsString(nameField) : p.id;
    return { id: p.id, label: label || p.id };
  });

  const updateRow = (rowId: string, updates: Partial<JobRow>) => {
    setRows(rows.map(r => r.id === rowId ? { ...r, ...updates } : r));
    setShowInvalidRows(false);
  };

  const addRow = () => setRows([...rows, createEmptyRow()]);

  const removeRow = (rowId: string) => {
    if (rows.length <= 1) return;
    setRows(rows.filter(r => r.id !== rowId));
  };

  const duplicateRow = (rowId: string) => {
    const source = rows.find(r => r.id === rowId);
    if (!source) return;
    const newRow: JobRow = {
      ...source,
      id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      bomResources: source.bomResources.map(b => ({ ...b, id: `bom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` })),
    };
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

  const handleCreateAll = async () => {
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

          const resourceFields = row.bomResources.map((r: any) => ({
            'fldJWgcTlCdXLJca0': [r.resourceId],
            'fldX9nW8yWPagrPTt': r.quantity,
            'fldUq5csjuSb50Ay1': [bomId],
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
          'flddTDwVWOq7fc1Je': [row.locationId],
          'fldexkzrV3Z1z270B': row.service,
          'fldw2W2UmvTJiIuSY': [row.partnerId],
          'fldk5E1PkIy1ZrM1e': row.type,
          'fld7q5wjIg47nltes': row.status,
          'fld19en5UMabiUnqG': row.dateScheduled,
          'fld9PbrU1Lw8IvCzy': row.assignedToIds.map((id: string) => ({ id })),
        };
        if (bomId) jobFields['fldMsBGHYoDkBxvBM'] = [bomId];
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

      setCreatedCount(created);
      setSuccess(true);
    } catch (err) {
      setError(`Failed after creating ${created}/${rows.length} jobs: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleReset = () => { setRows([createEmptyRow()]); setContracts([]); setContractModalEdit(null); setError(''); setSuccess(false); setCreatedCount(0); setShowInvalidRows(false); };

  const handleDeleteContract = (contractId: string) => {
    setContracts(contracts.filter(c => c.id !== contractId));
    setRows(rows.map(row => ({
      ...row,
      bomResources: row.bomResources.map(r => r.contractId === contractId ? { ...r, contractId: undefined } : r),
    })));
  };

  if (success) return <SuccessScreen count={createdCount} onReset={handleReset} />;

  const bomModalRow = bomModalRowId ? rows.find(r => r.id === bomModalRowId) : null;

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: 10,
    fontWeight: 600,
    fontFamily: FONT,
    color: D.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontFamily: FONT, color: D.textMuted, margin: 0 }}>
          Add multiple jobs at once. Each row becomes a separate job with its own BOM.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, fontFamily: FONT, color: allValid ? D.green : D.textMuted }}>{validCount}/{rows.length} valid</span>
          <button onClick={handleCreateAll} disabled={isCreating}
            style={{
              background: D.green, color: '#ffffff', border: 'none', borderRadius: 7,
              padding: '8px 16px', fontSize: 12, fontWeight: 500, fontFamily: FONT,
              cursor: isCreating ? 'not-allowed' : 'pointer',
              opacity: isCreating ? 0.5 : 1,
            }}
            onMouseEnter={(e: any) => { if (!isCreating) e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.opacity = isCreating ? '0.5' : '1'; }}
          >
            {isCreating ? 'Creating...' : `Create ${rows.length} Job${rows.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {isCreating && (
        <div style={{ marginBottom: 16, padding: 14, background: D.blueBg, border: `1px solid ${D.blue}`, borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT, color: D.blue }}>
              {creatingPhase === 'contracts' ? 'Creating contracts' : 'Creating jobs'}... {creatingProgress}/{creatingTotal}
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

      {error && (
        <div style={{ marginBottom: 16, padding: 12, background: D.redHoverBg, border: `1px solid ${D.redRequired}`, borderRadius: 8 }}>
          <p style={{ fontSize: 12, fontFamily: FONT, color: D.redRequired, margin: 0 }}>{error}</p>
        </div>
      )}

      <ContractPanel contracts={contracts} onAdd={() => setContractModalEdit('new')}
        onEdit={(c) => setContractModalEdit(c)} onDelete={handleDeleteContract}
        bomResources={rows.flatMap(r => r.bomResources)} />

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
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { if (row.bomResources.length === 0) e.currentTarget.style.borderColor = D.borderHover; }}
                    onMouseLeave={(e) => { if (row.bomResources.length === 0) e.currentTarget.style.borderColor = D.borderPrimary; }}
                  >
                    {row.bomResources.length > 0
                      ? row.bomResources.map((b) => {
                          const ac = b.contractId ? contracts.find(c => c.id === b.contractId) : null;
                          return (
                            <div key={b.id} style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                              {b.quantity}x {b.modelName}
                              {ac && <span style={{ width: 6, height: 6, borderRadius: '50%', background: ac.color, flexShrink: 0 }} />}
                            </div>
                          );
                        })
                      : 'Edit'}
                  </button>
                </td>
                <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => duplicateRow(row.id)} title="Duplicate row"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.textFaint, padding: 4 }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = D.blue)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = D.textFaint)}
                    >
                      <IconCopy />
                    </button>
                    <button onClick={() => removeRow(row.id)} disabled={rows.length <= 1} title="Remove row"
                      style={{
                        background: 'none', border: 'none', padding: 4,
                        color: D.textFaint,
                        cursor: rows.length <= 1 ? 'not-allowed' : 'pointer',
                        opacity: rows.length <= 1 ? 0.3 : 1,
                      }}
                      onMouseEnter={(e) => { if (rows.length > 1) e.currentTarget.style.color = D.redRequired; }}
                      onMouseLeave={(e) => (e.currentTarget.style.color = D.textFaint)}
                    >
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

      <button onClick={addRow}
        style={{
          marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, fontFamily: FONT, color: D.textMuted, padding: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = D.textSecondary)}
        onMouseLeave={(e) => (e.currentTarget.style.color = D.textMuted)}
      >
        <IconPlus /> Add row
      </button>

      {bomModalRow && (
        <BOMModal bomResources={bomModalRow.bomResources} resourceOptions={resourceOptions}
          contracts={contracts}
          onSave={(items) => { updateRow(bomModalRowId!, { bomResources: items }); setBomModalRowId(null); }}
          onClose={() => setBomModalRowId(null)}
          onCreateContract={() => setContractModalEdit('new')}
          onEditContract={(c) => setContractModalEdit(c)} />
      )}

      {contractModalEdit && (
        <ContractEditModal
          contract={contractModalEdit === 'new' ? null : contractModalEdit}
          onSave={(entry) => {
            setContracts(prev => {
              const idx = prev.findIndex(c => c.id === entry.id);
              return idx >= 0 ? prev.map(c => c.id === entry.id ? entry : c) : [...prev, entry];
            });
            setContractModalEdit(null);
          }}
          onClose={() => setContractModalEdit(null)}
          customerOptions={customerOptions}
          subscriptionTypeOptions={subscriptionTypeOptions}
          collaboratorOptions={collaboratorOptions}
        />
      )}
    </div>
  );
}

// ==================== Main App with Tabs ====================

function JobCreationApp(): React.ReactElement {
  useDesignSetup();

  const base = useBase();
  const { customPropertyValueByKey, errorState } = useCustomProperties(
    useCallback((b: ReturnType<typeof useBase>) => getCustomProperties(b), [])
  );

  const locationsTable = customPropertyValueByKey.locationsTable as Table | undefined;
  const bomTable = customPropertyValueByKey.bomTable as Table | undefined;
  const bomResourcesTable = customPropertyValueByKey.bomResourcesTable as Table | undefined;
  const jobsTable = customPropertyValueByKey.jobsTable as Table | undefined;
  const resourcesTable = customPropertyValueByKey.resourcesTable as Table | undefined;
  const partnersTable = customPropertyValueByKey.partnersTable as Table | undefined;

  const locations = useRecords(locationsTable ?? null);
  const resources = useRecords(resourcesTable ?? null);
  const partners = useRecords(partnersTable ?? null);

  const [customerOptionsList, setCustomerOptionsList] = useState<{ id: string; label: string }[]>([]);
  const [subscriptionTypeOptionsList, setSubscriptionTypeOptionsList] = useState<{ id: string; label: string }[]>([]);

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
    loadOptions('tblBjI9HEpZz8lFmY', 'ID').then(setCustomerOptionsList);
    loadOptions('tblVD2FwbJEZNYjVv', 'ID').then(setSubscriptionTypeOptionsList);
  }, [base.id]);

  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

  if (errorState) {
    return (
      <div style={{ minHeight: '100vh', background: D.bgPage, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
        <div style={{ background: D.bgSurface, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: 24, maxWidth: 400 }}>
          <p style={{ color: D.redRequired, fontWeight: 500, fontSize: 14, margin: 0 }}>Error loading custom properties</p>
          <p style={{ color: D.textMuted, fontSize: 12, marginTop: 8 }}>Please configure the extension in the properties panel.</p>
        </div>
      </div>
    );
  }

  if (!locationsTable || !bomTable || !bomResourcesTable || !jobsTable || !resourcesTable || !partnersTable) {
    return (
      <div style={{ minHeight: '100vh', background: D.bgPage, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
        <div style={{ background: D.bgSurface, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: 24, maxWidth: 400 }}>
          <p style={{ color: D.textSecondary, fontWeight: 500, fontSize: 14, margin: 0 }}>Configuration Required</p>
          <p style={{ color: D.textMuted, fontSize: 12, marginTop: 8 }}>Please configure all required tables in the properties panel.</p>
        </div>
      </div>
    );
  }

  const collabOptions = base.activeCollaborators.map(c => ({ id: c.id, label: c.name || c.email || c.id }));

  const sharedData: SharedData = {
    base, locationsTable, bomTable, bomResourcesTable, jobsTable, resourcesTable, partnersTable,
    locations, resources, partners,
    customerOptions: customerOptionsList,
    subscriptionTypeOptions: subscriptionTypeOptionsList,
    collaboratorOptions: collabOptions,
  };

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: D.bgPage, padding: 24, overflow: 'auto', fontFamily: FONT, boxSizing: 'border-box' }}>
      <div style={{ maxWidth: activeTab === 'bulk' ? 1400 : 640, margin: '0 auto' }}>
        <div style={{ background: D.bgSurface, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT, color: D.textPrimary, textAlign: 'center', marginBottom: 16, marginTop: 0 }}>
            Create New Job
          </h1>

          {/* Tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, borderBottom: `1px solid ${D.borderPrimary}` }}>
            <button
              onClick={() => setActiveTab('single')}
              style={{
                padding: '10px 24px',
                fontSize: 12,
                fontWeight: 500,
                fontFamily: FONT,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                color: activeTab === 'single' ? D.blue : D.textMuted,
                borderBottom: activeTab === 'single' ? `2px solid ${D.blue}` : '2px solid transparent',
                marginBottom: -1,
              }}
              onMouseEnter={(e) => { if (activeTab !== 'single') e.currentTarget.style.color = D.textSecondary; }}
              onMouseLeave={(e) => { if (activeTab !== 'single') e.currentTarget.style.color = D.textMuted; }}
            >
              Single Job
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              style={{
                padding: '10px 24px',
                fontSize: 12,
                fontWeight: 500,
                fontFamily: FONT,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                color: activeTab === 'bulk' ? D.blue : D.textMuted,
                borderBottom: activeTab === 'bulk' ? `2px solid ${D.blue}` : '2px solid transparent',
                marginBottom: -1,
              }}
              onMouseEnter={(e) => { if (activeTab !== 'bulk') e.currentTarget.style.color = D.textSecondary; }}
              onMouseLeave={(e) => { if (activeTab !== 'bulk') e.currentTarget.style.color = D.textMuted; }}
            >
              Bulk Import
            </button>
          </div>

          {activeTab === 'single' && <SingleJobTab data={sharedData} />}
          {activeTab === 'bulk' && <BulkJobTab data={sharedData} />}
        </div>
      </div>
    </div>
  );
}

initializeBlock({ interface: () => <JobCreationApp /> });
