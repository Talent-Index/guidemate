"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

export function NavBar() {
  const router = useRouter();
  const { loading, user, profile, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-blue/95 shadow-md backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-amber text-sm text-brand-blueDark">
            🧭
          </span>
          Guidemate
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/explore" className="text-sm font-medium text-white/85 transition hover:text-white">
            Explore
          </Link>
          <Link href="/concierge" className="text-sm font-medium text-white/85 transition hover:text-white">
            Concierge
          </Link>

          {loading ? null : user && profile ? (
            <>
              <Link
                href={profile.role === "guide" ? "/guide/dashboard" : "/tourist/bookings"}
                className="text-sm font-medium text-white/85 transition hover:text-white"
              >
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
              <Link href="/auth/sign-in" className="text-sm font-medium text-white/85 transition hover:text-white">
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
      </div>
    </header>
  );
}
