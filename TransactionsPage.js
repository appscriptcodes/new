/* ===================================================
   TransactionsPage.js — Transactions Page & Modals
   Global Hillview Society Portal
   =================================================== */

/* ─── GAS helpers for clearing + bulk-appending rows ─── */

/**
 * Clears all data rows (keeps header) in the Transactions sheet,
 * then appends each transaction one-by-one via createRow.
 * Called only when admin confirms the import.
 */
async function clearAndImportTransactions(rows) {
  /* 1. Ask GAS to wipe data rows via a dedicated op we add below.
        The GAS side already supports upsertRow / createRow.
        We send op:'clearSheet' which the GAS backend handles.       */
  const clearRes = await postPlain({ op: 'clearSheet', sheet: 'Transactions' });
  if (!clearRes.ok) throw new Error('Clear failed: ' + (clearRes.error || 'unknown'));

  /* 2. Append every row sequentially.  */
  for (const row of rows) {
    await postPlain({ op: 'createRow', sheet: 'Transactions', row });
  }
}

/* ─── Bank-statement XLS/XLSX parser (runs in browser) ─── */
/**
 * Parses an HDFC-style bank statement workbook (already loaded as an
 * XLSX.WorkBook via SheetJS) into an array of transaction objects
 * that match the Transactions sheet columns:
 *   Date | Description | Type | Amount | Category | Chq/Ref No | Closing Balance
 */
