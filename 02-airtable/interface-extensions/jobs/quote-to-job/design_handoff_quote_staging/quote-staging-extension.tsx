import React, { useState, useCallback, useEffect, useRef } from 'react';

import {
  initializeBlock,
  useBase,
  useRecords,
  useCustomProperties,
} from '@airtable/blocks/interface/ui';
import { Table } from '@airtable/blocks/interface/models';
import {
  PlusIcon, CheckIcon, MapPinIcon, PackageIcon, BriefcaseIcon,
  TrashIcon, XIcon, ArrowLeftIcon, ArrowRightIcon, ArrowSquareOutIcon,
  ListChecksIcon, HouseIcon, CaretDownIcon,
} from '@phosphor-icons/react';

console.log('[QuoteStaging] Extension loaded — v2 with countries fix');

// ==================== Types & Config ====================

interface BOMResourceItem {
  id: string;
  resourceId: string;
  resourceName: string;
  modelName: string;
  quantity: number;
}

interface NewLocation {
  name: string;
  customerId: string;
  address: string;
  countryId: string;
}

// Field IDs - centralised for maintainability
const F = {
  // HS - Quotes (tblRSXCmjroNPaO5j)
  hq_quoteId: 'fldknQwGzwI1VngxQ',
  hq_quoteNumber: 'fldxPrvWs1LJH4YgZ',
  hq_quoteStatus: 'fldbOMc45bUlfodQI',
  hq_status: 'flde1WYO61rqWSgfJ',
  hq_quoteType: 'fldee1UAEbbBRZNw8',
  hq_quoteService: 'fldOkbdzsb75CTmsk',
  hq_dealName: 'fld04192O7AGeoSHZ',
  hq_companyName: 'fldJfkmABVCUjmEnq',
  hq_publicUrl: 'fldQxytU98niDmqu0',
  hq_allocatedJobs: 'fldcxtVQn8aTaK6hm',
  hq_jobsOpened: 'fldD8PSiUVsxr6Dx6',
  hq_allocProgress: 'fld9UI8iTHD89mOC5',
  hq_jobsLink: 'flduqcUClFQMG8uMY',
  hq_customerAT: 'fldxsduX5imgE5hNW',
  hq_quoteTitle: 'fldednnLaxvKeH26Z',
  hq_currency: 'fld7opmszZ9yOy3PP',
  hq_created: 'fldxhSXasW6iV6Psw',

  // Jobs (tblwHj9cO37wp1fVx)
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

  // BOM Resources (tblAHbCtXG4w9tzSF)
  br_resources: 'fldJWgcTlCdXLJca0',
  br_quantity: 'fldX9nW8yWPagrPTt',
  br_bom: 'fldUq5csjuSb50Ay1',

  // Job locations / Locations (tbl5Nj3zs3nxKPdEv)
  loc_id: 'fldH1vrhUnKiwwpCA',
  loc_name: 'fldqsL7TAKvXlgXiD',
  loc_customer: 'fld50gjrLkGm9UAWa',
  loc_address: 'fldFKRQqqgq6ciM3N',
  loc_country: 'fld2HASuI5dQ03JFG',
  loc_brand: 'fldIGGH3dQTwmBYqg',
  loc_brandOwner: 'fldTJ5szaVI4GK481',

  // Resources (tbl6eFWh1yj7wjiGL)
  res_name: 'fld736xl5W3Mahu9I',
  res_model: 'fldJZ1YhZgDDU9Fw2',
  res_category: 'fldY2iaWf1bVxiPbX',

  // Partners (tblkK66QqEkfAKb2S)
  ptr_name: 'fldpNi9OwkPGLN03a',

  // Customers (tblhzcjYQk0NJCv9v)
  cust_id: 'fldVUI3Tf7Zt8kB8E',

  // Countries (tblPY2wcrdWOvYnkd)
  cty_name: 'fld1mAL19wYygGhIK',
};

const SERVICE_OPTIONS = ['Digital signage', 'Music streaming', 'Test'];
const JOB_TYPE_OPTIONS = ['Collect', 'Delivery', 'Installation', 'Rework', 'Survey', 'Un-installation', 'Ma - Audit', 'Ma - Preventive', 'Ma - Reactive', 'Account setup', 'Pre-sale'];
const STATUS_OPTIONS = ['Done', 'Incomplete', 'Installed', 'Scheduled', 'Tentative', 'Unscheduled', 'Cancelled'];

const SERVICE_MAP: Record<string, string> = {
  'Digital Signage': 'Digital signage',
  'Music Streaming': 'Music streaming',
};

// Quote types that enter the staging queue
const OPS_TYPES = new Set(['Installation', 'Hardware', 'Maintenance', 'Delivery']);

// ==================== Helpers ====================

function getFieldStr(record: any, table: Table | null | undefined, fieldId: string): string {
  try {
    if (!table || !record) return '';
    const field = table.getFieldIfExists(fieldId);
    return field ? (record.getCellValueAsString(field) || '') : '';
  } catch (e) {
    console.error('getFieldStr error:', fieldId, e);
    return '';
  }
}

function getFieldVal(record: any, table: Table | null | undefined, fieldId: string): any {
  try {
    if (!table || !record) return null;
    const field = table.getFieldIfExists(fieldId);
    return field ? record.getCellValue(field) : null;
  } catch (e) {
    console.error('getFieldVal error:', fieldId, e);
    return null;
  }
}

