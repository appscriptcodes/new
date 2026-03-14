/* ===================================================
   Chatbot.js — AI Assistant Chatbot Widget
   Global Hillview Society Portal
   =================================================== */

function Chatbot({ data, setView, isAdmin, theme, onClose }) {
  const [isOpen,   setIsOpen]   = React.useState(true);
  const [messages, setMessages] = React.useState([{
    id: 1,
    text: "Hi! 👋 I'm your AI-powered society assistant. I can help you with:\n• Society bylaws and rules\n• Staff directory\n• Issues and complaints\n• Notices and announcements\n• Tenant information\n• Documents & Voters\n• Financials (Admin only)\n\nAsk me anything!",
    sender: 'bot'
  }]);
  const [input,   setInput]   = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const messagesEndRef         = React.useRef(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Local Fallback ──────────────────────────────────
  const getLocalResponse = (query) => {
    const q = query.toLowerCase().trim();

    if (q.includes('staff') || q.includes('directory') || q.includes('employee')) {
      const total  = data.Directory?.length || 0;
      const active = data.Directory?.filter(r => r.Active?.toLowerCase() === 'yes').length || 0;
      return `📋 Directory has ${total} staff (${active} active). Click Directory in sidebar.`;
    }
    if (q.includes('notice') || q.includes('announcement')) {
      const recent = data.Notices?.slice(0, 3).map(n => n.Subject).join(', ') || 'none';
      return `📢 ${data.Notices?.length || 0} notices. Recent: ${recent}. Go to Notices page.`;
    }
    if (q.includes('issue') || q.includes('complaint')) {
      const open = data.Issues?.filter(i => i.Status?.toLowerCase() !== 'resolved').length || 0;
      return `⚠️ ${open} open issues. Report new ones on Issues page.`;
    }
    if (q.includes('document') || q.includes('form')) {
      return `📂 Repository has ${data.Documents?.length || 0} documents. Check Documents page.`;
    }
    if (q.includes('voter') || q.includes('election')) {
      return `🗳️ Voter list has ${data.Voters?.length || 0} members. Check Voters page.`;
    }
    if (q.includes('tenant')) {
      const total    = data.Tenants?.length || 0;
      const verified = data.Tenants?.filter(t => t['Police Verification']?.toLowerCase() === 'yes').length || 0;
      return `🏠 ${total} tenants (${verified} police verified). Check Tenants page.`;
    }

    // Admin-only modules
    if (q.includes('transaction') || q.includes('payment') || q.includes('expense') || q.includes('income')) {
      if (!isAdmin) return '🔒 Access Denied: Financial transactions are visible to Admins only.';
      const total = data.Transactions?.reduce((s, t) => s + Number(t.Amount || 0), 0) || 0;
      return `💰 Total Volume: ₹${total.toLocaleString()}. See Transactions page.`;
    }
    if (q.includes('balance') || q.includes('opening')) {
      if (!isAdmin) return '🔒 Access Denied: Opening balances are visible to Admins only.';
      return '📊 Opening Balances module is active. Check the dashboard table.';
    }
    if (q.includes('chart') || q.includes('account')) {
      if (!isAdmin) return '🔒 Access Denied: Chart of Accounts is visible to Admins only.';
      return `📈 Chart of Accounts has ${data.ChartOfAccounts?.length || 0} categories.`;
    }

    // Navigation shortcuts
    if (q.includes('go to') || q.includes('open')) {
      const nav = [
        ['directory', 'Directory'], ['notices', 'Notices'], ['issues', 'Issues'],
        ['tenants', 'Tenants'], ['documents', 'Documents'], ['voters', 'Voters'],
        ...(isAdmin ? [['transaction', 'Transactions'], ['balance', 'OpeningBalances'], ['account', 'ChartOfAccounts']] : [])
      ];
      for (const [keyword, viewId] of nav) {
        if (q.includes(keyword)) { setView(viewId); setIsOpen(false); return `✅ Opening ${viewId}...`; }
      }
    }

    return "🤔 I'm not sure. Try asking about \"staff\", \"rules\", \"voters\", or \"notices\".";
  };

  // ── Send Message ─────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg  = { id: Date.now(), text: input.trim(), sender: 'user' };
    const userInput = input.trim();
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const cleanDirectory = (data.Directory  || []).map(({ Photo,       ...r }) => r);
      const cleanIssues    = (data.Issues     || []).map(({ 'Media URL': m1, Attachment: m2, ...r }) => r);
      const cleanNotices   = (data.Notices    || []).map(({ Media,       ...r }) => r);
      const cleanDocuments = (data.Documents  || []).map(({ Media,       ...r }) => r);
      const cleanTenants   = (data.Tenants    || []).map(({ Attachments, ...r }) => r);

      const contextPayload = {
        directory: cleanDirectory, issues: cleanIssues, notices: cleanNotices,
        tenants: cleanTenants, documents: cleanDocuments, voters: data.Voters || []
      };
      if (isAdmin) {
        contextPayload.transactions    = (data.Transactions   || []).map(({ Attachment, ...r }) => r);
        contextPayload.openingBalances = data.OpeningBalances  || [];
        contextPayload.chartOfAccounts = data.ChartOfAccounts  || [];
      }

      const response = await postPlain({ op: 'chat', message: userInput, context: contextPayload, isAdmin });
      if (response.ok && response.reply) {
        setMessages(prev => [...prev, { id: Date.now() + 1, text: response.reply, sender: 'bot' }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now() + 1, text: getLocalResponse(userInput), sender: 'bot' }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: Date.now() + 1, text: getLocalResponse(userInput), sender: 'bot' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div className={`fixed bottom-28 right-6 w-[420px] max-h-[600px] backdrop-blur-xl rounded-3xl shadow-2xl z-[100] flex flex-col ${theme === 'dark' ? 'bg-gray-800/95 border-gray-600/50' : 'bg-white/95 border-gray-200/50'} border-2`}>
          {/* Header */}
          <div className="p-5 border-b flex items-center justify-between rounded-t-3xl bg-gradient-to-r from-blue-500 to-purple-600">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">AI Assistant</h3>
                <p className="text-xs text-white/80 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Powered by Gemini AI
                </p>
              </div>
            </div>
            <button onClick={() => { setIsOpen(false); onClose(); }} className="p-2 rounded-xl transition-colors hover:bg-white/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[450px]">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-lg ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : theme === 'dark'
                    ? 'bg-gray-700/80 text-gray-100 border border-gray-600/50'
                    : 'bg-white/80 text-gray-900 border border-gray-100/50'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className={`px-4 py-3 rounded-2xl max-w-xs ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2">
                    <div className="spinner" style={{width:'16px',height:'16px',borderWidth:'2px'}} />
                    <span className="text-sm text-gray-500">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200/50">
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask about bylaws, rules, staff..."
                className={`flex-1 px-4 py-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm ${theme === 'dark' ? 'border-gray-600/50 bg-gray-700/50 text-white placeholder-gray-400' : 'border-gray-300/50 bg-white/50 text-gray-900 placeholder-gray-500'}`}
                disabled={loading} />
              <button onClick={handleSend} disabled={!input.trim() || loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-2xl font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              💡 Try: "show voter list", "open issues", "parking rules"
            </p>
          </div>
        </div>
      )}
    </>
  );
}


/* ===================================================
   GenericTable.js — Fallback Generic Table Component
   =================================================== */

function GenericTable({ title, data, onRefresh, isAdmin }) {
  const { useState, useMemo } = React;
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
  }, [data, search]);

  const columns = useMemo(() => data.length ? Object.keys(data[0]) : [], [data]);

  return (
    <div className="bg-white rounded-2xl shadow-sm fade-in">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{title} ({filtered.length})</h2>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search..." className="px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(col => (
                <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {columns.map(col => (
                  <td key={col} className="px-4 py-3 text-sm">{String(row[col] || '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">No data found</div>
        )}
      </div>
    </div>
  );
}
