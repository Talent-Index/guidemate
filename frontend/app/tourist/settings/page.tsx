"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TouristProfileCard } from "@/components/TouristProfileCard";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsHelpSection } from "@/components/settings/SettingsHelpSection";
import { SettingsAccountSection } from "@/components/settings/SettingsAccountSection";
import { RoleGate } from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function TouristSettingsPage() {
  const { loading: authLoading, session, profile } = useAuth();

  if (authLoading || (session && !profile)) {
    return <p className="text-sm text-brand-muted">Loading…</p>;
  }

  if (!session || profile?.role !== "tourist") {
    return (
      <RoleGate
        role="tourist"
        title="Sign in to manage your profile"
        body="Sign in with a tourist account to edit settings."
      />
    );
  }

  return (
    <SettingsPageShell subtitle={`Signed in as ${profile.fullName ?? session.user.email}`}>
      <TouristProfileCard />

      <SettingsSection title="Wallet" description="Pay for tours, top up, and manage payouts on the wallet page.">
        <Link href="/wallet">
          <Button variant="primary">Open wallet</Button>
        </Link>
      </SettingsSection>

      <SettingsHelpSection role="tourist" />
      <SettingsAccountSection />
    </SettingsPageShell>
  );
}