// Compute staging status from raw field values
let _debugLogged = false;
function computeStage(record: any, table: Table): string {
  const statusA = getFieldStr(record, table, F.hq_quoteStatus);
  const statusB = getFieldStr(record, table, F.hq_status);
  const status = statusA || statusB;

  if (!_debugLogged) {
    const types = getFieldVal(record, table, F.hq_quoteType) as any[] | null;
    console.log('[QuoteStaging DEBUG] First record sample:', {
      id: record?.id,
      hq_quoteStatus_field: table?.getFieldIfExists(F.hq_quoteStatus)?.name ?? 'NOT FOUND',
      hq_status_field: table?.getFieldIfExists(F.hq_status)?.name ?? 'NOT FOUND',
      hq_quoteType_field: table?.getFieldIfExists(F.hq_quoteType)?.name ?? 'NOT FOUND',
      statusA, statusB, status,
      types: JSON.stringify(types),
      allFieldNames: table?.fields?.map((f: any) => `${f.name} (${f.id})`) ?? [],
    });
    _debugLogged = true;
  }

  if (status.toUpperCase() !== 'ACCEPTED') return 'skip';

  const types = getFieldVal(record, table, F.hq_quoteType) as any[] | null;
  if (!types || types.length === 0) return 'skip';
  const hasOpsType = types.some((t: any) => OPS_TYPES.has(t.name || t));
  if (!hasOpsType) return 'skip';

  const customer = getFieldVal(record, table, F.hq_customerAT);
  if (!customer || (Array.isArray(customer) && customer.length === 0)) return 'needs_customer';

  const allocated = getFieldVal(record, table, F.hq_allocatedJobs) as number | null;
  if (!allocated || allocated <= 0) return 'needs_allocation';

  const opened = getFieldVal(record, table, F.hq_jobsOpened) as number | null;
  if ((opened ?? 0) >= allocated) return 'done';

  return 'ready';
}

const STAGE_META: Record<string, { label: string; color: string; bg: string; sort: number }> = {
  needs_customer: { label: 'Needs customer', color: 'text-orange-orangeDark1', bg: 'bg-orange-orangeLight2', sort: 0 },
  needs_allocation: { label: 'Needs allocation', color: 'text-purple-purpleDark1', bg: 'bg-purple-purpleLight2', sort: 1 },
  ready: { label: 'Ready', color: 'text-green-greenDark1', bg: 'bg-green-greenLight2', sort: 2 },
  done: { label: 'Done', color: 'text-gray-gray500', bg: 'bg-gray-gray100', sort: 3 },
};

// ==================== Reusable: SearchDropdown ====================

