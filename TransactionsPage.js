/* ===================================================
   TransactionsPage.js — Transactions Page & Modals
   Global Hillview Society Portal
   Full bank-statement columns + Analytics dashboard
   =================================================== */

/* ── Auto-categoriser based on narration patterns ── */
function autoCategory(narration, type) {
  const n = (narration || '').toUpperCase();
  if (n.includes('EASEBUZZ') || n.includes('MAINTENANCE') || n.includes('MAINTENENCE')) return 'Maintenance';
  if (n.includes('NEFT') && type === 'Credit') return 'NEFT Credit';
  if (n.includes('NEFT') && type === 'Debit')  return 'NEFT Debit';
  if (n.includes('UPI') && type === 'Credit')  return 'UPI Receipt';
  if (n.includes('UPI') && type === 'Debit')   return 'UPI Payment';
  if (n.includes('CHQ') || n.includes('CHEQUE')) return 'Cheque';
  if (n.includes('IMPS')) return 'IMPS';
  if (n.includes('RTGS')) return 'RTGS';
  if (n.includes('FT'))   return 'Fund Transfer';
  if (n.includes('ATM'))  return 'ATM';
  if (n.includes('SALARY') || n.includes('SAL')) return 'Salary';
  if (n.includes('ELECTRICITY') || n.includes('ELEC') || n.includes('BESCOM') || n.includes('MSEB')) return 'Electricity';
  if (n.includes('WATER')) return 'Water';
  if (n.includes('SECURITY') || n.includes('GUARD')) return 'Security';
  if (n.includes('REPAIR') || n.includes('MAINTAIN')) return 'Repairs';
  if (n.includes('INSURANCE')) return 'Insurance';
  if (n.includes('AUDIT') || n.includes('CA ') || n.includes('ACCOUNTING')) return 'Audit/Accounting';
  if (n.includes('OWNERSHIP') || n.includes('TRANSFER')) return 'Ownership Transfer';
  if (n.includes('INTEREST')) return 'Interest';
  return type === 'Credit' ? 'Other Income' : 'Other Expense';
}

