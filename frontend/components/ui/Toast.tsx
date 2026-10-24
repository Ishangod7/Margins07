"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { CheckIcon, CrossIcon, ZapIcon } from "@/components/ui/Icons";
import styles from "./toast.module.css";

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", title?: string, duration = 3500) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: Toast = { id, message, type, title };

      setToasts((prev) => [...prev.slice(-3), newToast]); // Keep at most 4 toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => showToast(message, "success", title),
    [showToast]
  );

  const error = useCallback(
    (message: string, title?: string) => showToast(message, "error", title),
    [showToast]
  );

  const info = useCallback(
    (message: string, title?: string) => showToast(message, "info", title),
    [showToast]
  );

  const contextValue = useMemo(
    () => ({ showToast, success, error, info }),
    [showToast, success, error, info]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className={styles.toastContainer} role="region" aria-label="Notifications">
        {toasts.map((toast) => {
          const isSuccess = toast.type === "success";
          const isError = toast.type === "error";

          return (
            <div
              key={toast.id}
              className={`card ${styles.toastCard} ${
                isSuccess
                  ? styles.toastSuccess
                  : isError
                  ? styles.toastError
                  : styles.toastInfo
              }`}
            >
              <div className={styles.toastIconWrapper}>
                {isSuccess ? (
                  <CheckIcon size={16} className={styles.iconSuccess} aria-hidden="true" />
                ) : isError ? (
                  <CrossIcon size={16} className={styles.iconError} aria-hidden="true" />
                ) : (
                  <ZapIcon size={16} className={styles.iconInfo} aria-hidden="true" />
                )}
              </div>

              <div className={styles.toastContent}>
                {toast.title && <strong className={styles.toastTitle}>{toast.title}</strong>}
                <p className={styles.toastMessage}>{toast.message}</p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className={styles.closeBtn}
                aria-label="Dismiss notification"
              >
                <CrossIcon size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback if called outside ToastProvider
    return {
      showToast: (msg: string) => console.log("[Toast]", msg),
      success: (msg: string) => console.log("[Toast:success]", msg),
      error: (msg: string) => console.error("[Toast:error]", msg),
      info: (msg: string) => console.log("[Toast:info]", msg),
    };
  }
  return ctx;
}
