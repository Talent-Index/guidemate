"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { homeForRole } from "@/lib/auth/home";

/** Hides marketing/auth screens once a session + role profile is loaded. */
export function SignedInRedirect({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { loading, profile } = useAuth();

  useEffect(() => {
    if (!loading && profile) {
      router.replace(homeForRole(profile.role));
    }
  }, [loading, profile, router]);

  if (loading || profile) return null;
  return <>{children}</>;
}
