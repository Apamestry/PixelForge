"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none"
      >
        {toasts.map((toast) => {
          const typeStyles = {
            success: "bg-white border-green-200 text-text",
            error: "bg-white border-red-200 text-text",
            info: "bg-white border-border text-text",
          };

          const icons = {
            success: <CheckCircle2 size={16} strokeWidth={1.75} className="text-green-600 flex-shrink-0" />,
            error: <AlertCircle size={16} strokeWidth={1.75} className="text-danger flex-shrink-0" />,
            info: <Info size={16} strokeWidth={1.75} className="text-accent flex-shrink-0" />,
          };

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center space-x-2.5 rounded border p-3 text-xs shadow-md transition ${
                typeStyles[toast.type] || typeStyles.info
              }`}
            >
              {icons[toast.type] || icons.info}
              <span className="flex-1 font-medium">{toast.message}</span>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-text-muted hover:text-text rounded p-0.5"
                aria-label="Dismiss notification"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      addToast: (msg) => console.log(msg),
      removeToast: () => {},
    };
  }
  return ctx;
}
