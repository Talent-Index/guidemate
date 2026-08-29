"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "guidemate-cookie-notice";

export function CookieToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore private-mode storage failures
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside
      role="status"
      className="fixed bottom-4 left-4 z-[60] max-w-sm animate-[slideInLeft_0.35s_ease-out] border border-white/15 bg-brand-blueDark p-4 text-white shadow-lg"
    >
      <p className="text-sm leading-relaxed text-white/90">
        This site uses cookies to provide you with the best of experience.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-3 bg-brand-amber px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-blueDark transition hover:bg-brand-amberDark"
      >
        Got it
      </button>
    </aside>
  );
}
