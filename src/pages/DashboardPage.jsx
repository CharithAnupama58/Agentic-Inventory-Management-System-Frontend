import { useEffect, useState } from "react";
import { getDashboard } from "../api/services";

function StatCard({ title, value, sub, icon, color, subColor }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-500 text-sm font-medium">{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${subColor || "text-gray-400"}`}>{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin text-4xl">⏳</div>
    </div>
  );

  const today   = data?.today;
  const month   = data?.thisMonth;
  const refunds = data?.refundSummary;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {/* Today */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Today</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Net Revenue"
            value={`$${today?.netRevenue ?? "0.00"}`}
            icon="💵" color="text-green-600"
            sub={today?.refundedAmount > 0 ? `Gross $${today.revenue} − Refunds $${today.refundedAmount}` : `Gross $${today?.revenue ?? "0.00"}`}
          />
          <StatCard title="Profit"
            value={`$${today?.profit ?? "0.00"}`}
            icon="📈" color="text-blue-600"
            sub={`COGS: $${today?.cogs ?? "0.00"}`}
          />
          <StatCard title="Transactions"
            value={today?.transactionCount ?? 0}
            icon="🧾" color="text-purple-600"
          />
          <StatCard title="Refunds Today"
            value={today?.refundCount ?? 0}
            icon="🔄"
            color={today?.refundCount > 0 ? "text-red-500" : "text-gray-400"}
            sub={today?.refundedAmount > 0 ? `-$${today.refundedAmount}` : "None"}
            subColor="text-red-400"
          />
        </div>
      </div>

      {/* This Month */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">This Month</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Net Revenue"
            value={`$${month?.netRevenue ?? "0.00"}`}
            icon="💵" color="text-green-600"
            sub={`Gross: $${month?.revenue ?? "0.00"}`}
          />
          <StatCard title="Profit"
            value={`$${month?.profit ?? "0.00"}`}
            icon="📈" color="text-blue-600"
            sub={`COGS: $${month?.cogs ?? "0.00"}`}
          />
          <StatCard title="Transactions"
            value={month?.transactionCount ?? 0}
            icon="🧾" color="text-purple-600"
          />
          <StatCard title="Refunds"
            value={`$${refunds?.totalRefundedAmount ?? "0.00"}`}
            icon="🔄" color="text-red-500"
            sub={`${refunds?.totalRefunds ?? 0} order(s)`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-700 mb-4">🏆 Top Products This Month</h2>
          {data?.topProducts?.length === 0
            ? <p className="text-gray-400 text-sm">No sales data yet</p>
            : <div className="space-y-3">
                {data?.topProducts?.map((p, i) => (
                  <div key={p.productId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-700">{p.productName}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">${p.totalRevenue}</p>
                      <p className="text-xs text-gray-400">{p.quantitySold} sold</p>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Inventory */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-700 mb-4">📦 Inventory Health</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Total Products</span>
              <span className="font-bold">{data?.inventory?.totalProducts ?? 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm text-yellow-700">⚠️ Low Stock (≤10)</span>
              <span className="font-bold text-yellow-700">{data?.inventory?.lowStockCount ?? 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm text-red-700">🚫 Out of Stock</span>
              <span className="font-bold text-red-700">{data?.inventory?.outOfStockCount ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Sales Table — now shows gross, refunds, and net */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">📅 Daily Sales — Last 7 Days</h2>
        {!data?.dailySales?.length
          ? <p className="text-gray-400 text-sm">No sales data yet</p>
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs border-b">
                    <th className="text-left py-2 font-medium">Date</th>
                    <th className="text-right py-2 font-medium">Gross</th>
                    <th className="text-right py-2 font-medium">Refunds</th>
                    <th className="text-right py-2 font-medium">Net Revenue</th>
                    <th className="text-right py-2 font-medium">Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailySales.map(d => (
                    <tr key={d.date} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 text-gray-600">{d.date}</td>
                      <td className="py-2.5 text-right text-gray-500">${d.grossRevenue}</td>
                      <td className="py-2.5 text-right">
                        {d.refundedAmount > 0
                          ? <span className="text-red-500">-${d.refundedAmount}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="py-2.5 text-right font-semibold text-green-600">
                        ${d.netRevenue}
                      </td>
                      <td className="py-2.5 text-right text-gray-500">{d.transactionCount}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="py-2 font-semibold text-gray-700">Total</td>
                    <td className="py-2 text-right text-gray-500 font-medium">
                      ${data.dailySales.reduce((s, d) => s + parseFloat(d.grossRevenue), 0).toFixed(2)}
                    </td>
                    <td className="py-2 text-right text-red-500 font-medium">
                      -${data.dailySales.reduce((s, d) => s + parseFloat(d.refundedAmount), 0).toFixed(2)}
                    </td>
                    <td className="py-2 text-right text-green-600 font-bold">
                      ${data.dailySales.reduce((s, d) => s + parseFloat(d.netRevenue), 0).toFixed(2)}
                    </td>
                    <td className="py-2 text-right text-gray-500 font-medium">
                      {data.dailySales.reduce((s, d) => s + d.transactionCount, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
        }
      </div>
    </div>
  );
}
