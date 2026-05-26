import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, ArrowUpRight, ArrowDownLeft, 
  Wallet, X, MoreVertical, CheckCircle2, Clock
} from 'lucide-react';

const TransactionsPage = ({ data = [], onAdd, onEdit, onDelete, loading }) => {
  // 1. State for Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // 2. Robust Date Helper (Fixes the "substring" issue)
  const normDate = (dateVal) => {
    if (!dateVal) return { y: '', m: '' };
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return { y: '', m: '' };
    return {
      y: d.getFullYear().toString(),
      m: (d.getMonth() + 1).toString().padStart(2, '0')
    };
  };

  // 3. Dynamic Dropdown Data
  const availableYears = useMemo(() => {
    const years = new Set();
    data.forEach(t => {
      const { y } = normDate(t.Date);
      if (y) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [data]);

  const availableMonths = [
    { v: '01', l: 'January' }, { v: '02', l: 'February' }, { v: '03', l: 'March' },
    { v: '04', l: 'April' }, { v: '05', l: 'May' }, { v: '06', l: 'June' },
    { v: '07', l: 'July' }, { v: '08', l: 'August' }, { v: '09', l: 'September' },
    { v: '10', l: 'October' }, { v: '11', l: 'November' }, { v: '12', l: 'December' }
  ];

  // 4. Filtering Logic (Must come BEFORE stats)
  const filtered = useMemo(() => {
    let r = [...data];

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      r = r.filter(t => t.Description?.toLowerCase().includes(s) || t.Category?.toLowerCase().includes(s));
    }

    if (typeFilter !== 'all') {
      r = r.filter(t => t.Type?.toLowerCase() === typeFilter.toLowerCase());
    }

    if (filterYear) {
      r = r.filter(t => normDate(t.Date).y === filterYear);
    }

    if (filterMonth) {
      r = r.filter(t => normDate(t.Date).m === filterMonth);
    }

    return r.sort((a, b) => new Date(b.Date) - new Date(a.Date));
  }, [data, searchTerm, typeFilter, filterYear, filterMonth]);

  // 5. Stats (Uses Filtered Data)
  const stats = useMemo(() => {
    return filtered.reduce((acc, t) => {
      const amt = parseFloat(t.Amount) || 0;
      if (t.Type?.toLowerCase() === 'credit') acc.income += amt;
      else if (t.Type?.toLowerCase() === 'debit') acc.expense += amt;
      acc.net = acc.income - acc.expense;
      return acc;
    }, { income: 0, expense: 0, net: 0 });
  }, [filtered]);

  return (
    <div className="p-4 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="text-sm text-gray-500">Total Credits</div>
          <div className="text-2xl font-bold text-green-600">₹{stats.income.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="text-sm text-gray-500">Total Debits</div>
          <div className="text-2xl font-bold text-red-600">₹{stats.expense.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="text-sm text-gray-500">Net Flow</div>
          <div className="text-2xl font-bold text-blue-600">₹{stats.net.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">{filtered.length} transactions shown</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-xl border shadow-sm flex flex-wrap gap-3 items-center">
        <select 
          value={filterYear}
          onChange={(e) => { setFilterYear(e.target.value); setFilterMonth(''); }}
          className="border rounded-lg px-3 py-2 text-sm bg-gray-50"
        >
          <option value="">All Years</option>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <select 
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-gray-50"
        >
          <option value="">All Months</option>
          {availableMonths.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>

        {(filterYear || filterMonth) && (
          <button onClick={() => { setFilterYear(''); setFilterMonth(''); }} className="text-gray-400 hover:text-red-500">
            <X size={18} />
          </button>
        )}

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
        
        <button onClick={onAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <Plus size={18} /> Add
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4 text-right">Amount</th>
              <th className="px-6 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{new Date(t.Date).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-medium">{t.Description}</td>
                <td className={`px-6 py-4 text-right font-bold ${t.Type === 'Credit' ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{Math.abs(t.Amount).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-center">
                  {t.Status === 'Cleared' ? <CheckCircle2 className="text-green-500 mx-auto" size={18}/> : <Clock className="text-amber-500 mx-auto" size={18}/>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionsPage;
