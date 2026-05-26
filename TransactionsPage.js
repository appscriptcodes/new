/* ── 1. HELPER FUNCTIONS (Outside the Component) ── */

// Categorizes transactions based on text patterns
function autoCategory(narration, type) {
  const n = (narration || '').toUpperCase();
  if (type === 'Credit') {
    if (n.includes('EASEBUZZ')) return 'Maintenance Collection';
    if (n.includes('MOVE IN')) return 'Move In/Out Charges';
    if (n.includes('UPI')) return 'UPI Receipt';
    return 'Other Income';
  }
  if (n.includes('ENVIRO')) return 'Housekeeping (Enviro)';
  if (n.includes('TEAMWORKS')) return 'Security (TeamWorks)';
  if (n.includes('DHBVN')) return 'Electricity (DHBVN)';
  return 'Other Expense';
}

// Converts messy dates (01/11/25) into standard (2025-11-01)
function normDate(val) {
  if (!val) return '';
  const s = String(val).trim();
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  const m4 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m2) { const [,d,mo,y]=m2; return `20${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`; }
  if (m4) { const [,d,mo,y]=m4; return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`; }
  return s;
}

// Formats date for display: "Nov 2025"
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatMonthYear(dateStr) {
  const normalized = normDate(dateStr);
  if (!normalized || !normalized.includes('-')) return dateStr;
  const [y, m] = normalized.split('-');
  return `${MONTH_LABELS[parseInt(m) - 1]} ${y}`;
}

/* ── 2. MAIN COMPONENT ── */

function TransactionsPage({ data, isAdmin, onRefresh, chartOfAccounts }) {
  const { useState, useMemo } = React;

  // Filter States
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // Helper to split date for filtering logic
  const getParts = (dateVal) => {
    const normalized = normDate(dateVal);
    if (!normalized || normalized.length < 7) return { y: '', m: '' };
    return { y: normalized.substring(0, 4), m: normalized.substring(5, 7) };
  };

  // Generate Year Options
  const availableYears = useMemo(() => {
    const years = new Set();
    data.forEach(t => { const { y } = getParts(t.Date); if (y) years.add(y); });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data]);

  // Generate Month Options
  const availableMonths = useMemo(() => {
    const months = new Set();
    data.forEach(t => {
      const { y, m } = getParts(t.Date);
      if (y && (!filterYear || y === filterYear)) if (m) months.add(m);
    });
    return Array.from(months).sort().map(m => ({ value: m, label: FULL_MONTHS[parseInt(m, 10) - 1] }));
  }, [data, filterYear]);

  // Execute Search and Filters
  const filtered = useMemo(() => {
    return data.filter(t => {
      const { y, m } = getParts(t.Date);
      const matchYear = !filterYear || y === filterYear;
      const matchMonth = !filterMonth || m === filterMonth;
      const matchSearch = !search || Object.values(t).some(v => String(v).toLowerCase().includes(search.toLowerCase()));
      return matchYear && matchMonth && matchSearch;
    });
  }, [data, filterYear, filterMonth, search]);

  return (
    <div className="p-4 space-y-4">
      {/* TOOLBAR */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl shadow-sm">
        <select value={filterYear} onChange={e => {setFilterYear(e.target.value); setFilterMonth('');}} className="border p-2 rounded text-sm">
          <option value="">All Years</option>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="border p-2 rounded text-sm">
          <option value="">All Months</option>
          {availableMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <input 
          type="text" 
          placeholder="Search narration..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="border p-2 rounded text-sm flex-1" 
        />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Period</th>
              <th className="px-4 py-3 text-left">Narration</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-left">Category</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {/* Updated Period Column */}
                <td className="px-4 py-3 font-medium text-gray-900">
                  {formatMonthYear(row.Date)}
                </td>
                <td className="px-4 py-3 text-gray-600 truncate max-w-xs">
                  {row.Narration || row.Description}
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-800">
                  ₹{row.Amount || row['Deposit Amt'] || row['Withdrawal Amt']}
                </td>
                <td className="px-4 py-3">
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    {row.Category || autoCategory(row.Narration, row.Type)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
