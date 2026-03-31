import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }  from "./store/AuthContext";
import { ToastProvider } from "./components/Toast";
import ProtectedRoute    from "./components/ProtectedRoute";
import Layout            from "./components/Layout";
import LoginPage         from "./pages/LoginPage";
import DashboardPage     from "./pages/DashboardPage";
import ProductsPage      from "./pages/ProductsPage";
import POSPage           from "./pages/POSPage";
import SalesPage         from "./pages/SalesPage";
import InventoryPage     from "./pages/InventoryPage";
import AnalyticsPage     from "./pages/AnalyticsPage";
import InsightsPage      from "./pages/InsightsPage";
import PredictionPage    from "./pages/PredictionPage";
import ChatAgentPage     from "./pages/ChatAgentPage";
import UsersPage         from "./pages/UsersPage";

const ROUTES = [
  { path: "/",            Page: DashboardPage  },
  { path: "/products",    Page: ProductsPage   },
  { path: "/pos",         Page: POSPage        },
  { path: "/sales",       Page: SalesPage      },
  { path: "/inventory",   Page: InventoryPage  },
  { path: "/predictions", Page: PredictionPage },
  { path: "/analytics",   Page: AnalyticsPage  },
  { path: "/insights",    Page: InsightsPage   },
  { path: "/agent",       Page: ChatAgentPage  },
  { path: "/users",       Page: UsersPage      },
];

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {ROUTES.map(({ path, Page }) => (
              <Route key={path} path={path} element={
                <ProtectedRoute>
                  <Layout><Page /></Layout>
                </ProtectedRoute>
              }/>
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
