import { useEffect, useState, useCallback } from "react";
import { getInsights } from "../api/services";

const TYPE_STYLE = {
  POSITIVE: {
    card:  "bg-green-50 border-green-200",
    badge: "bg-green-100 text-green-700",
  },
  NEGATIVE: {
    card:  "bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-700",
  },
  WARNING: {
    card:  "bg-yellow-50 border-yellow-200",
    badge: "bg-yellow-100 text-yellow-700",
  },
  NEUTRAL: {
    card:  "bg-blue-50 border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
};

function KpiCard({ icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-1">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
          {label}
        </p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function InsightCard({ insight, index }) {
  const style = TYPE_STYLE[insight.type] ?? TYPE_STYLE.NEUTRAL;
  return (
    <div
      className={`rounded-xl border p-4 ${style.card}`}
      style={{ animation: `fadeIn 0.4s ease-out ${index * 100}ms both` }}>
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{insight.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-gray-800 text-sm">
              {insight.title}
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium
              ${style.badge}`}>
              {insight.type}
            </span>
            {insight.changePercent != null && (
              <span className={`text-xs font-bold ${
                parseFloat(insight.changePercent) >= 0
                  ? "text-green-600" : "text-red-600"}`}>
                {parseFloat(insight.changePercent) >= 0 ? "↑" : "↓"}
                {Math.abs(parseFloat(insight.changePercent))}%
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">{insight.detail}</p>
        </div>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError]             = useState("");
  const [cooldown, setCooldown]       = useState(0);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await getInsights();
      setData(res.data);
      setLastUpdated(new Date());
      setCooldown(15);
    } catch (err) {
      setError(err.displayMessage || "Failed to load insights");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">🧠</div>
        <p className="text-gray-500 text-sm font-medium">
          AI is analyzing your business...
        </p>
        <p className="text-gray-400 text-xs mt-1">Crunching today's numbers</p>
      </div>
    </div>
  );

  const raw = data?.rawData;

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            🧠 AI Sales Insights
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {data?.provider && `Powered by ${data.provider}`}
            {lastUpdated && ` · Updated ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cooldown > 0 && (
            <span className="text-xs text-gray-400">
              Next refresh in {cooldown}s
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing || cooldown > 0}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600
              disabled:opacity-50 disabled:cursor-not-allowed text-white
              px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <span className={refreshing ? "animate-spin" : ""}>🔄</span>
            {refreshing
              ? "Analyzing..."
              : cooldown > 0
              ? `Wait ${cooldown}s`
              : "Refresh Insights"}
          </button>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700
          px-4 py-3 rounded-xl text-sm">
          ❌ {error}
        </div>
      )}

      {/* ── Provider Badge ────────────────────────────────────────────────── */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl
        px-4 py-3 text-xs text-orange-700 flex items-center gap-2">
        <span>⚡</span>
        <span>
          Powered by <strong>Groq Llama3</strong> —
          completely free with generous rate limits.
          No billing required.
        </span>
      </div>

      {/* ── AI Summary Banner ────────────────────────────────────────────── */}
      {data?.summary && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500
          text-white rounded-xl p-5 shadow-md">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <p className="text-xs font-semibold opacity-75 uppercase
                tracking-wide mb-1">
                AI Summary
              </p>
              <p className="font-medium text-sm leading-relaxed">
                {data.summary}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      {raw && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon="💵" label="Today Revenue"
            value={`$${raw.todayRevenue}`}
            sub={`${raw.todayTransactions} transactions`}
            color="text-green-600"
          />
          <KpiCard
            icon="💰" label="Today Profit"
            value={`$${raw.todayProfit}`}
            sub={`Margin: ${raw.profitMargin}%`}
            color="text-blue-600"
          />
          <KpiCard
            icon="📅" label="Month Revenue"
            value={`$${raw.monthRevenue}`}
            sub={`${raw.monthTransactions} transactions`}
            color="text-purple-600"
          />
          <KpiCard
            icon="📈" label="vs Yesterday"
            value={`${parseFloat(raw.revenueGrowthVsYesterday) >= 0
              ? "+" : ""}${raw.revenueGrowthVsYesterday}%`}
            sub={`Yesterday: $${raw.yesterdayRevenue}`}
            color={parseFloat(raw.revenueGrowthVsYesterday) >= 0
              ? "text-green-600" : "text-red-600"}
          />
        </div>
      )}

      {/* ── Main Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Insights — 2 columns */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <span>💡</span> Key Insights
          </h2>
          {data?.insights?.length
            ? data.insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} index={i} />
              ))
            : <p className="text-gray-400 text-sm">No insights available</p>
          }
        </div>

        {/* Right Column */}
        <div className="space-y-4">

          {/* Urgent Alerts */}
          {data?.alerts?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border
              border-red-100 p-4">
              <h2 className="font-semibold text-red-700 mb-3 flex
                items-center gap-2">
                <span>🚨</span> Urgent Alerts
              </h2>
              <div className="space-y-2">
                {data.alerts.map((alert, i) => (
                  <div key={i} className="bg-red-50 border border-red-100
                    rounded-lg px-3 py-2 text-xs text-red-700">
                    {alert}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {data?.recommendations?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border
              border-gray-100 p-4">
              <h2 className="font-semibold text-gray-700 mb-3 flex
                items-center gap-2">
                <span>✅</span> Recommendations
              </h2>
              <div className="space-y-2">
                {data.recommendations.map((rec, i) => (
                  <div key={i}
                    className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="text-orange-500 font-bold
                      flex-shrink-0 mt-0.5">
                      {i + 1}.
                    </span>
                    <p>{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Products Today */}
          {raw?.topProductsToday?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border
              border-gray-100 p-4">
              <h2 className="font-semibold text-gray-700 mb-3 flex
                items-center gap-2">
                <span>🏆</span> Top Products Today
              </h2>
              <div className="space-y-3">
                {raw.topProductsToday.map((p, i) => {
                  const maxRev = parseFloat(
                          raw.topProductsToday[0].revenue);
                  const pct = maxRev > 0
                    ? ((parseFloat(p.revenue) / maxRev) * 100).toFixed(0)
                    : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700
                          truncate flex-1 mr-2">
                          {i + 1}. {p.name}
                        </span>
                        <span className="text-gray-500 flex-shrink-0">
                          {p.quantitySold} sold · ${p.revenue}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-orange-500 h-1.5 rounded-full
                            transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Inventory Status */}
          {raw && (
            <div className="bg-white rounded-xl shadow-sm border
              border-gray-100 p-4">
              <h2 className="font-semibold text-gray-700 mb-3 flex
                items-center gap-2">
                <span>📦</span> Inventory Status
              </h2>
              <div className="space-y-2 text-xs">
                {[
                  { label: "Out of Stock",
                    value: raw.outOfStockCount,
                    color: "text-red-600",
                    bg:    "bg-red-50"      },
                  { label: "Low Stock",
                    value: raw.lowStockCount,
                    color: "text-yellow-600",
                    bg:    "bg-yellow-50"   },
                  { label: "Critical Reorders",
                    value: raw.criticalReorders,
                    color: "text-orange-600",
                    bg:    "bg-orange-50"   },
                  { label: "Slow Moving",
                    value: raw.slowMovingCount,
                    color: "text-gray-600",
                    bg:    "bg-gray-50"     },
                ].map(s => (
                  <div key={s.label}
                    className={`flex justify-between items-center
                      ${s.bg} px-3 py-2 rounded-lg`}>
                    <span className="text-gray-600">{s.label}</span>
                    <span className={`font-bold ${s.color}`}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Split */}
          {raw && (
            parseFloat(raw.cashRevenue)  > 0 ||
            parseFloat(raw.cardRevenue)  > 0 ||
            parseFloat(raw.splitRevenue) > 0
          ) && (
            <div className="bg-white rounded-xl shadow-sm border
              border-gray-100 p-4">
              <h2 className="font-semibold text-gray-700 mb-3 flex
                items-center gap-2">
                <span>💳</span> Payment Split Today
              </h2>
              {[
                { label: "💵 Cash",
                  value: raw.cashRevenue,
                  color: "bg-green-500"  },
                { label: "💳 Card",
                  value: raw.cardRevenue,
                  color: "bg-blue-500"   },
                { label: "✂️ Split",
                  value: raw.splitRevenue,
                  color: "bg-purple-500" },
              ].map(p => {
                const total = parseFloat(raw.cashRevenue)
                            + parseFloat(raw.cardRevenue)
                            + parseFloat(raw.splitRevenue);
                const pct = total > 0
                  ? ((parseFloat(p.value) / total) * 100).toFixed(0)
                  : 0;
                return parseFloat(p.value) > 0 ? (
                  <div key={p.label} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{p.label}</span>
                      <span className="font-medium">
                        ${p.value} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`${p.color} h-2 rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          )}

          {/* API Info */}
          <div className="bg-white rounded-xl shadow-sm border
            border-gray-100 p-4">
            <h2 className="font-semibold text-gray-700 mb-3 flex
              items-center gap-2">
              <span>⚡</span> Groq API Info
            </h2>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Model</span>
                <span className="font-medium text-gray-700">
                  Llama3 8B
                </span>
              </div>
              <div className="flex justify-between">
                <span>Rate Limit</span>
                <span className="font-medium text-green-600">
                  6000 tokens/min
                </span>
              </div>
              <div className="flex justify-between">
                <span>Daily Limit</span>
                <span className="font-medium text-green-600">
                  Unlimited (free)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Provider</span>
                <span className="font-medium text-orange-500">
                  {data?.provider ?? "—"}
                </span>
              </div>
              {data?.generatedAt && (
                <div className="flex justify-between">
                  <span>Generated</span>
                  <span className="font-medium text-gray-700">
                    {data.generatedAt}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
