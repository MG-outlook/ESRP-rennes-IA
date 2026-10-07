"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const TYPE_STYLES: Record<ToastType, string> = {
  success: "bg-success-soft text-success-strong border border-success",
  error: "bg-danger-soft text-danger-strong border border-danger",
  info: "bg-brand-soft text-brand-strong border border-brand",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>({
    message: "",
    type: "success",
    visible: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, type: ToastType = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ message, type, visible: true });
    timerRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  return (
    <ToastContext value={{ show }}>
      {children}
      {state.visible && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-xl shadow-lg font-bold text-lg max-w-[calc(100vw-2rem)] ${TYPE_STYLES[state.type]}`}
          role="status"
          aria-live="assertive"
        >
          {state.message}
        </div>
      )}
    </ToastContext>
  );
}