function parseBankStatement(workbook) {
  const sheetName = workbook.SheetNames[0];
  const ws        = workbook.Sheets[sheetName];

  /* Convert to row arrays (no header detection — we find the header row) */
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

  /* Find the header row that contains "Date" and "Narration" */
  let headerIdx = -1;
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (row && row.some(c => String(c || '').trim() === 'Date') &&
               row.some(c => String(c || '').trim().toLowerCase().includes('narration'))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) throw new Error('Could not find the transaction header row. Is this an HDFC bank statement?');

  const header   = raw[headerIdx].map(h => String(h || '').trim());
  const dateIdx  = header.findIndex(h => h === 'Date');
  const narrIdx  = header.findIndex(h => h.toLowerCase().includes('narration'));
  const refIdx   = header.findIndex(h => h.toLowerCase().includes('chq') || h.toLowerCase().includes('ref'));
  const wdIdx    = header.findIndex(h => h.toLowerCase().includes('withdrawal'));
  const depIdx   = header.findIndex(h => h.toLowerCase().includes('deposit'));
  const balIdx   = header.findIndex(h => h.toLowerCase().includes('closing') || h.toLowerCase().includes('balance'));

  const transactions = [];
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || !row[dateIdx]) continue;

    const dateVal = String(row[dateIdx] || '').trim();
    /* Skip separator lines like ******* */
    if (!dateVal || dateVal.startsWith('*')) continue;

    const withdrawal = parseFloat(String(row[wdIdx] || '').replace(/,/g, '')) || 0;
    const deposit    = parseFloat(String(row[depIdx] || '').replace(/,/g, '')) || 0;
    const closing    = parseFloat(String(row[balIdx] || '').replace(/,/g, '')) || 0;

    /* Skip rows where both amounts are zero (likely junk/footer) */
    if (withdrawal === 0 && deposit === 0) continue;

    const isCredit = deposit > 0;
    const amount   = isCredit ? deposit : withdrawal;

    /* Normalise date: "29/11/25" → "2025-11-29" */
    let isoDate = dateVal;
    const dmyShort = dateVal.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    const dmyFull  = dateVal.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyShort) {
      const [, d, m, y] = dmyShort;
      isoDate = `20${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    } else if (dmyFull) {
      const [, d, m, y] = dmyFull;
      isoDate = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }

    transactions.push({
      Date:            isoDate,
      Description:     String(row[narrIdx] || '').trim(),
      Type:            isCredit ? 'Credit' : 'Debit',
      Amount:          amount,
      Category:        '',
      'Chq/Ref No':    String(row[refIdx]  || '').trim(),
      'Closing Balance': closing,
      Attachment:      ''
    });
  }

  return transactions;
}

/* ───────────────────────────────────────────────────────────
   Main Component
   ─────────────────────────────────────────────────────────── */
function TransactionsPage({ data, isAdmin, onRefresh, chartOfAccounts }) {
  const { useState, useMemo, useRef } = React;

  const [search,           setSearch]           = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState(null);
  const [showAddModal,     setShowAddModal]      = useState(false);
  const [viewRow,          setViewRow]           = useState(null);
  const [editRow,          setEditRow]           = useState(null);
  const [uploading,        setUploading]         = useState(false);

  /* ── Import state ── */
  const [importStep,       setImportStep]        = useState('idle'); // idle | preview | importing | done
  const [importRows,       setImportRows]        = useState([]);
  const [importError,      setImportError]       = useState('');
  const [importProgress,   setImportProgress]    = useState(0);
  const fileInputRef = useRef(null);

  /* ── Summary stats ── */
  const stats = useMemo(() => {
    const income  = data.filter(t => (t.Type || '').toLowerCase() === 'credit')
                        .reduce((s, t) => s + Number(t.Amount || 0), 0);
    const expense = data.filter(t => {
      const type = (t.Type || '').toLowerCase().trim();
      return type === 'debit' || type === 'expense';
    }).reduce((s, t) => s + Number(t.Amount || 0), 0);
    return { income, expense, profit: income - expense };
  }, [data]);

  /* ── Filtered rows ── */
  const filtered = useMemo(() => {
    let result = data;
    if (activeTypeFilter === 'income')  result = result.filter(t => (t.Type || '').toLowerCase() === 'credit');
    if (activeTypeFilter === 'expense') result = result.filter(t => {
      const type = (t.Type || '').toLowerCase().trim();
      return type === 'debit' || type === 'expense';
    });
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
  }, [data, search, activeTypeFilter]);

  /* ── Bank-statement file picked ── */
  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImportError('');

    if (typeof XLSX === 'undefined') {
      setImportError('SheetJS (XLSX) library is not loaded. Please refresh the page.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb   = XLSX.read(evt.target.result, { type: 'binary', cellText: true, cellDates: false });
        const rows = parseBankStatement(wb);
        if (rows.length === 0) {
          setImportError('No valid transactions found in the file. Please check the format.');
          return;
        }
        setImportRows(rows);
        setImportStep('preview');
      } catch (err) {
        setImportError('Parse error: ' + String(err));
      }
    };
    reader.readAsBinaryString(file);
    /* reset so same file can be re-picked */
    e.target.value = '';
  }

  /* ── Confirmed: clear existing + append imported rows ── */
  async function handleConfirmImport() {
    setImportStep('importing');
    setImportProgress(0);
    try {
      /* Step 1 – clear */
      const clearRes = await postPlain({ op: 'clearSheet', sheet: 'Transactions' });
      if (!clearRes.ok) throw new Error('Clear failed: ' + (clearRes.error || 'unknown'));

      /* Step 2 – append each row */
      for (let i = 0; i < importRows.length; i++) {
        await postPlain({ op: 'createRow', sheet: 'Transactions', row: importRows[i] });
        setImportProgress(Math.round(((i + 1) / importRows.length) * 100));
      }

      setImportStep('done');
      showToast(`Imported ${importRows.length} transactions successfully.`, 'success');
      await onRefresh();
      setTimeout(() => { setImportStep('idle'); setImportRows([]); }, 2000);
    } catch (err) {
      setImportError(String(err));
      setImportStep('preview'); /* go back so user can retry */
    }
  }

  /* ── Append only (no clear) ── */
  async function handleAppendOnly() {
    setImportStep('importing');
    setImportProgress(0);
    try {
      for (let i = 0; i < importRows.length; i++) {
        await postPlain({ op: 'createRow', sheet: 'Transactions', row: importRows[i] });
        setImportProgress(Math.round(((i + 1) / importRows.length) * 100));
      }
      setImportStep('done');
      showToast(`Appended ${importRows.length} transactions successfully.`, 'success');
      await onRefresh();
      setTimeout(() => { setImportStep('idle'); setImportRows([]); }, 2000);
    } catch (err) {
      setImportError(String(err));
      setImportStep('preview');
    }
  }

  /* ─────────────────────────────── RENDER ─────────────────────── */
  return (
    <div className="space-y-6 fade-in">

      {/* ── Import Preview Modal ── */}
      {importStep !== 'idle' && (
        <ImportPreviewModal
          step={importStep}
          rows={importRows}
          progress={importProgress}
          error={importError}
          onClearAndImport={handleConfirmImport}
          onAppendOnly={handleAppendOnly}
          onCancel={() => { setImportStep('idle'); setImportRows([]); setImportError(''); }}
        />
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveTypeFilter(activeTypeFilter === 'income' ? null : 'income')}
          className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer transition-all ${activeTypeFilter === 'income' ? 'ring-2 ring-green-500' : 'hover:shadow-md'}`}
        >
          <p className="text-xs text-gray-600">Total Income</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{INR.format(stats.income)}</p>
        </div>
        <div
          onClick={() => setActiveTypeFilter(activeTypeFilter === 'expense' ? null : 'expense')}
          className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer transition-all ${activeTypeFilter === 'expense' ? 'ring-2 ring-red-500' : 'hover:shadow-md'}`}
        >
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

      {/* ── Table Card ── */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Transactions ({filtered.length})</h2>

            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…" className="px-4 py-2 border border-gray-300 rounded-lg"
              />

              <ExportButton data={filtered} filename="Transactions" />

              {isAdmin && (
                <>
                  {/* ── Import Bank Statement Button ── */}
                  <button
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-colors"
                    title="Import Bank Statement (XLS / XLSX)"
                  >
                    {/* upload-file icon */}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="hidden sm:inline">Import Statement</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xls,.xlsx,.csv"
                    style={{ display: 'none' }}
                    onChange={handleImportFile}
                  />

                  {/* ── Manual Add Button ── */}
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'Description', 'Type', 'Amount', 'Category', 'Actions'].map(h => (
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-gray-400 text-sm">No transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewRow && <TransactionViewModal row={viewRow} onClose={() => setViewRow(null)} />}

      {(showAddModal || editRow) && (
        <TransactionModal
          row={editRow}
          chartOfAccounts={chartOfAccounts}
          uploading={uploading}
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
          }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ImportPreviewModal
   ═══════════════════════════════════════════════════════════ */
function ImportPreviewModal({ step, rows, progress, error, onClearAndImport, onAppendOnly, onCancel }) {
  const credits = rows.filter(r => r.Type === 'Credit').length;
  const debits  = rows.filter(r => r.Type === 'Debit').length;
  const totalIn  = rows.filter(r => r.Type === 'Credit').reduce((s, r) => s + Number(r.Amount || 0), 0);
  const totalOut = rows.filter(r => r.Type === 'Debit').reduce((s, r) => s + Number(r.Amount || 0), 0);

  return (
    <div className="modal-overlay" onClick={step === 'preview' ? onCancel : undefined}>
      <div
        className="modal-content"
        style={{ maxWidth: '760px', width: '95%' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Import Bank Statement</h3>
              <p className="text-sm text-gray-500">
                {step === 'preview'   && `${rows.length} transactions detected`}
                {step === 'importing' && 'Uploading to Google Sheets…'}
                {step === 'done'      && 'Import complete!'}
              </p>
            </div>
          </div>
          {step === 'preview' && (
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">

          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Summary tiles */}
          {step === 'preview' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-800">{rows.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Rows</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{credits}</p>
                  <p className="text-xs text-gray-500 mt-1">Credits</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{debits}</p>
                  <p className="text-xs text-gray-500 mt-1">Debits</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-blue-700">{INR.format(totalIn - totalOut)}</p>
                  <p className="text-xs text-gray-500 mt-1">Net</p>
                </div>
              </div>

              {/* Amount summary */}
              <div className="flex gap-4 text-sm text-gray-600">
                <span>Total In: <strong className="text-green-600">{INR.format(totalIn)}</strong></span>
                <span>Total Out: <strong className="text-red-600">{INR.format(totalOut)}</strong></span>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">Choose how to import:</p>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li><strong>Clear & Import</strong> — removes ALL existing transactions, then adds the {rows.length} statement rows.</li>
                    <li><strong>Append Data</strong> — keeps existing transactions and adds the {rows.length} new rows below them.</li>
                  </ul>
                </div>
              </div>

              {/* Preview table (first 10 rows) */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Preview (first 10 rows)</p>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Date', 'Description', 'Type', 'Amount', 'Chq/Ref No', 'Closing Bal'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.slice(0, 10).map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap">{formatDateDisplay(r.Date)}</td>
                          <td className="px-3 py-2 max-w-xs truncate" title={r.Description}>{r.Description}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.Type === 'Credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {r.Type}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap font-medium">{INR.format(r.Amount)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-500">{r['Chq/Ref No'] || '-'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{INR.format(r['Closing Balance'] || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length > 10 && (
                    <p className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
                      … and {rows.length - 10} more rows
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Progress bar during import */}
          {step === 'importing' && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Uploading transactions…</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 text-center">Please wait — do not close this window.</p>
            </div>
          )}

          {/* Done state */}
          {step === 'done' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-800">Import Successful</p>
              <p className="text-sm text-gray-500">{rows.length} transactions have been saved.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3 flex-wrap">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onAppendOnly}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Append Data
            </button>
            <button
              onClick={onClearAndImport}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear &amp; Import
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TransactionViewModal  (unchanged from original)
   ═══════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════
   TransactionModal  (unchanged from original)
   ═══════════════════════════════════════════════════════════ */
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
              <input type="file"
                onChange={e => {
                  const f = e.target.files[0];
                  if (f) { const r = new FileReader(); r.onload = () => set('Attachment', r.result); r.readAsDataURL(f); }
                }}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} disabled={uploading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button onClick={() => onSave(formData)} disabled={uploading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2">
            {uploading && <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />}
            {uploading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
