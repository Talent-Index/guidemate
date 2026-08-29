"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

export function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, user, profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    lastY.current = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      if (y < 32) {
        setHidden(false);
      } else if (y > lastY.current + 6) {
        setHidden(true);
        setMenuOpen(false);
      } else if (y < lastY.current - 6) {
        setHidden(false);
      }
      lastY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    router.push("/");
  }

  const linkClass =
    "text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 transition hover:text-white";
  const mobileLinkClass =
    "block px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-white/90 transition hover:bg-white/10";

  return (
    <header
      className={`fixed top-0 z-50 w-full bg-brand-blueDark/90 backdrop-blur-md transition-transform duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center bg-white px-3 py-1.5" onClick={() => setMenuOpen(false)}>
          <Image src="/logo.png" alt="Guidemate" width={1340} height={526} className="h-6 w-auto sm:h-7" priority />
        </Link>

        <nav className="hidden items-center md:flex">
          {loading ? null : user && profile ? (
            <div className="flex items-center gap-6 pr-4">
              {profile.role === "tourist" && (
                <Link href="/explore" className={linkClass}>
                  Explore
                </Link>
              )}
              {profile.role === "admin" && (
                <Link href="/admin/applications" className={linkClass}>
                  Dashboard
                </Link>
              )}
              <Link href="/live" className={linkClass}>
                Live
              </Link>
              {profile.role !== "admin" && (
                <Link href={profile.role === "guide" ? "/guide/dashboard" : "/tourist/bookings"} className={linkClass}>
                  {profile.role === "guide" ? "Dashboard" : "Bookings"}
                </Link>
              )}
              <button type="button" onClick={handleSignOut} className={linkClass}>
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center">
              <div className="flex items-center gap-6 bg-black/25 px-6 py-3">
                <Link href="/explore" className={linkClass}>
                  Explore
                </Link>
                <Link href="/live" className={linkClass}>
                  Live
                </Link>
              </div>
              <Link
                href="/auth/sign-in"
                className="bg-brand-amber px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-blueDark transition hover:bg-brand-amberDark"
              >
                Sign in
              </Link>
            </div>
          )}
        </nav>

        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center text-white/90 md:hidden"
        >
          {menuOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-white/10 bg-brand-blueDark px-4 pb-4 pt-2 md:hidden">
          {loading ? null : user && profile ? (
            <div className="flex flex-col gap-1">
              {profile.role === "tourist" && (
                <Link href="/explore" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
                  Explore
                </Link>
              )}
              {profile.role === "admin" && (
                <Link href="/admin/applications" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
                  Dashboard
                </Link>
              )}
              <Link href="/live" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
                Live
              </Link>
              {profile.role !== "admin" && (
                <Link
                  href={profile.role === "guide" ? "/guide/dashboard" : "/tourist/bookings"}
                  className={mobileLinkClass}
                  onClick={() => setMenuOpen(false)}
                >
                  {profile.role === "guide" ? "Dashboard" : "Bookings"}
                </Link>
              )}
              <button type="button" onClick={handleSignOut} className={`${mobileLinkClass} text-left text-white/70`}>
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <Link href="/explore" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
                Explore
              </Link>
              <Link href="/live" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
                Live
              </Link>
              <Link
                href="/auth/sign-in"
                className="mt-2 block bg-brand-amber px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-brand-blueDark"
                onClick={() => setMenuOpen(false)}
              >
                Sign in
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
