import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { useRole } from "../hooks/useRole";
import { PERMISSIONS } from "../utils/permissions";
import RoleBadge from "./RoleBadge";

export default function Layout({ children }) {
  const { pathname }         = useLocation();
  const { user, logoutUser } = useAuth();
  const { can }              = useRole();
  const navigate             = useNavigate();

  const handleLogout = () => { logoutUser(); navigate("/login"); };

  // ── Chat page needs overflow-hidden (manages its own scroll internally)
  // ── All other pages need overflow-auto for normal scrolling
  const isChatPage = pathname === "/agent";

  const navItems = [
    { path: "/",            label: "Dashboard",   icon: "📊", perm: PERMISSIONS.DASHBOARD_VIEW  },
    { path: "/products",    label: "Products",    icon: "📦", perm: PERMISSIONS.PRODUCT_VIEW    },
    { path: "/pos",         label: "POS",         icon: "🛒", perm: PERMISSIONS.SALE_CREATE      },
    { path: "/sales",       label: "Sales",       icon: "💰", perm: PERMISSIONS.SALE_VIEW        },
    { path: "/inventory",   label: "Inventory",   icon: "🔔", perm: PERMISSIONS.INVENTORY_VIEW   },
    { path: "/predictions", label: "Predictions", icon: "🔮", perm: PERMISSIONS.INVENTORY_VIEW   },
    { path: "/analytics",   label: "Analytics",   icon: "📈", perm: PERMISSIONS.ANALYTICS_VIEW   },
    { path: "/insights",    label: "AI Insights", icon: "🧠", perm: PERMISSIONS.ANALYTICS_VIEW   },
    { path: "/agent",       label: "AI Agent",    icon: "🤖", perm: PERMISSIONS.ANALYTICS_VIEW   },
    { path: "/users",       label: "Team",        icon: "👥", perm: PERMISSIONS.USER_MANAGE      },
  ].filter(item => can(item.perm));

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col
        flex-shrink-0 h-screen">

        {/* Brand */}
        <div className="p-6 border-b border-gray-700 flex-shrink-0">
          <h1 className="text-xl font-bold text-blue-400">🏪 POS System</h1>
          <p className="text-gray-300 text-sm mt-2 font-medium">
            {user?.name}
          </p>
          <div className="mt-1">
            <RoleBadge role={user?.role} size="xs" />
          </div>
        </div>

        {/* Nav — scrollable if too many items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ path, label, icon }) => (
            <Link key={path} to={path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg
                text-sm font-medium transition-colors
                ${pathname === path
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
              <span>{icon}</span>{label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-700 flex-shrink-0">
          <button onClick={handleLogout}
            className="w-full text-left text-gray-400 hover:text-red-400
              text-sm px-4 py-2 rounded-lg hover:bg-gray-800
              transition-colors">
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className={`flex-1 p-6
        ${isChatPage
          ? "overflow-hidden flex flex-col"   // chat manages its own scroll
          : "overflow-y-auto"                  // all other pages scroll normally
        }`}>
        {children}
      </main>
    </div>
  );
}
