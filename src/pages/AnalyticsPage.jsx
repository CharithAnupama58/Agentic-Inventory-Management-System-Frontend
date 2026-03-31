import { useEffect, useState, useCallback } from "react";
import { getAnalytics } from "../api/services";
import { downloadPDF, downloadExcel } from "../utils/reportGenerator";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from "recharts";

// ── Theme colors ──────────────────────────────────────────────────────────────
const COLORS = {
  blue:   "#3b82f6",
  green:  "#22c55e",
  purple: "#a855f7",
  orange: "#f97316",
  red:    "#ef4444",
  teal:   "#14b8a6",
  yellow: "#eab308",
  indigo: "#6366f1",
};

const PIE_COLORS = [COLORS.blue, COLORS.green, COLORS.purple, COLORS.orange];

// ── Custom tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: ${parseFloat(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  );
};

const CountTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, icon, color, growth, pulse }) {
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 relative overflow-hidden ${pulse ? "ring-2 ring-blue-200" : ""}`}>
      {pulse && (
        <span className="absolute top-2 right-2 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
      )}
      <div className="flex justify-between items-start mb-2">
        <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">{title}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {growth !== undefined && (
        <p className={`text-xs font-medium mt-1 ${growth >= 0 ? "text-green-600" : "text-red-500"}`}>
          {growth >= 0 ? "↑" : "↓"} {Math.abs(growth)}% vs last month
        </p>
      )}
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function Card({ title, sub, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-700 mb-0.5">{title}</h2>
      {sub && <p className="text-xs text-gray-400 mb-4">{sub}</p>}
      {!sub && <div className="mb-4" />}
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tab, setTab]               = useState("overview");
  const [countdown, setCountdown]   = useState(30);
  const [downloading, setDownloading] = useState(null); // "pdf" | "excel" | null

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchData = useCallback(() => {
    getAnalytics()
      .then(r => {
        setData(r.data);
        setLastUpdated(new Date());
        setCountdown(30);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Auto-refresh every 30 seconds ─────────────────────────────────────────
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => prev <= 1 ? 30 : prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Download handlers ─────────────────────────────────────────────────────
  const handlePDF = async () => {
    setDownloading("pdf");
    try { await downloadPDF(data, "My Business"); }
    finally { setDownloading(null); }
  };

  const handleExcel = async () => {
    setDownloading("excel");
    try { await downloadExcel(data, "My Business"); }
    finally { setDownloading(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin text-5xl mb-3">📊</div>
        <p className="text-gray-500 text-sm">Loading analytics...</p>
      </div>
    </div>
  );

  const rev    = data?.revenue;
  const profit = data?.profit;

  // ── Prepare chart data ────────────────────────────────────────────────────
  const dailyChartData = (data?.dailyRevenue ?? []).map(d => ({
    date:         d.label?.slice(-5),
    Revenue:      parseFloat(d.revenue    ?? 0),
    Net:          parseFloat(d.netRevenue ?? 0),
    Refunds:      parseFloat(d.refunds    ?? 0),
    Transactions: d.transactions ?? 0,
  }));

  const monthlyChartData = (data?.monthlyRevenue ?? []).map(d => ({
    month:   d.label,
    Revenue: parseFloat(d.revenue    ?? 0),
    Profit:  parseFloat(d.profit     ?? 0),
    Net:     parseFloat(d.netRevenue ?? 0),
  }));

  const paymentData = (data?.paymentBreakdown ?? []).map(p => ({
    name:  p.label,
    value: parseFloat(p.amount ?? 0),
    count: p.count,
    pct:   parseFloat(p.percentage ?? 0),
  }));

  const hourlyData = (data?.peakHours ?? [])
    .filter(h => h.transactions > 0)
    .map(h => ({
      hour:         h.label,
      Transactions: h.transactions,
      Revenue:      parseFloat(h.revenue ?? 0),
    }));

  const topProductsData = (data?.topProducts ?? []).slice(0, 8).map(p => ({
    name:    p.productName?.length > 12
               ? p.productName.slice(0, 12) + "…"
               : p.productName,
    Revenue: parseFloat(p.revenue ?? 0),
    Profit:  parseFloat(p.profit  ?? 0),
    Margin:  parseFloat(p.profitMargin ?? 0),
  }));

  return (
    <div className="space-y-5">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📊 Analytics & Insights</h1>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">
              Last updated: {lastUpdated.toLocaleTimeString()} · Refreshes in {countdown}s
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchData}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <span className="inline-block animate-spin" style={{ animationDuration: "3s" }}>🔄</span>
            Refresh
          </button>

          <button
            onClick={handlePDF}
            disabled={!data || downloading === "pdf"}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {downloading === "pdf" ? (
              <><span className="animate-spin">⏳</span> Generating...</>
            ) : (
              <><span>📄</span> PDF Report</>
            )}
          </button>

          <button
            onClick={handleExcel}
            disabled={!data || downloading === "excel"}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {downloading === "excel" ? (
              <><span className="animate-spin">⏳</span> Generating...</>
            ) : (
              <><span>📊</span> Excel Report</>
            )}
          </button>
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Today Revenue"
          value={`$${rev?.todayRevenue ?? "0.00"}`}
          sub={`Profit: $${rev?.todayProfit ?? "0.00"}`}
          icon="💵" color="text-green-600" pulse={true}
        />
        <KpiCard
          title="Month Revenue"
          value={`$${rev?.monthRevenue ?? "0.00"}`}
          sub={`${rev?.monthTransactions ?? 0} transactions`}
          icon="📅" color="text-blue-600"
          growth={parseFloat(rev?.revenueGrowth ?? 0)}
        />
        <KpiCard
          title="Profit Margin"
          value={`${rev?.profitMargin ?? 0}%`}
          sub={`Net profit: $${rev?.monthProfit ?? "0.00"}`}
          icon="📈" color="text-purple-600"
        />
        <KpiCard
          title="Avg Order Value"
          value={`$${rev?.avgOrderValue ?? "0.00"}`}
          sub={`Refunds: $${rev?.monthRefunds ?? "0.00"}`}
          icon="🧾" color="text-orange-600"
        />
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {[
          { key: "overview", label: "📊 Overview" },
          { key: "products", label: "🏆 Products" },
          { key: "profit",   label: "💰 Profit" },
          { key: "slow",     label: `🐢 Slow Stock (${data?.slowMoving?.length ?? 0})` },
          { key: "hours",    label: "🕐 Peak Hours" },
          { key: "payment",  label: "💳 Payments" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === t.key
                ? "bg-white shadow text-gray-800"
                : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Area chart — daily revenue */}
          <Card title="📅 Daily Revenue — Last 30 Days" sub="Net revenue after refunds">
            {dailyChartData.length === 0
              ? <p className="text-gray-400 text-sm py-8 text-center">No data yet</p>
              : <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={dailyChartData}>
                    <defs>
                      <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={COLORS.blue}  stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.blue}  stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={COLORS.green} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.green} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="Revenue"
                      stroke={COLORS.blue}  fill="url(#gradRev)"
                      strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="Net"
                      stroke={COLORS.green} fill="url(#gradNet)"
                      strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
            }
          </Card>

          {/* Line chart — monthly revenue + profit */}
          <Card title="📆 Monthly Trend — Last 12 Months" sub="Revenue vs profit">
            {monthlyChartData.length === 0
              ? <p className="text-gray-400 text-sm py-8 text-center">No data yet</p>
              : <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Revenue"
                      stroke={COLORS.blue} strokeWidth={2.5}
                      dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Profit"
                      stroke={COLORS.purple} strokeWidth={2.5}
                      dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Net"
                      stroke={COLORS.green} strokeWidth={2}
                      strokeDasharray="4 2" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
            }
          </Card>

          {/* Bar chart — daily transactions */}
          <Card title="🧾 Daily Transactions" sub="Number of sales per day">
            {dailyChartData.length === 0
              ? <p className="text-gray-400 text-sm py-8 text-center">No data yet</p>
              : <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CountTooltip />} />
                    <Bar dataKey="Transactions"
                      fill={COLORS.indigo} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
            }
          </Card>

          {/* Period summary */}
          <Card title="📋 Period Summary">
            <div className="space-y-3">
              {[
                { period: "Today",      rev: rev?.todayRevenue,  profit: rev?.todayProfit,  txn: rev?.todayTransactions  },
                { period: "This Week",  rev: rev?.weekRevenue,   profit: rev?.weekProfit,   txn: rev?.weekTransactions   },
                { period: "This Month", rev: rev?.monthRevenue,  profit: rev?.monthProfit,  txn: rev?.monthTransactions  },
              ].map(r => (
                <div key={r.period}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 w-24">{r.period}</span>
                  <div className="flex gap-4 text-right">
                    <div>
                      <p className="text-xs text-gray-400">Revenue</p>
                      <p className="font-bold text-green-600 text-sm">${r.rev ?? "0.00"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Profit</p>
                      <p className="font-bold text-blue-600 text-sm">${r.profit ?? "0.00"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Sales</p>
                      <p className="font-bold text-gray-700 text-sm">{r.txn ?? 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Products Tab ─────────────────────────────────────────────────── */}
      {tab === "products" && (
        <div className="space-y-5">

          {/* Horizontal bar — revenue vs profit */}
          <Card title="🏆 Revenue vs Profit by Product" sub="This month — top 8 products">
            {topProductsData.length === 0
              ? <p className="text-gray-400 text-sm py-8 text-center">No data yet</p>
              : <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topProductsData} layout="vertical"
                    margin={{ left: 90, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }}
                      tickFormatter={v => `$${v}`} />
                    <YAxis type="category" dataKey="name"
                      tick={{ fontSize: 10 }} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Revenue" fill={COLORS.blue}  radius={[0,4,4,0]} />
                    <Bar dataKey="Profit"  fill={COLORS.green} radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
            }
          </Card>

          {/* Full product table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-700">📋 Full Product Performance</h2>
              <p className="text-xs text-gray-400 mt-0.5">Sorted by revenue this month</p>
            </div>
            {!data?.topProducts?.length
              ? <div className="p-12 text-center text-gray-400">No sales data yet</div>
              : <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b text-xs text-gray-500">
                      <tr>
                        {["#","Product","Sold","Revenue","Profit","Margin","Avg/Day","Stock","Trend"].map(h => (
                          <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((p, i) => (
                        <tr key={p.productId} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{p.productName}</td>
                          <td className="px-4 py-3 text-gray-600">{p.quantitySold}</td>
                          <td className="px-4 py-3 font-semibold text-green-600">${p.revenue}</td>
                          <td className="px-4 py-3 text-blue-600">${p.profit}</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${
                              parseFloat(p.profitMargin) >= 30 ? "text-green-600"
                            : parseFloat(p.profitMargin) >= 15 ? "text-yellow-600"
                            : "text-red-500"}`}>
                              {p.profitMargin}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{p.avgDailySales}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.currentStock === 0     ? "bg-red-100 text-red-700"
                            : p.currentStock <= 10     ? "bg-yellow-100 text-yellow-700"
                            :                            "bg-green-100 text-green-700"}`}>
                              {p.currentStock}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.trend === "UP"   ? "bg-green-100 text-green-700"
                            : p.trend === "DOWN" ? "bg-red-100 text-red-700"
                            :                      "bg-gray-100 text-gray-600"}`}>
                              {p.trend === "UP" ? "↑" : p.trend === "DOWN" ? "↓" : "→"} {p.trend}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        </div>
      )}

      {/* ── Profit Tab ───────────────────────────────────────────────────── */}
      {tab === "profit" && (
        <div className="space-y-5">

          {/* Profit KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Gross Revenue", icon: "💵", color: "text-gray-800",
                value: `$${(parseFloat(profit?.cogs ?? 0) + parseFloat(profit?.grossProfit ?? 0)).toFixed(2)}` },
              { label: "COGS",    icon: "📦", color: "text-orange-600", value: `$${profit?.cogs    ?? "0.00"}` },
              { label: "Refunds", icon: "🔄", color: "text-red-500",    value: `$${profit?.refunds ?? "0.00"}` },
              { label: "Net Profit", icon: "✅", color: "text-green-600", value: `$${profit?.netProfit ?? "0.00"}` },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
                  <span>{s.icon}</span>
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Radial gauge */}
            <Card
              title="🎯 Profit Margin Gauge"
              sub={`Current margin: ${profit?.profitMarginPercent ?? 0}%`}>
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart
                  cx="50%" cy="65%"
                  innerRadius="60%" outerRadius="90%"
                  startAngle={180} endAngle={0}
                  data={[
                    { value: 100, fill: "#f3f4f6" },
                    {
                      value: parseFloat(profit?.profitMarginPercent ?? 0),
                      fill:  parseFloat(profit?.profitMarginPercent ?? 0) >= 30 ? COLORS.green
                           : parseFloat(profit?.profitMarginPercent ?? 0) >= 15 ? COLORS.yellow
                           : COLORS.red
                    }
                  ]}>
                  <RadialBar dataKey="value" cornerRadius={8} />
                </RadialBarChart>
              </ResponsiveContainer>
              <p className="text-center -mt-6 text-3xl font-bold text-gray-800">
                {profit?.profitMarginPercent ?? 0}%
              </p>
              <div className="flex justify-between text-xs mt-3 px-2">
                <span className="text-red-500">● Poor (&lt;15%)</span>
                <span className="text-yellow-500">● Fair (15–30%)</span>
                <span className="text-green-500">● Good (&gt;30%)</span>
              </div>
            </Card>

            {/* Donut — cost breakdown */}
            <Card title="🥧 Cost Breakdown" sub="Revenue allocation this month">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Net Profit", value: Math.max(0, parseFloat(profit?.netProfit ?? 0)) },
                      { name: "COGS",       value: parseFloat(profit?.cogs     ?? 0) },
                      { name: "Refunds",    value: parseFloat(profit?.refunds  ?? 0) },
                    ]}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={3} dataKey="value">
                    {[COLORS.green, COLORS.orange, COLORS.red].map((c, i) => (
                      <Cell key={i} fill={c} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => `$${parseFloat(v).toFixed(2)}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* High / low margin */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title="✅ Highest Margin Products">
              {!profit?.highestMarginProducts?.length
                ? <p className="text-gray-400 text-sm">No data yet</p>
                : profit.highestMarginProducts.map((p, i) => (
                    <div key={i}
                      className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-700">{p.productName}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-green-600">{p.profitMargin}%</span>
                        <p className="text-xs text-gray-400">${p.profit} profit</p>
                      </div>
                    </div>
                  ))
              }
            </Card>

            <Card title="⚠️ Lowest Margin Products">
              {!profit?.lowestMarginProducts?.length
                ? <p className="text-gray-400 text-sm">No data yet</p>
                : profit.lowestMarginProducts.map((p, i) => (
                    <div key={i}
                      className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-700">{p.productName}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-red-500">{p.profitMargin}%</span>
                        <p className="text-xs text-gray-400">${p.profit} profit</p>
                      </div>
                    </div>
                  ))
              }
            </Card>
          </div>
        </div>
      )}

      {/* ── Slow Moving Tab ──────────────────────────────────────────────── */}
      {tab === "slow" && (
        <div className="space-y-5">

          {data?.slowMoving?.length > 0 && (
            <Card title="📊 Slow-Moving Stock Levels" sub="Units on hand with no recent sales">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={data.slowMoving.slice(0, 10).map(p => ({
                    name:  p.productName?.length > 12
                             ? p.productName.slice(0, 12) + "…"
                             : p.productName,
                    Stock: p.currentStock,
                  }))}
                  layout="vertical"
                  margin={{ left: 90 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name"
                    tick={{ fontSize: 10 }} width={90} />
                  <Tooltip content={<CountTooltip />} />
                  <Bar dataKey="Stock" fill={COLORS.orange} radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-700">🐢 Slow-Moving Products</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Stock on hand but zero sales in last 30 days
              </p>
            </div>
            {!data?.slowMoving?.length
              ? <div className="p-12 text-center text-gray-400">
                  <div className="text-4xl mb-2">🎉</div>
                  <p>All products are selling — no slow movers!</p>
                </div>
              : <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b text-xs text-gray-500">
                    <tr>
                      {["Product","Current Stock","Sales (30d)","Recommended Action"].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.slowMoving.map(p => (
                      <tr key={p.productId}
                        className="border-b border-gray-50 hover:bg-orange-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{p.productName}</td>
                        <td className="px-4 py-3">
                          <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            {p.currentStock} units
                          </span>
                        </td>
                        <td className="px-4 py-3 text-red-500 font-bold">0</td>
                        <td className="px-4 py-3 text-xs text-orange-600">
                          💡 Run a discount or promotion
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
        </div>
      )}

      {/* ── Peak Hours Tab ───────────────────────────────────────────────── */}
      {tab === "hours" && (
        <div className="space-y-5">
          <Card title="🕐 Sales by Hour — Last 30 Days"
            sub="When are your customers most active?">
            {hourlyData.length === 0
              ? <p className="text-gray-400 text-sm py-8 text-center">No data yet</p>
              : <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left"  tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right"
                      tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left"  dataKey="Transactions"
                      fill={COLORS.orange} radius={[4,4,0,0]} />
                    <Bar yAxisId="right" dataKey="Revenue"
                      fill={COLORS.blue} radius={[4,4,0,0]} opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
            }
          </Card>

          {hourlyData.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {[...hourlyData]
                .sort((a, b) => b.Transactions - a.Transactions)
                .slice(0, 3)
                .map((h, i) => (
                  <div key={i}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                    <p className="text-3xl mb-1">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                    </p>
                    <p className="text-lg font-bold text-orange-600">{h.hour}</p>
                    <p className="text-sm text-gray-600">{h.Transactions} sales</p>
                    <p className="text-xs text-gray-400">
                      ${parseFloat(h.Revenue).toFixed(2)}
                    </p>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}

      {/* ── Payments Tab ─────────────────────────────────────────────────── */}
      {tab === "payment" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Donut pie */}
          <Card title="🥧 Payment Method Split" sub="By revenue this month">
            {paymentData.length === 0
              ? <p className="text-gray-400 text-sm py-8 text-center">No data yet</p>
              : <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%" cy="50%"
                      innerRadius={70} outerRadius={110}
                      paddingAngle={4} dataKey="value"
                      label={({ name, pct }) => `${name} ${pct}%`}
                      labelLine={false}>
                      {paymentData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => `$${parseFloat(v).toFixed(2)}`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
            }
          </Card>

          {/* Progress bars */}
          <Card title="💳 Payment Details" sub="Count and revenue by method">
            {!(data?.paymentBreakdown?.length)
              ? <p className="text-gray-400 text-sm">No data yet</p>
              : <div className="space-y-5 mt-2">
                  {data.paymentBreakdown.map((p, i) => (
                    <div key={p.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-gray-700 flex items-center gap-1">
                          <span style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>●</span>
                          {p.label === "CASH" ? "💵" : p.label === "CARD" ? "💳" : "✂️"} {p.label}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {p.count} sales · ${p.amount} · {p.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-3 rounded-full transition-all duration-700"
                          style={{
                            width: `${p.percentage}%`,
                            backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
            }
          </Card>
        </div>
      )}
    </div>
  );
}
