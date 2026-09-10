"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSuperAdmin } from "@/lib/auth/roles";
import type { ReactNode } from "react";
import {
  AnalyticsNavIcon,
  BookingsNavIcon,
  CompassNavIcon,
  DashboardNavIcon,
  HomeNavIcon,
  LiveNavIcon,
  MessagesNavIcon,
  SettingsNavIcon,
  TourNavIcon,
  WalletNavIcon,
} from "@/components/ui/NavIcons";

type Tab = {
  href: string;
  label: string;
  match: (path: string) => boolean;
  icon: (active: boolean) => ReactNode;
};

function SignInIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[22px] w-[22px]"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={active ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8.2" r="3.2" />
      <path d="M5.4 19.4c.6-3.4 3.2-5 6.6-5s6 1.6 6.6 5" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[22px] w-[22px]"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={active ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8.2" r="3.2" />
      <path d="M5.4 19.4c.6-3.4 3.2-5 6.6-5s6 1.6 6.6 5" />
    </svg>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  const settingsHref =
    profile?.role === "guide"
      ? "/guide/settings"
      : profile?.role === "tourist"
        ? "/tourist/settings"
        : profile?.role === "admin" || profile?.role === "staff"
          ? "/admin/settings"
          : null;

  const profileTab: Tab | null = settingsHref
    ? {
        href: settingsHref,
        label: "Settings",
        match: (p) =>
          p.startsWith("/tourist/settings") ||
          p.startsWith("/guide/settings") ||
          p.startsWith("/admin/settings"),
        icon: (a) => <ProfileIcon active={a} />,
      }
    : null;

  let tabs: Tab[];
  if (profile?.role === "guide") {
    tabs = [
      {
        href: "/guide",
        label: "Tour",
        match: (p) => p === "/guide" || p.startsWith("/tourists"),
        icon: (a) => <TourNavIcon active={a} />,
      },
      {
        href: "/chat",
        label: "Messages",
        match: (p) => p.startsWith("/chat"),
        icon: (a) => <MessagesNavIcon active={a} />,
      },
      {
        href: "/guide/dashboard",
        label: "Dashboard",
        match: (p) => p.startsWith("/guide/dashboard"),
        icon: (a) => <DashboardNavIcon active={a} />,
      },
      { href: "/wallet", label: "Wallet", match: (p) => p.startsWith("/wallet"), icon: (a) => <WalletNavIcon active={a} /> },
      { href: "/live", label: "Livestream", match: (p) => p.startsWith("/live"), icon: (a) => <LiveNavIcon active={a} /> },
    ];
    if (profileTab) tabs.push(profileTab);
  } else if (isSuperAdmin(profile?.role)) {
    tabs = [
      { href: "/admin", label: "Dashboard", match: (p) => p.startsWith("/admin"), icon: (a) => <AnalyticsNavIcon active={a} /> },
      { href: "/live", label: "Livestream", match: (p) => p.startsWith("/live"), icon: (a) => <LiveNavIcon active={a} /> },
    ];
    if (profileTab) tabs.push(profileTab);
  } else if (profile?.role === "staff") {
    tabs = [
      { href: "/admin", label: "Analytics", match: (p) => p === "/admin", icon: (a) => <AnalyticsNavIcon active={a} /> },
    ];
    if (profileTab) tabs.push(profileTab);
  } else if (user && profile?.role === "tourist") {
    tabs = [
      {
        href: "/explore",
        label: "Explore",
        match: (p) => p.startsWith("/explore") || p.startsWith("/book") || p.startsWith("/experiences") || p.startsWith("/guides"),
        icon: (a) => <CompassNavIcon active={a} />,
      },
      {
        href: "/tourist/bookings",
        label: "Bookings",
        match: (p) => p.startsWith("/tourist/bookings"),
        icon: (a) => <BookingsNavIcon active={a} />,
      },
      { href: "/wallet", label: "Wallet", match: (p) => p.startsWith("/wallet"), icon: (a) => <WalletNavIcon active={a} /> },
      {
        href: "/chat",
        label: "Messages",
        match: (p) => p.startsWith("/chat"),
        icon: (a) => <MessagesNavIcon active={a} />,
      },
    ];
    if (profileTab) tabs.push(profileTab);
  } else {
    tabs = [
      { href: "/", label: "Home", match: (p) => p === "/", icon: (a) => <HomeNavIcon active={a} /> },
      { href: "/explore", label: "Explore", match: (p) => p.startsWith("/explore"), icon: (a) => <CompassNavIcon active={a} /> },
      { href: "/live", label: "Livestream", match: (p) => p.startsWith("/live"), icon: (a) => <LiveNavIcon active={a} /> },
      { href: "/auth/sign-in", label: "Sign in", match: (p) => p.startsWith("/auth"), icon: (a) => <SignInIcon active={a} /> },
    ];
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--gm-border)] bg-[var(--gm-tabs)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1.5 pb-1">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className="mx-auto flex flex-col items-center gap-0.5 py-0.5"
                aria-current={active ? "page" : undefined}
                aria-label={tab.label}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-[1.05rem] transition ${
                    active ? "bg-brand-amber text-[#111111]" : "text-[var(--gm-ink)]/38"
                  }`}
                >
                  {tab.icon(active)}
                </span>
                <span
                  className={`text-[10px] font-bold tracking-wide ${
                    active ? "text-[var(--gm-ink)]" : "text-[var(--gm-ink)]/38"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
