"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { homeForRole } from "@/lib/auth/home";
import { isSuperAdmin } from "@/lib/auth/roles";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  AnalyticsNavIcon,
  BookingsNavIcon,
  CompassNavIcon,
  DashboardNavIcon,
  LiveNavIcon,
  MessagesNavIcon,
  SettingsNavIcon,
  TourNavIcon,
  WalletNavIcon,
} from "@/components/ui/NavIcons";

function PillLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  children: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-brand-blue text-white" : "text-brand-muted hover:text-brand-blueDark"
      }`}
    >
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </span>
      {children}
    </Link>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { loading, user, profile } = useAuth();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const signedIn = Boolean(user && profile);

  useEffect(() => {
    if (signedIn) {
      setHidden(false);
      return;
    }
    lastY.current = window.scrollY;
    function onScroll() {
      if (window.innerWidth < 768) {
        setHidden(false);
        return;
      }
      const y = window.scrollY;
      if (y < 32) {
        setHidden(false);
      } else if (y > lastY.current + 6) {
        setHidden(true);
      } else if (y < lastY.current - 6) {
        setHidden(false);
      }
      lastY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [signedIn]);

  const onMarketingHero = pathname === "/" && !signedIn;
  const linkClass = onMarketingHero
    ? "text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 transition hover:text-white"
    : "text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-800 transition hover:text-black dark:text-white dark:hover:text-white";
  const dashboardSettings = pathname.startsWith("/guide/dashboard") && searchParams.get("tab") === "settings";
  const showNavAccountActions = !signedIn;

  return (
    <header
      className={`fixed top-0 z-50 w-full backdrop-blur-md transition-transform duration-300 ${
        onMarketingHero
          ? "border-b border-white/15 bg-black/40"
          : "border-b border-[var(--gm-border)] bg-[var(--gm-nav)]/90"
      } ${hidden ? "md:-translate-y-full" : "translate-y-0"}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
        <Link
          href={profile ? homeForRole(profile.role) : "/"}
          className={`flex items-center border px-3 py-1.5 ${
            onMarketingHero
              ? "border-white/25 bg-white"
              : "border-[var(--gm-border)] bg-[#ffffff] dark:bg-[#000000]"
          }`}
        >
          <BrandLogo className="h-6 w-auto sm:h-7" priority />
        </Link>

        <nav className="hidden items-center gap-3 md:flex">
          {loading ? null : user && profile ? (
            <div className="flex items-center rounded-full border border-brand-border bg-white/80 p-1 dark:bg-black/40">
              {profile.role === "guide" && (
                <>
                  <PillLink
                    href="/guide/dashboard"
                    active={pathname.startsWith("/guide/dashboard") && !dashboardSettings}
                    icon={<DashboardNavIcon active={pathname.startsWith("/guide/dashboard") && !dashboardSettings} />}
                  >
                    Dashboard
                  </PillLink>
                  <PillLink href="/guide" active={pathname === "/guide"} icon={<TourNavIcon active={pathname === "/guide"} />}>
                    Tour
                  </PillLink>
                  <PillLink href="/live" active={pathname.startsWith("/live")} icon={<LiveNavIcon active={pathname.startsWith("/live")} />}>
                    Livestream
                  </PillLink>
                  <PillLink href="/chat" active={pathname.startsWith("/chat")} icon={<MessagesNavIcon active={pathname.startsWith("/chat")} />}>
                    Messages
                  </PillLink>
                  <PillLink href="/wallet" active={pathname.startsWith("/wallet")} icon={<WalletNavIcon active={pathname.startsWith("/wallet")} />}>
                    Wallet
                  </PillLink>
                  <PillLink
                    href="/guide/settings"
                    active={dashboardSettings || pathname.startsWith("/guide/settings")}
                    icon={<SettingsNavIcon active={dashboardSettings || pathname.startsWith("/guide/settings")} />}
                  >
                    Settings
                  </PillLink>
                </>
              )}
              {profile.role === "tourist" && (
                <>
                  <PillLink href="/explore" active={pathname.startsWith("/explore")} icon={<CompassNavIcon active={pathname.startsWith("/explore")} />}>
                    Explore
                  </PillLink>
                  <PillLink
                    href="/tourist/bookings"
                    active={pathname.startsWith("/tourist/bookings")}
                    icon={<BookingsNavIcon active={pathname.startsWith("/tourist/bookings")} />}
                  >
                    Bookings
                  </PillLink>
                  <PillLink href="/live" active={pathname.startsWith("/live")} icon={<LiveNavIcon active={pathname.startsWith("/live")} />}>
                    Livestream
                  </PillLink>
                  <PillLink href="/chat" active={pathname.startsWith("/chat")} icon={<MessagesNavIcon active={pathname.startsWith("/chat")} />}>
                    Messages
                  </PillLink>
                  <PillLink href="/wallet" active={pathname.startsWith("/wallet")} icon={<WalletNavIcon active={pathname.startsWith("/wallet")} />}>
                    Wallet
                  </PillLink>
                  <PillLink
                    href="/tourist/settings"
                    active={pathname.startsWith("/tourist/settings")}
                    icon={<SettingsNavIcon active={pathname.startsWith("/tourist/settings")} />}
                  >
                    Settings
                  </PillLink>
                </>
              )}
              {isSuperAdmin(profile.role) && (
                <>
                  <PillLink href="/admin" active={pathname.startsWith("/admin")} icon={<AnalyticsNavIcon active={pathname.startsWith("/admin")} />}>
                    Dashboard
                  </PillLink>
                  <PillLink
                    href="/admin/settings"
                    active={pathname.startsWith("/admin/settings")}
                    icon={<SettingsNavIcon active={pathname.startsWith("/admin/settings")} />}
                  >
                    Settings
                  </PillLink>
                  <PillLink href="/live" active={pathname.startsWith("/live")} icon={<LiveNavIcon active={pathname.startsWith("/live")} />}>
                    Livestream
                  </PillLink>
                </>
              )}
              {profile.role === "staff" && (
                <>
                  <PillLink href="/admin" active={pathname === "/admin"} icon={<AnalyticsNavIcon active={pathname === "/admin"} />}>
                    Analytics
                  </PillLink>
                  <PillLink
                    href="/admin/settings"
                    active={pathname.startsWith("/admin/settings")}
                    icon={<SettingsNavIcon active={pathname.startsWith("/admin/settings")} />}
                  >
                    Settings
                  </PillLink>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center">
              <div className="flex items-center gap-6 px-4 py-2">
                <Link href="/explore" className={linkClass}>
                  Explore
                </Link>
                <Link href="/live" className={linkClass}>
                  Livestream
                </Link>
              </div>
              <Link
                href="/auth/sign-in"
                className="bg-brand-amber px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#111111] transition hover:bg-brand-amberDark"
              >
                Sign in
              </Link>
            </div>
          )}
          {showNavAccountActions && <ThemeToggle />}
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          {showNavAccountActions && <ThemeToggle />}
          {!signedIn && pathname === "/" && (
            <Link
              href="/auth/sign-in"
              className="bg-brand-amber px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#111111] transition hover:bg-brand-amberDark"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