function SearchDropdown({
  value, displayValue, options, onSelect, placeholder, disabled,
}: {
  value: string;
  displayValue: string;
  options: { id: string; label: string }[];
  onSelect: (id: string, label: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

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
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 220) });
    }
  };

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} className="group/tooltip relative">
      <input
        ref={inputRef}
        type="text"
        value={open ? search : displayValue}
        onChange={(e) => { setSearch(e.target.value); updatePos(); setOpen(true); }}
        onFocus={() => { setSearch(''); updatePos(); setOpen(true); }}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-2.5 py-1.5 text-sm border border-gray-gray200 dark:border-gray-gray600 rounded-md bg-white dark:bg-gray-gray700 text-gray-gray800 dark:text-gray-gray100 focus:outline-none focus:ring-1 focus:ring-blue-blue disabled:opacity-50"
      />
      {displayValue && !open && (
        <div className="pointer-events-none absolute left-0 bottom-full mb-1 z-50 hidden group-hover/tooltip:block px-2 py-1 text-xs text-white bg-gray-gray800 dark:bg-gray-gray100 dark:text-gray-gray800 rounded shadow-lg whitespace-nowrap max-w-xs truncate">
          {displayValue}
        </div>
      )}
      {open && !disabled && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-gray700 border border-gray-gray200 dark:border-gray-gray600 rounded-md shadow-lg max-h-48 overflow-auto"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          {filtered.map((o) => (
            <div
              key={o.id}
              onClick={() => { onSelect(o.id, o.label); setOpen(false); setSearch(''); }}
              className={`px-2.5 py-1.5 text-sm cursor-pointer hover:bg-gray-gray100 dark:hover:bg-gray-gray600 ${value === o.id ? 'bg-blue-blueLight2 dark:bg-blue-blueDark1' : ''}`}
            >
              {o.label}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-2.5 py-1.5 text-sm text-gray-gray500 dark:text-gray-gray400">No results</div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== Reusable: AssignedToCell ====================

function AssignedToCell({
  selectedIds, collaboratorOptions, onChange,
}: {
  selectedIds: string[];
  collaboratorOptions: { id: string; label: string; email?: string; pic?: string }[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

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
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 200) });
    }
  };

  const available = collaboratorOptions.filter(
    c => !selectedIds.includes(c.id) && (c.label.toLowerCase().includes(search.toLowerCase()) || (c.email || '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div ref={ref}>
      <div className="flex flex-wrap gap-1 mb-1">
        {selectedIds.map(id => {
          const collab = collaboratorOptions.find(c => c.id === id);
          return (
            <span key={id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-blueLight2 dark:bg-blue-blueDark1 text-blue-blueDark1 dark:text-blue-blueLight1 rounded text-xs">
              {collab?.label || id}
              <button type="button" onClick={() => onChange(selectedIds.filter(i => i !== id))} className="hover:text-red-red ml-0.5">×</button>
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
        className="w-full px-2.5 py-1.5 text-sm border border-gray-gray200 dark:border-gray-gray600 rounded-md bg-white dark:bg-gray-gray700 text-gray-gray800 dark:text-gray-gray100 focus:outline-none focus:ring-1 focus:ring-blue-blue"
      />
      {open && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-gray700 border border-gray-gray200 dark:border-gray-gray600 rounded-md shadow-lg max-h-40 overflow-auto"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          {available.map(c => (
            <div key={c.id} onClick={() => { onChange([...selectedIds, c.id]); setSearch(''); }}
              className="px-2.5 py-1.5 text-sm cursor-pointer hover:bg-gray-gray100 dark:hover:bg-gray-gray600 flex items-center gap-2">
              {c.pic && <img src={c.pic} alt="" className="w-5 h-5 rounded-full" />}
              <div>
                <div className="text-sm text-gray-gray800 dark:text-gray-gray100">{c.label}</div>
                {c.email && <div className="text-xs text-gray-gray500 dark:text-gray-gray400">{c.email}</div>}
              </div>
            </div>
          ))}
          {available.length === 0 && <div className="px-2.5 py-1.5 text-sm text-gray-gray500 dark:text-gray-gray400">No results</div>}
        </div>
      )}
    </div>
  );
}

// ==================== Custom Properties ====================

function getCustomProperties(base: ReturnType<typeof useBase>) {
  return [
    { key: 'hsQuotesTable', label: 'HS - Quotes', type: 'table' as const, defaultValue: base.tables.find(t => t.id === 'tblRSXCmjroNPaO5j') },
    { key: 'locationsTable', label: 'Locations', type: 'table' as const, defaultValue: base.tables.find(t => t.id === 'tbl5Nj3zs3nxKPdEv') },
    { key: 'bomTable', label: 'BOM', type: 'table' as const, defaultValue: base.tables.find(t => t.id === 'tblMoXmjtWVO8Wyz7') },
    { key: 'bomResourcesTable', label: 'BOM Resources', type: 'table' as const, defaultValue: base.tables.find(t => t.id === 'tblAHbCtXG4w9tzSF') },
    { key: 'jobsTable', label: 'Jobs', type: 'table' as const, defaultValue: base.tables.find(t => t.id === 'tblwHj9cO37wp1fVx') },
    { key: 'resourcesTable', label: 'Resources', type: 'table' as const, defaultValue: base.tables.find(t => t.id === 'tbl6eFWh1yj7wjiGL') },
    { key: 'customersTable', label: 'Customers', type: 'table' as const, defaultValue: base.tables.find(t => t.id === 'tblhzcjYQk0NJCv9v') },
    { key: 'partnersTable', label: 'Partners', type: 'table' as const, defaultValue: base.tables.find(t => t.id === 'tblkK66QqEkfAKb2S') },
  ];
}

// ==================== Quote Queue (left panel) ====================

function QuoteQueue({
  quotes, hsQuotesTable, selectedQuoteId, onSelect,
}: {
  quotes: any[] | null;
  hsQuotesTable: Table;
  selectedQuoteId: string | null;
  onSelect: (id: string) => void;
}) {
  // Group by stage
  const grouped: Record<string, any[]> = { needs_customer: [], needs_allocation: [], ready: [], done: [] };
  (quotes ?? []).forEach(q => {
    const stage = computeStage(q, hsQuotesTable);
    if (stage !== 'skip' && grouped[stage]) grouped[stage].push(q);
  });

  const totalActionable = grouped.needs_customer.length + grouped.needs_allocation.length + grouped.ready.length;

  return (
    <div className="w-72 flex-shrink-0 border-r border-gray-gray200 dark:border-gray-gray600 bg-white dark:bg-gray-gray700 overflow-y-auto">
      <div className="px-4 py-3 border-b border-gray-gray200 dark:border-gray-gray600">
        <h2 className="text-sm font-semibold text-gray-gray800 dark:text-gray-gray100">Quote Queue</h2>
        <p className="text-xs text-gray-gray500 dark:text-gray-gray400 mt-0.5">{totalActionable} quote{totalActionable !== 1 ? 's' : ''} need action</p>
      </div>
      {(['needs_customer', 'needs_allocation', 'ready', 'done'] as const).map(stageKey => {
        const items = grouped[stageKey];
        if (items.length === 0) return null;
        const meta = STAGE_META[stageKey];
        return (
          <div key={stageKey}>
            <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${meta.color}`}>
              {meta.label} · {items.length}
            </div>
            {items.map(q => {
              const isSelected = q.id === selectedQuoteId;
              const quoteNum = getFieldStr(q, hsQuotesTable, F.hq_quoteNumber);
              const company = getFieldStr(q, hsQuotesTable, F.hq_companyName);
              const deal = getFieldStr(q, hsQuotesTable, F.hq_dealName);
              const types = (getFieldVal(q, hsQuotesTable, F.hq_quoteType) as any[] | null) ?? [];
              const allocated = getFieldVal(q, hsQuotesTable, F.hq_allocatedJobs) as number | null;
              const opened = getFieldVal(q, hsQuotesTable, F.hq_jobsOpened) as number | null;

              return (
                <button
                  key={q.id}
                  onClick={() => onSelect(q.id)}
                  className={`w-full text-left px-4 py-2.5 border-l-[3px] transition-colors ${isSelected
                      ? `${meta.bg} border-l-current ${meta.color}`
                      : 'border-l-transparent hover:bg-gray-gray50 dark:hover:bg-gray-gray800'
                    } ${stageKey === 'done' ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-semibold text-gray-gray700 dark:text-gray-gray200 truncate">{quoteNum || q.id.slice(0, 10)}</span>
                    {allocated != null && (
                      <span className="text-[10px] font-mono text-gray-gray400 dark:text-gray-gray500">{opened ?? 0}/{allocated}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-gray500 dark:text-gray-gray400 truncate mt-0.5">{company || deal}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {types.map((t: any) => (
                      <span key={t.name || t} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-gray100 dark:bg-gray-gray800 text-gray-gray500 dark:text-gray-gray400">
                        {t.name || t}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
      {totalActionable === 0 && grouped.done.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-gray-gray400 dark:text-gray-gray500">
          No accepted quotes with ops types found.
        </div>
      )}
    </div>
  );
}

// ==================== Quote Detail + Job Wizard (right panel) ====================

function QuoteWorkspace({
  quote, hsQuotesTable, locationsTable, bomTable, bomResourcesTable, jobsTable,
  resourcesTable, customersTable, partnersTable, countriesTable, base,
  locations, resources, customers, partners, countries,
}: {
  quote: any;
  hsQuotesTable: Table;
  locationsTable: Table;
  bomTable: Table;
  bomResourcesTable: Table;
  jobsTable: Table;
  resourcesTable: Table;
  customersTable: Table;
  partnersTable: Table;
  countriesTable?: Table;
  base: ReturnType<typeof useBase>;
  locations: any[] | null;
  resources: any[] | null;
  customers: any[] | null;
  partners: any[] | null;
  countries?: any[] | null;
}) {
  // ——— Quote-level state ———
  const stage = computeStage(quote, hsQuotesTable);
  const quoteNum = getFieldStr(quote, hsQuotesTable, F.hq_quoteNumber);
  const deal = getFieldStr(quote, hsQuotesTable, F.hq_dealName);
  const company = getFieldStr(quote, hsQuotesTable, F.hq_companyName);
  const publicUrl = getFieldStr(quote, hsQuotesTable, F.hq_publicUrl);
  const quoteTitle = getFieldStr(quote, hsQuotesTable, F.hq_quoteTitle);
  const currency = getFieldStr(quote, hsQuotesTable, F.hq_currency);
  const serviceObj = getFieldVal(quote, hsQuotesTable, F.hq_quoteService) as any | null;
  const types = (getFieldVal(quote, hsQuotesTable, F.hq_quoteType) as any[] | null) ?? [];
  const customerAT = getFieldVal(quote, hsQuotesTable, F.hq_customerAT) as any[] | null;
  const allocated = getFieldVal(quote, hsQuotesTable, F.hq_allocatedJobs) as number | null;
  const opened = getFieldVal(quote, hsQuotesTable, F.hq_jobsOpened) as number | null;
  const existingJobs = getFieldVal(quote, hsQuotesTable, F.hq_jobsLink) as any[] | null;

  const jobsRemaining = Math.max(0, (allocated ?? 0) - (opened ?? 0));
  const hasCustomer = customerAT && customerAT.length > 0;

  // ——— Job wizard state ———
  const [wizardStep, setWizardStep] = useState<number>(0); // 0 = not started, 1-3 = steps
  const [locationMode, setLocationMode] = useState<'existing' | 'new'>('existing');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedLocationDisplay, setSelectedLocationDisplay] = useState('');
  const [newLocation, setNewLocation] = useState<NewLocation>({ name: '', customerId: '', address: '', countryId: '' });
  const [bomResources, setBomResources] = useState<BOMResourceItem[]>([]);
  const [jobService, setJobService] = useState('');
  const [jobPartnerId, setJobPartnerId] = useState('');
  const [jobPartnerDisplay, setJobPartnerDisplay] = useState('');
  const [jobType, setJobType] = useState('');
  const [jobStatus, setJobStatus] = useState('');
  const [jobDateScheduled, setJobDateScheduled] = useState('');
  const [jobAssignedToIds, setJobAssignedToIds] = useState<string[]>([]);
  const [newResId, setNewResId] = useState('');
  const [newResDisplay, setNewResDisplay] = useState('');
  const [newResQty, setNewResQty] = useState<number | string>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [justCreatedJobId, setJustCreatedJobId] = useState<string | null>(null);

  // Reset wizard when quote changes
  useEffect(() => {
    resetWizard();
  }, [quote.id]);

  // Pre-fill service from quote
  useEffect(() => {
    if (serviceObj) {
      const mapped = SERVICE_MAP[serviceObj.name || ''];
      if (mapped) setJobService(mapped);
    }
  }, [serviceObj]);

  // Pre-fill new location customer from quote customer
  useEffect(() => {
    if (hasCustomer) {
      setNewLocation(prev => ({ ...prev, customerId: customerAT![0].id }));
    }
  }, [customerAT]);

  const resetWizard = () => {
    setWizardStep(0);
    setLocationMode('existing');
    setSelectedLocationId('');
    setSelectedLocationDisplay('');
    setNewLocation({ name: '', customerId: hasCustomer ? customerAT![0].id : '', address: '', countryId: '' });
    setBomResources([]);
    setJobService(serviceObj ? (SERVICE_MAP[serviceObj.name || ''] || '') : '');
    setJobPartnerId('');
    setJobPartnerDisplay('');
    setJobType('');
    setJobStatus('');
    setJobDateScheduled('');
    setJobAssignedToIds([]);
    setNewResId('');
    setNewResDisplay('');
    setNewResQty(1);
    setError('');
    setJustCreatedJobId(null);
  };

  // ——— Options ———
  const locationOptions = (locations ?? []).map(loc => ({
    id: loc.id,
    label: getFieldStr(loc, locationsTable, F.loc_id) || loc.id,
  }));

  const resourceOptions = (resources ?? []).map(res => {
    const name = getFieldStr(res, resourcesTable, F.res_name);
    const model = getFieldStr(res, resourcesTable, F.res_model);
    return { id: res.id, label: name || res.id, model: model || name || res.id };
  });

  const partnerOptions = (partners ?? []).map(p => ({
    id: p.id,
    label: getFieldStr(p, partnersTable, F.ptr_name) || p.id,
  }));

  const customerOptions = (customers ?? []).map(c => ({
    id: c.id,
    label: getFieldStr(c, customersTable, F.cust_id) || c.id,
  }));

  const countryOptions: { id: string; label: string }[] = countriesTable
    ? (countries ?? []).map(c => ({
      id: c.id,
      label: getFieldStr(c, countriesTable, F.cty_name) || c.id,
    }))
    : [];

  const collaboratorOptions = base.activeCollaborators.map(c => ({
    id: c.id,
    label: c.name || c.email || c.id,
    email: c.email,
    pic: c.profilePicUrl,
  }));

  // ——— Handlers ———
  const handleSetCustomer = async (custId: string) => {
    try {
      await hsQuotesTable.updateRecordAsync(quote.id, {
        [F.hq_customerAT]: [{ id: custId }],
      });
    } catch (err) {
      setError(`Failed to set customer: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSetAllocated = async (n: number) => {
    try {
      await hsQuotesTable.updateRecordAsync(quote.id, {
        [F.hq_allocatedJobs]: Math.max(1, n),
      });
    } catch (err) {
      setError(`Failed to set allocated jobs: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleAddBomResource = () => {
    if (!newResId || !newResQty || Number(newResQty) < 1) return;
    const opt = resourceOptions.find(r => r.id === newResId);
    setBomResources([...bomResources, {
      id: `bom-${Date.now()}`,
      resourceId: newResId,
      resourceName: opt?.label || 'Unknown',
      modelName: opt?.model || opt?.label || 'Unknown',
      quantity: Number(newResQty),
    }]);
    setNewResId('');
    setNewResDisplay('');
    setNewResQty(1);
  };

  const handleCreateJob = async () => {
    // Validation
    const hasLocation = locationMode === 'existing' ? !!selectedLocationId : !!newLocation.name;
    if (!hasLocation) { setError('Please select or create a location'); return; }
    if (bomResources.length === 0) { setError('Please add at least one BOM resource'); return; }
    if (!jobService || !jobPartnerId || !jobType || !jobStatus || !jobDateScheduled || jobAssignedToIds.length === 0) {
      setError('Please fill in all required job fields');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Step A: Create location if new
      let locationId = selectedLocationId;
      if (locationMode === 'new') {
        const locFields: Record<string, any> = {
          [F.loc_name]: newLocation.name,
        };
        if (newLocation.customerId) locFields[F.loc_customer] = [{ id: newLocation.customerId }];
        if (newLocation.address) locFields[F.loc_address] = newLocation.address;
        if (newLocation.countryId) locFields[F.loc_country] = [{ id: newLocation.countryId }];
        locationId = await locationsTable.createRecordAsync(locFields);
      }

      // Step B: Create BOM (empty shell — resources link to it)
      const bomId = await bomTable.createRecordAsync({});

      // Step C: Create BOM Resources
      for (const resource of bomResources) {
        await bomResourcesTable.createRecordAsync({
          [F.br_resources]: [{ id: resource.resourceId }],
          [F.br_quantity]: resource.quantity,
          [F.br_bom]: [{ id: bomId }],
        });
      }

      // Step D: Create Job — same chain as existing extension + HS quote link
      const jobId = await jobsTable.createRecordAsync({
        [F.job_location]: [{ id: locationId }],
        [F.job_bom]: [{ id: bomId }],
        [F.job_service]: { name: jobService },
        [F.job_partner]: [{ id: jobPartnerId }],
        [F.job_type]: { name: jobType },
        [F.job_status]: { name: jobStatus },
        [F.job_dateScheduled]: jobDateScheduled,
        [F.job_assignedTo]: jobAssignedToIds.map(id => ({ id })),
        [F.job_hsQuotes]: [{ id: quote.id }],  // ← THE NEW BIT: link to HS quote
      });

      setJustCreatedJobId(jobId);
      setWizardStep(0); // Return to quote overview — progress auto-updates via count field
      resetWizard();
    } catch (err) {
      setError(`Failed to create job: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  // ——— Render ———
  const stageMeta = STAGE_META[stage] || STAGE_META.needs_customer;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-gray50 dark:bg-gray-gray800">
      {/* Quote header */}
      <div className="bg-white dark:bg-gray-gray700 border-b border-gray-gray200 dark:border-gray-gray600 px-6 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-gray500 dark:text-gray-gray400">{quoteNum}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stageMeta.bg} ${stageMeta.color}`}>
                {stageMeta.label}
              </span>
            </div>
            <h1 className="text-lg font-semibold text-gray-gray800 dark:text-gray-gray100 truncate">{deal || quoteTitle || 'Untitled deal'}</h1>
            <p className="text-sm text-gray-gray500 dark:text-gray-gray400">{company}{currency ? ` · ${currency}` : ''}</p>
          </div>
          {publicUrl && (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-gray200 dark:border-gray-gray600 rounded-md bg-white dark:bg-gray-gray600 text-gray-gray700 dark:text-gray-gray200 hover:bg-gray-gray50 dark:hover:bg-gray-gray500 transition-colors">
              Open quote <ArrowSquareOutIcon size={14} />
            </a>
          )}
        </div>

        {/* Quote meta: types + progress */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <div className="flex gap-1.5">
            {types.map((t: any) => (
              <span key={t.name || t} className="text-xs font-medium px-2 py-0.5 rounded bg-gray-gray100 dark:bg-gray-gray800 text-gray-gray600 dark:text-gray-gray300">
                {t.name || t}
              </span>
            ))}
          </div>
          {allocated != null && allocated > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <div className="w-24 h-1.5 bg-gray-gray200 dark:bg-gray-gray600 rounded-full overflow-hidden">
                <div className="h-full bg-green-green rounded-full transition-all" style={{ width: `${Math.min(100, ((opened ?? 0) / allocated) * 100)}%` }} />
              </div>
              <span className="text-xs font-mono text-gray-gray500 dark:text-gray-gray400">{opened ?? 0}/{allocated} jobs</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-redLight3 dark:bg-red-redDark1/20 border border-red-redLight1 dark:border-red-redDark1 rounded-lg">
            <p className="text-sm text-red-red dark:text-red-redLight1">{error}</p>
          </div>
        )}

        {/* ═══ Stage: Needs Customer ═══ */}
        {stage === 'needs_customer' && (
          <div className="bg-white dark:bg-gray-gray700 rounded-lg border border-gray-gray200 dark:border-gray-gray600 p-5 max-w-lg">
            <h3 className="text-sm font-semibold text-gray-gray800 dark:text-gray-gray100 mb-1">Map customer</h3>
            <p className="text-xs text-gray-gray500 dark:text-gray-gray400 mb-3">
              HubSpot company: <strong>{company}</strong> — pick the matching Airtable customer.
            </p>
            <SearchDropdown
              value=""
              displayValue=""
              options={customerOptions}
              onSelect={(id) => handleSetCustomer(id)}
              placeholder="Search customers..."
            />
          </div>
        )}

        {/* ═══ Stage: Needs Allocation ═══ */}
        {stage === 'needs_allocation' && (
          <div className="bg-white dark:bg-gray-gray700 rounded-lg border border-gray-gray200 dark:border-gray-gray600 p-5 max-w-lg">
            <h3 className="text-sm font-semibold text-gray-gray800 dark:text-gray-gray100 mb-1">How many jobs?</h3>
            <p className="text-xs text-gray-gray500 dark:text-gray-gray400 mb-3">
              Read the quote and decide how many jobs (locations) this needs.
            </p>
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => handleSetAllocated(n)}
                  className="w-10 h-10 rounded-md border border-gray-gray200 dark:border-gray-gray600 text-sm font-semibold hover:bg-blue-blueLight2 dark:hover:bg-blue-blueDark1 hover:border-blue-blue hover:text-blue-blue transition-colors hover:cursor-pointer">
                  {n}
                </button>
              ))}
              <input type="number" min="1" placeholder="or type..."
                className="w-20 px-2.5 py-2 text-sm border border-gray-gray200 dark:border-gray-gray600 rounded-md bg-white dark:bg-gray-gray700 text-gray-gray800 dark:text-gray-gray100 focus:outline-none focus:ring-1 focus:ring-blue-blue"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = parseInt((e.target as HTMLInputElement).value);
                    if (val > 0) handleSetAllocated(val);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* ═══ Stage: Ready — Job creation wizard ═══ */}
        {stage === 'ready' && wizardStep === 0 && (
          <div className="max-w-lg">
            <div className="bg-white dark:bg-gray-gray700 rounded-lg border border-gray-gray200 dark:border-gray-gray600 p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-gray800 dark:text-gray-gray100">
                  {jobsRemaining} job{jobsRemaining !== 1 ? 's' : ''} remaining
                </h3>
                {allocated != null && allocated > 0 && (
                  <button onClick={() => handleSetAllocated(allocated)}
                    className="text-xs text-gray-gray400 dark:text-gray-gray500 hover:text-gray-gray600 dark:hover:text-gray-gray300 underline">
                    Edit allocation ({allocated})
                  </button>
                )}
              </div>

              {/* Show already-created jobs */}
              {existingJobs && existingJobs.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-gray500 dark:text-gray-gray400 mb-1.5">Created so far:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {existingJobs.map((j: any) => (
                      <span key={j.id} className="text-xs font-mono font-medium px-2 py-1 bg-green-greenLight2 dark:bg-green-greenDark1 text-green-green dark:text-green-greenLight1 rounded-md">
                        {j.name || j.id.slice(0, 10)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => setWizardStep(1)}
                className="w-full bg-black text-white px-4 py-2.5 rounded-md text-sm font-medium hover:opacity-90 hover:cursor-pointer shadow-xs">
                Create job {(opened ?? 0) + 1} of {allocated}
              </button>
            </div>
          </div>
        )}

        {/* ═══ Wizard Step 1: Location ═══ */}
        {stage === 'ready' && wizardStep === 1 && (
          <div className="max-w-xl">
            <WizardHeader step={1} total={3} label="Location" icon={<MapPinIcon size={20} />}
              subtitle={`Job ${(opened ?? 0) + 1} of ${allocated}`} />

            <div className="bg-white dark:bg-gray-gray700 rounded-lg border border-gray-gray200 dark:border-gray-gray600 p-5 mb-4">
              {/* Toggle existing / new */}
              <div className="flex gap-2 mb-4">
                <button onClick={() => setLocationMode('existing')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors hover:cursor-pointer ${locationMode === 'existing'
                      ? 'border-blue-blue bg-blue-blueLight2 dark:bg-blue-blueDark1 text-blue-blue'
                      : 'border-gray-gray200 dark:border-gray-gray600 text-gray-gray500 dark:text-gray-gray400'
                    }`}>
                  Search existing
                </button>
                <button onClick={() => setLocationMode('new')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors hover:cursor-pointer ${locationMode === 'new'
                      ? 'border-blue-blue bg-blue-blueLight2 dark:bg-blue-blueDark1 text-blue-blue'
                      : 'border-gray-gray200 dark:border-gray-gray600 text-gray-gray500 dark:text-gray-gray400'
                    }`}>
                  Create new
                </button>
              </div>

              {locationMode === 'existing' ? (
                <SearchDropdown
                  value={selectedLocationId}
                  displayValue={selectedLocationDisplay}
                  options={locationOptions}
                  onSelect={(id, label) => { setSelectedLocationId(id); setSelectedLocationDisplay(label); }}
                  placeholder="Search locations..."
                />
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-gray700 dark:text-gray-gray200 mb-1">Location name <span className="text-red-red">*</span></label>
                    <input type="text" value={newLocation.name}
                      onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                      placeholder="e.g. Boost Juice - Siam Paragon"
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-gray200 dark:border-gray-gray600 rounded-md bg-white dark:bg-gray-gray700 text-gray-gray800 dark:text-gray-gray100 focus:outline-none focus:ring-1 focus:ring-blue-blue" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-gray700 dark:text-gray-gray200 mb-1">Customer</label>
                    <SearchDropdown
                      value={newLocation.customerId}
                      displayValue={customerOptions.find(c => c.id === newLocation.customerId)?.label || ''}
                      options={customerOptions}
                      onSelect={(id, label) => setNewLocation({ ...newLocation, customerId: id })}
                      placeholder="Search customers..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-gray700 dark:text-gray-gray200 mb-1">Address</label>
                    <textarea value={newLocation.address}
                      onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                      rows={2} placeholder="Address..."
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-gray200 dark:border-gray-gray600 rounded-md bg-white dark:bg-gray-gray700 text-gray-gray800 dark:text-gray-gray100 focus:outline-none focus:ring-1 focus:ring-blue-blue resize-none" />
                  </div>
                  {countryOptions.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-gray700 dark:text-gray-gray200 mb-1">Country</label>
                      <SearchDropdown
                        value={newLocation.countryId}
                        displayValue={countryOptions.find(c => c.id === newLocation.countryId)?.label || ''}
                        options={countryOptions}
                        onSelect={(id) => setNewLocation({ ...newLocation, countryId: id })}
                        placeholder="Search countries..."
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <WizardNav
              onBack={() => setWizardStep(0)}
              onNext={() => {
                const hasLoc = locationMode === 'existing' ? !!selectedLocationId : !!newLocation.name;
                if (!hasLoc) { setError('Please select or create a location'); return; }
                setError(''); setWizardStep(2);
              }}
              nextDisabled={locationMode === 'existing' ? !selectedLocationId : !newLocation.name}
              nextLabel="Continue to BOM"
            />
          </div>
        )}

        {/* ═══ Wizard Step 2: BOM ═══ */}
        {stage === 'ready' && wizardStep === 2 && (
          <div className="max-w-xl">
            <WizardHeader step={2} total={3} label="Bill of Materials" icon={<PackageIcon size={20} />}
              subtitle={`Job ${(opened ?? 0) + 1} of ${allocated}`} />

            <div className="bg-white dark:bg-gray-gray700 rounded-lg border border-gray-gray200 dark:border-gray-gray600 p-5 mb-4">
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <SearchDropdown
                    value={newResId}
                    displayValue={newResDisplay}
                    options={resourceOptions}
                    onSelect={(id, label) => { setNewResId(id); setNewResDisplay(label); }}
                    placeholder="Search resource..."
                  />
                </div>
                <input type="number" min="1" value={newResQty}
                  onChange={(e) => setNewResQty(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                  className="w-20 px-2.5 py-1.5 text-sm border border-gray-gray200 dark:border-gray-gray600 rounded-md bg-white dark:bg-gray-gray700 text-gray-gray800 dark:text-gray-gray100 focus:outline-none focus:ring-1 focus:ring-blue-blue"
                  placeholder="Qty" />
                <button onClick={handleAddBomResource}
                  disabled={!newResId || !newResQty || Number(newResQty) < 1}
                  className="bg-black text-white px-2.5 py-1.5 rounded-md hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  <PlusIcon size={16} />
                </button>
              </div>

              {bomResources.length > 0 ? (
                <div className="border border-gray-gray200 dark:border-gray-gray600 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-gray50 dark:bg-gray-gray800">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-gray500 dark:text-gray-gray400">Resource</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-gray500 dark:text-gray-gray400 w-20">Qty</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-gray200 dark:divide-gray-gray600">
                      {bomResources.map(item => (
                        <tr key={item.id} className="bg-white dark:bg-gray-gray700">
                          <td className="px-3 py-2 text-sm text-gray-gray800 dark:text-gray-gray100">{item.resourceName}</td>
                          <td className="px-3 py-2 text-sm text-gray-gray800 dark:text-gray-gray100 text-center">{item.quantity}</td>
                          <td className="px-3 py-2">
                            <button onClick={() => setBomResources(bomResources.filter(r => r.id !== item.id))}
                              className="text-red-red hover:text-red-redDark1 p-0.5">
                              <TrashIcon size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-gray400 dark:text-gray-gray500 text-center py-4">No resources added yet.</p>
              )}
            </div>

            <WizardNav
              onBack={() => setWizardStep(1)}
              onNext={() => {
                if (bomResources.length === 0) { setError('Please add at least one BOM resource'); return; }
                setError(''); setWizardStep(3);
              }}
              nextDisabled={bomResources.length === 0}
              nextLabel="Continue to Job Details"
            />
          </div>
        )}

        {/* ═══ Wizard Step 3: Job Details ═══ */}
        {stage === 'ready' && wizardStep === 3 && (
          <div className="max-w-xl">
            <WizardHeader step={3} total={3} label="Job Details" icon={<BriefcaseIcon size={20} />}
              subtitle={`Job ${(opened ?? 0) + 1} of ${allocated}`} />

            <div className="bg-white dark:bg-gray-gray700 rounded-lg border border-gray-gray200 dark:border-gray-gray600 p-5 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-gray700 dark:text-gray-gray200 mb-1">Service <span className="text-red-red">*</span></label>
                  <select value={jobService} onChange={(e) => setJobService(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-gray200 dark:border-gray-gray600 rounded-md bg-white dark:bg-gray-gray700 text-gray-gray800 dark:text-gray-gray100 focus:outline-none focus:ring-1 focus:ring-blue-blue">
                    <option value="">Select...</option>
                    {SERVICE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-gray700 dark:text-gray-gray200 mb-1">Partner <span className="text-red-red">*</span></label>
                  <SearchDropdown value={jobPartnerId} displayValue={jobPartnerDisplay} options={partnerOptions}
                    onSelect={(id, label) => { setJobPartnerId(id); setJobPartnerDisplay(label); }} placeholder="Search partners..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-gray700 dark:text-gray-gray200 mb-1">Job Type <span className="text-red-red">*</span></label>
                  <select value={jobType} onChange={(e) => setJobType(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-gray200 dark:border-gray-gray600 rounded-md bg-white dark:bg-gray-gray700 text-gray-gray800 dark:text-gray-gray100 focus:outline-none focus:ring-1 focus:ring-blue-blue">
                    <option value="">Select...</option>
                    {JOB_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-gray700 dark:text-gray-gray200 mb-1">Status <span className="text-red-red">*</span></label>
                  <select value={jobStatus} onChange={(e) => setJobStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-gray200 dark:border-gray-gray600 rounded-md bg-white dark:bg-gray-gray700 text-gray-gray800 dark:text-gray-gray100 focus:outline-none focus:ring-1 focus:ring-blue-blue">
                    <option value="">Select...</option>
                    {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-gray700 dark:text-gray-gray200 mb-1">Date Scheduled <span className="text-red-red">*</span></label>
                  <input type="date" value={jobDateScheduled} onChange={(e) => setJobDateScheduled(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-gray200 dark:border-gray-gray600 rounded-md bg-white dark:bg-gray-gray700 text-gray-gray800 dark:text-gray-gray100 focus:outline-none focus:ring-1 focus:ring-blue-blue" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-gray700 dark:text-gray-gray200 mb-1">Assigned to <span className="text-red-red">*</span></label>
                  <AssignedToCell selectedIds={jobAssignedToIds} collaboratorOptions={collaboratorOptions}
                    onChange={setJobAssignedToIds} />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setWizardStep(2)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white dark:bg-gray-gray600 hover:bg-gray-gray50 dark:hover:bg-gray-gray500 text-gray-gray700 dark:text-gray-gray200 px-4 py-2.5 rounded-md text-sm font-medium border border-gray-gray200 dark:border-gray-gray600 hover:cursor-pointer">
                <ArrowLeftIcon size={14} /> Back
              </button>
              <button onClick={handleCreateJob} disabled={isCreating}
                className="flex-1 bg-black text-white px-4 py-2.5 rounded-md text-sm font-medium hover:opacity-90 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs">
                {isCreating ? 'Creating...' : `Create Job ${(opened ?? 0) + 1}`}
              </button>
            </div>
          </div>
        )}

        {/* ═══ Stage: Done ═══ */}
        {stage === 'done' && (
          <div className="max-w-lg">
            <div className="bg-white dark:bg-gray-gray700 rounded-lg border border-gray-gray200 dark:border-gray-gray600 p-5 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-greenLight2 dark:bg-green-greenDark1 rounded-full mb-3">
                <CheckIcon size={28} className="text-green-green dark:text-green-greenLight1" weight="bold" />
              </div>
              <h3 className="text-base font-semibold text-gray-gray800 dark:text-gray-gray100 mb-1">
                All {allocated} job{(allocated ?? 0) > 1 ? 's' : ''} created
              </h3>
              <p className="text-sm text-gray-gray500 dark:text-gray-gray400 mb-4">This quote is fully staged.</p>
              {existingJobs && existingJobs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {existingJobs.map((j: any) => (
                    <span key={j.id} className="text-xs font-mono font-medium px-2 py-1 bg-green-greenLight2 dark:bg-green-greenDark1 text-green-green dark:text-green-greenLight1 rounded-md">
                      {j.name || j.id.slice(0, 10)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== Wizard sub-components ====================

function WizardHeader({ step, total, label, icon, subtitle }: {
  step: number; total: number; label: string; icon: React.ReactNode; subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <React.Fragment key={i}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${i + 1 < step ? 'bg-green-green text-white' :
                i + 1 === step ? 'bg-blue-blue text-white' :
                  'bg-gray-gray200 dark:bg-gray-gray600 text-gray-gray500 dark:text-gray-gray400'
              }`}>
              {i + 1 < step ? <CheckIcon size={14} weight="bold" /> : i + 1}
            </div>
            {i < total - 1 && <div className={`w-6 h-0.5 rounded ${i + 1 < step ? 'bg-green-green' : 'bg-gray-gray200 dark:bg-gray-gray600'}`} />}
          </React.Fragment>
        ))}
      </div>
      <div className="ml-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-gray800 dark:text-gray-gray100">
          {icon} {label}
        </div>
        <p className="text-xs text-gray-gray500 dark:text-gray-gray400">{subtitle}</p>
      </div>
    </div>
  );
}

function WizardNav({ onBack, onNext, nextDisabled, nextLabel }: {
  onBack: () => void; onNext: () => void; nextDisabled: boolean; nextLabel: string;
}) {
  return (
    <div className="flex gap-3">
      <button onClick={onBack}
        className="flex-1 flex items-center justify-center gap-1.5 bg-white dark:bg-gray-gray600 hover:bg-gray-gray50 dark:hover:bg-gray-gray500 text-gray-gray700 dark:text-gray-gray200 px-4 py-2.5 rounded-md text-sm font-medium border border-gray-gray200 dark:border-gray-gray600 hover:cursor-pointer">
        <ArrowLeftIcon size={14} /> Back
      </button>
      <button onClick={onNext} disabled={nextDisabled}
        className="flex-1 flex items-center justify-center gap-1.5 bg-black text-white px-4 py-2.5 rounded-md text-sm font-medium hover:opacity-90 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs">
        {nextLabel} <ArrowRightIcon size={14} />
      </button>
    </div>
  );
}

// ==================== Error Boundary ====================

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[QuoteStaging] Crash:', error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'monospace' }}>
          <h2 style={{ color: 'red' }}>Extension crashed</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {this.state.error.message}{'\n'}{this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==================== Main App ====================

interface ResolvedTables {
  hsQuotesTable: Table;
  locationsTable: Table;
  bomTable: Table;
  bomResourcesTable: Table;
  jobsTable: Table;
  resourcesTable: Table;
  customersTable: Table;
  partnersTable: Table;
}

function QuoteStagingInner({ tables, base }: { tables: ResolvedTables; base: ReturnType<typeof useBase> }): React.ReactElement {
  const quotes = useRecords(tables.hsQuotesTable);
  const locations = useRecords(tables.locationsTable);
  const resources = useRecords(tables.resourcesTable);
  const customers = useRecords(tables.customersTable);
  const partners = useRecords(tables.partnersTable);

  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const selectedQuote = selectedQuoteId ? (quotes ?? []).find((q: any) => q.id === selectedQuoteId) : null;

  return (
    <div className="min-h-screen flex bg-gray-gray50 dark:bg-gray-gray800">
      <QuoteQueue
        quotes={quotes}
        hsQuotesTable={tables.hsQuotesTable}
        selectedQuoteId={selectedQuoteId}
        onSelect={setSelectedQuoteId}
      />

      {selectedQuote ? (
        <QuoteWorkspace
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
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-gray400 dark:text-gray-gray500">
          <div className="text-center">
            <ListChecksIcon size={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Select a quote from the queue to get started</p>
          </div>
        </div>
      )}
    </div>
  );
}

function QuoteStagingApp(): React.ReactElement {
  const base = useBase();
  const { customPropertyValueByKey, errorState } = useCustomProperties(
    useCallback((b: ReturnType<typeof useBase>) => getCustomProperties(b), [])
  );

  if (errorState) {
    return (
      <div className="min-h-screen bg-gray-gray50 dark:bg-gray-gray800 p-6 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-gray700 rounded-lg shadow-md p-6 max-w-md">
          <p className="text-red-red font-medium">Error loading configuration</p>
          <p className="text-gray-gray500 dark:text-gray-gray300 text-sm mt-2">Please configure the extension in the properties panel.</p>
        </div>
      </div>
    );
  }

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

  const missingTables = Object.entries(tables)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missingTables.length > 0) {
    return (
      <div className="min-h-screen bg-gray-gray50 dark:bg-gray-gray800 p-6 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-gray700 rounded-lg shadow-md p-6 max-w-md">
          <p className="text-gray-gray700 dark:text-gray-gray200 font-medium">Configuration Required</p>
          <p className="text-gray-gray500 dark:text-gray-gray300 text-sm mt-2">
            Missing tables: {missingTables.join(', ')}. Add them to the interface data sources, then select them in the properties panel.
          </p>
        </div>
      </div>
    );
  }

  return <QuoteStagingInner tables={tables as ResolvedTables} base={base} />;
}

initializeBlock({ interface: () => <ErrorBoundary><QuoteStagingApp /></ErrorBoundary> });
