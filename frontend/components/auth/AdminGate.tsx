"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canAccessAnalytics, isSuperAdmin } from "@/lib/auth/roles";

export function AnalyticsGate({ children }: { children: ReactNode }) {
  const { loading, session, profile } = useAuth();

  if (loading || (session && !profile)) {
    return <p className="text-sm text-brand-muted">Loading…</p>;
  }

  if (!session || !canAccessAnalytics(profile?.role)) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <p className="text-sm text-brand-muted">Analytics access required.</p>
        <Link href="/auth/sign-in">
          <Button className="mt-4">Sign in</Button>
        </Link>
      </Card>
    );
  }

  return <>{children}</>;
}

export function SuperAdminGate({ children }: { children: ReactNode }) {
  const { loading, session, profile } = useAuth();

  if (loading || (session && !profile)) {
    return <p className="text-sm text-brand-muted">Loading…</p>;
  }

  if (!session || !isSuperAdmin(profile?.role)) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <p className="text-sm text-brand-muted">Super-admin access required.</p>
        <Link href="/auth/sign-in">
          <Button className="mt-4">Sign in</Button>
        </Link>
      </Card>
    );
  }

  return <>{children}</>;
}
