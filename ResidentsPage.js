/* ===================================================
   ResidentsPage.js
   Global Hillview Society Portal — Residents Module
   Includes: Data Mapping, Analytics Dashboard & Directory
   =================================================== */

// ── 1. DATA TRANSFORMATION LAYER ──────────────────────
/**
 * Maps CSV headers to the property names used by the components.
 * This ensures compatibility between the "Residents Data.xlsx" and the UI logic.
 */
const transformResidentData = (rawData) => {
  if (!rawData || !Array.isArray(rawData)) return [];
  
  return rawData.map(row => ({
    // Flat & Location Info
    Tower: String(row['Tower No.'] || '').trim(),
    Flat: String(row['Flat No.'] || '').trim(),
    FlatType: (row['Flat Type'] || '').trim(),
    Area: row['AREA(SqFt)'] || '0',
    Parking: row['Parking No.'] || '-',
    Vehicle: row['Vehicle Number'] || '-',
    
    // Occupancy Status
    Residing: row['Residing (Owner/Tenant)'] || 'No Status',
    SaleResale: row['Sale & Resale'] || '-',
    MoveIn: row['Move In '] || '-', // Note the trailing space in CSV header
    
    // Owner Information
    PrimaryOwner: row['Primary Owner Name'] || 'Unknown',
    SecondaryOwner: row['Secondary Owner Name'] || '-',
    PrimaryPhone: row['Primary Owner Number'] || '-',
    AltPhone1: row['Alternate Owner Number-1'] || '-',
    OwnerEmail: row['Owner E-MAIL ID'] || '-',
    OwnerKYC: row['Owner KYC Done'] || 'No',
    OwnerRegistry: row['Owner Registry'] || 'No',
    OwnerPhoto: row['Owner Photo'] || 'No',
    OwnerAadhar: row['Owner Aadhar'] || 'No',

    // Tenant Information
    TenantName: row['Tenant Name'] || '-',
    TenantPhone: row['Tenant Contact no'] || '-',
    TenantEmail: row['Tenant Email Id'] || '-',
    TenantKYC: row['Tenant KYC Done'] || 'No',
    TenantRentAgreement: row['Tenant Rent Agreement'] || 'No',
    TenantPoliceVerification: row['Tenant Police Verification'] || 'No',
    TenantRC: row['Tenant RC'] || 'No',
    TenantMoveIn: row['Tenant Move In '] || '-',
    TenantMoveOut: row['Tenant Move Out'] || '-',

    // Administrative
    DocumentsPending: row['Documents Pending'] || 'None',
    EnviroReason: row['Enviro Reason'] || '-',
    MoveInOut: row['Move In & Out Charges'] || '-'
  }));
};

// ── 2. UI HELPER COMPONENTS ───────────────────────────

