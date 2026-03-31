import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { getProducts, createSale, getProductCampaign } from "../api/services";

export default function POSPage() {
  const [products, setProducts]     = useState([]);
  const [cart, setCart]             = useState([]);
  const [search, setSearch]         = useState("");
  const [payMethod, setPayMethod]   = useState("CASH");
  const [cashGiven, setCashGiven]   = useState("");
  const [discountType, setDiscountType]   = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [loading, setLoading]       = useState(false);
  const [receipt, setReceipt]       = useState(null);
  const [error, setError]           = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const location = useLocation();

  const loadProducts = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const r = await getProducts();
      setProducts(r.data);
      setCart(prev => prev.map(cartItem => {
        const fresh = r.data.find(p => p.id === cartItem.productId);
        if (!fresh) return cartItem;
        return { ...cartItem, stock: fresh.stock };
      }));
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts(true);
  }, [location.pathname, loadProducts]);

  const addToCart = useCallback(async (product) => {
    if (product.stock === 0) return;

    let campaignInfo = null;
    try {
      const res = await getProductCampaign(product.id);
      if (res.status === 200) campaignInfo = res.data;
    } catch { /* no campaign */ }

    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(i => i.productId === product.id
          ? { ...i,
              quantity: i.quantity + 1,
              subtotal: i.effectivePrice * (i.quantity + 1) }
          : i);
      }
      const effectivePrice = campaignInfo
        ? parseFloat(campaignInfo.discountedPrice)
        : parseFloat(product.price);
      return [...prev, {
        productId:     product.id,
        name:          product.name,
        price:         product.price,
        effectivePrice,
        campaignInfo,
        quantity:      1,
        subtotal:      effectivePrice,
        stock:         product.stock,
      }];
    });
  }, []);

  const removeFromCart = (productId) =>
    setCart(prev => prev.filter(i => i.productId !== productId));

  const updateQty = (productId, qty) => {
    if (qty < 1) { removeFromCart(productId); return; }
    const item = cart.find(i => i.productId === productId);
    if (item && qty > item.stock) return;
    setCart(prev => prev.map(i => i.productId === productId
      ? { ...i, quantity: qty, subtotal: i.effectivePrice * qty }
      : i));
  };

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);

  const manualDiscount = (() => {
    if (!discountType || !discountValue) return 0;
    if (discountType === "PERCENTAGE")
      return subtotal * (parseFloat(discountValue) / 100);
    return Math.min(parseFloat(discountValue), subtotal);
  })();

  const total  = Math.max(subtotal - manualDiscount, 0);
  const change = payMethod === "CASH" && cashGiven
    ? Math.max(parseFloat(cashGiven) - total, 0) : 0;

  const campaignSavings = cart.reduce((s, i) => {
    if (!i.campaignInfo) return s;
    return s + (parseFloat(i.price) - i.effectivePrice) * i.quantity;
  }, 0);

  const checkout = async () => {
    if (!cart.length) { setError("Cart is empty"); return; }
    if (payMethod === "CASH" && parseFloat(cashGiven || 0) < total) {
      setError("Insufficient cash"); return;
    }
    setLoading(true); setError("");
    try {
      const res = await createSale({
        items: cart.map(i => ({
          productId: i.productId,
          quantity:  i.quantity,
        })),
        discountType:  discountType  || null,
        discountValue: discountValue ? parseFloat(discountValue) : null,
        paymentMethod: payMethod,
        cashTendered:  payMethod === "CASH" ? parseFloat(cashGiven) : null,
      });
      setReceipt(res.data);
      setCart([]);
      setCashGiven("");
      setDiscountType("");
      setDiscountValue("");
      loadProducts(true);
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.response?.data?.message        ||
        "Checkout failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
    || (p.barcode && p.barcode.includes(search)));

  return (
    <div className="flex gap-4"
      style={{ height: "calc(100vh - 96px)" }}>

      {/* ── Products Panel ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl
        shadow-sm border border-gray-100 overflow-hidden min-h-0">

        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-gray-800">🛒 Products</h2>
            <button
              onClick={() => loadProducts()}
              disabled={refreshing}
              className="flex items-center gap-1 text-xs text-gray-400
                hover:text-blue-600 transition-colors disabled:opacity-50">
              <span className={refreshing ? "animate-spin" : ""}>🔄</span>
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search or scan barcode..."
            className="w-full border border-gray-300 rounded-lg px-3
              py-2 text-sm focus:outline-none focus:ring-2
              focus:ring-blue-500"
          />
        </div>

        {/* Product Grid — scrollable */}
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {filtered.map(p => {
              const inCart = cart.find(i => i.productId === p.id);
              return (
                <button key={p.id} onClick={() => addToCart(p)}
                  disabled={p.stock === 0}
                  className={`text-left p-3 rounded-xl border
                    transition-all text-sm
                    ${p.stock === 0
                      ? "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                      : inCart
                      ? "bg-blue-50 border-blue-300 shadow-sm"
                      : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm"}`}>
                  <p className="font-medium text-gray-800 truncate">
                    {p.name}
                  </p>
                  <p className="font-bold text-blue-600 mt-1">
                    ${p.price}
                  </p>
                  <div className="flex justify-between items-center mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full
                      ${p.stock === 0
                        ? "bg-red-100 text-red-600"
                        : p.stock <= 10
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"}`}>
                      {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                    </span>
                    {inCart && (
                      <span className="text-xs bg-blue-600 text-white
                        px-1.5 py-0.5 rounded-full">
                        ×{inCart.quantity}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Cart + Billing Panel ──────────────────────────────────────────── */}
      <div className="w-80 flex flex-col bg-white rounded-2xl shadow-sm
        border border-gray-100 overflow-hidden min-h-0">

        {/* Cart header */}
        <div className="p-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-800">
            🧾 Cart ({cart.length})
          </h2>
        </div>

        {/* Cart items — scrollable, takes remaining space */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
          {cart.length === 0
            ? <div className="text-center text-gray-400 py-8">
                <div className="text-4xl mb-2">🛒</div>
                <p className="text-sm">Add products to cart</p>
              </div>
            : cart.map(item => (
                <div key={item.productId}
                  className="bg-gray-50 rounded-xl p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm">
                        {item.name}
                      </p>
                      {item.campaignInfo
                        ? <div className="mt-1 bg-purple-50 border
                            border-purple-200 rounded-lg px-2 py-1">
                            <p className="text-xs text-purple-700 font-semibold">
                              🎯 {item.campaignInfo.campaignName}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs text-gray-400
                                line-through">
                                ${item.price}
                              </span>
                              <span className="text-xs font-bold
                                text-purple-700">
                                → ${item.effectivePrice.toFixed(2)}
                              </span>
                              <span className="text-xs bg-red-100
                                text-red-600 px-1 rounded-full">
                                -{item.campaignInfo.discountValue}%
                              </span>
                            </div>
                          </div>
                        : <p className="text-blue-600 font-bold text-sm mt-0.5">
                            ${item.price}
                          </p>
                      }
                    </div>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-red-400 hover:text-red-600 ml-2
                        text-lg leading-none flex-shrink-0">
                      ✕
                    </button>
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.productId, item.quantity - 1)}
                        className="w-7 h-7 rounded-full bg-gray-200
                          hover:bg-red-100 hover:text-red-600 flex
                          items-center justify-center font-bold text-sm
                          transition-colors">
                        −
                      </button>
                      <span className="font-bold text-gray-800 w-6
                        text-center text-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="w-7 h-7 rounded-full bg-gray-200
                          hover:bg-green-100 hover:text-green-600
                          disabled:opacity-40 flex items-center
                          justify-center font-bold text-sm transition-colors">
                        +
                      </button>
                    </div>
                    <span className="font-bold text-gray-800 text-sm">
                      ${item.subtotal.toFixed(2)}
                    </span>
                  </div>

                  {item.stock <= 5 && (
                    <p className="text-xs text-orange-500 mt-1">
                      ⚠️ Only {item.stock} left
                    </p>
                  )}
                </div>
              ))
          }
        </div>

        {/* ── Billing section — FIXED at bottom, never scrolls away ──────── */}
        <div className="flex-shrink-0 border-t border-gray-100">

          {/* Campaign savings */}
          {campaignSavings > 0 && (
            <div className="mx-3 mt-2 bg-purple-50 border border-purple-200
              rounded-xl px-3 py-2">
              <p className="text-xs text-purple-700 font-semibold">
                🎉 Campaign Savings: -${campaignSavings.toFixed(2)}
              </p>
            </div>
          )}

          <div className="p-4 space-y-3">

            {/* Manual discount */}
            <div className="flex gap-2">
              <select value={discountType}
                onChange={e => {
                  setDiscountType(e.target.value);
                  setDiscountValue("");
                }}
                className="flex-1 border border-gray-300 rounded-lg px-2
                  py-2 text-xs focus:outline-none focus:ring-1
                  focus:ring-blue-500 bg-white">
                <option value="">No extra discount</option>
                <option value="PERCENTAGE">% Discount</option>
                <option value="FIXED">Fixed ($)</option>
              </select>
              {discountType && (
                <input type="number" min="0"
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  placeholder={discountType === "PERCENTAGE" ? "%" : "$"}
                  className="w-20 border border-gray-300 rounded-lg
                    px-2 py-2 text-xs focus:outline-none focus:ring-1
                    focus:ring-blue-500"
                />
              )}
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {campaignSavings > 0 && (
                <div className="flex justify-between text-xs text-purple-600">
                  <span>🎯 Campaign discount</span>
                  <span>-${campaignSavings.toFixed(2)}</span>
                </div>
              )}
              {manualDiscount > 0 && (
                <div className="flex justify-between text-xs text-green-600">
                  <span>Manual discount</span>
                  <span>-${manualDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-800
                text-base border-t border-gray-200 pt-1.5 mt-1">
                <span>Total</span>
                <span className="text-blue-600">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: "CASH", icon: "💵", label: "Cash"  },
                { key: "CARD", icon: "💳", label: "Card"  },
                { key: "SPLIT",icon: "✂️", label: "Split" },
              ].map(m => (
                <button key={m.key} onClick={() => setPayMethod(m.key)}
                  className={`py-2 rounded-lg text-xs font-semibold
                    transition-colors flex flex-col items-center gap-0.5
                    ${payMethod === m.key
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* Cash tendered input */}
            {payMethod === "CASH" && (
              <div className="space-y-1">
                <input type="number"
                  placeholder="Cash given by customer"
                  value={cashGiven}
                  onChange={e => setCashGiven(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg
                    px-3 py-2 text-sm focus:outline-none focus:ring-2
                    focus:ring-blue-500"
                />
                {cashGiven && parseFloat(cashGiven) >= total && (
                  <div className="bg-green-50 border border-green-200
                    rounded-lg px-3 py-2 flex justify-between
                    items-center">
                    <span className="text-xs text-green-700 font-medium">
                      Change to return
                    </span>
                    <span className="font-bold text-green-700">
                      ${change.toFixed(2)}
                    </span>
                  </div>
                )}
                {cashGiven && parseFloat(cashGiven) < total && (
                  <p className="text-xs text-red-500">
                    ⚠️ Need ${(total - parseFloat(cashGiven)).toFixed(2)} more
                  </p>
                )}
              </div>
            )}

            {/* Split payment inputs */}
            {payMethod === "SPLIT" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    💵 Cash
                  </label>
                  <input type="number" placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg
                      px-2 py-1.5 text-sm focus:outline-none
                      focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    💳 Card
                  </label>
                  <input type="number" placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg
                      px-2 py-1.5 text-sm focus:outline-none
                      focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg
                px-3 py-2">
                <p className="text-red-600 text-xs">❌ {error}</p>
              </div>
            )}

            {/* Checkout button */}
            <button
              onClick={checkout}
              disabled={loading || !cart.length}
              className="w-full bg-blue-600 hover:bg-blue-700
                disabled:opacity-50 disabled:cursor-not-allowed
                text-white py-3 rounded-xl font-bold text-sm
                transition-colors shadow-sm">
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Processing...
                  </span>
                : <span className="flex items-center justify-center gap-2">
                    <span>💳</span>
                    Checkout — ${total.toFixed(2)}
                  </span>
              }
            </button>

          </div>
        </div>
      </div>

      {/* ── Receipt Modal ─────────────────────────────────────────────────── */}
      {receipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex
          items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full
            max-w-sm overflow-hidden">

            {/* Receipt header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600
              p-6 text-center text-white">
              <div className="text-5xl mb-2">✅</div>
              <h2 className="font-bold text-xl">Payment Successful!</h2>
              <p className="text-green-100 text-sm mt-1">
                Thank you for your purchase
              </p>
            </div>

            {/* Receipt body */}
            <div className="p-5">
              <div className="space-y-2 text-sm mb-4">
                {receipt.items?.map((item, i) => (
                  <div key={i}
                    className="flex justify-between text-gray-600">
                    <span className="flex-1">
                      {item.productName}
                      <span className="text-gray-400"> ×{item.quantity}</span>
                      {item.originalPrice &&
                       parseFloat(item.originalPrice) !==
                       parseFloat(item.price) && (
                        <span className="text-purple-500 text-xs ml-1">
                          (was ${item.originalPrice})
                        </span>
                      )}
                    </span>
                    <span className="font-medium ml-2">
                      ${item.subtotal}
                    </span>
                  </div>
                ))}
              </div>

              {/* Receipt totals */}
              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                {receipt.discountAmount > 0 && (
                  <div className="flex justify-between text-sm
                    text-green-600">
                    <span>Discount</span>
                    <span>-${receipt.discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold
                  text-gray-800 text-lg">
                  <span>Total Paid</span>
                  <span>${receipt.totalAmount}</span>
                </div>
                {receipt.changeAmount > 0 && (
                  <div className="flex justify-between text-sm
                    text-green-600 font-medium bg-green-50
                    rounded-lg px-3 py-2">
                    <span>Change</span>
                    <span>${receipt.changeAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs
                  text-gray-400 pt-1">
                  <span>Payment method</span>
                  <span>{receipt.paymentMethod}</span>
                </div>
              </div>

              <button onClick={() => setReceipt(null)}
                className="w-full bg-blue-600 hover:bg-blue-700
                  text-white py-3 rounded-xl font-bold mt-4
                  transition-colors">
                🛒 New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
