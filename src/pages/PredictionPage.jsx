import { useEffect, useState, useCallback } from "react";
import { getPredictions } from "../api/services";

// ── Risk styles ───────────────────────────────────────────────────────────────
const RISK_STYLE = {
  CRITICAL: {
    card:   "bg-red-50 border-red-300",
    badge:  "bg-red-600 text-white",
    bar:    "bg-red-500",
    text:   "text-red-700",
    light:  "bg-red-100",
  },
  HIGH: {
    card:   "bg-orange-50 border-orange-300",
    badge:  "bg-orange-500 text-white",
    bar:    "bg-orange-500",
    text:   "text-orange-700",
    light:  "bg-orange-100",
  },
  MEDIUM: {
    card:   "bg-yellow-50 border-yellow-300",
    badge:  "bg-yellow-500 text-white",
    bar:    "bg-yellow-500",
    text:   "text-yellow-700",
    light:  "bg-yellow-100",
  },
  LOW: {
    card:   "bg-green-50 border-green-200",
    badge:  "bg-green-500 text-white",
    bar:    "bg-green-500",
    text:   "text-green-700",
    light:  "bg-green-100",
  },
  SAFE: {
    card:   "bg-green-50 border-green-200",
    badge:  "bg-green-500 text-white",
    bar:    "bg-green-500",
    text:   "text-green-700",
    light:  "bg-green-100",
  },
};

