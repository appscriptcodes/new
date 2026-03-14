/* ===================================================
   TransactionsPage.js — Transactions Page & Modals
   Global Hillview Society Portal
   =================================================== */

function TransactionsPage({ data, isAdmin, onRefresh, chartOfAccounts }) {
  const { useState, useMemo } = React;

  const [search,          setSearch]          = useState('');
  const [activeTypeFilter,setActiveTypeFilter] = useState(null);
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [viewRow,         setViewRow]         = useState(null);
  const [editRow,         setEditRow]         = useState(null);
  const [uploading,       setUploading]       = useState(false);

  const stats = useMemo(() => {
    const income  = data.filter(t => (t.Type || '').toLowerCase() === 'credit').reduce((s, t) => s + Number(t.Amount || 0), 0);
    const expense = data.filter(t => { const type = (t.Type || '').toLowerCase().trim(); return type === 'debit' || type === 'expense'; }).reduce((s, t) => s + Number(t.Amount || 0), 0);
    return { income, expense, profit: income - expense };
  }, [data]);

  const filtered = useMemo(() => {
    let result = data;
    if (activeTypeFilter === 'income')  result = result.filter(t => (t.Type || '').toLowerCase() === 'credit');
    if (activeTypeFilter === 'expense') result = result.filter(t => { const type = (t.Type || '').toLowerCase().trim(); return type === 'debit' || type === 'expense'; });
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
  }, [data, search, activeTypeFilter]);

  return (
    <div className="space-y-6 fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div onClick={() => setActiveTypeFilter(activeTypeFilter === 'income' ? null : 'income')}
          className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer transition-all ${activeTypeFilter === 'income' ? 'ring-2 ring-green-500' : 'hover:shadow-md'}`}>
          <p className="text-xs text-gray-600">Total Income</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{INR.format(stats.income)}</p>
        </div>
        <div onClick={() => setActiveTypeFilter(activeTypeFilter === 'expense' ? null : 'expense')}
          className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer transition-all ${activeTypeFilter === 'expense' ? 'ring-2 ring-red-500' : 'hover:shadow-md'}`}>
          <p className="text-xs text-gray-600">Total Expense</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{INR.format(stats.expense)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-600">Net Profit/Loss</p>
          <p className={`text-2xl font-bold mt-1 ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {INR.format(stats.profit)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Transactions ({filtered.length})</h2>
            <div className="flex items-center gap-3">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search..." className="px-4 py-2 border border-gray-300 rounded-lg" />
              <ExportButton data={filtered} filename="Transactions" />
              {isAdmin && (
                <button onClick={() => setShowAddModal(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Date','Description','Type','Amount','Category','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{formatDateDisplay(row.Date)}</td>
                  <td className="px-4 py-3 text-sm"><span className="line-clamp-1">{row.Description}</span></td>
                  <td className="px-4 py-3">
                    <span className={`status-badge ${(row.Type || '').toLowerCase() === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {row.Type || 'Debit'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{INR.format(Number(row.Amount || 0))}</td>
                  <td className="px-4 py-3 text-sm">{row.Category}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setViewRow(row)} className="text-blue-500 hover:text-blue-600 text-sm font-medium">View</button>
                      {isAdmin && <button onClick={() => setEditRow(row)} className="text-green-500 hover:text-green-600 text-sm font-medium">Edit</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewRow && <TransactionViewModal row={viewRow} onClose={() => setViewRow(null)} />}

      {(showAddModal || editRow) && (
        <TransactionModal row={editRow} chartOfAccounts={chartOfAccounts} uploading={uploading}
          onClose={() => { setShowAddModal(false); setEditRow(null); }}
          onSave={async (formData) => {
            try {
              setUploading(true);
              await maybeUploadField(formData, 'Transactions', 'Attachment', 'txn');
              if (editRow) await api.upsertRow('Transactions', 'Serial Number', { ...editRow, ...formData });
              else         await api.createRow('Transactions', formData);
              await onRefresh();
              setShowAddModal(false); setEditRow(null);
              showToast('Transaction saved', 'success');
            } catch (e) { showToast('Failed: ' + String(e), 'error'); }
            finally     { setUploading(false); }
          }} />
      )}
    </div>
  );
}

function TransactionViewModal({ row, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold">Transaction Details</h3>
        </div>
        <div className="p-6 space-y-3">
          {Object.keys(row).map(col => (
            <div key={col}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{col}</label>
              {col === 'Attachment' && row[col] ? (
                <a href={row[col]} target="_blank" rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Attachment
                </a>
              ) : <p className="text-gray-900">{row[col] || '-'}</p>}
            </div>
          ))}
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Close</button>
        </div>
      </div>
    </div>
  );
}

function TransactionModal({ row, chartOfAccounts, uploading, onClose, onSave }) {
  const { useState, useMemo } = React;
  const [formData, setFormData] = useState(row || {
    Date: new Date().toISOString().split('T')[0],
    Description: '', Type: 'Credit', Amount: '', Category: '', Attachment: ''
  });
  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const categories = useMemo(() =>
    chartOfAccounts.filter(c => (c.Group || '').toLowerCase() === (formData.Type.toLowerCase() === 'credit' ? 'income' : 'expense')),
  [chartOfAccounts, formData.Type]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold">{row ? 'Edit' : 'Add'} Transaction</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input type="date" value={formData.Date} onChange={e => set('Date', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select value={formData.Type} onChange={e => set('Type', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="Credit">Income (Credit)</option>
                <option value="Debit">Expense (Debit)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <input type="text" value={formData.Description} onChange={e => set('Description', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <input type="number" value={formData.Amount} onChange={e => set('Amount', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select value={formData.Category} onChange={e => set('Category', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="">Select Category</option>
                {categories.map((cat, i) => <option key={i} value={cat.Category}>{cat.Category}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Attachment</label>
              <input type="file" onChange={e => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = () => set('Attachment', r.result); r.readAsDataURL(f); }}}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} disabled={uploading} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button onClick={() => onSave(formData)} disabled={uploading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2">
            {uploading && <div className="spinner" style={{width:'16px',height:'16px',borderWidth:'2px'}} />}
            {uploading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
