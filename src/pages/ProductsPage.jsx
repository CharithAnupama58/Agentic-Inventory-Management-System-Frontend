import { useEffect, useState, useCallback } from "react";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../api/services";
import api from "../api/axios";
import PermissionGate from "../components/PermissionGate";
import { PERMISSIONS } from "../utils/permissions";

const empty = { name: "", barcode: "", price: "", costPrice: "", stock: "" };

export default function ProductsPage() {
  const [products, setProducts]       = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(0);
  const [totalPages, setTotalPages]   = useState(0);
  const [search, setSearch]           = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [form, setForm]               = useState(empty);
  const [editId, setEditId]           = useState(null);
  const [showModal, setShowModal]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const PAGE_SIZE = 20;

  // ── Load paginated products ───────────────────────────────────────────────
  const load = useCallback((p = page, s = search) => {
    setLoading(true);
    const params = new URLSearchParams({ page: p, size: PAGE_SIZE });
    if (s) params.append("search", s);
    api.get(`/products/paged?${params}`)
      .then(r => {
        setProducts(r.data.content);
        setTotal(r.data.totalElements);
        setTotalPages(r.data.totalPages);
        setPage(r.data.page);
      })
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(0, search); }, [search]);

  // ── Search debounce ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openCreate = () => {
    setForm(empty); setEditId(null); setError(""); setShowModal(true);
  };

  const openEdit = (p) => {
    setForm({
      name: p.name, barcode: p.barcode || "",
      price: p.price, costPrice: p.costPrice, stock: p.stock,
    });
    setEditId(p.id); setError(""); setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError("");
    try {
      if (editId) await updateProduct(editId, form);
      else        await createProduct(form);
      setShowModal(false);
      load(page, search);
    } catch (err) {
      setError(err.response?.data?.error?.message
            || err.response?.data?.message
            || "Something went wrong");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
      load(page, search);
    } catch (err) {
      alert(err.response?.data?.error?.message || "Failed to delete product");
    }
  };

  const stockBadge = (stock) =>
    stock === 0   ? "bg-red-100 text-red-700"
    : stock <= 10 ? "bg-yellow-100 text-yellow-700"
    :               "bg-green-100 text-green-700";

  return (
    <div className="space-y-5">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📦 Products</h1>
          <p className="text-xs text-gray-400 mt-0.5">{total} total products</p>
        </div>

        {/* Add button — ADMIN and MANAGER only */}
        <PermissionGate permission={PERMISSIONS.PRODUCT_CREATE}>
          <button onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2
              rounded-lg text-sm font-medium transition-colors">
            + Add Product
          </button>
        </PermissionGate>
      </div>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <input
        value={searchInput}
        onChange={e => setSearchInput(e.target.value)}
        placeholder="🔍 Search by name or barcode..."
        className="w-full max-w-sm border border-gray-300 rounded-lg px-4 py-2
          text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading
          ? <div className="flex items-center justify-center py-16">
              <div className="animate-spin text-3xl">⏳</div>
            </div>
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Name","Barcode","Price","Cost","Stock","Margin","Actions"].map(h => (
                      <th key={h}
                        className="text-left px-4 py-3 text-gray-500 font-medium
                          text-xs uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0
                    ? <tr>
                        <td colSpan={7}
                          className="text-center py-16 text-gray-400">
                          {search
                            ? `No products matching "${search}"`
                            : "No products yet — add your first product"}
                        </td>
                      </tr>
                    : products.map(p => {
                        const margin = p.price > 0
                          ? (((p.price - p.costPrice) / p.price) * 100).toFixed(1)
                          : "0.0";
                        return (
                          <tr key={p.id}
                            className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">
                              {p.name}
                            </td>
                            <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                              {p.barcode || "—"}
                            </td>
                            <td className="px-4 py-3 text-green-700 font-semibold">
                              ${p.price}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              ${p.costPrice}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs
                                font-medium ${stockBadge(p.stock)}`}>
                                {p.stock}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-blue-600 font-medium">
                              {margin}%
                            </td>
                            <td className="px-4 py-3 flex gap-3 items-center">
                              {/* Edit — ADMIN and MANAGER only */}
                              <PermissionGate permission={PERMISSIONS.PRODUCT_EDIT}>
                                <button onClick={() => openEdit(p)}
                                  className="text-blue-600 hover:underline text-xs">
                                  Edit
                                </button>
                              </PermissionGate>

                              {/* Delete — ADMIN only */}
                              <PermissionGate permission={PERMISSIONS.PRODUCT_DELETE}>
                                <button onClick={() => handleDelete(p.id)}
                                  className="text-red-500 hover:underline text-xs">
                                  Delete
                                </button>
                              </PermissionGate>

                              {/* No actions available for CASHIER */}
                              <PermissionGate
                                permission={PERMISSIONS.PRODUCT_EDIT}
                                fallback={
                                  <span className="text-gray-300 text-xs italic">
                                    View only
                                  </span>
                                }
                              />
                            </td>
                          </tr>
                        );
                      })
                  }
                </tbody>
              </table>
            </div>
        }

        {/* ── Pagination ────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3
            border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Page {page + 1} of {totalPages} · {total} products
            </p>
            <div className="flex gap-1">
              <button onClick={() => load(0, search)} disabled={page === 0}
                className="px-2 py-1 text-xs rounded border
                  disabled:opacity-40 hover:bg-gray-100">«</button>
              <button onClick={() => load(page - 1, search)} disabled={page === 0}
                className="px-2 py-1 text-xs rounded border
                  disabled:opacity-40 hover:bg-gray-100">‹</button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = Math.max(0,
                  Math.min(page - 2, totalPages - 5)) + i;
                return (
                  <button key={pg} onClick={() => load(pg, search)}
                    className={`px-2 py-1 text-xs rounded border transition-colors
                      ${pg === page
                        ? "bg-blue-600 text-white border-blue-600"
                        : "hover:bg-gray-100"}`}>
                    {pg + 1}
                  </button>
                );
              })}

              <button
                onClick={() => load(page + 1, search)}
                disabled={page >= totalPages - 1}
                className="px-2 py-1 text-xs rounded border
                  disabled:opacity-40 hover:bg-gray-100">›</button>
              <button
                onClick={() => load(totalPages - 1, search)}
                disabled={page >= totalPages - 1}
                className="px-2 py-1 text-xs rounded border
                  disabled:opacity-40 hover:bg-gray-100">»</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center
          justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editId ? "✏️ Edit Product" : "➕ Add Product"}
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700
                px-3 py-2 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { label: "Product Name *", key: "name",      type: "text",   placeholder: "Coca Cola 330ml",  step: undefined },
                { label: "Barcode",        key: "barcode",   type: "text",   placeholder: "1234567890123",    step: undefined },
                { label: "Selling Price *",key: "price",     type: "number", placeholder: "2.50",             step: "0.01" },
                { label: "Cost Price *",   key: "costPrice", type: "number", placeholder: "1.20",             step: "0.01" },
                { label: "Stock *",        key: "stock",     type: "number", placeholder: "100",              step: "1" },
              ].map(({ label, key, type, placeholder, step }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {label}
                  </label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    step={step}
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                      text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              {/* Margin preview */}
              {form.price && form.costPrice && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg
                  px-3 py-2 text-xs text-blue-700">
                  Estimated margin: <strong>
                    {(((form.price - form.costPrice) / form.price) * 100).toFixed(1)}%
                  </strong>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700
                    py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg
                    text-sm hover:bg-blue-700 transition-colors">
                  {editId ? "Save Changes" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
