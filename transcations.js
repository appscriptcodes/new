/* ===================================================
   TransactionsPage.js — Transactions Page & Modals
   Global Hillview Society Portal
   Full bank-statement columns + Analytics dashboard
   =================================================== */

/* ── Updated Auto-categoriser with Remarks Priority ── */
function autoCategory(narration, type, remarks) {
  // If Remarks exist, use them as the primary indicator/party name
  if (remarks && remarks.trim() !== "") {
    return remarks.trim(); 
  }

  const n = (narration || '').toUpperCase();
  
  // Fallback to Narration-based logic if Remarks are blank
  if (type === 'Credit') {
    if (n.includes('EASEBUZZ'))                        return 'Maintenance Collection';
    if (n.includes('MOVE IN') || n.includes('MOVE OUT')) return 'Move In/Out Charges';
    if (n.includes('OWNERSHIP') || n.includes('OWNERSHIP CHANGE')) return 'Ownership Transfer';
    if (n.includes('ADVANCE MAIN') || n.includes('ADVANCE MAINTEN')) return 'Advance Maintenance';
    if (n.includes('CHQ RET') || n.includes('I/W CHQ RET'))  return 'Cheque Return';
    if (n.includes('VKM'))                             return 'VKM Transfer';
    if (n.includes('UPI'))                             return 'UPI Receipt';
    if (n.includes('NEFT'))                            return 'NEFT Receipt';
    if (n.includes('IMPS'))                            return 'IMPS Receipt';
    if (n.includes('RTGS'))                            return 'RTGS Receipt';
    if (n.includes('FT') && n.includes('CR'))          return 'Fund Transfer In';
    return 'Other Income';
  }
  
  // Debits
  if (n.includes('ENVIRO'))                            return 'Housekeeping (Enviro)';
  if (n.includes('TEAMWORKS') || n.includes('TEAM WORKS')) return 'Security (TeamWorks)';
  if (n.includes('DHBVN') || n.includes('BIJLI VITRAN')) return 'Electricity (DHBVN)';
  if (n.includes('CHQ RETURN CHGS'))                   return 'Bank Charges';
  if (n.includes('CHQ PAID') || n.includes('CTS'))     return 'Cheque Payment';
  if (n.includes('PAWAN') || n.includes('SANDEEP'))    return 'Petty Cash';
  if (n.includes('RTGS DR'))                           return 'RTGS Payment';
  if (n.includes('FT - DR') || (n.includes('FT') && n.includes('DR'))) return 'Fund Transfer Out';
  if (n.includes('NEFT'))                              return 'NEFT Payment';
  if (n.includes('UPI'))                               return 'UPI Payment';
  if (n.includes('IMPS'))                              return 'IMPS Payment';
  if (n.includes('ATM'))                               return 'ATM';
  if (n.includes('ELECTRICITY') || n.includes('ELEC')) return 'Electricity';
  if (n.includes('REPAIR') || n.includes('MAINTAIN'))  return 'Repairs & Maintenance';
  if (n.includes('INTEREST'))                          return 'Interest';
  return 'Other Expense';
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
  const idxRem = col('Remarks'); // Added mapping for Remarks column

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
    const remarks = String(row[idxRem]||'').trim(); // Fetching remark
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
      // If Remarks are available, use them as Category/Party name; else fallback to narration
      Category:          autoCategory(narr, type, remarks),
      Description:       remarks && remarks !== "" ? remarks : narr, 
      Attachment:        ''
    });
  }
  return out;
}

/* ... rest of your file (TransactionAnalytics, TransactionsPage components) ... */