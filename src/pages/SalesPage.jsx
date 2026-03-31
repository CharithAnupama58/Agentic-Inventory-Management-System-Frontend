import { useEffect, useState } from "react";
import { getSales } from "../api/services";
import api from "../api/axios";

export default function SalesPage() {
  const [sales, setSales]         = useState([]);
  const [selected, setSelected]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refunding, setRefunding] = useState(false);
  const [refundItems, setRefundItems] = useState({});
  const [refundSuccess, setRefundSuccess] = useState(null);
  const [error, setError]         = useState("");

  const load = () => getSales().then(r => setSales(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openSale = (sale) => {
    setSelected(sale);
    setRefundItems({});
    setRefundSuccess(null);
    setError("");
  };

  // ── Build refund qty map from inputs ──────────────────────────────────────
  const handleRefundQtyChange = (productId, value) => {
    setRefundItems(prev => ({ ...prev, [productId]: parseInt(value) || 0 }));
  };

  // ── Submit refund ─────────────────────────────────────────────────────────
  const handleRefund = async () => {
    const items = Object.entries(refundItems)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    if (items.length === 0) {
      setError("Select at least one item to refund");
      return;
    }

    setRefunding(true); setError("");
    try {
      const { data } = await api.post("/sales/refund", {
        saleId: selected.id,
        items,
        reason: "Customer return"
      });
      setRefundSuccess(data);
      load(); // refresh sales list
    } catch (err) {
      setError(err.response?.data?.error || "Refund failed");
    } finally {
      setRefunding(false);
    }
  };

  // ── Status badge ──────────────────────────────────────────────────────────
  const statusBadge = (status) => {
    if (status === "REFUNDED")          return "bg-red-100 text-red-700";
    if (status === "PARTIALLY_REFUNDED") return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin text-4xl">⏳</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Sales History</h1>

      {/* ── Sales Table ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Sale ID","Date & Time","Items","Payment","Discount","Total","Status",""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sales.length === 0
              ? <tr><td colSpan={8} className="text-center py-12 text-gray-400">No sales yet</td></tr>
              : sales.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{s.id?.slice(0,8)}...</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{s.items?.length}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                      {s.paymentMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-green-600 text-xs">
                    {s.discountAmount > 0 ? `-$${s.discountAmount}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-bold text-green-600">${s.totalAmount}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(s.status)}`}>
                      {s.status || "COMPLETED"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openSale(s)}
                      className="text-blue-600 hover:underline text-xs">
                      View
                    </button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* ── Sale Detail + Refund Modal ────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-screen overflow-y-auto">

            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-bold text-gray-800 text-lg">Sale Details</h2>
                <p className="text-gray-400 text-xs font-mono">{selected.id}</p>
                <p className="text-gray-500 text-xs">{new Date(selected.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {/* Refund success message */}
            {refundSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                <p className="font-semibold">✅ Refund Processed!</p>
                <p className="text-sm">Refund Amount: <strong>${refundSuccess.refundAmount}</strong></p>
                <p className="text-sm">Status: {refundSuccess.status}</p>
                <div className="mt-1">
                  {refundSuccess.refundedItems?.map((item, i) => (
                    <p key={i} className="text-xs text-green-600">• {item}</p>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            {/* Items table with refund qty inputs */}
            <div className="space-y-2 mb-4">
              <div className="grid grid-cols-4 text-xs text-gray-400 font-medium pb-1 border-b">
                <span>Product</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Price</span>
                <span className="text-right">Refund Qty</span>
              </div>
              {selected.items?.map(item => {
                const refundable = item.quantity - (item.refundedQuantity || 0);
                return (
                  <div key={item.productId} className="grid grid-cols-4 items-center text-sm py-1 border-b border-gray-50">
                    <div>
                      <p className="font-medium text-gray-700">{item.productName}</p>
                      {item.refundedQuantity > 0 && (
                        <p className="text-xs text-orange-500">Refunded: {item.refundedQuantity}</p>
                      )}
                    </div>
                    <span className="text-right text-gray-600">{item.quantity}</span>
                    <span className="text-right text-gray-600">${item.subtotal}</span>
                    <div className="flex justify-end">
                      {refundable > 0 && selected.status !== "REFUNDED" ? (
                        <input
                          type="number" min="0" max={refundable}
                          placeholder="0"
                          value={refundItems[item.productId] || ""}
                          onChange={e => handleRefundQtyChange(item.productId, e.target.value)}
                          className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-red-400"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">
                          {selected.status === "REFUNDED" ? "Refunded" : "—"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm mb-4">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>${selected.subtotal}</span>
              </div>
              {selected.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({selected.discountType === "PERCENTAGE"
                    ? `${selected.discountValue}%` : `$${selected.discountValue}`})</span>
                  <span>-${selected.discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-1">
                <span>Total</span>
                <span className="text-green-600">${selected.totalAmount}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-xs">
                <span>Payment</span><span>{selected.paymentMethod}</span>
              </div>
              {selected.cashTendered && (
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>Cash Given</span><span>${selected.cashTendered}</span>
                </div>
              )}
              {selected.changeAmount > 0 && (
                <div className="flex justify-between text-blue-600 text-xs">
                  <span>Change Given</span><span>${selected.changeAmount}</span>
                </div>
              )}
              {selected.notes && (
                <div className="text-xs text-gray-400 pt-1">📝 {selected.notes}</div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button onClick={() => setSelected(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                Close
              </button>
              {selected.status !== "REFUNDED" && (
                <button
                  onClick={handleRefund}
                  disabled={refunding || Object.values(refundItems).every(v => v === 0)}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {refunding ? "Processing..." : "🔄 Process Refund"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
