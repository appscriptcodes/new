/* ===================================================
   BudgetPage.js — CAM Budget Analytics Dashboard
   Global Hillview Society

   Flat data (from official document):
     Type A: 376 flats × 585.41 sq ft + 99.11 balcony
     Type B: 376 flats × 554.17 sq ft + 98.81 balcony
     Total : 752 flats

   CAM Rate : ₹2.57 per sq ft (carpet area only)
   Water    : ₹300 per flat per month
   =================================================== */

// ── Constants ─────────────────────────────────────────
const BUDGET_CONSTANTS = {
  TYPE_A: { count: 376, area: 684.52, balcony: 99.11 },
  TYPE_B: { count: 376, area: 652.98, balcony: 98.81 },
  CAM_RATE: 2.57,
  WATER_PER_FLAT: 300,
  TOTAL_FLATS: 752,
};

// Default monthly vendor expenses (editable by admin)
const DEFAULT_EXPENSES = [
  { id: 'security',     label: 'Security Services',          amount: 426000, icon: '🛡️',  color: '#3b82f6' },
  { id: 'enviro',       label: 'Enviro (Housekeeping)',       amount: 800000, icon: '🧹',  color: '#10b981' },
  { id: 'garbage',      label: 'Garbage Collection',         amount: 18880,  icon: '🗑️',  color: '#6b7280' },
  { id: 'smartmeters',  label: 'Smart Meters (AMC)',         amount: 26621,  icon: '⚡',  color: '#f59e0b' },
  { id: 'stp',          label: 'STP Operations',             amount: 35000,  icon: '💧',  color: '#0ea5e9' },
  { id: 'boombarrier',  label: 'Boom Barrier (AMC)',         amount: 12000,   icon: '🚧',  color: '#8b5cf6' },
  { id: 'diesel',       label: 'Diesel (DG Set)',            amount: 150000,  icon: '⛽',  color: '#dc2626' },
  { id: 'plumbing',     label: 'Plumbing & Civil',           amount: 100000,  icon: '🔧',  color: '#ea580c' },
  { id: 'lifts',        label: 'Lift AMC',                   amount: 55000,  icon: '🛗',  color: '#7c3aed' },
  { id: 'dgset',        label: 'DG Set AMC',                 amount: 12000,  icon: '⚙️',  color: '#475569' },
  { id: 'transformer',  label: 'Transformer AMC',            amount: 8000,   icon: '🔌',  color: '#0f766e' },
  { id: 'fire',         label: 'Fire Extinguisher AMC',      amount: 6000,   icon: '🔥',  color: '#ef4444' },
  { id: 'govt',         label: 'Govt. Liaison / Compliance', amount: 40000,  icon: '🏛️',  color: '#1d4ed8' },
  { id: 'accidental',   label: 'Accidental Maintenance',     amount: 25000,  icon: '⚠️',  color: '#d97706' },
  { id: 'pettycash',    label: 'Petty Cash / Imprest',       amount: 30000,  icon: '💵',  color: '#059669' },
];

// ── Helper: format INR ────────────────────────────────
const fmt = v => '₹' + Math.round(Number(v) || 0).toLocaleString('en-IN');
const fmtK = v => {
  const n = Math.round(Number(v) || 0);
  if (n >= 100000) return '₹' + (n/100000).toFixed(2) + 'L';
  if (n >= 1000)   return '₹' + (n/1000).toFixed(1)   + 'K';
  return '₹' + n;
};

