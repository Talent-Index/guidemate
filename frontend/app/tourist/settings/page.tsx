"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TouristProfileCard } from "@/components/TouristProfileCard";
import { WalletPanel } from "@/components/WalletPanel";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsHelpSection } from "@/components/settings/SettingsHelpSection";
import { SettingsAccountSection } from "@/components/settings/SettingsAccountSection";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function TouristSettingsPage() {
  const { loading: authLoading, session, profile } = useAuth();

  if (authLoading) return null;

  if (!session) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <h1 className="text-xl font-bold text-brand-blueDark">Sign in to manage your profile</h1>
        <Link href="/auth/sign-in">
          <Button className="mt-4">Sign in</Button>
        </Link>
      </Card>
    );
  }

  if (profile?.role !== "tourist") {
    return (
      <Card className="mx-auto max-w-md text-center">
        <p className="text-sm text-brand-muted">This page is for tourist accounts.</p>
      </Card>
    );
  }

  return (
    <SettingsPageShell subtitle={`Signed in as ${profile.fullName ?? session.user.email}`}>
      <TouristProfileCard />

      <SettingsSection title="Wallet" description="Pay for tours and top up with M-Pesa or crypto.">
        <WalletPanel accessToken={session.access_token} />
        <div className="mt-4 border-t border-brand-border pt-4">
          <p className="text-sm font-semibold text-brand-blueDark">External crypto wallet</p>
          <p className="mt-1 text-xs text-brand-muted">Connect MetaMask or another EVM wallet to pay on-chain.</p>
          <div className="mt-3">
            <WalletConnectButton />
          </div>
        </div>
      </SettingsSection>

      <SettingsHelpSection role="tourist" />
      <SettingsAccountSection />
    </SettingsPageShell>
  );
}
