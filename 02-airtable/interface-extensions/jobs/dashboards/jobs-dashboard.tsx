import React, { useState, useMemo, useCallback } from 'react';
import {
  initializeBlock,
  useBase,
  useRecords,
  useCustomProperties,
} from '@airtable/blocks/interface/ui';
import { Table } from '@airtable/blocks/interface/models';

const FIELD_IDS = {
  status: 'fld7q5wjIg47nltes',
  jobType: 'fldk5E1PkIy1ZrM1e',
  service: 'fldexkzrV3Z1z270B',
  dateScheduled: 'fld19en5UMabiUnqG',
  dateCompleted: 'fldu0PmyaUa3gAMjd',
  brand: 'fldGPMfidH7qwjPm6',
  country: 'fldBsUJatSTFaBFm4',
  locationName: 'fldf3BFB6lc1mj3we',
  jobId: 'fldcbFW9pJzt3ZIVh',
  stage: 'fldf5sIFaYbXUTb0y',
  region: 'fld0UgPikqyOZ5wJC',
  timeSlot: 'fldPrLpyLZJsocBP1',
};

const STATUS_COLORS: Record<string, string> = {
  'Done': '#34d399',
  'Installed': '#5eead4',
  'Scheduled': '#fbbf24',
  'Tentative': '#60a5fa',
  'Unscheduled': '#f87171',
  'Incomplete': '#fb923c',
  'Cancelled': '#ef4444',
};

const JOB_TYPE_COLORS: Record<string, string> = {
  'Installation': '#6366f1',
  'Ma - Preventive': '#06b6d4',
  'Ma - Reactive': '#8b5cf6',
  'Ma - Audit': '#14b8a6',
  'Delivery': '#f59e0b',
  'Collect': '#ef4444',
  'Survey': '#10b981',
  'Un-installation': '#ec4899',
  'Rework': '#64748b',
  'Account setup': '#a855f7',
  'Pre-sale': '#22c55e',
};

const CHART_PALETTE = [
  '#6366f1', '#06b6d4', '#f59e0b', '#ef4444', '#10b981',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b',
  '#a855f7', '#22c55e', '#e11d48', '#0ea5e9', '#84cc16',
];

function getCustomProperties(base: ReturnType<typeof useBase>) {
  const jobsTable = base.tables.find(t => t.id === 'tblwHj9cO37wp1fVx');
  return [
    { key: 'jobsTable', label: 'Jobs', type: 'table' as const, defaultValue: jobsTable },
  ];
}

function getFieldValue(record: any, table: Table, fieldId: string): string {
  const field = table.getFieldIfExists(fieldId);
  return field ? (record.getCellValueAsString(field) || '') : '';
}

// ── Stat Card ──
function StatCard({ label, value, subtitle, color, icon }: {
  label: string; value: string | number; subtitle?: string; color: string; icon?: string;
}) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: '20px 24px',
      flex: '1 1 180px',
      minWidth: 160,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      border: '1px solid #f1f5f9',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: color,
      }} />
      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        {icon && <span style={{ marginRight: 6 }}>{icon}</span>}
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{subtitle}</div>
      )}
    </div>
  );
}

