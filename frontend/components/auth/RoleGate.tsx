"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth, type Profile } from "@/lib/auth/AuthProvider";

export function RoleGate({
  role,
  title,
  body,
  children,
}: {
  role: Profile["role"];
  title: string;
  body: string;
  children?: ReactNode;
}) {
  const { loading, session, profile } = useAuth();

  if (loading || (session && !profile)) {
    return <p className="text-sm text-brand-muted">Loading…</p>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md text-center">
        <Card>
          <h1 className="text-xl font-bold text-brand-blueDark">{title}</h1>
          <p className="mt-2 text-sm text-brand-muted">{body}</p>
          <Link href="/auth/sign-in">
            <Button variant="primary" className="mt-4">
              Sign in
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (profile?.role !== role) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <p className="text-sm text-brand-muted">This page is for {role} accounts.</p>
      </Card>
    );
  }

  return <>{children}</>;
}
