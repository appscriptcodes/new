/* ===================================================
   DefaultersPage.js — High-Fidelity UI Integration
   =================================================== */

const DEFAULTER_DATA = [
  { tower: 'T1', total: 152, defaulters: 38, outstanding: 1045231.45 },
  { tower: 'T2', total: 152, defaulters: 41, outstanding: 1212345.12 },
  { tower: 'T3', total: 144, defaulters: 42, outstanding: 1195123.84 },
  { tower: 'T4', total: 152, defaulters: 41, outstanding: 1233141.07 },
  { tower: 'T5', total: 152, defaulters: 33, outstanding: 684218.52 },
];

const AGING_DATA = [
  { period: '1-3 Months', flats: 125, amount: 1820000, color: 'bg-blue-500' },
  { period: '3-6 Months', flats: 45, amount: 1540000, color: 'bg-amber-500' },
  { period: '6+ Months',  flats: 25, amount: 2010000, color: 'bg-red-500' },
];

function DefaultersPage() {
  const [activeTab, setActiveTab] = React.useState('monthly');
  
  const totalOOS = DEFAULTER_DATA.reduce((s, d) => s + d.outstanding, 0);
  const totalDef = DEFAULTER_DATA.reduce((s, d) => s + d.defaulters, 0);
  const fmtL = v => '₹' + (v / 100000).toFixed(1) + 'L';
  const fmt = v => '₹' + Math.round(v).toLocaleString('en-IN');

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Defaulter Analysis</h1>
          <p className="text-sm text-gray-500">Maintenance Recovery Tracking • 752 Units</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
          <button 
            onClick={() => setActiveTab('monthly')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'monthly' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Monthly Analytics
          </button>
          <button 
            onClick={() => setActiveTab('aging')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'aging' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Aging Analysis
          </button>
        </div>
      </div>

      {activeTab === 'monthly' ? (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Outstanding</p>
              <p className="text-2xl font-bold text-red-600">{fmtL(totalOOS)}</p>
              <p className="text-[10px] text-gray-400 mt-1">Direct budget impact</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Defaulter Count</p>
              <p className="text-2xl font-bold text-gray-900">{totalDef} <span className="text-sm font-normal text-gray-400">/ 752</span></p>
              <p className="text-[10px] text-gray-400 mt-1">{(totalDef/752*100).toFixed(1)}% Society default rate</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Avg. Dues/Flat</p>
              <p className="text-2xl font-bold text-amber-600">{fmt(totalOOS/totalDef)}</p>
              <p className="text-[10px] text-gray-400 mt-1">Per defaulting unit</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Collection Gap</p>
              <p className="text-2xl font-bold text-blue-600">26%</p>
              <p className="text-[10px] text-gray-400 mt-1">Current revenue loss</p>
            </div>
          </div>

          {/* Tower Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-600">Tower</th>
                  <th className="px-6 py-4 font-semibold text-gray-600">Total Flats</th>
                  <th className="px-6 py-4 font-semibold text-gray-600">Defaulters</th>
                  <th className="px-6 py-4 font-semibold text-gray-600">Rate (%)</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 text-right">Outstanding</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 text-right">Avg O/S</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {DEFAULTER_DATA.map(d => (
                  <tr key={d.tower} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{d.tower}</td>
                    <td className="px-6 py-4 text-gray-500">{d.total}</td>
                    <td className="px-6 py-4 text-red-600 font-semibold">{d.defaulters}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-red-400 h-full rounded-full" 
                            style={{ width: `${(d.defaulters/d.total)*100}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-500 font-medium w-8">{(d.defaulters/d.total*100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-amber-800">{fmtL(d.outstanding)}</td>
                    <td className="px-6 py-4 text-right text-gray-500">{fmt(d.outstanding/d.defaulters)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Aging Analysis View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-6 tracking-wide">Outstanding by Duration</h3>
            <div className="space-y-6">
              {AGING_DATA.map(item => (
                <div key={item.period} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-gray-700">{item.period}</span>
                    <span className="font-bold text-gray-900">{fmtL(item.amount)}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                    <div 
                      className={`${item.color} h-full rounded-full transition-all duration-1000`} 
                      style={{ width: `${(item.amount / 5370000) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">{item.flats} flats in this bucket</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-amber-50 border border-amber-100 p-6 rounded-xl self-start">
            <h3 className="text-amber-800 font-bold text-sm uppercase mb-3">Recovery Strategy</h3>
            <ul className="space-y-3 text-sm text-amber-900/80">
              <li className="flex gap-2"><span>•</span> <span>Send legal notices to <strong>25 flats</strong> with 6+ months dues.</span></li>
              <li className="flex gap-2"><span>•</span> <span>Restrict club access for <strong>{totalDef}</strong> defaulters.</span></li>
              <li className="flex gap-2"><span>•</span> <span>Incentivize 1-3 month bucket with 2% early-pay discount.</span></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
