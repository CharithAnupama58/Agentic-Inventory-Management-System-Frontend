import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import api from "../api/axios";

export default function LoginPage() {
  const [email, setEmail]       = useState("admin20@testshop.com");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const { loginUser } = useAuth();
  const navigate      = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", { email, password });
      const authData = response.data;

      if (!authData?.token) throw new Error("No token received");

      localStorage.setItem("token", authData.token);
      localStorage.setItem("user", JSON.stringify({
        email:    authData.email,
        name:     authData.name,
        role:     authData.role,
        tenantId: authData.tenantId,
      }));

      loginUser(authData);
      navigate("/", { replace: true });

    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-gray-900
      flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏪</div>
          <h1 className="text-2xl font-bold text-gray-800">POS System</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700
            px-4 py-3 rounded-lg mb-5 text-sm text-center">
            ❌ {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="admin@shop.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3
                text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-3
                text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50
              text-white py-3 rounded-lg text-sm font-semibold transition-colors">
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </div>

        <div className="mt-6 p-3 bg-gray-50 rounded-lg text-xs
          text-gray-500 text-center space-y-1">
          <p className="font-semibold text-gray-600">Demo Credentials</p>
          <p>📧 admin20@testshop.com</p>
          <p>🔑 password123</p>
        </div>
      </div>
    </div>
  );
}
