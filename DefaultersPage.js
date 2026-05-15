/* ===================================================
   DefaultersPage.js — Corrected Flat Counts
   =================================================== */

const DEFAULTER_DATA = [
  { tower: 'T1', total: 152, defaulters: 35, outstanding: 1040894.74 }, // 19 floors * 8
  { tower: 'T2', total: 152, defaulters: 46, outstanding: 1374063.94 }, // 19 floors * 8
  { tower: 'T3', total: 144, defaulters: 40, outstanding: 1035740.44 }, // 18 floors * 8
  { tower: 'T4', total: 152, defaulters: 41, outstanding: 1233141.07 }, // 19 floors * 8
  { tower: 'T5', total: 152, defaulters: 33, outstanding: 684218.52 },  // 19 floors * 8
];

function DefaultersPage() {
  const totalOutstanding = DEFAULTER_DATA.reduce((sum, d) => sum + d.outstanding, 0);
  const totalDefaulters = DEFAULTER_DATA.reduce((sum, d) => sum + d.defaulters, 0);
  const totalFlats = DEFAULTER_DATA.reduce((sum, d) => sum + d.total, 0); // Correctly sums to 752

  const fmt = v => '₹' + Math.round(v).toLocaleString('en-IN');
  const fmtL = v => '₹' + (v / 100000).toFixed(1) + 'L';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Defaulter Analysis</h1>
        <p className="text-sm text-gray-500">
          Analytics based on 5 Towers | {totalFlats} Total Flats
        </p>
      </header>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-red-500">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Outstanding</p>
          <p className="text-3xl font-bold text-gray-900">{fmtL(totalOutstanding)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-amber-500">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Defaulters</p>
          <p className="text-3xl font-bold text-gray-900">{totalDefaulters}</p>
          <p className="text-xs text-gray-500 mt-1">{(totalDefaulters/totalFlats*100).toFixed(1)}% of society</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-500">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg. Collection Gap</p>
          <p className="text-3xl font-bold text-gray-900">₹4.05L</p>
          <p className="text-xs text-gray-500 mt-1">Monthly revenue loss</p>
        </div>
      </div>

      {/* Detailed Tower Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-700">Tower</th>
              <th className="px-6 py-4 font-bold text-gray-700">Config</th>
              <th className="px-6 py-4 font-bold text-gray-700">Total Flats</th>
              <th className="px-6 py-4 font-bold text-gray-700">Defaulters</th>
              <th className="px-6 py-4 font-bold text-gray-700">Outstanding</th>
              <th className="px-6 py-4 font-bold text-gray-700">Recovery %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {DEFAULTER_DATA.map(d => (
              <tr key={d.tower} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-bold">{d.tower}</td>
                <td className="px-6 py-4 text-gray-500">
                  {d.tower === 'T3' ? '18 Floors' : '19 Floors'}
                </td>
                <td className="px-6 py-4">{d.total}</td>
                <td className="px-6 py-4 text-red-600 font-medium">{d.defaulters}</td>
                <td className="px-6 py-4 font-semibold text-gray-800">{fmt(d.outstanding)}</td>
                <td className="px-6 py-4">
                  <div className="w-full bg-gray-100 h-2 rounded-full">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(1 - d.defaulters/d.total)*100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}