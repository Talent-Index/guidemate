"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { ReactNode } from "react";

type Tab = {
  href: string;
  label: string;
  match: (path: string) => boolean;
  icon: ReactNode;
};

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M12 3.2 3.5 10.2V21h6.2v-6.3h4.6V21h6.2V10.2L12 3.2z" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M12 2.5A9.5 9.5 0 1 0 21.5 12 9.51 9.51 0 0 0 12 2.5zm3.6 5.2-1.5 5.1-5.1 1.5 1.5-5.1 5.1-1.5z" />
    </svg>
  );
}

function LiveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M8 6.5v11l9.5-5.5L8 6.5z" />
    </svg>
  );
}

function BookingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M7 3.5h10a2 2 0 0 1 2 2V20l-7-3.2L5 20V5.5a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function TourIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M12 3a7 7 0 0 0-7 7c0 5.25 7 11 7 11s7-5.75 7-11a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 14.5 10 2.5 2.5 0 0 1 12 12.5z" />
    </svg>
  );
}

function DashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M4 4.5h7v7H4v-7zm9 0h7v4h-7v-4zM4 13.5h7v7H4v-7zm9 2h7v5h-7v-5z" />
    </svg>
  );
}

function SignInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.3 0-8 1.7-8 5v1.5h16V19c0-3.3-4.7-5-8-5z" />
    </svg>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  let tabs: Tab[];
  if (profile?.role === "guide") {
    tabs = [
      { href: "/guide", label: "Tour", match: (p) => p === "/guide", icon: <TourIcon /> },
      { href: "/guide/dashboard", label: "Dashboard", match: (p) => p.startsWith("/guide/dashboard"), icon: <DashIcon /> },
      { href: "/live", label: "Live", match: (p) => p.startsWith("/live"), icon: <LiveIcon /> },
    ];
  } else if (profile?.role === "admin") {
    tabs = [
      { href: "/admin/applications", label: "Dashboard", match: (p) => p.startsWith("/admin"), icon: <DashIcon /> },
      { href: "/live", label: "Live", match: (p) => p.startsWith("/live"), icon: <LiveIcon /> },
    ];
  } else if (user && profile?.role === "tourist") {
    tabs = [
      { href: "/explore", label: "Explore", match: (p) => p.startsWith("/explore") || p.startsWith("/book"), icon: <CompassIcon /> },
      { href: "/live", label: "Live", match: (p) => p.startsWith("/live"), icon: <LiveIcon /> },
      { href: "/tourist/bookings", label: "Bookings", match: (p) => p.startsWith("/tourist"), icon: <BookingsIcon /> },
    ];
  } else {
    tabs = [
      { href: "/", label: "Home", match: (p) => p === "/", icon: <HomeIcon /> },
      { href: "/explore", label: "Explore", match: (p) => p.startsWith("/explore"), icon: <CompassIcon /> },
      { href: "/live", label: "Live", match: (p) => p.startsWith("/live"), icon: <LiveIcon /> },
      { href: "/auth/sign-in", label: "Sign in", match: (p) => p.startsWith("/auth"), icon: <SignInIcon /> },
    ];
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--gm-border)] bg-[var(--gm-tabs)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2 pb-2">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`mx-auto flex h-12 w-12 flex-col items-center justify-center rounded-2xl transition ${
                  active ? "bg-brand-amber text-brand-blueDark" : "text-[var(--gm-ink)]/35"
                }`}
                aria-current={active ? "page" : undefined}
                aria-label={tab.label}
              >
                {tab.icon}
                <span className="sr-only">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
