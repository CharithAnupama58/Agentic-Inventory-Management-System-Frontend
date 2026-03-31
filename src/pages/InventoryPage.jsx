import { useEffect, useState } from "react";
import {
  getInventorySummary, acknowledgeReorder,
  adjustStock, addBatch, getProductBatches
} from "../api/services";
import { getProducts } from "../api/services";

const URGENCY_STYLE = {
  CRITICAL: "bg-red-100 text-red-700 border border-red-200",
  HIGH:     "bg-orange-100 text-orange-700 border border-orange-200",
  MEDIUM:   "bg-yellow-100 text-yellow-700 border border-yellow-200",
  LOW:      "bg-blue-100 text-blue-700 border border-blue-200",
};

const MOVEMENT_ICON = {
  SALE:       { icon: "🛒", color: "text-red-500" },
  REFUND:     { icon: "🔄", color: "text-green-500" },
  RESTOCK:    { icon: "📦", color: "text-blue-500" },
  ADJUSTMENT: { icon: "✏️", color: "text-purple-500" },
  EXPIRED:    { icon: "⚠️", color: "text-orange-500" },
  DAMAGED:    { icon: "💔", color: "text-gray-500" },
};

export default function InventoryPage() {
  const [summary, setSummary]       = useState(null);
  const [products, setProducts]     = useState([]);
  const [tab, setTab]               = useState("reorder");
  const [loading, setLoading]       = useState(true);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showBatch, setShowBatch]   = useState(false);
  const [adjustForm, setAdjustForm] = useState({ productId: "", quantity: "", movementType: "RESTOCK", notes: "" });
  const [batchForm, setBatchForm]   = useState({ productId: "", batchNumber: "", quantity: "", costPrice: "", expiryDate: "", purchaseDate: "" });
  const [error, setError]           = useState("");
  const [saving, setSaving]         = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([getInventorySummary(), getProducts()])
      .then(([inv, prod]) => { setSummary(inv.data); setProducts(prod.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAcknowledge = async (id, action) => {
    await acknowledgeReorder(id, action);
    load();
  };

  const handleAdjust = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await adjustStock({ ...adjustForm, quantity: parseInt(adjustForm.quantity) });
      setShowAdjust(false);
      setAdjustForm({ productId: "", quantity: "", movementType: "RESTOCK", notes: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed");
    } finally { setSaving(false); }
  };

  const handleAddBatch = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await addBatch({ ...batchForm, quantity: parseInt(batchForm.quantity), costPrice: parseFloat(batchForm.costPrice) });
      setShowBatch(false);
      setBatchForm({ productId: "", batchNumber: "", quantity: "", costPrice: "", expiryDate: "", purchaseDate: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin text-4xl">⏳</div>
    </div>
  );

  const stats = summary?.stats;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">📦 Inventory Intelligence</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowBatch(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Add Batch
          </button>
          <button onClick={() => setShowAdjust(true)}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
            ✏️ Adjust Stock
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Products",    value: stats?.totalProducts ?? 0,       color: "text-gray-800" },
          { label: "Out of Stock",      value: stats?.outOfStock ?? 0,          color: "text-red-600" },
          { label: "Low Stock",         value: stats?.lowStock ?? 0,            color: "text-yellow-600" },
          { label: "Critical Reorders", value: stats?.criticalReorders ?? 0,    color: "text-red-600" },
          { label: "Expiring ≤30 Days", value: stats?.expiringIn30Days ?? 0,    color: "text-orange-600" },
          { label: "Stock Value",       value: `$${stats?.totalStockValue ?? "0.00"}`, color: "text-green-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: "reorder",   label: `🔔 Reorder (${summary?.reorderSuggestions?.length ?? 0})` },
          { key: "expiring",  label: `⏰ Expiring (${summary?.expiringBatches?.length ?? 0})` },
          { key: "movements", label: "📋 Movements" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === t.key ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Reorder Suggestions Tab ─────────────────────────────────────────── */}
      {tab === "reorder" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">🔔 Smart Restock Suggestions</h2>
            <p className="text-xs text-gray-400 mt-0.5">Based on last 30 days sales velocity</p>
          </div>
          {!summary?.reorderSuggestions?.length
            ? <div className="p-12 text-center text-gray-400">
                <div className="text-4xl mb-2">✅</div>
                <p>All products are well stocked!</p>
              </div>
            : <div className="divide-y divide-gray-50">
                {summary.reorderSuggestions.map(s => (
                  <div key={s.id} className="p-4 hover:bg-gray-50 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${URGENCY_STYLE[s.urgency]}`}>
                          {s.urgency}
                        </span>
                        <span className="font-semibold text-gray-800">{s.productName}</span>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1 text-xs text-gray-500 mt-2">
                        <span>Current stock: <strong className={s.currentStock === 0 ? "text-red-600" : "text-gray-800"}>{s.currentStock}</strong></span>
                        <span>Reorder point: <strong>{s.reorderPoint}</strong></span>
                        <span>Avg daily sales: <strong>{s.avgDailySales}</strong> units</span>
                        <span>Days left: <strong className={s.daysOfStockLeft <= 3 ? "text-red-600" : "text-gray-800"}>
                          {s.daysOfStockLeft ?? "N/A"}
                        </strong></span>
                      </div>
                      <div className="mt-2 text-xs bg-blue-50 text-blue-700 inline-block px-3 py-1 rounded-full">
                        💡 Suggested order: <strong>{s.suggestedQuantity} units</strong>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => handleAcknowledge(s.id, "ORDERED")}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg">
                        ✅ Ordered
                      </button>
                      <button onClick={() => handleAcknowledge(s.id, "DISMISSED")}
                        className="border border-gray-300 text-gray-500 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-50">
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* ── Expiring Batches Tab ────────────────────────────────────────────── */}
      {tab === "expiring" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">⏰ Expiring Batches</h2>
            <p className="text-xs text-gray-400 mt-0.5">Batches expiring within 30 days</p>
          </div>
          {!summary?.expiringBatches?.length
            ? <div className="p-12 text-center text-gray-400">
                <div className="text-4xl mb-2">✅</div>
                <p>No batches expiring soon</p>
              </div>
            : <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b text-xs text-gray-500">
                  <tr>
                    {["Product","Batch #","Remaining","Expiry Date","Days Left","Status"].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.expiringBatches.map(b => (
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{b.productName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{b.batchNumber}</td>
                      <td className="px-4 py-3">{b.remainingQuantity}</td>
                      <td className="px-4 py-3">{b.expiryDate}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${b.daysUntilExpiry <= 7 ? "text-red-600" : b.daysUntilExpiry <= 14 ? "text-orange-600" : "text-yellow-600"}`}>
                          {b.daysUntilExpiry} days
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      )}

      {/* ── Stock Movements Tab ─────────────────────────────────────────────── */}
      {tab === "movements" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">📋 Recent Stock Movements</h2>
          </div>
          {!summary?.recentMovements?.length
            ? <div className="p-12 text-center text-gray-400">No movements yet</div>
            : <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b text-xs text-gray-500">
                  <tr>
                    {["Type","Product","Change","Before","After","Notes","Time"].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.recentMovements.map(m => {
                    const style = MOVEMENT_ICON[m.movementType] || { icon: "•", color: "text-gray-500" };
                    return (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium ${style.color}`}>
                            {style.icon} {m.movementType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-gray-800">{m.productName}</td>
                        <td className="px-4 py-2.5">
                          <span className={`font-bold ${m.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
                            {m.quantity > 0 ? "+" : ""}{m.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{m.stockBefore}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-800">{m.stockAfter}</td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{m.notes || "—"}</td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">
                          {new Date(m.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
          }
        </div>
      )}

      {/* ── Adjust Stock Modal ──────────────────────────────────────────────── */}
      {showAdjust && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="font-bold text-gray-800 text-lg mb-4">✏️ Adjust Stock</h2>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3 text-sm">{error}</div>}
            <form onSubmit={handleAdjust} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
                <select required value={adjustForm.productId}
                  onChange={e => setAdjustForm({ ...adjustForm, productId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select value={adjustForm.movementType}
                  onChange={e => setAdjustForm({ ...adjustForm, movementType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="RESTOCK">📦 Restock (add)</option>
                  <option value="ADJUSTMENT">✏️ Correction</option>
                  <option value="DAMAGED">💔 Write-off (damaged)</option>
                  <option value="EXPIRED">⚠️ Write-off (expired)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Quantity <span className="text-gray-400">(use negative to reduce)</span>
                </label>
                <input type="number" required placeholder="e.g. 50 or -10"
                  value={adjustForm.quantity}
                  onChange={e => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input type="text" placeholder="Reason for adjustment"
                  value={adjustForm.notes}
                  onChange={e => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowAdjust(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm disabled:opacity-50">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Batch Modal ─────────────────────────────────────────────────── */}
      {showBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="font-bold text-gray-800 text-lg mb-4">📦 Add New Batch</h2>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3 text-sm">{error}</div>}
            <form onSubmit={handleAddBatch} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
                <select required value={batchForm.productId}
                  onChange={e => setBatchForm({ ...batchForm, productId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {[
                { label: "Batch Number", key: "batchNumber", type: "text",   placeholder: "BATCH-2024-001" },
                { label: "Quantity",     key: "quantity",    type: "number", placeholder: "100" },
                { label: "Cost Price",   key: "costPrice",   type: "number", placeholder: "1.20" },
                { label: "Expiry Date",  key: "expiryDate",  type: "date",   placeholder: "" },
                { label: "Purchase Date",key: "purchaseDate",type: "date",   placeholder: "" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    value={batchForm[f.key]}
                    onChange={e => setBatchForm({ ...batchForm, [f.key]: e.target.value })}
                    step={f.key === "costPrice" ? "0.01" : undefined}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowBatch(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm disabled:opacity-50">
                  {saving ? "Saving..." : "Add Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
