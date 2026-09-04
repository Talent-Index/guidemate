"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { ReactNode } from "react";

type Tab = {
  href: string;
  label: string;
  match: (path: string) => boolean;
  icon: (active: boolean) => ReactNode;
};

function IconFrame({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
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
      {children}
    </svg>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <IconFrame active={active}>
      <path d="M4.2 10.4 12 3.8l7.8 6.6v9.1a1.4 1.4 0 0 1-1.4 1.4h-4.1v-5.4H9.7v5.4H5.6a1.4 1.4 0 0 1-1.4-1.4v-9.1z" />
    </IconFrame>
  );
}

function CompassIcon({ active }: { active: boolean }) {
  return (
    <IconFrame active={active}>
      <circle cx="12" cy="12" r="8.2" fill={active ? "currentColor" : "none"} />
      {active ? (
        <path d="M12 7.4 15.2 16l-3.2-1.6L8.8 16z" fill="#111111" />
      ) : (
        <path d="M12 7.6 15.1 15.8 12 14.3 8.9 15.8z" />
      )}
    </IconFrame>
  );
}

function LiveIcon({ active }: { active: boolean }) {
  return (
    <IconFrame active={active}>
      <rect x="3.4" y="5.6" width="13.2" height="12.8" rx="2.4" />
      <path d="M16.6 9.6 20.6 7.4v9.2l-4-2.2" />
      {active ? (
        <path d="M8 9.4v5.2l4.4-2.6z" fill="#111111" />
      ) : (
        <path d="M8.2 9.6v4.8l4.2-2.4z" />
      )}
    </IconFrame>
  );
}

function BookingsIcon({ active }: { active: boolean }) {
  return (
    <IconFrame active={active}>
      <path d="M7.2 4.2h9.6a1.6 1.6 0 0 1 1.6 1.6V20l-6.4-2.6L5.6 20V5.8a1.6 1.6 0 0 1 1.6-1.6z" />
      {active ? null : <path d="M9 8.4h6M9 11.6h4.2" />}
    </IconFrame>
  );
}

function TourIcon({ active }: { active: boolean }) {
  return (
    <IconFrame active={active}>
      <path d="M12 21s6.4-5.4 6.4-10.2A6.4 6.4 0 0 0 5.6 10.8C5.6 15.6 12 21 12 21z" />
      <circle cx="12" cy="10.6" r="2.1" fill={active ? "#111111" : "none"} />
    </IconFrame>
  );
}

function DashIcon({ active }: { active: boolean }) {
  return (
    <IconFrame active={active}>
      <rect x="3.6" y="3.6" width="7.2" height="7.2" rx="1.6" />
      <rect x="13.2" y="3.6" width="7.2" height="4.6" rx="1.6" />
      <rect x="3.6" y="13.2" width="7.2" height="7.2" rx="1.6" />
      <rect x="13.2" y="10.6" width="7.2" height="9.8" rx="1.6" />
    </IconFrame>
  );
}

function SignInIcon({ active }: { active: boolean }) {
  return (
    <IconFrame active={active}>
      <circle cx="12" cy="8.2" r="3.2" />
      <path d="M5.4 19.4c.6-3.4 3.2-5 6.6-5s6 1.6 6.6 5" />
    </IconFrame>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <IconFrame active={active}>
      <circle cx="12" cy="12" r="2.6" fill={active ? "#111111" : "none"} />
      <path d="M12 2.8v2.1M12 19.1v2.1M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M2.8 12h2.1M19.1 12h2.1M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5" />
    </IconFrame>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  let tabs: Tab[];
  if (profile?.role === "guide") {
    tabs = [
      { href: "/guide", label: "Tour", match: (p) => p === "/guide" || p.startsWith("/tourists"), icon: (a) => <TourIcon active={a} /> },
      {
        href: "/guide/dashboard",
        label: "Dashboard",
        match: (p) => p.startsWith("/guide/dashboard"),
        icon: (a) => <DashIcon active={a} />,
      },
      { href: "/live", label: "Live", match: (p) => p.startsWith("/live"), icon: (a) => <LiveIcon active={a} /> },
    ];
  } else if (profile?.role === "admin") {
    tabs = [
      {
        href: "/admin/applications",
        label: "Dashboard",
        match: (p) => p.startsWith("/admin"),
        icon: (a) => <DashIcon active={a} />,
      },
      { href: "/live", label: "Live", match: (p) => p.startsWith("/live"), icon: (a) => <LiveIcon active={a} /> },
    ];
  } else if (user && profile?.role === "tourist") {
    tabs = [
      {
        href: "/explore",
        label: "Explore",
        match: (p) => p.startsWith("/explore") || p.startsWith("/book") || p.startsWith("/guides"),
        icon: (a) => <CompassIcon active={a} />,
      },
      { href: "/live", label: "Live", match: (p) => p.startsWith("/live"), icon: (a) => <LiveIcon active={a} /> },
      {
        href: "/tourist/bookings",
        label: "Bookings",
        match: (p) => p.startsWith("/tourist/bookings"),
        icon: (a) => <BookingsIcon active={a} />,
      },
      {
        href: "/tourist/settings",
        label: "Settings",
        match: (p) => p.startsWith("/tourist/settings"),
        icon: (a) => <SettingsIcon active={a} />,
      },
    ];
  } else {
    tabs = [
      { href: "/", label: "Home", match: (p) => p === "/", icon: (a) => <HomeIcon active={a} /> },
      { href: "/explore", label: "Explore", match: (p) => p.startsWith("/explore"), icon: (a) => <CompassIcon active={a} /> },
      { href: "/live", label: "Live", match: (p) => p.startsWith("/live"), icon: (a) => <LiveIcon active={a} /> },
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
