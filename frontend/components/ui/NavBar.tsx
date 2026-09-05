"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { homeForRole } from "@/lib/auth/home";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function NavBar() {
  const pathname = usePathname();
  const { loading, user, profile } = useAuth();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
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
  }, []);

  const linkClass =
    "text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-800 transition hover:text-black dark:text-white dark:hover:text-white";

  const settingsHref =
    profile?.role === "guide"
      ? "/guide/dashboard#settings"
      : profile?.role === "tourist"
        ? "/tourist/settings"
        : profile?.role === "admin"
          ? "/admin#account"
          : null;

  return (
    <header
      className={`fixed top-0 z-50 w-full border-b border-[var(--gm-border)] bg-[var(--gm-nav)]/90 backdrop-blur-md transition-transform duration-300 ${
        hidden ? "md:-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
        <Link href={profile ? homeForRole(profile.role) : "/"} className="flex items-center border border-[var(--gm-border)] bg-[#ffffff] px-3 py-1.5 dark:bg-[#000000]">
          <BrandLogo className="h-6 w-auto sm:h-7" priority />
        </Link>

        <nav className="hidden items-center gap-3 md:flex">
          {loading ? null : user && profile ? (
            <div className="flex items-center gap-6 pr-2">
              {profile.role === "tourist" && (
                <Link href="/explore" className={linkClass}>
                  Explore
                </Link>
              )}
              {profile.role === "admin" && (
                <>
                  <Link href="/admin" className={linkClass}>
                    Analytics
                  </Link>
                  <Link href="/admin/applications" className={linkClass}>
                    Dashboard
                  </Link>
                </>
              )}
              <Link href="/live" className={linkClass}>
                Live
              </Link>
              {profile.role !== "admin" && (
                <Link href={profile.role === "guide" ? "/guide/dashboard" : "/tourist/bookings"} className={linkClass}>
                  {profile.role === "guide" ? "Dashboard" : "Bookings"}
                </Link>
              )}
              {profile.role !== "admin" && (
                <Link href="/chat" className={linkClass}>
                  Messages
                </Link>
              )}
              {settingsHref && (
                <Link href={settingsHref} className={linkClass}>
                  Settings
                </Link>
              )}
            </div>
          ) : (
            <div className="flex items-center">
              <div className="flex items-center gap-6 px-4 py-2">
                <Link href="/explore" className={linkClass}>
                  Explore
                </Link>
                <Link href="/live" className={linkClass}>
                  Live
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
          <ThemeToggle />
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          {user && profile && settingsHref ? (
            <Link
              href={settingsHref}
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-800 dark:text-white"
            >
              Settings
            </Link>
          ) : pathname === "/" ? (
            <Link
              href="/auth/sign-in"
              className="bg-brand-amber px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#111111]"
            >
              Sign in
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
