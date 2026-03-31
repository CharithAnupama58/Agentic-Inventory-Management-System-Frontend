import { useState, useEffect, createContext, useContext, useCallback } from "react";

const ToastContext = createContext(null);

const ICONS = {
  success: "✅",
  error:   "❌",
  warning: "⚠️",
  info:    "ℹ️",
};

const STYLES = {
  success: "bg-green-50 border-green-200 text-green-800",
  error:   "bg-red-50 border-red-200 text-red-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  info:    "bg-blue-50 border-blue-200 text-blue-800",
};

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), toast.duration || 4000);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg
      text-sm font-medium max-w-sm w-full animate-slide-in
      ${STYLES[toast.type || "info"]}`}>
      <span className="text-lg flex-shrink-0">{ICONS[toast.type || "info"]}</span>
      <div className="flex-1">
        {toast.title && (
          <p className="font-bold mb-0.5">{toast.title}</p>
        )}
        <p className="font-normal">{toast.message}</p>
        {toast.fieldErrors && (
          <ul className="mt-1 text-xs space-y-0.5 opacity-80">
            {Object.entries(toast.fieldErrors).map(([field, msg]) => (
              <li key={field}>• <strong>{field}</strong>: {msg}</li>
            ))}
          </ul>
        )}
      </div>
      <button onClick={() => onRemove(toast.id)}
        className="opacity-50 hover:opacity-100 text-lg leading-none flex-shrink-0">
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { ...toast, id }]);
    return id;
  }, []);

  const success = useCallback((message, title) =>
    add({ type: "success", message, title }), [add]);

  const error = useCallback((message, title, fieldErrors) =>
    add({ type: "error", message, title, fieldErrors, duration: 6000 }), [add]);

  const warning = useCallback((message, title) =>
    add({ type: "warning", message, title }), [add]);

  const info = useCallback((message, title) =>
    add({ type: "info", message, title }), [add]);

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};