// ── Mini forecast bar chart ───────────────────────────────────────────────────
function ForecastChart({ forecast, currentStock }) {
  if (!forecast?.length) return null;
  const maxStock = currentStock;
  return (
    <div className="mt-3">
      <p className="text-xs text-gray-400 mb-1">7-Day Stock Forecast</p>
      <div className="flex items-end gap-0.5 h-10">
        {forecast.map((day, i) => {
          const pct = maxStock > 0
            ? Math.max((day.predictedStock / maxStock) * 100, 0)
            : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center group
              relative">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2
                bg-gray-800 text-white text-xs px-1 py-0.5 rounded
                opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                {day.date}: {day.predictedStock}
              </div>
              <div
                className={`w-full rounded-t transition-all
                  ${day.isStockout ? "bg-red-500" : "bg-blue-400"}`}
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-300 mt-0.5">
        <span>{forecast[0]?.date}</span>
        <span>{forecast[forecast.length - 1]?.date}</span>
      </div>
    </div>
  );
}

// ── Single product prediction card ───────────────────────────────────────────
function PredictionCard({ product }) {
  const [expanded, setExpanded] = useState(false);
  const style = RISK_STYLE[product.riskLevel] ?? RISK_STYLE.SAFE;

  return (
    <div className={`rounded-xl border p-4 ${style.card} transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-xl flex-shrink-0 mt-0.5">
            {product.riskIcon}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-800 text-sm">
                {product.productName}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-xs
                font-bold ${style.badge}`}>
                {product.riskLevel}
              </span>
            </div>
            <p className={`text-xs mt-1 font-medium ${style.text}`}>
              {product.prediction}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              💡 {product.action}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-gray-800">
            {product.currentStock}
          </p>
          <p className="text-xs text-gray-400">in stock</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className={`${style.light} rounded-lg p-2 text-center`}>
          <p className="text-xs text-gray-500">Avg/Day (7d)</p>
          <p className="font-bold text-gray-800 text-sm">
            {product.avgDailySales}
          </p>
        </div>
        <div className={`${style.light} rounded-lg p-2 text-center`}>
          <p className="text-xs text-gray-500">Days Left</p>
          <p className={`font-bold text-sm ${style.text}`}>
            {product.daysUntilStockout === 999
              ? "30+"
              : product.daysUntilStockout}
          </p>
        </div>
        <div className={`${style.light} rounded-lg p-2 text-center`}>
          <p className="text-xs text-gray-500">Reorder Qty</p>
          <p className="font-bold text-gray-800 text-sm">
            {product.recommendedReorderQty}
          </p>
        </div>
      </div>

      {/* Trend badge */}
      {product.avgDailySalesTrend !== 0 && (
        <div className="mt-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full
            ${parseFloat(product.avgDailySalesTrend) > 0
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"}`}>
            {parseFloat(product.avgDailySalesTrend) > 0 ? "↑" : "↓"}
            Trend: {Math.abs(parseFloat(product.avgDailySalesTrend))}%
            vs last week
          </span>
        </div>
      )}

      {/* Expand button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs text-gray-400 hover:text-gray-600
          flex items-center gap-1">
        {expanded ? "▲ Hide forecast" : "▼ Show 7-day forecast"}
      </button>

      {expanded && (
        <ForecastChart
          forecast={product.forecast}
          currentStock={product.currentStock}
        />
      )}
    </div>
  );
}

// ── Summary stat card ─────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, bg }) {
  return (
    <div className={`${bg} rounded-xl p-4 border`}>
      <div className="flex justify-between items-start">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

export default function PredictionPage() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState("");
  const [tab, setTab]             = useState("critical");
  const [search, setSearch]       = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await getPredictions();
      setData(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.displayMessage || "Failed to load predictions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">🔮</div>
        <p className="text-gray-500 text-sm font-medium">
          Analyzing inventory patterns...
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Running stock predictions
        </p>
      </div>
    </div>
  );

  const summary = data?.summary;

  // ── Get products for current tab ──────────────────────────────────────────
  const getTabProducts = () => {
    let products = [];
    switch (tab) {
      case "critical": products = data?.criticalProducts  ?? []; break;
      case "high":     products = data?.highRiskProducts  ?? []; break;
      case "medium":   products = data?.mediumRiskProducts ?? []; break;
      case "safe":     products = data?.safeProducts      ?? []; break;
      case "all":      products = data?.allPredictions    ?? []; break;
      default:         products = data?.criticalProducts  ?? [];
    }
    if (search) {
      products = products.filter(p =>
        p.productName.toLowerCase().includes(search.toLowerCase()));
    }
    return products;
  };

  const tabProducts = getTabProducts();

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            🔮 Inventory Predictions
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            AI-powered stock forecasting
            {lastUpdated && ` · Updated ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 bg-indigo-600
            hover:bg-indigo-700 disabled:opacity-50 text-white
            px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <span className={refreshing ? "animate-spin" : ""}>🔄</span>
          {refreshing ? "Analyzing..." : "Refresh"}
        </button>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700
          px-4 py-3 rounded-xl text-sm">
          ❌ {error}
        </div>
      )}

      {/* ── AI Analysis Banner ────────────────────────────────────────────── */}
      {data?.aiAnalysis && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600
          text-white rounded-xl p-5 shadow-md">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <p className="text-xs font-semibold opacity-75 uppercase
                tracking-wide mb-1">
                AI Inventory Analysis
              </p>
              <p className="font-medium text-sm leading-relaxed">
                {data.aiAnalysis}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Summary Stats ─────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard icon="🚨" label="Critical"
            value={summary.criticalCount}
            color="text-red-600"
            bg="bg-red-50 border-red-200" />
          <StatCard icon="⚠️" label="High Risk"
            value={summary.highRiskCount}
            color="text-orange-600"
            bg="bg-orange-50 border-orange-200" />
          <StatCard icon="📦" label="Medium Risk"
            value={summary.mediumRiskCount}
            color="text-yellow-600"
            bg="bg-yellow-50 border-yellow-200" />
          <StatCard icon="✅" label="Safe"
            value={summary.safeCount}
            color="text-green-600"
            bg="bg-green-50 border-green-200" />
          <StatCard icon="💰" label="Reorder Cost"
            value={`$${summary.totalReorderCost}`}
            color="text-blue-600"
            bg="bg-blue-50 border-blue-200" />
        </div>
      )}

      {/* ── Most Urgent Alert ─────────────────────────────────────────────── */}
      {summary?.mostUrgentProduct && (
        <div className="bg-red-50 border border-red-300 rounded-xl
          px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <p className="font-semibold text-red-800 text-sm">
              Most Urgent: {summary.mostUrgentProduct}
            </p>
            <p className="text-xs text-red-600">
              Only {summary.mostUrgentDaysLeft} day(s) of stock remaining
              — order immediately!
            </p>
          </div>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
        {[
          { key: "critical", label: `🚨 Critical (${data?.criticalProducts?.length ?? 0})` },
          { key: "high",     label: `⚠️ High (${data?.highRiskProducts?.length ?? 0})` },
          { key: "medium",   label: `📦 Medium (${data?.mediumRiskProducts?.length ?? 0})` },
          { key: "safe",     label: `✅ Safe (${data?.safeProducts?.length ?? 0})` },
          { key: "all",      label: `📋 All (${data?.allPredictions?.length ?? 0})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 rounded-lg text-xs font-medium
              transition-colors
              ${tab === t.key
                ? "bg-white shadow text-gray-800"
                : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Search products..."
        className="w-full max-w-sm border border-gray-300 rounded-lg
          px-4 py-2 text-sm focus:outline-none focus:ring-2
          focus:ring-indigo-500"
      />

      {/* ── Product Cards ─────────────────────────────────────────────────── */}
      {tabProducts.length === 0
        ? <div className="bg-white rounded-xl border border-gray-100
            p-12 text-center">
            <div className="text-4xl mb-3">
              {tab === "critical" || tab === "high" ? "✅" : "📦"}
            </div>
            <p className="text-gray-500 font-medium">
              {search
                ? `No products matching "${search}"`
                : tab === "critical"
                  ? "No critical stock issues! All products are well stocked."
                  : tab === "high"
                  ? "No high-risk products at this time."
                  : "No products in this category."}
            </p>
          </div>
        : <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {tabProducts.map(product => (
              <PredictionCard
                key={product.productId}
                product={product}
              />
            ))}
          </div>
      }

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-700 mb-3 flex
          items-center gap-2">
          <span>⚙️</span> How Predictions Work
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4
          text-xs text-gray-500">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-semibold text-gray-700 mb-1">
              📊 Sales Velocity
            </p>
            <p>Analyzes last 7 and 30 days of sales. Uses weighted
              average (60% recent, 40% monthly) for accuracy.</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-semibold text-gray-700 mb-1">
              📈 Trend Detection
            </p>
            <p>Compares last 7 days vs previous 7 days to detect
              trending up or down products and adjusts forecast.</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-semibold text-gray-700 mb-1">
              🔮 Stock Forecast
            </p>
            <p>Projects stock levels for next 7 days. Reorder point
              includes 3-day lead time plus 2-day safety buffer.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