/* ── Date normaliser: "29/11/25" or "29/11/2025" → "2025-11-29" ── */
function normDate(val) {
  if (!val) return '';
  const s = String(val).trim();
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  const m4 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m2) { const [,d,mo,y]=m2; return `20${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`; }
  if (m4) { const [,d,mo,y]=m4; return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`; }
  return s;
}

/* ── Bank statement XLS/XLSX parser (SheetJS, runs in browser) ── */
function parseBankStatement(workbook) {
  const ws  = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

  let headerIdx = -1;
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i] || [];
    if (row.some(c => String(c||'').trim()==='Date') &&
        row.some(c => String(c||'').toLowerCase().includes('narration'))) {
      headerIdx = i; break;
    }
  }
  if (headerIdx === -1) throw new Error('Header row not found — is this an HDFC statement?');

  const hdr    = raw[headerIdx].map(h => String(h||'').trim());
  const col    = k => hdr.findIndex(h => h.toLowerCase().includes(k.toLowerCase()));
  const idxDate= col('Date');
  const idxNar = col('Narration');
  const idxRef = col('Chq');
  const idxVdt = col('Value');
  const idxWd  = col('Withdrawal');
  const idxDep = col('Deposit');
  const idxBal = col('Closing');

  const out = [];
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || !row[idxDate]) continue;
    const dateStr = String(row[idxDate]||'').trim();
    if (!dateStr || dateStr.startsWith('*') || dateStr.length < 5) continue;
    const wd  = parseFloat(String(row[idxWd] ||'').replace(/,/g,'')) || 0;
    const dep = parseFloat(String(row[idxDep]||'').replace(/,/g,'')) || 0;
    const bal = parseFloat(String(row[idxBal]||'').replace(/,/g,'')) || 0;
    if (wd === 0 && dep === 0) continue;
    const type    = dep > 0 ? 'Credit' : 'Debit';
    const narr    = String(row[idxNar]||'').trim();
    const refNo   = String(row[idxRef]||'').trim();
    const valueDt = normDate(row[idxVdt]);
    out.push({
      Date:              normDate(dateStr),
      Narration:         narr,
      'Chq/Ref No':      refNo,
      'Value Date':      valueDt,
      'Withdrawal Amt':  wd   || '',
      'Deposit Amt':     dep  || '',
      'Closing Balance': bal,
      Type:              type,
      Amount:            dep > 0 ? dep : wd,
      Category:          autoCategory(narr, type),
      Description:       narr,
      Attachment:        ''
    });
  }
  return out;
}

/* ── Tiny bar sparkline rendered as inline SVG ── */
function MiniBar({ values, color }) {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values, 1);
  const w = 4, gap = 2, h = 32;
  const total = values.length * (w + gap) - gap;
  return (
    <svg width={total} height={h} style={{ display:'block' }}>
      {values.map((v, i) => {
        const barH = Math.max(2, Math.round((v / max) * h));
        return <rect key={i} x={i*(w+gap)} y={h-barH} width={w} height={barH} fill={color} rx="1" opacity="0.8" />;
      })}
    </svg>
  );
}

/* ── Analytics Panel ── */
function TransactionAnalytics({ data }) {
  const { useState, useMemo } = React;
  const [period, setPeriod] = useState('monthly');

  const analytics = useMemo(() => {
    if (!data || data.length === 0) return null;

    const credits = data.filter(t => t.Type === 'Credit' || (t['Deposit Amt'] && Number(t['Deposit Amt']) > 0));
    const debits  = data.filter(t => t.Type === 'Debit'  || (t['Withdrawal Amt'] && Number(t['Withdrawal Amt']) > 0));

    const totalIn  = credits.reduce((s,t) => s + Number(t['Deposit Amt']  || t.Amount || 0), 0);
    const totalOut = debits.reduce((s,t)  => s + Number(t['Withdrawal Amt']|| t.Amount || 0), 0);

    /* Monthly bucketing */
    const monthMap = {};
    data.forEach(t => {
      const d = t.Date || '';
      if (!d) return;
      const ym = d.substring(0, 7); // "2025-11"
      if (!monthMap[ym]) monthMap[ym] = { label: ym, credit: 0, debit: 0, count: 0 };
      const dep = Number(t['Deposit Amt']  || (t.Type === 'Credit' ? t.Amount : 0) || 0);
      const wd  = Number(t['Withdrawal Amt']|| (t.Type === 'Debit'  ? t.Amount : 0) || 0);
      monthMap[ym].credit += dep;
      monthMap[ym].debit  += wd;
      monthMap[ym].count++;
    });
    const months = Object.values(monthMap).sort((a,b) => a.label.localeCompare(b.label));

    /* Category breakdown */
    const catMap = {};
    data.forEach(t => {
      const cat = t.Category || 'Other';
      if (!catMap[cat]) catMap[cat] = { credit: 0, debit: 0, count: 0 };
      catMap[cat].credit += Number(t['Deposit Amt']  || (t.Type === 'Credit' ? t.Amount : 0) || 0);
      catMap[cat].debit  += Number(t['Withdrawal Amt']|| (t.Type === 'Debit'  ? t.Amount : 0) || 0);
      catMap[cat].count++;
    });
    const categories = Object.entries(catMap)
      .map(([name, v]) => ({ name, ...v, total: v.credit + v.debit }))
      .sort((a,b) => b.total - a.total);

    /* Mode detection */
    const modeMap = {};
    data.forEach(t => {
      const n = (t.Narration || t.Description || '').toUpperCase();
      let mode = 'Other';
      if (n.includes('UPI'))  mode = 'UPI';
      else if (n.includes('NEFT')) mode = 'NEFT';
      else if (n.includes('RTGS')) mode = 'RTGS';
      else if (n.includes('IMPS')) mode = 'IMPS';
      else if (n.includes('CHQ') || n.includes('CHEQUE')) mode = 'Cheque';
      else if (n.includes('ATM')) mode = 'ATM';
      modeMap[mode] = (modeMap[mode] || 0) + 1;
    });

    /* Balance trend (closing balance per day) */
    const balMap = {};
    data.forEach(t => {
      if (t['Closing Balance'] && t.Date) balMap[t.Date] = Number(t['Closing Balance']);
    });
    const balTrend = Object.entries(balMap).sort((a,b)=>a[0].localeCompare(b[0])).map(([d,v])=>({date:d,bal:v}));

    const latestBal = balTrend.length ? balTrend[balTrend.length-1].bal : 0;
    const oldestBal = balTrend.length > 1 ? balTrend[0].bal : latestBal;

    return { totalIn, totalOut, net: totalIn - totalOut, months, categories, modeMap, balTrend, latestBal, oldestBal,
             totalTxns: data.length, avgCredit: credits.length ? totalIn / credits.length : 0,
             avgDebit: debits.length ? totalOut / debits.length : 0 };
  }, [data]);

  if (!analytics) return (
    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">No transaction data to analyse.</div>
  );

  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtMonth = ym => { const [y,m] = ym.split('-'); return `${MONTH_LABELS[+m-1]} ${y.slice(2)}`; };

  const maxMonthCredit = Math.max(...analytics.months.map(m => m.credit), 1);
  const maxMonthDebit  = Math.max(...analytics.months.map(m => m.debit),  1);
  const maxBal         = Math.max(...analytics.balTrend.map(b => b.bal), 1);
  const minBal         = Math.min(...analytics.balTrend.map(b => b.bal));

  /* SVG line chart for balance trend */
  const svgW = 600, svgH = 120, pad = 10;
  const bPoints = analytics.balTrend;
  const bRange  = maxBal - minBal || 1;
  const pts = bPoints.map((b, i) => {
    const x = pad + (i / Math.max(bPoints.length - 1, 1)) * (svgW - pad*2);
    const y = svgH - pad - ((b.bal - minBal) / bRange) * (svgH - pad*2);
    return `${x},${y}`;
  }).join(' ');

  const modeColors = { UPI:'#6366f1', NEFT:'#10b981', RTGS:'#f59e0b', IMPS:'#ef4444', Cheque:'#8b5cf6', ATM:'#ec4899', Other:'#94a3b8' };
  const modeTotal = Object.values(analytics.modeMap).reduce((s,v)=>s+v,0);

  return (
    <div className="space-y-4">

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Total Credits', val: INR.format(analytics.totalIn),  sub:`Avg ${INR.format(analytics.avgCredit)}`, color:'text-emerald-600', bg:'bg-emerald-50', border:'border-emerald-200' },
          { label:'Total Debits',  val: INR.format(analytics.totalOut), sub:`Avg ${INR.format(analytics.avgDebit)}`,  color:'text-red-600',     bg:'bg-red-50',     border:'border-red-200' },
          { label:'Net Flow',      val: INR.format(analytics.net),      sub: analytics.net >= 0 ? 'Surplus' : 'Deficit', color: analytics.net>=0?'text-blue-600':'text-orange-600', bg:'bg-blue-50', border:'border-blue-200' },
          { label:'Closing Balance', val: INR.format(analytics.latestBal), sub:`${analytics.totalTxns} transactions`, color:'text-purple-600', bg:'bg-purple-50', border:'border-purple-200' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} border ${k.border} rounded-xl p-4`}>
            <p className="text-xs font-medium text-gray-500 mb-1">{k.label}</p>
            <p className={`text-xl font-bold ${k.color} leading-tight`}>{k.val}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Balance Trend ── */}
      {bPoints.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Balance Trend</h3>
            <div className="flex gap-4 text-xs text-gray-500">
              <span>Low: <strong className="text-gray-700">{INR.format(minBal)}</strong></span>
              <span>High: <strong className="text-gray-700">{INR.format(maxBal)}</strong></span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width:'100%', minWidth:'300px', height:'100px' }}>
              <defs>
                <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02"/>
                </linearGradient>
              </defs>
              {/* Fill area */}
              <polygon
                points={`${pad},${svgH-pad} ${pts} ${svgW-pad},${svgH-pad}`}
                fill="url(#balGrad)"
              />
              {/* Line */}
              <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )}

      {/* ── Monthly bars + Mode breakdown ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Monthly In/Out */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Flow</h3>
          <div className="space-y-3 overflow-y-auto" style={{ maxHeight:'260px' }}>
            {analytics.months.map(m => (
              <div key={m.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500 font-medium w-14 flex-shrink-0">{fmtMonth(m.label)}</span>
                  <span className="text-gray-400 ml-2">{m.count} txns</span>
                  <span className="ml-auto text-emerald-600 font-medium">{INR.format(m.credit)}</span>
                </div>
                <div className="flex gap-1 h-2">
                  <div className="bg-emerald-400 rounded-full" style={{ width: `${(m.credit/maxMonthCredit)*100}%`, minWidth: m.credit>0?'2px':0, transition:'width 0.4s' }} />
                </div>
                <div className="flex gap-1 h-2 mt-0.5">
                  <div className="bg-red-400 rounded-full" style={{ width: `${(m.debit/maxMonthDebit)*100}%`, minWidth: m.debit>0?'2px':0, transition:'width 0.4s' }} />
                </div>
                <div className="flex justify-end text-xs text-red-500 mt-0.5">{INR.format(m.debit)}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-400 rounded-full inline-block"/> Credits</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-400 rounded-full inline-block"/> Debits</span>
          </div>
        </div>

        {/* Payment Mode Donut + legend */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Transaction Modes</h3>
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight:'260px' }}>
            {Object.entries(analytics.modeMap).sort((a,b)=>b[1]-a[1]).map(([mode, cnt]) => (
              <div key={mode} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: modeColors[mode]||'#94a3b8' }} />
                <span className="text-xs text-gray-600 w-16 flex-shrink-0">{mode}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all" style={{ width:`${(cnt/modeTotal)*100}%`, background: modeColors[mode]||'#94a3b8' }} />
                </div>
                <span className="text-xs font-medium text-gray-700 w-8 text-right">{cnt}</span>
                <span className="text-xs text-gray-400 w-12 text-right">{((cnt/modeTotal)*100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Category Breakdown ── */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Category Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                {['Category','Txns','Credits','Debits','Net'].map(h => (
                  <th key={h} className="pb-2 text-left font-medium text-gray-400 uppercase pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {analytics.categories.slice(0,12).map(cat => (
                <tr key={cat.name} className="hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-700">{cat.name}</td>
                  <td className="py-2 pr-4 text-gray-500">{cat.count}</td>
                  <td className="py-2 pr-4 text-emerald-600">{cat.credit ? INR.format(cat.credit) : '—'}</td>
                  <td className="py-2 pr-4 text-red-500">{cat.debit ? INR.format(cat.debit) : '—'}</td>
                  <td className={`py-2 font-semibold ${(cat.credit-cat.debit)>=0?'text-emerald-600':'text-red-500'}`}>
                    {INR.format(cat.credit - cat.debit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main TransactionsPage Component
   ═══════════════════════════════════════════════════════════ */
function TransactionsPage({ data, isAdmin, onRefresh, chartOfAccounts }) {
  const { useState, useMemo, useRef } = React;

  const [tab,             setTab]             = useState('table');   // table | analytics
  const [search,          setSearch]          = useState('');
  const [typeFilter,      setTypeFilter]      = useState(null);
  const [showAddModal,    setShowAddModal]     = useState(false);
  const [viewRow,         setViewRow]         = useState(null);
  const [editRow,         setEditRow]         = useState(null);
  const [uploading,       setUploading]       = useState(false);

  /* Import state */
  const [importStep,      setImportStep]      = useState('idle');    // idle|preview|importing|done
  const [importRows,      setImportRows]      = useState([]);
  const [importError,     setImportError]     = useState('');
  const [importProgress,  setImportProgress]  = useState(0);
  const fileRef = useRef(null);

  /* Summary stats (works with both old & new column names) */
  const stats = useMemo(() => {
    const getAmt = (t, type) => {
      if (type === 'credit') {
        return Number(t['Deposit Amt'] || (t.Type === 'Credit' ? t.Amount : 0) || 0);
      }
      return Number(t['Withdrawal Amt'] || (t.Type === 'Debit' ? t.Amount : 0) || 0);
    };
    const income  = data.reduce((s,t) => s + getAmt(t,'credit'), 0);
    const expense = data.reduce((s,t) => s + getAmt(t,'debit'),  0);
    return { income, expense, net: income - expense };
  }, [data]);

  /* Filtered rows */
  const filtered = useMemo(() => {
    let r = data;
    if (typeFilter === 'credit') r = r.filter(t => t.Type === 'Credit' || Number(t['Deposit Amt']||0) > 0);
    if (typeFilter === 'debit')  r = r.filter(t => t.Type === 'Debit'  || Number(t['Withdrawal Amt']||0) > 0);
    if (!search.trim()) return r;
    const q = search.toLowerCase();
    return r.filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(q)));
  }, [data, search, typeFilter]);

  /* File picked for import */
  function onFilePick(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImportError('');
    if (typeof XLSX === 'undefined') { setImportError('SheetJS not loaded. Please refresh.'); return; }
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const wb   = XLSX.read(evt.target.result, { type:'binary', cellText:true, cellDates:false });
        const rows = parseBankStatement(wb);
        if (!rows.length) { setImportError('No transactions found. Is this an HDFC bank statement?'); return; }
        setImportRows(rows);
        setImportStep('preview');
      } catch (err) { setImportError('Parse error: ' + String(err)); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  }

  async function doImport(clearFirst) {
    setImportStep('importing'); setImportProgress(0);
    try {
      if (clearFirst) {
        const r = await postPlain({ op:'clearSheet', sheet:'Transactions' });
        if (!r.ok) throw new Error('Clear failed: ' + (r.error||''));
      }
      for (let i = 0; i < importRows.length; i++) {
        await postPlain({ op:'createRow', sheet:'Transactions', row: importRows[i] });
        setImportProgress(Math.round(((i+1)/importRows.length)*100));
      }
      setImportStep('done');
      showToast(`${importRows.length} transactions imported.`, 'success');
      await onRefresh();
      setTimeout(() => { setImportStep('idle'); setImportRows([]); }, 2000);
    } catch (err) { setImportError(String(err)); setImportStep('preview'); }
  }

  /* Determine visible columns (adapt to whatever columns exist in data) */
  const hasBankCols = data.length > 0 && ('Narration' in data[0] || 'Deposit Amt' in data[0]);

  return (
    <div className="space-y-5 fade-in">

      {/* Import modal */}
      {importStep !== 'idle' && (
        <ImportPreviewModal
          step={importStep} rows={importRows} progress={importProgress} error={importError}
          onClear={() => doImport(true)} onAppend={() => doImport(false)}
          onCancel={() => { setImportStep('idle'); setImportRows([]); setImportError(''); }}
        />
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div onClick={() => setTypeFilter(typeFilter==='credit'?null:'credit')}
          className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer transition-all ${typeFilter==='credit'?'ring-2 ring-emerald-500':'hover:shadow-md'}`}>
          <p className="text-xs text-gray-500 font-medium">Total Credits</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{INR.format(stats.income)}</p>
          <p className="text-xs text-gray-400 mt-1">Click to filter</p>
        </div>
        <div onClick={() => setTypeFilter(typeFilter==='debit'?null:'debit')}
          className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer transition-all ${typeFilter==='debit'?'ring-2 ring-red-500':'hover:shadow-md'}`}>
          <p className="text-xs text-gray-500 font-medium">Total Debits</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{INR.format(stats.expense)}</p>
          <p className="text-xs text-gray-400 mt-1">Click to filter</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Net Flow</p>
          <p className={`text-2xl font-bold mt-1 ${stats.net>=0?'text-blue-600':'text-orange-600'}`}>{INR.format(stats.net)}</p>
          <p className="text-xs text-gray-400 mt-1">{data.length} transactions</p>
        </div>
      </div>

      {/* ── Tab bar + toolbar ── */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-3">

            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              {[['table','Transactions'],['analytics','Analytics']].map(([id,label]) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab===id?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {tab === 'table' && (
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search…" className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
              )}
              <ExportButton data={filtered} filename="Transactions" />
              {isAdmin && (
                <>
                  <button onClick={() => fileRef.current?.click()}
                    className="bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 flex items-center gap-1.5 text-sm transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                    </svg>
                    Import Statement
                  </button>
                  <input ref={fileRef} type="file" accept=".xls,.xlsx,.csv" style={{display:'none'}} onChange={onFilePick} />
                  <button onClick={() => setShowAddModal(true)}
                    className="bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 flex items-center gap-1.5 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Add
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        {tab === 'analytics' ? (
          <div className="p-4">
            <TransactionAnalytics data={data} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {hasBankCols ? (
              /* ── Full bank-statement table ── */
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Date','Narration','Chq/Ref No','Value Date','Withdrawal','Deposit','Balance','Category','Actions'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((row, i) => {
                    const isCredit = Number(row['Deposit Amt']||0) > 0 || row.Type === 'Credit';
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{formatDateDisplay(row.Date)}</td>
                        <td className="px-3 py-2.5 max-w-xs">
                          <p className="truncate text-gray-800" title={row.Narration||row.Description}>{row.Narration||row.Description||'—'}</p>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap font-mono">{row['Chq/Ref No']||'—'}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-gray-500 text-xs">{formatDateDisplay(row['Value Date'])||'—'}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-right font-medium text-red-600">
                          {row['Withdrawal Amt'] ? INR.format(Number(row['Withdrawal Amt'])) : '—'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-right font-medium text-emerald-600">
                          {row['Deposit Amt'] ? INR.format(Number(row['Deposit Amt'])) : '—'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-right font-semibold text-gray-700">
                          {row['Closing Balance'] ? INR.format(Number(row['Closing Balance'])) : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {row.Category||'—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-2">
                            <button onClick={() => setViewRow(row)} className="text-blue-500 hover:text-blue-700 text-xs font-medium">View</button>
                            {isAdmin && <button onClick={() => setEditRow(row)} className="text-green-500 hover:text-green-700 text-xs font-medium">Edit</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan="9" className="px-4 py-12 text-center text-gray-400">No transactions found.</td></tr>
                  )}
                </tbody>
              </table>
            ) : (
              /* ── Legacy table (old column names) ── */
              <table className="w-full text-sm">
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
                      <td className="px-4 py-3">{formatDateDisplay(row.Date)}</td>
                      <td className="px-4 py-3"><span className="line-clamp-1">{row.Description}</span></td>
                      <td className="px-4 py-3">
                        <span className={`status-badge ${(row.Type||'').toLowerCase()==='credit'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{row.Type||'Debit'}</span>
                      </td>
                      <td className="px-4 py-3 font-medium">{INR.format(Number(row.Amount||0))}</td>
                      <td className="px-4 py-3">{row.Category}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => setViewRow(row)} className="text-blue-500 text-sm">View</button>
                          {isAdmin && <button onClick={() => setEditRow(row)} className="text-green-500 text-sm">Edit</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan="6" className="px-4 py-10 text-center text-gray-400">No transactions found.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {viewRow && <TransactionViewModal row={viewRow} onClose={() => setViewRow(null)} />}

      {(showAddModal || editRow) && (
        <TransactionModal row={editRow} chartOfAccounts={chartOfAccounts} uploading={uploading}
          onClose={() => { setShowAddModal(false); setEditRow(null); }}
          onSave={async fd => {
            try {
              setUploading(true);
              await maybeUploadField(fd, 'Transactions', 'Attachment', 'txn');
              if (editRow) await api.upsertRow('Transactions','Serial Number',{...editRow,...fd});
              else         await api.createRow('Transactions', fd);
              await onRefresh();
              setShowAddModal(false); setEditRow(null);
              showToast('Saved', 'success');
            } catch (e) { showToast('Failed: '+String(e),'error'); }
            finally { setUploading(false); }
          }} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Import Preview Modal
   ═══════════════════════════════════════════════════════════ */
function ImportPreviewModal({ step, rows, progress, error, onClear, onAppend, onCancel }) {
  const credits  = rows.filter(r => r.Type === 'Credit');
  const debits   = rows.filter(r => r.Type === 'Debit');
  const totalIn  = credits.reduce((s,r) => s + Number(r['Deposit Amt']  ||r.Amount||0), 0);
  const totalOut = debits.reduce((s,r)  => s + Number(r['Withdrawal Amt']||r.Amount||0), 0);

  return (
    <div className="modal-overlay" onClick={step==='preview'?onCancel:undefined}>
      <div className="modal-content" style={{maxWidth:'800px',width:'95%'}} onClick={e=>e.stopPropagation()}>

        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Import Bank Statement</h3>
              <p className="text-xs text-gray-500">
                {step==='preview'   && `${rows.length} transactions detected`}
                {step==='importing' && `Uploading… ${progress}%`}
                {step==='done'      && 'Import complete!'}
              </p>
            </div>
          </div>
          {step==='preview' && (
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

          {step==='preview' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {label:'Total Rows', val:rows.length, cls:'text-gray-700',    bg:'bg-gray-50 border-gray-200'},
                  {label:'Credits',    val:credits.length, cls:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200'},
                  {label:'Debits',     val:debits.length,  cls:'text-red-700',     bg:'bg-red-50 border-red-200'},
                  {label:'Net',        val:INR.format(totalIn-totalOut), cls:(totalIn-totalOut)>=0?'text-blue-700':'text-orange-700', bg:'bg-blue-50 border-blue-200'},
                ].map(k=>(
                  <div key={k.label} className={`border rounded-xl p-3 text-center ${k.bg}`}>
                    <p className={`text-xl font-bold ${k.cls}`}>{k.val}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 flex gap-3">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z"/>
                </svg>
                <div>
                  <strong>Clear &amp; Import</strong> removes all existing rows then adds {rows.length} new rows.<br/>
                  <strong>Append Data</strong> keeps existing data and adds {rows.length} rows below.
                </div>
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Date','Narration','Chq/Ref No','Value Date','Withdrawal','Deposit','Balance','Category'].map(h=>(
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.slice(0,8).map((r,i)=>(
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">{formatDateDisplay(r.Date)}</td>
                        <td className="px-3 py-2 max-w-48 truncate" title={r.Narration}>{r.Narration}</td>
                        <td className="px-3 py-2 font-mono text-gray-400 whitespace-nowrap">{r['Chq/Ref No']||'—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-400">{formatDateDisplay(r['Value Date'])||'—'}</td>
                        <td className="px-3 py-2 text-right text-red-600">{r['Withdrawal Amt']?INR.format(r['Withdrawal Amt']):'—'}</td>
                        <td className="px-3 py-2 text-right text-emerald-600">{r['Deposit Amt']?INR.format(r['Deposit Amt']):'—'}</td>
                        <td className="px-3 py-2 text-right font-medium">{INR.format(r['Closing Balance']||0)}</td>
                        <td className="px-3 py-2"><span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">{r.Category}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 8 && (
                  <p className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t">… and {rows.length-8} more rows</p>
                )}
              </div>
            </>
          )}

          {step==='importing' && (
            <div className="py-6 space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Uploading transactions…</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-purple-600 h-3 rounded-full transition-all" style={{width:`${progress}%`}}/>
              </div>
              <p className="text-xs text-gray-400 text-center">Please wait — do not close this window.</p>
            </div>
          )}

          {step==='done' && (
            <div className="py-10 flex flex-col items-center gap-3">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <p className="font-semibold text-gray-800">{rows.length} transactions imported</p>
            </div>
          )}
        </div>

        {step==='preview' && (
          <div className="p-5 border-t border-gray-100 flex justify-end gap-2 flex-wrap">
            <button onClick={onCancel} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
            <button onClick={onAppend} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
              Append Data
            </button>
            <button onClick={onClear} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              Clear &amp; Import
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TransactionViewModal
   ═══════════════════════════════════════════════════════════ */
function TransactionViewModal({ row, onClose }) {
  const bankCols = ['Date','Narration','Chq/Ref No','Value Date','Withdrawal Amt','Deposit Amt','Closing Balance','Type','Category','Description','Attachment'];
  const legacyCols = ['Date','Description','Type','Amount','Category','Attachment'];
  const hasBankCols = 'Narration' in row || 'Deposit Amt' in row;
  const cols = hasBankCols ? bankCols : legacyCols;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e=>e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Transaction Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-x-6 gap-y-4">
          {cols.filter(c => c in row).map(col => (
            <div key={col} className={col==='Narration'||col==='Description'?'col-span-2':''}>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">{col}</label>
              {col==='Attachment' && row[col] ? (
                <a href={row[col]} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm hover:underline">View File</a>
              ) : (
                <p className="text-sm text-gray-800 break-words">
                  {(col==='Withdrawal Amt'||col==='Deposit Amt'||col==='Closing Balance'||col==='Amount') && row[col]
                    ? INR.format(Number(row[col]))
                    : (col==='Date'||col==='Value Date')
                    ? formatDateDisplay(row[col])
                    : row[col] || '—'}
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TransactionModal (Add / Edit)
   ═══════════════════════════════════════════════════════════ */
function TransactionModal({ row, chartOfAccounts, uploading, onClose, onSave }) {
  const { useState, useMemo } = React;
  const isNew = !row;
  const [fd, setFd] = useState(row || {
    Date: new Date().toISOString().split('T')[0],
    Narration:'', Description:'', Type:'Credit',
    'Deposit Amt':'', 'Withdrawal Amt':'',
    Amount:'', Category:'', 'Chq/Ref No':'',
    'Value Date':'', 'Closing Balance':'', Attachment:''
  });
  const set = (k,v) => setFd(p=>({...p,[k]:v}));

  const categories = useMemo(() =>
    chartOfAccounts.filter(c => (c.Group||'').toLowerCase() === (fd.Type.toLowerCase()==='credit'?'income':'expense')),
  [chartOfAccounts, fd.Type]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e=>e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{isNew?'Add':'Edit'} Transaction</h3>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto" style={{maxHeight:'65vh'}}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
              <input type="date" value={fd.Date} onChange={e=>set('Date',e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Type</label>
              <select value={fd.Type} onChange={e=>set('Type',e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="Credit">Credit (Deposit)</option>
                <option value="Debit">Debit (Withdrawal)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Narration / Description</label>
              <input type="text" value={fd.Narration||fd.Description} onChange={e=>{set('Narration',e.target.value);set('Description',e.target.value);}}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                {fd.Type==='Credit'?'Deposit Amount':'Withdrawal Amount'}
              </label>
              <input type="number" value={fd.Type==='Credit'?fd['Deposit Amt']:fd['Withdrawal Amt']}
                onChange={e=>{
                  const k = fd.Type==='Credit'?'Deposit Amt':'Withdrawal Amt';
                  set(k,e.target.value); set('Amount',e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
              <select value={fd.Category} onChange={e=>set('Category',e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Auto / Select</option>
                {categories.map((c,i)=><option key={i} value={c.Category}>{c.Category}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Chq / Ref No</label>
              <input type="text" value={fd['Chq/Ref No']||''} onChange={e=>set('Chq/Ref No',e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Value Date</label>
              <input type="date" value={fd['Value Date']||''} onChange={e=>set('Value Date',e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Closing Balance</label>
              <input type="number" value={fd['Closing Balance']||''} onChange={e=>set('Closing Balance',e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Attachment</label>
              <input type="file" onChange={e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=()=>set('Attachment',r.result);r.readAsDataURL(f);}}}
                className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700"/>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} disabled={uploading} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button onClick={()=>onSave(fd)} disabled={uploading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2">
            {uploading && <div className="spinner" style={{width:'14px',height:'14px',borderWidth:'2px'}}/>}
            {uploading?'Saving…':'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
