/* ===================================================
   DefaultersPage.js — Final High-Fidelity Version
   =================================================== */

const DEFAULTER_DATA = [
  { tower: 'T1', total: 152, defaulters: 38, outstanding: 1045231.45 },
  { tower: 'T2', total: 152, defaulters: 41, outstanding: 1212345.12 },
  { tower: 'T3', total: 144, defaulters: 42, outstanding: 1195123.84 },
  { tower: 'T4', total: 152, defaulters: 41, outstanding: 1233141.07 },
  { tower: 'T5', total: 152, defaulters: 33, outstanding: 684218.52 },
];

// Calculation Constants based on your Society Budget
const AVG_MONTHLY_CAM = 2200; 

function DefaultersPage() {
  const [activeTab, setActiveTab] = React.useState('monthly');
  
  const totalOOS = DEFAULTER_DATA.reduce((s, d) => s + d.outstanding, 0);
  const totalDef = DEFAULTER_DATA.reduce((s, d) => s + d.defaulters, 0);
  
  // Formatters
  const fmtL = v => '₹' + (v / 100000).toFixed(1) + 'L';
  const fmt = v => '₹' + Math.round(v).toLocaleString('en-IN');

  // Logic for Aging Analysis (Based on your "Duration" screenshot)
  const agingBuckets = [
    { period: '1-3 Months', amount: 1820000, flats: 125, color: 'bg-blue-500',  limit: 'Up to 3x CAM' },
    { period: '3-6 Months', amount: 1540000, flats: 45,  color: 'bg-amber-500', limit: '3x to 6x CAM' },
    { period: '6+ Months',  amount: 2010000, flats: 25,  color: 'bg-red-500',   limit: 'Above 6x CAM' }
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Defaulter Analysis</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <p className="text-sm text-gray-500 font-medium">Live Maintenance Recovery • 752 Units</p>
          </div>
        </div>
        
        {/* Tab Switcher (Monthly vs Aging) */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-fit shadow-inner">
          <button 
            onClick={() => setActiveTab('monthly')}
            className={`px-6 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'monthly' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Tower Wise
          </button>
          <button 
            onClick={() => setActiveTab('aging')}
            className={`px-6 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'aging' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Aging Analysis
          </button>
        </div>
      </div>

      {activeTab === 'monthly' ? (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Outstanding</p>
              <p className="text-2xl font-black text-gray-900">{fmtL(totalOOS)}</p>
              <p className="text-[10px] text-red-500 font-medium mt-1">Action Required</p>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Defaulters</p>
              <p className="text-2xl font-black text-gray-900">{totalDef}</p>
              <p className="text-[10px] text-gray-400 mt-1">{(totalDef/752*100).toFixed(1)}% of Society</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Avg Dues</p>
              <p className="text-2xl font-black text-amber-600">{fmt(totalOOS/totalDef)}</p>
              <p className="text-[10px] text-gray-400 mt-1">Per Unit</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Recovery</p>
              <p className="text-2xl font-black text-blue-600">74%</p>
              <p className="text-[10px] text-gray-400 mt-1">Current Month</p>
            </div>
          </div>

          {/* Tower Breakdown Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-600">Tower</th>
                  <th className="px-6 py-4 font-bold text-gray-600">Flats</th>
                  <th className="px-6 py-4 font-bold text-gray-600">Defaulters</th>
                  <th className="px-6 py-4 font-bold text-gray-600">Default Rate</th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-right">Total O/S</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {DEFAULTER_DATA.map(d => (
                  <tr key={d.tower} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-black text-gray-900">{d.tower}</td>
                    <td className="px-6 py-4 text-gray-500 font-medium">{d.total}</td>
                    <td className="px-6 py-4 text-red-600 font-bold">{d.defaulters}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden max-w-[100px]">
                          <div 
                            className="bg-red-400 h-full rounded-full" 
                            style={{ width: `${(d.defaulters/d.total)*100}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-500 font-bold">{(d.defaulters/d.total*100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-gray-800">{fmtL(d.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Aging Analysis View - Matches "Duration" Calculation */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 uppercase mb-8 tracking-[0.2em]">Outstanding by Duration</h3>
            <div className="space-y-10">
              {agingBuckets.map(item => (
                <div key={item.period} className="group">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <span className="block text-sm font-black text-gray-800 uppercase tracking-wide">{item.period}</span>
                      <span className="text-[10px] text-gray-400 font-medium">{item.limit}</span>
                    </div>
                    <div className="text-right">
                      <span className="block font-black text-lg text-gray-900">{fmtL(item.amount)}</span>
                      <span className="text-[10px] text-gray-400 font-bold">{item.flats} Units Involved</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden p-0.5 shadow-inner">
                    <div 
                      className={`${item.color} h-full rounded-full transition-all duration-1000 ease-out shadow-sm`} 
                      style={{ width: `${(item.amount / 5370000) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl">
              <h3 className="text-amber-800 font-black text-xs uppercase mb-4 tracking-widest">Recovery Guidelines</h3>
              <ul className="space-y-4">
                <li className="flex gap-3 text-sm text-amber-900/80">
                  <div className="w-5 h-5 rounded bg-amber-200 flex items-center justify-center text-[10px] font-bold">1</div>
                  <span><strong>1-3 Months:</strong> Send automated WhatsApp & SMS reminders.</span>
                </li>
                <li className="flex gap-3 text-sm text-amber-900/80">
                  <div className="w-5 h-5 rounded bg-amber-200 flex items-center justify-center text-[10px] font-bold">2</div>
                  <span><strong>3-6 Months:</strong> Restrict Club House & Intercom facilities.</span>
                </li>
                <li className="flex gap-3 text-sm text-amber-900/80">
                  <div className="w-5 h-5 rounded bg-amber-200 flex items-center justify-center text-[10px] font-bold">3</div>
                  <span><strong>6+ Months:</strong> Initiate formal Legal Notice as per society bylaws.</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-200">
               <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Projected Recovery</p>
               <p className="text-2xl font-black">₹3.80L <span className="text-sm font-normal opacity-70">expected by 25th</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
