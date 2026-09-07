"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

export type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toneStyles(tone: ToastTone) {
  if (tone === "success") return "border-brand-success/30 bg-brand-successBg text-brand-success";
  if (tone === "error") return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300";
  return "border-brand-border bg-[var(--gm-surface)] text-[var(--gm-ink)]";
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const recentRef = useRef<Map<string, number>>(new Map());

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    const key = `${tone}:${message}`;
    const now = Date.now();
    const lastShown = recentRef.current.get(key);
    if (lastShown != null && now - lastShown < 3000) return;
    recentRef.current.set(key, now);

    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-20 z-[70] flex flex-col items-center gap-2 px-4 md:items-end md:pr-6"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto w-full max-w-sm animate-[slideInLeft_0.25s_ease-out] rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg md:animate-none ${toneStyles(item.tone)}`}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
