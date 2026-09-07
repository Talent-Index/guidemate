"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TouristProfileCard } from "@/components/TouristProfileCard";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
import { AccountSettingsActions } from "@/components/ui/AccountSettingsActions";
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
    <div className="flex flex-col gap-6">
      <div>
        <MobilePageBanner eyebrow="Account" title="Settings" />
        <div className="hidden md:block">
          <h1 className="text-xl font-bold text-brand-blueDark">Settings</h1>
          <p className="text-sm text-brand-muted">
            Signed in as {profile.fullName ?? session.user.email}
          </p>
        </div>
        <p className="mt-3 text-sm text-brand-muted md:hidden">
          Signed in as {profile.fullName ?? session.user.email}
        </p>
      </div>

      <TouristProfileCard />

      <Card className="p-4">
        <p className="text-sm font-semibold text-brand-blueDark">Wallet</p>
        <p className="mt-1 text-sm text-brand-muted">
          In-app balance, connected wallets, and payouts live on the wallet page.
        </p>
        <Link href="/wallet">
          <Button variant="primary" className="mt-3">
            Open wallet
          </Button>
        </Link>
      </Card>

      <AccountSettingsActions />
    </div>
  );
}
