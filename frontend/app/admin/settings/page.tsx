"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";
import { SettingsHelpSection } from "@/components/settings/SettingsHelpSection";
import { SettingsAccountSection } from "@/components/settings/SettingsAccountSection";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function AdminSettingsPage() {
  const { loading: authLoading, session, profile } = useAuth();

  if (authLoading) return null;

  if (!session || profile?.role !== "admin") {
    return (
      <Card className="mx-auto max-w-md text-center">
        <p className="text-sm text-brand-muted">Admin access required.</p>
        <Link href="/auth/sign-in">
          <Button className="mt-4">Sign in</Button>
        </Link>
      </Card>
    );
  }

  return (
    <SettingsPageShell subtitle={`Signed in as ${profile.fullName ?? session.user.email}`}>
      <SettingsHelpSection role="admin" />
      <SettingsAccountSection />
    </SettingsPageShell>
  );
}
