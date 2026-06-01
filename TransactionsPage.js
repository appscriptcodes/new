/* ===================================================
   TransactionsPage.js — Updated for FY Dropdown & Balance
   =================================================== */

// 1. Helper to calculate Financial Years (April to March)
function getFinancialYears() {
  const years = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); 
  let startYear = (currentMonth < 3) ? currentYear - 1 : currentYear;

  for (let i = 0; i < 5; i++) {
    const y = startYear - i;
    years.push({
      label: `FY ${y}-${(y + 1).toString().slice(-2)}`,
      start: new Date(y, 3, 1),      // April 1st
      end: new Date(y + 1, 2, 31, 23, 59, 59)
    });
  }
  return years;
}

function TransactionsPage({ data, isAdmin, onRefresh, chartOfAccounts }) {
  const { useState, useMemo, useRef } = React;

  // ─── STATE ───
  const [tab, setTab] = useState('table');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(null);
  const [selectedFY, setSelectedFY] = useState('All'); // NEW
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const fiscalYears = useMemo(() => getFinancialYears(), []);

  // ─── FILTER ENGINE ───
  const filtered = useMemo(() => {
    return data.filter(t => {
      // Search
      const s = search.toLowerCase();
      const matchesSearch = !search || 
        (t.Narration || t.Description || '').toLowerCase().includes(s) ||
        (t.Category || '').toLowerCase().includes(s);

      // Type (Credit/Debit)
      const matchesType = !typeFilter || t.Type?.toLowerCase() === typeFilter.toLowerCase();

      // Financial Year logic
      let matchesFY = true;
      if (selectedFY !== 'All') {
        const fy = fiscalYears.find(f => f.label === selectedFY);
        const tDate = new Date(t.Date);
        matchesFY = tDate >= fy.start && tDate <= fy.end;
      }

      return matchesSearch && matchesType && matchesFY;
    }).sort((a, b) => new Date(b.Date) - new Date(a.Date));
  }, [data, search, typeFilter, selectedFY, fiscalYears]);

  // ─── STATS ───
  const stats = useMemo(() => {
    const income = filtered.reduce((s, t) => s + Number(String(t['Deposit Amt.'] || t.Amount && t.Type === 'Credit' ? t.Amount : 0).replace(/,/g, '')), 0);
    const expense = filtered.reduce((s, t) => s + Number(String(t['Withdrawal Amt.'] || t.Amount && t.Type === 'Debit' ? t.Amount : 0).replace(/,/g, '')), 0);
    const latestBal = filtered.length > 0 ? (filtered[0]['Closing Balance'] || filtered[0].Balance || 0) : 0;
    return { income, expense, net: income - expense, balance: latestBal };
  }, [filtered]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
          <p className="text-xs font-bold text-gray-400 uppercase">Income</p>
          <p className="text-xl font-bold text-green-600">{INR.format(stats.income)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
          <p className="text-xs font-bold text-gray-400 uppercase">Expense</p>
          <p className="text-xl font-bold text-red-600">{INR.format(stats.expense)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
          <p className="text-xs font-bold text-gray-400 uppercase">Current Balance</p>
          <p className="text-xl font-bold text-blue-600">{INR.format(stats.balance)}</p>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap gap-4 items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex-1 min-w-[300px]">
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-4 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>

        {/* FINANCIAL YEAR DROPDOWN */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-400">FY:</label>
          <select 
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-sm rounded-lg p-2 outline-none"
          >
            <option value="All">All Transactions</option>
            {fiscalYears.map(fy => <option key={fy.label} value={fy.label}>{fy.label}</option>)}
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Narration</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm">{row.Date}</td>
                <td className="px-4 py-3 text-sm truncate max-w-xs">{row.Narration || row.Description}</td>
                <td className={`px-4 py-3 text-sm font-bold ${row.Type === 'Credit' ? 'text-green-600' : 'text-red-600'}`}>
                  {INR.format(row.Amount || row['Deposit Amt.'] || row['Withdrawal Amt.'] || 0)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                  {INR.format(row['Closing Balance'] || row.Balance || 0)}
                </td>
                <td className="px-4 py-3">
                   <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${row.Type === 'Credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {row.Type}
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