function MiniBarChart({ data, colorFn, height = 80 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-1">
          <span className="text-xs text-gray-500 font-medium">{d.value}</span>
          <div
            className="w-full rounded-t transition-all"
            style={{ height: `${(d.value / max) * (height - 24)}px`, background: colorFn(i, d) }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-xs text-gray-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments, size = 120 }) {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;
  let angle = -90;
  const paths = segments.map(seg => {
    const pct = seg.value / total;
    const start = angle;
    angle += pct * 360;
    const end = angle;
    const r = size / 2 - 8;
    const cx = size / 2, cy = size / 2;
    const startRad = (start * Math.PI) / 180;
    const endRad   = (end   * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const large = pct > 0.5 ? 1 : 0;
    return { ...seg, d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z` };
  });
  const ir = (size / 2 - 8) * 0.55;
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} opacity={0.9}>
          <title>{p.label}: {p.value} ({((p.value / total) * 100).toFixed(1)}%)</title>
        </path>
      ))}
      <circle cx={size / 2} cy={size / 2} r={ir} fill="white" />
      <text x={size / 2} y={size / 2 - 6} textAnchor="middle" fontSize="16" fontWeight="700" fill="#1f2937">{total}</text>
      <text x={size / 2} y={size / 2 + 12} textAnchor="middle" fontSize="9" fill="#6b7280">TOTAL</text>
    </svg>
  );
}

function StatCard({ label, value, sub, color = '#3b82f6', icon, onClick, active }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-4 shadow-sm transition-all ${onClick ? 'cursor-pointer hover:shadow-md' : ''} ${active ? 'ring-2' : ''}`}
      style={active ? { ringColor: color } : {}}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {icon && (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: color + '20' }}>
            <svg className="w-5 h-5" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
            </svg>
          </div>
        )}
      </div>
      {active && <div className="mt-2 h-0.5 rounded" style={{ background: color }} />}
    </div>
  );
}

// ── 3. ANALYTICS PANELS ───────────────────────────────

function TowerOccupancyGrid({ data }) {
  const towers = ['1','2','3','4','5'];
  const byTower = towers.map(t => {
    const flats = data.filter(r => r.Tower === t);
    const owner  = flats.filter(r => r.Residing === 'Owner').length;
    const tenant = flats.filter(r => r.Residing === 'Tenant').length;
    const vacant = flats.filter(r => r.Residing === 'Vaccant').length;
    const noStat = flats.filter(r => r.Residing === 'No Status').length;
    const kycDone = flats.filter(r => r.OwnerKYC === 'Yes').length;
    return { t, total: flats.length, owner, tenant, vacant, noStat, kycDone };
  });

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Tower-wise Occupancy Breakdown</h3>
      <div className="space-y-3">
        {byTower.map(({ t, total, owner, tenant, vacant, noStat, kycDone }) => {
          const ownerPct  = total > 0 ? Math.round(owner  / total * 100) : 0;
          const tenantPct = total > 0 ? Math.round(tenant / total * 100) : 0;
          const vacantPct = total > 0 ? Math.round(vacant / total * 100) : 0;
          const noStatPct = 100 - ownerPct - tenantPct - vacantPct;
          return (
            <div key={t}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-600">Tower {t}</span>
                <span className="text-xs text-gray-400">{total} flats · {kycDone} KYC done</span>
              </div>
              <div className="flex h-6 rounded-md overflow-hidden gap-px">
                {owner  > 0 && <div style={{ width: `${ownerPct}%`,  background:'#3b82f6' }} title={`Owner: ${owner}`} className="flex items-center justify-center text-white text-xs font-medium">{ownerPct > 8 ? `${owner}` : ''}</div>}
                {tenant > 0 && <div style={{ width: `${tenantPct}%`, background:'#10b981' }} title={`Tenant: ${tenant}`} className="flex items-center justify-center text-white text-xs font-medium">{tenantPct > 8 ? `${tenant}` : ''}</div>}
                {vacant > 0 && <div style={{ width: `${vacantPct}%`, background:'#f59e0b' }} title={`Vacant: ${vacant}`} className="flex items-center justify-center text-white text-xs font-medium">{vacantPct > 8 ? `${vacant}` : ''}</div>}
                {noStat > 0 && <div style={{ width: `${noStatPct}%`, background:'#e5e7eb' }} title={`No Status: ${noStat}`} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KYCProgressPanel({ data }) {
  const towers = ['1','2','3','4','5'];
  const cols = [
    { key: 'OwnerKYC',      label: 'Owner KYC',         color: '#3b82f6' },
    { key: 'OwnerRegistry', label: 'Registry',           color: '#8b5cf6' },
    { key: 'OwnerAadhar',   label: 'Owner Aadhar',       color: '#06b6d4' },
    { key: 'TenantKYC',     label: 'Tenant KYC',         color: '#10b981' },
    { key: 'TenantPoliceVerification', label: 'Police Verif.', color: '#f59e0b' },
    { key: 'TenantRentAgreement', label: 'Rent Agreement', color: '#ef4444' },
  ];

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm overflow-x-auto">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">KYC & Document Completion by Tower</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-3 text-gray-500 font-medium">Tower</th>
            {cols.map(c => (
              <th key={c.key} className="text-center py-2 px-2 text-gray-500 font-medium whitespace-nowrap">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {towers.map(t => {
            const flats = data.filter(r => r.Tower === t);
            const total = flats.length || 1;
            return (
              <tr key={t} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 pr-3 font-semibold text-gray-700">T{t}</td>
                {cols.map(c => {
                  const done = flats.filter(r => r[c.key] === 'Yes').length;
                  const pct  = Math.round(done / total * 100);
                  return (
                    <td key={c.key} className="py-2 px-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-semibold text-gray-700">{pct}%</span>
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                        </div>
                        <span className="text-gray-400">{done}/{total}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DocumentStatusBreakdown({ data }) {
  const counts = {};
  data.forEach(r => {
    const d = (r.DocumentsPending || 'Unknown').trim();
    counts[d] = (counts[d] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const palette = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#14b8a6','#6366f1','#78716c'];
  const total = sorted.reduce((s, [,v]) => s + v, 0);

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Document Status Distribution</h3>
      <div className="flex items-start gap-4 flex-wrap">
        <DonutChart
          size={140}
          segments={sorted.map(([label, value], i) => ({ label, value, color: palette[i % palette.length] }))}
        />
        <div className="flex-1 space-y-1.5 min-w-0">
          {sorted.map(([label, value], i) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: palette[i % palette.length] }} />
                <span className="text-xs text-gray-600 truncate">{label}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-semibold text-gray-700 w-6 text-right">{value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 4. RESIDENT DETAIL MODAL ──────────────────────────

function ResidentViewModal({ row, onClose }) {
  const sections = [
    {
      title: 'Flat Details',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      fields: [
        ['Tower', `Tower ${row.Tower}`],
        ['Flat No.', row.Flat],
        ['Flat Type', row.FlatType],
        ['Area', `${row.Area} sq ft`],
        ['Parking No.', row.Parking],
        ['Vehicle', row.Vehicle],
        ['Residing', row.Residing],
        ['Ownership', row.SaleResale],
        ['Move-in Date', row.MoveIn],
      ]
    },
    {
      title: 'Owner Details',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      fields: [
        ['Primary Owner', row.PrimaryOwner],
        ['Secondary Owner', row.SecondaryOwner],
        ['Mobile', row.PrimaryPhone],
        ['Alt. Mobile', row.AltPhone1],
        ['Email', row.OwnerEmail],
        ['KYC Status', row.OwnerKYC],
        ['Registry', row.OwnerRegistry],
        ['Photo', row.OwnerPhoto],
        ['Aadhar', row.OwnerAadhar],
      ]
    },
    {
      title: 'Tenant Details',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      fields: [
        ['Tenant Name', row.TenantName],
        ['Mobile', row.TenantPhone],
        ['Email', row.TenantEmail],
        ['Tenant KYC', row.TenantKYC],
        ['Rent Agreement', row.TenantRentAgreement],
        ['Police Verif.', row.TenantPoliceVerification],
        ['Tenant RC', row.TenantRC],
        ['Move-in', row.TenantMoveIn],
        ['Move-out', row.TenantMoveOut],
      ]
    },
    {
      title: 'Documents',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      fields: [
        ['Documents Pending', row.DocumentsPending],
        ['Enviro Reason', row.EnviroReason],
        ['Move In/Out Charges', row.MoveInOut],
      ]
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Flat {row.Flat} · Tower {row.Tower}</h3>
            <p className="text-xs text-gray-500">{row.PrimaryOwner} · Type {row.FlatType}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {sections.map(sec => (
              <div key={sec.title} className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-700 uppercase mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={sec.icon} /></svg>
                  {sec.title}
                </p>
                <div className="space-y-2">
                  {sec.fields.map(([label, value]) => (
                    <div key={label} className="flex justify-between items-start gap-2">
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className={`text-xs font-medium text-right ${value === 'Yes' ? 'text-green-600' : value === 'No' ? 'text-red-500' : 'text-gray-700'}`}>{value || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 5. MAIN PAGE COMPONENT ────────────────────────────

function ResidentsPage({ rawData }) {
  const { useState, useMemo } = React;

  // Process data from spreadsheet format to internal format
  const data = useMemo(() => transformResidentData(rawData), [rawData]);

  const [activeTab,   setActiveTab]   = useState('analytics');
  const [search,      setSearch]      = useState('');
  const [towerFilter, setTowerFilter] = useState('all');
  const [typeFilter,  setTypeFilter]  = useState('all');
  const [kycFilter,   setKYCFilter]   = useState('all');
  const [viewRow,     setViewRow]     = useState(null);

  // Summary statistics
  const stats = useMemo(() => {
    const total      = data.length;
    const owners     = data.filter(r => r.Residing === 'Owner').length;
    const tenants    = data.filter(r => r.Residing === 'Tenant').length;
    const vacant     = data.filter(r => r.Residing === 'Vaccant').length;
    const kycDone    = data.filter(r => r.OwnerKYC === 'Yes').length;
    const docComplete= data.filter(r => (r.DocumentsPending || '').includes('Complete')).length;
    return { total, owners, tenants, vacant, kycDone, docComplete };
  }, [data]);

  // Directory filtering logic
  const filtered = useMemo(() => {
    let rows = data;
    if (towerFilter !== 'all') rows = rows.filter(r => r.Tower === towerFilter);
    if (typeFilter  !== 'all') rows = rows.filter(r => r.Residing === typeFilter);
    if (kycFilter   !== 'all') rows = rows.filter(r => r.OwnerKYC === kycFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.PrimaryOwner.toLowerCase().includes(q)  ||
        r.Flat.includes(q)                         ||
        r.PrimaryPhone.includes(q)
      );
    }
    return rows;
  }, [data, towerFilter, typeFilter, kycFilter, search]);

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Residents Dashboard</h1>
          <p className="text-sm text-gray-500">{stats.total} Total Units · Global Hillview Society</p>
        </div>
        <div className="flex items-center gap-2">
          {[['analytics','Analytics'],['directory','Directory']].map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 border'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard label="Total Units" value={stats.total} color="#3b82f6" />
        <StatCard label="Owners" value={stats.owners} color="#3b82f6" />
        <StatCard label="Tenants" value={stats.tenants} color="#10b981" />
        <StatCard label="Vacant" value={stats.vacant} color="#f59e0b" />
        <StatCard label="KYC Done" value={stats.kycDone} color="#8b5cf6" />
        <StatCard label="Docs Done" value={stats.docComplete} color="#06b6d4" />
      </div>

      {/* Tabs Content */}
      {activeTab === 'analytics' ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <TowerOccupancyGrid data={data} />
            <DocumentStatusBreakdown data={data} />
          </div>
          <KYCProgressPanel data={data} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm">
          {/* Filter Bar */}
          <div className="p-5 border-b flex flex-wrap gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, flat, phone..."
              className="flex-1 min-w-[200px] px-4 py-2 border rounded-lg text-sm"
            />
            <select value={towerFilter} onChange={e => setTowerFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="all">All Towers</option>
              {['1','2','3','4','5'].map(t => <option key={t} value={t}>Tower {t}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">KYC</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">T{row.Tower}-{row.Flat}</td>
                    <td className="px-4 py-3">{row.PrimaryOwner}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${row.Residing === 'Owner' ? 'bg-blue-100 text-blue-700' : row.Residing === 'Tenant' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                        {row.Residing}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{row.OwnerKYC === 'Yes' ? '✅' : '❌'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setViewRow(row)} className="text-blue-600 hover:underline">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewRow && <ResidentViewModal row={viewRow} onClose={() => setViewRow(null)} />}
    </div>
  );
}
