"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

export function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, user, profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Belt-and-suspenders: also collapse the mobile panel on any route change
  // (e.g. browser back/forward), not just direct link clicks.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    router.push("/");
  }

  const linkClass = "text-sm font-medium text-white/85 transition hover:text-white";
  const mobileLinkClass = "block rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/10";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-blue/95 shadow-md backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center rounded-lg bg-white px-3 py-1.5 shadow-sm" onClick={() => setMenuOpen(false)}>
          <Image src="/logo.png" alt="Guidemate" width={1340} height={526} className="h-6 w-auto sm:h-7" priority />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {loading ? null : user && profile ? (
            <>
              {profile.role === "tourist" && (
                <Link href="/explore" className={linkClass}>
                  Explore
                </Link>
              )}
              <Link href={profile.role === "guide" ? "/guide/dashboard" : "/tourist/bookings"} className={linkClass}>
                {profile.role === "guide" ? "My dashboard" : "My bookings"}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-sm font-medium text-white/70 underline-offset-2 hover:text-white hover:underline"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/explore" className={linkClass}>
                Explore
              </Link>
              <Link href="/concierge" className={linkClass}>
                Concierge
              </Link>
              <Link href="/auth/sign-in" className={linkClass}>
                Sign in
              </Link>
              <Link
                href="/auth/sign-up"
                className="rounded-full bg-brand-amber px-4 py-2 text-sm font-semibold text-brand-blueDark transition hover:bg-brand-amberDark"
              >
                Get started
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu toggle */}
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/90 transition hover:bg-white/10 md:hidden"
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

      {/* Mobile nav panel */}
      {menuOpen && (
        <nav className="border-t border-white/10 bg-brand-blue/95 px-4 pb-4 pt-2 md:hidden">
          {loading ? null : user && profile ? (
            <div className="flex flex-col gap-1">
              {profile.role === "tourist" && (
                <Link href="/explore" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
                  Explore
                </Link>
              )}
              <Link
                href={profile.role === "guide" ? "/guide/dashboard" : "/tourist/bookings"}
                className={mobileLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                {profile.role === "guide" ? "My dashboard" : "My bookings"}
              </Link>
              <button type="button" onClick={handleSignOut} className={`${mobileLinkClass} text-left text-white/70`}>
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <Link href="/explore" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
                Explore
              </Link>
              <Link href="/concierge" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
                Concierge
              </Link>
              <Link href="/auth/sign-in" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
                Sign in
              </Link>
              <Link
                href="/auth/sign-up"
                className="mt-1 block rounded-full bg-brand-amber px-4 py-2.5 text-center text-sm font-semibold text-brand-blueDark transition hover:bg-brand-amberDark"
                onClick={() => setMenuOpen(false)}
              >
                Get started
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
