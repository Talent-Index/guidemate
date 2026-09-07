"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GuideProfileCard } from "@/components/GuideProfileCard";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";
import { SettingsHelpSection } from "@/components/settings/SettingsHelpSection";
import { SettingsAccountSection } from "@/components/settings/SettingsAccountSection";
import { RoleGate } from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function GuideSettingsPage() {
  const { loading: authLoading, session, profile } = useAuth();

  if (authLoading || (session && !profile)) {
    return <p className="text-sm text-brand-muted">Loading…</p>;
  }

  if (!session || profile?.role !== "guide") {
    return (
      <RoleGate
        role="guide"
        title="Sign in to manage your profile"
        body="Sign in with a guide account to edit settings."
      />
    );
  }

  return (
    <SettingsPageShell subtitle={`Signed in as ${profile.fullName ?? session.user.email}`}>
      <GuideProfileCard />
      <SettingsHelpSection role="guide" />
      <SettingsAccountSection />
    </SettingsPageShell>
  );
}
