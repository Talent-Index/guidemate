"use client";

import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center text-neutral-800 transition hover:opacity-80 dark:text-white"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M6.8 12A5.2 5.2 0 1 0 12 6.8 5.2 5.2 0 0 0 6.8 12zM12 1.5h0v2.2h0zm0 18.8h0v2.2h0zM4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M1.5 12h2.2m18.8 0h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M16.4 13.2A7 7 0 0 1 10.8 4 7.8 7.8 0 1 0 20 14.8a7 7 0 0 1-3.6-1.6z" />
        </svg>
      )}
    </button>
  );
}