// ── SVG Donut Chart ──
function DonutChart({ data, title, size = 200 }: {
  data: { label: string; value: number; color: string }[];
  title: string;
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const radius = (size - 20) / 2;
  const strokeWidth = radius * 0.35;
  const innerRadius = radius - strokeWidth;
  const circumference = 2 * Math.PI * innerRadius;
  const cx = size / 2;
  const cy = size / 2;

  let cumulativeOffset = 0;
  const arcs = data.filter(d => d.value > 0).map(d => {
    const pct = d.value / total;
    const dashArray = `${circumference * pct} ${circumference * (1 - pct)}`;
    const dashOffset = -cumulativeOffset * circumference;
    cumulativeOffset += pct;
    return { ...d, pct, dashArray, dashOffset };
  });

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={innerRadius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={arc.dashArray}
              strokeDashoffset={arc.dashOffset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          ))}
          <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 24, fontWeight: 700, fill: '#0f172a' }}>
            {total.toLocaleString()}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 11, fill: '#94a3b8' }}>
            total
          </text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 120 }}>
          {arcs.map((arc, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: arc.color, flexShrink: 0 }} />
              <span style={{ color: '#475569', flex: 1 }}>{arc.label}</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{arc.value}</span>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>({(arc.pct * 100).toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Horizontal Bar Chart ──
function HBarChart({ data, title, maxBars = 12 }: {
  data: { label: string; value: number; color: string }[];
  title: string;
  maxBars?: number;
}) {
  const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, maxBars);
  const max = Math.max(...sorted.map(d => d.value), 1);

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 110, fontSize: 12, color: '#475569', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.label}
            </div>
            <div style={{ flex: 1, height: 24, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                width: `${(d.value / max) * 100}%`,
                height: '100%',
                background: d.color,
                borderRadius: 6,
                transition: 'width 0.5s ease',
                minWidth: d.value > 0 ? 2 : 0,
              }} />
            </div>
            <div style={{ width: 40, fontSize: 13, fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>
              {d.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SVG Mini Bar Chart (vertical) ──
function VBarChart({ data, title }: {
  data: { label: string; value: number; color: string }[];
  title: string;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  const barWidth = 32;
  const gap = 8;
  const chartHeight = 160;
  const labelHeight = 50;
  const width = data.length * (barWidth + gap) + gap;

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflowX: 'auto' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>{title}</div>
      <svg width={Math.max(width, 300)} height={chartHeight + labelHeight} style={{ display: 'block' }}>
        {data.map((d, i) => {
          const barHeight = (d.value / max) * chartHeight;
          const x = gap + i * (barWidth + gap);
          return (
            <g key={i}>
              <rect
                x={x} y={chartHeight - barHeight}
                width={barWidth} height={barHeight}
                rx={4} fill={d.color}
                style={{ transition: 'height 0.5s ease, y 0.5s ease' }}
              />
              <text
                x={x + barWidth / 2} y={chartHeight - barHeight - 6}
                textAnchor="middle" style={{ fontSize: 11, fontWeight: 600, fill: '#0f172a' }}
              >
                {d.value}
              </text>
              <text
                x={x + barWidth / 2} y={chartHeight + 14}
                textAnchor="middle" style={{ fontSize: 10, fill: '#64748b' }}
                transform={`rotate(45 ${x + barWidth / 2} ${chartHeight + 14})`}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Section Header ──
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16, marginTop: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>{subtitle}</p>}
    </div>
  );
}

// ── Upcoming Jobs Table ──
function UpcomingJobsTable({ jobs }: { jobs: { id: string; location: string; type: string; status: string; date: string; brand: string }[] }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Upcoming Scheduled Jobs</span>
        <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>({jobs.length})</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Job ID', 'Location', 'Brand', 'Type', 'Status', 'Scheduled'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.slice(0, 20).map((job, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 16px', fontWeight: 500, color: '#0f172a', fontFamily: 'monospace', fontSize: 12 }}>{job.id}</td>
                <td style={{ padding: '10px 16px', color: '#475569', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.location}</td>
                <td style={{ padding: '10px 16px', color: '#475569' }}>{job.brand}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                    background: (JOB_TYPE_COLORS[job.type] || '#64748b') + '20',
                    color: JOB_TYPE_COLORS[job.type] || '#64748b',
                  }}>{job.type}</span>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                    background: (STATUS_COLORS[job.status] || '#64748b') + '20',
                    color: STATUS_COLORS[job.status] || '#64748b',
                  }}>{job.status}</span>
                </td>
                <td style={{ padding: '10px 16px', color: '#475569', whiteSpace: 'nowrap' }}>{job.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Dashboard ──
function JobsDashboard(): React.ReactElement {
  const base = useBase();
  const { customPropertyValueByKey } = useCustomProperties(
    useCallback((b: ReturnType<typeof useBase>) => getCustomProperties(b), [])
  );

  const jobsTable = customPropertyValueByKey.jobsTable as Table | undefined;
  const allRecords = useRecords(jobsTable ?? null);

  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const metrics = useMemo(() => {
    if (!jobsTable || !allRecords) return null;

    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const serviceCounts: Record<string, number> = {};
    const brandCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    const monthlyScheduled: Record<string, number> = {};
    const monthlyCompleted: Record<string, number> = {};
    const upcoming: { id: string; location: string; type: string; status: string; date: string; brand: string }[] = [];

    const today = new Date().toISOString().slice(0, 10);

    const records = allRecords.filter(r => {
      if (serviceFilter !== 'all') {
        const svc = getFieldValue(r, jobsTable, FIELD_IDS.service);
        if (svc !== serviceFilter) return false;
      }
      if (typeFilter !== 'all') {
        const jt = getFieldValue(r, jobsTable, FIELD_IDS.jobType);
        if (jt !== typeFilter) return false;
      }
      return true;
    });

    for (const r of records) {
      const status = getFieldValue(r, jobsTable, FIELD_IDS.status) || 'Unknown';
      const jobType = getFieldValue(r, jobsTable, FIELD_IDS.jobType) || 'Unknown';
      const service = getFieldValue(r, jobsTable, FIELD_IDS.service) || 'Unknown';
      const brand = getFieldValue(r, jobsTable, FIELD_IDS.brand) || 'Unknown';
      const country = getFieldValue(r, jobsTable, FIELD_IDS.country) || 'Unknown';
      const scheduled = getFieldValue(r, jobsTable, FIELD_IDS.dateScheduled);
      const completed = getFieldValue(r, jobsTable, FIELD_IDS.dateCompleted);
      const jobId = getFieldValue(r, jobsTable, FIELD_IDS.jobId);
      const location = getFieldValue(r, jobsTable, FIELD_IDS.locationName);

      statusCounts[status] = (statusCounts[status] || 0) + 1;
      typeCounts[jobType] = (typeCounts[jobType] || 0) + 1;
      serviceCounts[service] = (serviceCounts[service] || 0) + 1;
      brandCounts[brand] = (brandCounts[brand] || 0) + 1;
      countryCounts[country] = (countryCounts[country] || 0) + 1;

      if (scheduled) {
        const month = scheduled.slice(0, 7);
        monthlyScheduled[month] = (monthlyScheduled[month] || 0) + 1;
      }
      if (completed) {
        const month = completed.slice(0, 7);
        monthlyCompleted[month] = (monthlyCompleted[month] || 0) + 1;
      }

      if (scheduled && scheduled >= today && (status === 'Scheduled' || status === 'Tentative' || status === 'Unscheduled')) {
        upcoming.push({ id: jobId, location, type: jobType, status, date: scheduled, brand });
      }
    }

    upcoming.sort((a, b) => a.date.localeCompare(b.date));

    const allMonths = new Set([...Object.keys(monthlyScheduled), ...Object.keys(monthlyCompleted)]);
    const sortedMonths = [...allMonths].sort().slice(-12);

    const allServices = [...new Set(allRecords.map(r => getFieldValue(r, jobsTable, FIELD_IDS.service)).filter(Boolean))];
    const allTypes = [...new Set(allRecords.map(r => getFieldValue(r, jobsTable, FIELD_IDS.jobType)).filter(Boolean))];

    return {
      total: records.length,
      done: statusCounts['Done'] || 0,
      scheduled: statusCounts['Scheduled'] || 0,
      unscheduled: statusCounts['Unscheduled'] || 0,
      incomplete: statusCounts['Incomplete'] || 0,
      statusCounts,
      typeCounts,
      serviceCounts,
      brandCounts,
      countryCounts,
      monthlyScheduled,
      monthlyCompleted,
      sortedMonths,
      upcoming,
      allServices,
      allTypes,
    };
  }, [allRecords, jobsTable, serviceFilter, typeFilter]);

  if (!jobsTable) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Configure the Jobs table in page settings.</div>;
  }
  if (!metrics) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading...</div>;
  }

  const statusData = Object.entries(metrics.statusCounts)
    .map(([label, value]) => ({ label, value, color: STATUS_COLORS[label] || '#94a3b8' }))
    .sort((a, b) => b.value - a.value);

  const typeData = Object.entries(metrics.typeCounts)
    .map(([label, value], i) => ({ label, value, color: JOB_TYPE_COLORS[label] || CHART_PALETTE[i % CHART_PALETTE.length] }))
    .sort((a, b) => b.value - a.value);

  const brandData = Object.entries(metrics.brandCounts)
    .map(([label, value], i) => ({ label, value, color: CHART_PALETTE[i % CHART_PALETTE.length] }))
    .sort((a, b) => b.value - a.value);

  const countryData = Object.entries(metrics.countryCounts)
    .map(([label, value], i) => ({ label, value, color: CHART_PALETTE[i % CHART_PALETTE.length] }));

  const monthlyData = metrics.sortedMonths.map((m, i) => ({
    label: m.slice(2),
    scheduled: metrics.monthlyScheduled[m] || 0,
    completed: metrics.monthlyCompleted[m] || 0,
  }));

  const filterBarStyle: React.CSSProperties = {
    display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24,
    padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0',
  };

  const selectStyle: React.CSSProperties = {
    padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1',
    fontSize: 13, color: '#0f172a', background: '#fff', cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Jobs Dashboard</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
          {allRecords?.length.toLocaleString()} jobs loaded
        </p>
      </div>

      {/* Filters */}
      <div style={filterBarStyle}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters</span>
        <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} style={selectStyle}>
          <option value="all">All Services</option>
          {metrics.allServices.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="all">All Job Types</option>
          {metrics.allTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {(serviceFilter !== 'all' || typeFilter !== 'all') && (
          <button
            onClick={() => { setServiceFilter('all'); setTypeFilter('all'); }}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, color: '#ef4444', cursor: 'pointer' }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
        <StatCard label="Total Jobs" value={metrics.total} color="#6366f1" icon="📋" />
        <StatCard label="Done" value={metrics.done} subtitle={`${metrics.total ? ((metrics.done / metrics.total) * 100).toFixed(0) : 0}% complete`} color="#34d399" icon="✓" />
        <StatCard label="Scheduled" value={metrics.scheduled} color="#fbbf24" icon="📅" />
        <StatCard label="Unscheduled" value={metrics.unscheduled} color="#f87171" icon="⏳" />
        <StatCard label="Incomplete" value={metrics.incomplete} color="#fb923c" icon="⚠" />
      </div>

      {/* Status + Job Type */}
      <SectionHeader title="Pipeline Overview" subtitle="Job distribution by status and type" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
        <DonutChart title="Jobs by Status" data={statusData} size={180} />
        <DonutChart title="Jobs by Service" data={
          Object.entries(metrics.serviceCounts).map(([label, value], i) => ({
            label, value, color: CHART_PALETTE[i % CHART_PALETTE.length],
          }))
        } size={180} />
      </div>

      <div style={{ marginTop: 16 }}>
        <HBarChart title="Jobs by Type" data={typeData} />
      </div>

      {/* Brand + Country */}
      <SectionHeader title="Brand & Geography" subtitle="Job distribution by brand and country" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
        <HBarChart title="Jobs by Brand" data={brandData} maxBars={15} />
        <HBarChart title="Jobs by Country" data={countryData} />
      </div>

      {/* Monthly Trends */}
      <SectionHeader title="Monthly Trends" subtitle="Jobs scheduled and completed over the last 12 months" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
        <VBarChart
          title="Scheduled per Month"
          data={monthlyData.map((m, i) => ({ label: m.label, value: m.scheduled, color: '#6366f1' }))}
        />
        <VBarChart
          title="Completed per Month"
          data={monthlyData.map((m, i) => ({ label: m.label, value: m.completed, color: '#34d399' }))}
        />
      </div>

      {/* Upcoming Jobs */}
      {metrics.upcoming.length > 0 && (
        <>
          <SectionHeader title="Upcoming Schedule" subtitle="Jobs scheduled from today onwards" />
          <UpcomingJobsTable jobs={metrics.upcoming} />
        </>
      )}
    </div>
  );
}

initializeBlock({ interface: () => <JobsDashboard /> });
