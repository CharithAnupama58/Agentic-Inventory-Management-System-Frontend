import { useEffect, useState } from "react";
import api from "../api/axios";
import { useToast } from "../components/Toast";
import RoleBadge from "../components/RoleBadge";

const ROLES = ["MANAGER", "CASHIER"];
const empty = { name: "", email: "", password: "", role: "CASHIER" };

export default function UsersPage() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]         = useState(empty);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const toast = useToast();

  const load = () => {
    setLoading(true);
    api.get("/users")
      .then(r => setUsers(r.data))
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await api.post("/users", form);
      toast.success(`${form.name} added as ${form.role}`);
      setShowModal(false); setForm(empty); load();
    } catch (err) {
      setError(err.displayMessage || "Failed to create user");
    } finally { setSaving(false); }
  };

  const handleRoleChange = async (userId, newRole, userName) => {
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      toast.success(`${userName}'s role updated to ${newRole}`);
      load();
    } catch (err) {
      toast.error(err.displayMessage || "Failed to update role");
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${userId}`);
      toast.success(`${userName} removed`);
      load();
    } catch (err) {
      toast.error(err.displayMessage || "Failed to delete user");
    }
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">👥 Team Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {users.length} staff members
          </p>
        </div>
        <button onClick={() => { setShowModal(true); setError(""); setForm(empty); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Add Staff
        </button>
      </div>

      {/* Role Legend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">
          Role Permissions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500">
          {[
            {
              role: "ADMIN", icon: "👑",
              perms: ["All permissions", "Delete products",
                      "Manage users", "View analytics & reports",
                      "Full inventory control"]
            },
            {
              role: "MANAGER", icon: "🎯",
              perms: ["Create & edit products", "Process sales & refunds",
                      "Adjust stock & batches",
                      "View analytics & reports"]
            },
            {
              role: "CASHIER", icon: "🛒",
              perms: ["View products", "Process sales only",
                      "View inventory (read only)",
                      "View dashboard"]
            },
          ].map(r => (
            <div key={r.role} className="p-3 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <RoleBadge role={r.role} />
              </div>
              <ul className="space-y-1">
                {r.perms.map(p => (
                  <li key={p} className="flex items-center gap-1">
                    <span className="text-green-500">✓</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading
          ? <div className="flex items-center justify-center py-16">
              <div className="animate-spin text-3xl">⏳</div>
            </div>
          : <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-xs text-gray-500">
                <tr>
                  {["Name","Email","Role","Actions"].map(h => (
                    <th key={h}
                      className="text-left px-4 py-3 font-medium uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}
                    className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {u.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.role === "ADMIN"
                        ? <RoleBadge role="ADMIN" />
                        : <select
                            value={u.role}
                            onChange={e => handleRoleChange(
                                u.id, e.target.value, u.name)}
                            className="border border-gray-300 rounded-lg px-2 py-1
                              text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {ROLES.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {u.role !== "ADMIN" && (
                        <button onClick={() => handleDelete(u.id, u.name)}
                          className="text-red-500 hover:text-red-700 text-xs
                            hover:underline">
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      {/* Add Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center
          justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              👤 Add Staff Member
            </h2>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700
                px-3 py-2 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-3">
              {[
                { label: "Full Name *",  key: "name",     type: "text",     placeholder: "John Silva" },
                { label: "Email *",      key: "email",    type: "email",    placeholder: "john@shop.com" },
                { label: "Password *",   key: "password", type: "password", placeholder: "Min 6 characters" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {f.label}
                  </label>
                  <input type={f.type} placeholder={f.placeholder} required
                    value={form[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                      text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Role *
                </label>
                <select value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                    text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="MANAGER">🎯 Manager</option>
                  <option value="CASHIER">🛒 Cashier</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700
                    py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg
                    text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Adding..." : "Add Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