// ── Mini bar component ────────────────────────────────
function BudgetBar({ label, icon, amount, total, color, editable, onChange }) {
  const pct = total > 0 ? Math.min((amount / total) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-lg w-7 flex-shrink-0 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700 truncate pr-2">{label}</span>
          {editable ? (
            <input
              type="number"
              value={amount}
              onChange={e => onChange(Number(e.target.value) || 0)}
              className="text-xs font-bold w-28 text-right border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              style={{ color }}
            />
          ) : (
            <span className="text-xs font-bold flex-shrink-0" style={{ color }}>{fmt(amount)}</span>
          )}
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────
function StatCard({ label, value, sub, color, bg, icon }) {
  return (
    <div className={`rounded-xl p-4 ${bg}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
          <p className="text-xl font-bold truncate" style={{ color }}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <span className="text-2xl flex-shrink-0 ml-2">{icon}</span>
      </div>
    </div>
  );
}

// ── Donut SVG ─────────────────────────────────────────
function DonutChart({ segments, size = 120 }) {
  let offset = 0;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
      {segments.map((seg, i) => {
        const pct = total > 0 ? (seg.value / total) * 100 : 0;
        const dash = (pct / 100) * circ;
        const gap  = circ - dash;
        const el = (
          <circle key={i} cx="50" cy="50" r={r} fill="none"
            stroke={seg.color} strokeWidth="18"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset * circ / 100}
          />
        );
        offset += pct;
        return el;
      })}
      <circle cx="50" cy="50" r="31" fill="white" />
    </svg>
  );
}

// ── What-If Scenario Panel ────────────────────────────
function ScenarioPanel({ typeAArea, typeBArea, onRateChange, camRate, waterRate }) {
  const { useState } = React;
  const [simCam,   setSimCam]   = useState(camRate);
  const [simWater, setSimWater] = useState(waterRate);

  const simRevenue =
    (BUDGET_CONSTANTS.TYPE_A.count * typeAArea * simCam) +
    (BUDGET_CONSTANTS.TYPE_B.count * typeBArea * simCam) +
    (BUDGET_CONSTANTS.TOTAL_FLATS  * simWater);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span>🔮</span> What-If Rate Simulator
      </h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">CAM Rate (₹/sq ft)</label>
          <input type="number" step="0.01" value={simCam}
            onChange={e => { setSimCam(Number(e.target.value)); onRateChange('cam', Number(e.target.value)); }}
            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm font-bold text-blue-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Water Charge (₹/flat)</label>
          <input type="number" step="50" value={simWater}
            onChange={e => { setSimWater(Number(e.target.value)); onRateChange('water', Number(e.target.value)); }}
            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm font-bold text-blue-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>
      <div className="bg-white rounded-lg p-3 text-center">
        <p className="text-xs text-gray-500">Projected Monthly Collection</p>
        <p className="text-2xl font-bold text-blue-600 mt-1">{fmt(simRevenue)}</p>
        <p className="text-xs text-gray-400">{fmtK(simRevenue * 12)} per year</p>
      </div>
      <p className="text-xs text-gray-400 mt-3 text-center">
        Adjust rates to see live impact on revenue vs expenses
      </p>
    </div>
  );
}

// ── Main Budget Page ──────────────────────────────────
function BudgetPage() {
  const { useState, useMemo, useCallback } = React;

  // State: expenses are editable
  const [expenses,   setExpenses]   = useState(DEFAULT_EXPENSES);
  const [camRate,    setCamRate]    = useState(BUDGET_CONSTANTS.CAM_RATE);
  const [waterRate,  setWaterRate]  = useState(BUDGET_CONSTANTS.WATER_PER_FLAT);
  const [editMode,   setEditMode]   = useState(false);
  const [activeTab,  setActiveTab]  = useState('overview'); // overview | breakdown | simulation

  // Flat areas — carpet only (no balcony for CAM)
  const typeAArea = BUDGET_CONSTANTS.TYPE_A.area;
  const typeBArea = BUDGET_CONSTANTS.TYPE_B.area;

  // ── Revenue calculations ───────────────────────────
  const revenue = useMemo(() => {
    const camA     = BUDGET_CONSTANTS.TYPE_A.count * typeAArea * camRate;
    const camB     = BUDGET_CONSTANTS.TYPE_B.count * typeBArea * camRate;
    const water    = BUDGET_CONSTANTS.TOTAL_FLATS  * waterRate;
    const totalCam = camA + camB;
    const total    = totalCam + water;
    return { camA, camB, totalCam, water, total };
  }, [camRate, waterRate, typeAArea, typeBArea]);

  // ── Expense calculations ──────────────────────────
  const totalExpenses = useMemo(() =>
    expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [expenses]
  );

  const surplus = revenue.total - totalExpenses;

  // ── Per-flat breakdown ────────────────────────────
  const perFlatA = (BUDGET_CONSTANTS.TYPE_A.area * camRate) + waterRate;
  const perFlatB = (BUDGET_CONSTANTS.TYPE_B.area * camRate) + waterRate;

  // ── CAM rate needed to break even ─────────────────
  const totalCarpet =
    (BUDGET_CONSTANTS.TYPE_A.count * typeAArea) +
    (BUDGET_CONSTANTS.TYPE_B.count * typeBArea);
  const camNeeded = (totalExpenses - revenue.water) / totalCarpet;

  // ── Top expense categories ────────────────────────
  const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);

  // ── Handlers ──────────────────────────────────────
  const updateExpense = useCallback((id, val) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, amount: val } : e));
  }, []);

  const handleRateChange = useCallback((type, val) => {
    if (type === 'cam')   setCamRate(val);
    if (type === 'water') setWaterRate(val);
  }, []);

  const resetExpenses = () => {
    setExpenses(DEFAULT_EXPENSES);
    setCamRate(BUDGET_CONSTANTS.CAM_RATE);
    setWaterRate(BUDGET_CONSTANTS.WATER_PER_FLAT);
  };

  // ── Donut segments ────────────────────────────────
  const donutRevenue = [
    { label: 'CAM (Type A)', value: revenue.camA,  color: '#3b82f6' },
    { label: 'CAM (Type B)', value: revenue.camB,  color: '#6366f1' },
    { label: 'Water',        value: revenue.water, color: '#0ea5e9' },
  ];

  const expenseGroups = [
    { label: 'Staffing',    value: expenses.filter(e => ['security','enviro','garbage'].includes(e.id)).reduce((s,e)=>s+e.amount,0),         color: '#3b82f6' },
    { label: 'Maintenance', value: expenses.filter(e => ['lifts','dgset','transformer','fire','boombarrier','smartmeters'].includes(e.id)).reduce((s,e)=>s+e.amount,0), color: '#f59e0b' },
    { label: 'Operations',  value: expenses.filter(e => ['stp','diesel','plumbing','accidental','pettycash'].includes(e.id)).reduce((s,e)=>s+e.amount,0),              color: '#10b981' },
    { label: 'Compliance',  value: expenses.filter(e => ['govt'].includes(e.id)).reduce((s,e)=>s+e.amount,0),                                 color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-5 fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">CAM Budget Dashboard</h1>
          <p className="text-sm text-gray-500">
            752 flats · ₹{camRate}/sq ft · ₹{waterRate}/flat water · FY 2025–26
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {['overview','breakdown','simulation'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all
                ${activeTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
              {tab === 'overview' ? '📊 Overview' : tab === 'breakdown' ? '📋 Expenses' : '🔮 Simulator'}
            </button>
          ))}
          <button onClick={() => setEditMode(e => !e)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border
              ${editMode ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {editMode ? '✓ Done Editing' : '✏️ Edit Expenses'}
          </button>
          <button onClick={resetExpenses}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium">
            ↺ Reset
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Monthly Revenue" value={fmtK(revenue.total)} sub={fmt(revenue.total)}
          color="#2563eb" bg="bg-blue-50" icon="💰" />
        <StatCard label="Monthly Expenses" value={fmtK(totalExpenses)} sub={fmt(totalExpenses)}
          color="#dc2626" bg="bg-red-50" icon="📤" />
        <StatCard label={surplus >= 0 ? 'Monthly Surplus' : 'Monthly Deficit'} value={fmtK(Math.abs(surplus))}
          sub={surplus >= 0 ? 'Healthy budget ✓' : 'Increase CAM ⚠️'}
          color={surplus >= 0 ? '#16a34a' : '#dc2626'}
          bg={surplus >= 0 ? 'bg-green-50' : 'bg-red-50'} icon={surplus >= 0 ? '✅' : '⚠️'} />
        <StatCard label="Annual Projection" value={fmtK(revenue.total * 12)}
          sub={`Expenses: ${fmtK(totalExpenses * 12)}`} color="#7c3aed" bg="bg-purple-50" icon="📅" />
      </div>

      {/* ══════════════════════════════════════════════
          TAB: OVERVIEW
      ══════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">

          {/* Revenue vs Expense visual */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Revenue breakdown */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Revenue Breakdown</h3>
              <div className="flex items-center gap-5">
                <DonutChart segments={donutRevenue} size={110} />
                <div className="space-y-2 flex-1">
                  {donutRevenue.map(seg => (
                    <div key={seg.label} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                      <span className="text-xs text-gray-600 flex-1">{seg.label}</span>
                      <span className="text-xs font-bold" style={{ color: seg.color }}>{fmtK(seg.value)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-xs font-semibold text-gray-700">Total</span>
                      <span className="text-xs font-bold text-blue-600">{fmt(revenue.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue detail rows */}
              <div className="mt-4 space-y-2 border-t pt-4">
                {[
                  { label: `CAM Type A (376 × ${typeAArea} sq ft × ₹${camRate})`, val: revenue.camA, color: '#3b82f6' },
                  { label: `CAM Type B (376 × ${typeBArea} sq ft × ₹${camRate})`, val: revenue.camB, color: '#6366f1' },
                  { label: `Water (752 × ₹${waterRate})`,                          val: revenue.water, color: '#0ea5e9' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-start gap-2">
                    <span className="text-xs text-gray-500 leading-tight">{row.label}</span>
                    <span className="text-xs font-semibold flex-shrink-0" style={{ color: row.color }}>{fmt(row.val)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expense breakdown donut */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Expense Categories</h3>
              <div className="flex items-center gap-5">
                <DonutChart segments={expenseGroups} size={110} />
                <div className="space-y-2 flex-1">
                  {expenseGroups.map(seg => (
                    <div key={seg.label} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                      <span className="text-xs text-gray-600 flex-1">{seg.label}</span>
                      <span className="text-xs font-bold" style={{ color: seg.color }}>{fmtK(seg.value)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-xs font-semibold text-gray-700">Total</span>
                      <span className="text-xs font-bold text-red-500">{fmt(totalExpenses)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top 5 expenses */}
              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Top 5 Expenses</p>
                {topExpenses.map(e => (
                  <div key={e.id} className="flex items-center gap-2 py-1">
                    <span className="text-sm w-6">{e.icon}</span>
                    <span className="text-xs text-gray-600 flex-1 truncate">{e.label}</span>
                    <span className="text-xs font-semibold" style={{ color: e.color }}>{fmtK(e.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Surplus / Deficit gauge + per-flat */}
            <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Budget Health</h3>

              {/* Surplus gauge bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Expenses</span>
                  <span>Revenue</span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden relative">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min((totalExpenses / Math.max(revenue.total, totalExpenses)) * 100, 100)}%`,
                      background: surplus >= 0 ? '#ef4444' : '#dc2626'
                    }} />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                    {surplus >= 0 ? `${((totalExpenses/revenue.total)*100).toFixed(1)}% utilized` : 'Over budget!'}
                  </div>
                </div>
              </div>

              {/* Surplus/Deficit */}
              <div className={`rounded-lg p-4 text-center ${surplus >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className="text-xs text-gray-500">{surplus >= 0 ? 'Monthly Surplus' : 'Monthly Deficit'}</p>
                <p className={`text-2xl font-bold mt-1 ${surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {surplus >= 0 ? '+' : '-'}{fmt(Math.abs(surplus))}
                </p>
                <p className="text-xs text-gray-400 mt-1">Annual: {surplus >= 0 ? '+' : '-'}{fmtK(Math.abs(surplus * 12))}</p>
              </div>

              {/* Per-flat charges */}
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-600 mb-3">Monthly per Flat</p>
                {[
                  { label: 'Type A (684.52 sq ft)', cam: typeAArea * camRate, total: perFlatA },
                  { label: 'Type B (652.98 sq ft)', cam: typeBArea * camRate, total: perFlatB },
                ].map(f => (
                  <div key={f.label} className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">{f.label}</p>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-blue-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-400">CAM</p>
                        <p className="text-sm font-bold text-blue-600">{fmt(f.cam)}</p>
                      </div>
                      <div className="flex-1 bg-sky-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-400">Water</p>
                        <p className="text-sm font-bold text-sky-600">{fmt(waterRate)}</p>
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-400">Total</p>
                        <p className="text-sm font-bold text-gray-800">{fmt(f.total)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Break-even CAM rate */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700 font-medium">Break-even CAM Rate</p>
                <p className="text-lg font-bold text-amber-600">₹{camNeeded.toFixed(2)}/sq ft</p>
                <p className="text-xs text-amber-500">
                  {camNeeded > camRate
                    ? `Need ₹${(camNeeded - camRate).toFixed(2)} more/sq ft to cover expenses`
                    : `Current rate covers expenses with ₹${(camRate - camNeeded).toFixed(2)}/sq ft headroom`}
                </p>
              </div>
            </div>
          </div>

          {/* Annual summary table */}
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Annual Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    {['Item','Monthly','Quarterly','Half-Yearly','Annual'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { label: '💰 Total Revenue',  val: revenue.total,    color: 'text-blue-600',  bold: true },
                    { label: '   CAM Collection', val: revenue.totalCam, color: 'text-blue-500'  },
                    { label: '   Water Charges',  val: revenue.water,    color: 'text-sky-500'   },
                    { label: '📤 Total Expenses', val: totalExpenses,    color: 'text-red-500',   bold: true },
                    { label: surplus >= 0 ? '✅ Net Surplus' : '⚠️ Net Deficit',
                      val: Math.abs(surplus),
                      color: surplus >= 0 ? 'text-green-600' : 'text-red-600',
                      bold: true },
                  ].map(row => (
                    <tr key={row.label} className="hover:bg-gray-50">
                      <td className={`px-4 py-2 text-xs ${row.bold ? 'font-semibold' : 'text-gray-500 pl-8'}`}>{row.label}</td>
                      {[1, 3, 6, 12].map(m => (
                        <td key={m} className={`px-4 py-2 text-xs font-medium ${row.color} ${row.bold ? 'font-bold' : ''}`}>
                          {fmt(row.val * m)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB: EXPENSE BREAKDOWN
      ══════════════════════════════════════════════ */}
      {activeTab === 'breakdown' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Editable expense list */}
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Monthly Vendor Expenses</h3>
              {editMode && <span className="text-xs text-amber-600 font-medium">✏️ Editing live</span>}
            </div>
            <div>
              {expenses.map(exp => (
                <BudgetBar key={exp.id}
                  label={exp.label} icon={exp.icon}
                  amount={exp.amount} total={totalExpenses}
                  color={exp.color} editable={editMode}
                  onChange={val => updateExpense(exp.id, val)} />
              ))}
            </div>
            <div className="border-t mt-3 pt-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Total Monthly</span>
              <span className="text-base font-bold text-red-500">{fmt(totalExpenses)}</span>
            </div>
          </div>

          {/* Expense analysis */}
          <div className="space-y-4">
            {/* Category totals */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Expense by Category</h3>
              {[
                { label: '👮 Staffing & Labour',   ids: ['security','enviro','garbage'],                                       color: '#3b82f6' },
                { label: '🔧 Maintenance AMCs',    ids: ['lifts','dgset','transformer','fire','boombarrier','smartmeters'],    color: '#f59e0b' },
                { label: '⚙️ Operations',          ids: ['stp','diesel','plumbing','accidental','pettycash'],                  color: '#10b981' },
                { label: '🏛️ Compliance & Admin',  ids: ['govt'],                                                             color: '#8b5cf6' },
              ].map(cat => {
                const catTotal = expenses.filter(e => cat.ids.includes(e.id)).reduce((s, e) => s + e.amount, 0);
                const pct = totalExpenses > 0 ? ((catTotal / totalExpenses) * 100).toFixed(1) : 0;
                return (
                  <div key={cat.label} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{cat.label}</span>
                      <span className="font-bold" style={{ color: cat.color }}>{fmt(catTotal)} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cat.color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Revenue vs Expense bars */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue vs Expenses</h3>
              {[
                { label: 'CAM Revenue',   val: revenue.totalCam, color: '#3b82f6' },
                { label: 'Water Revenue', val: revenue.water,    color: '#0ea5e9' },
                { label: 'Total Expenses',val: totalExpenses,    color: '#ef4444' },
                { label: surplus >= 0 ? 'Surplus' : 'Deficit', val: Math.abs(surplus), color: surplus >= 0 ? '#10b981' : '#dc2626' },
              ].map(row => {
                const max = Math.max(revenue.total, totalExpenses);
                return (
                  <div key={row.label} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="font-semibold" style={{ color: row.color }}>{fmt(row.val)}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(row.val / max) * 100}%`, background: row.color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Per-flat expense share */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Monthly Expense per Flat</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Expense share / flat', val: totalExpenses / BUDGET_CONSTANTS.TOTAL_FLATS, color: '#ef4444' },
                  { label: 'Revenue / flat (avg)',  val: revenue.total   / BUDGET_CONSTANTS.TOTAL_FLATS, color: '#3b82f6' },
                ].map(c => (
                  <div key={c.label} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">{c.label}</p>
                    <p className="text-lg font-bold mt-1" style={{ color: c.color }}>{fmt(c.val)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB: SIMULATOR
      ══════════════════════════════════════════════ */}
      {activeTab === 'simulation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          <div className="space-y-5">
            <ScenarioPanel
              typeAArea={typeAArea} typeBArea={typeBArea}
              camRate={camRate} waterRate={waterRate}
              onRateChange={handleRateChange} />

            {/* CAM rate scenarios table */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">CAM Rate Scenarios</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Rate</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-medium">Monthly Rev</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-medium">Surplus/Deficit</th>
                      <th className="px-3 py-2 text-center text-gray-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[2.00, 2.25, 2.57, 2.75, 3.00, 3.25, 3.50].map(rate => {
                      const rev = (BUDGET_CONSTANTS.TYPE_A.count * typeAArea * rate) +
                                  (BUDGET_CONSTANTS.TYPE_B.count * typeBArea * rate) +
                                  (BUDGET_CONSTANTS.TOTAL_FLATS * waterRate);
                      const sur = rev - totalExpenses;
                      const isCurrent = rate === camRate;
                      return (
                        <tr key={rate} className={`${isCurrent ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <td className={`px-3 py-2 font-bold ${isCurrent ? 'text-blue-700' : 'text-gray-700'}`}>
                            ₹{rate.toFixed(2)} {isCurrent && <span className="text-xs font-normal text-blue-500">(current)</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-700">{fmt(rev)}</td>
                          <td className={`px-3 py-2 text-right font-bold ${sur >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {sur >= 0 ? '+' : ''}{fmt(sur)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`status-badge ${sur >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {sur >= 0 ? '✓ OK' : '✗ Deficit'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {/* Water rate scenarios */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Water Rate Scenarios</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Water/flat</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-medium">Water Rev</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-medium">Total Rev</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-medium">Surplus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[200, 250, 300, 350, 400, 500].map(wrate => {
                      const wrev = BUDGET_CONSTANTS.TOTAL_FLATS * wrate;
                      const trev = revenue.totalCam + wrev;
                      const sur  = trev - totalExpenses;
                      const isCur = wrate === waterRate;
                      return (
                        <tr key={wrate} className={isCur ? 'bg-sky-50' : 'hover:bg-gray-50'}>
                          <td className={`px-3 py-2 font-bold ${isCur ? 'text-sky-700' : 'text-gray-700'}`}>
                            ₹{wrate} {isCur && <span className="text-xs font-normal text-sky-500">(current)</span>}
                          </td>
                          <td className="px-3 py-2 text-right text-sky-600 font-medium">{fmt(wrev)}</td>
                          <td className="px-3 py-2 text-right text-blue-600 font-medium">{fmt(trev)}</td>
                          <td className={`px-3 py-2 text-right font-bold ${sur >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {sur >= 0 ? '+' : ''}{fmt(sur)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expense reduction scenarios */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">If Expenses Change By…</h3>
              <div className="space-y-2">
                {[-20, -10, -5, 0, 5, 10, 20].map(pctChange => {
                  const adjExp = totalExpenses * (1 + pctChange / 100);
                  const adjSur = revenue.total - adjExp;
                  const isCur  = pctChange === 0;
                  return (
                    <div key={pctChange} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${isCur ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50'}`}>
                      <span className={`font-medium ${pctChange < 0 ? 'text-green-600' : pctChange > 0 ? 'text-red-500' : 'text-gray-700'}`}>
                        {pctChange === 0 ? 'Current' : (pctChange > 0 ? '▲ +' : '▼ ') + pctChange + '%'}
                      </span>
                      <span className="text-gray-500">{fmt(adjExp)}</span>
                      <span className={`font-bold ${adjSur >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {adjSur >= 0 ? '+' : ''}{fmt(adjSur)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Insights box */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 text-white">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <span>💡</span> Budget Insights
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex gap-2">
                  <span>•</span>
                  <span>Break-even CAM rate: <span className="font-bold text-amber-400">₹{camNeeded.toFixed(2)}/sq ft</span></span>
                </div>
                <div className="flex gap-2">
                  <span>•</span>
                  <span>Security is <span className="font-bold text-red-400">{((expenses.find(e=>e.id==='security')?.amount||0)/totalExpenses*100).toFixed(1)}%</span> of total expenses — largest single cost</span>
                </div>
                <div className="flex gap-2">
                  <span>•</span>
                  <span>Raising CAM by ₹0.10/sq ft adds <span className="font-bold text-green-400">{fmt(totalCarpet * 0.10)}/month</span></span>
                </div>
                <div className="flex gap-2">
                  <span>•</span>
                  <span>Raising water by ₹50/flat adds <span className="font-bold text-green-400">{fmt(BUDGET_CONSTANTS.TOTAL_FLATS * 50)}/month</span></span>
                </div>
                <div className="flex gap-2">
                  <span>•</span>
                  <span>Current collection covers <span className={`font-bold ${surplus >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {((revenue.total / totalExpenses) * 100).toFixed(1)}%</span> of expenses</span>
                </div>
                <div className="flex gap-2">
                  <span>•</span>
                  <span>Avg resident pays <span className="font-bold text-blue-300">{fmt((perFlatA + perFlatB) / 2)}/month</span> (Type A+B average)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
