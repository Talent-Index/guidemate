"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TouristProfileCard } from "@/components/TouristProfileCard";
import { WalletPanel } from "@/components/WalletPanel";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
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

      {session && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-brand-muted">Wallet</h2>
          <WalletPanel accessToken={session.access_token} />
          <Card className="p-4">
            <p className="text-sm font-semibold text-brand-blueDark">External crypto wallet</p>
            <p className="mt-1 text-xs text-brand-muted">Connect MetaMask or another EVM wallet to pay on-chain.</p>
            <div className="mt-3">
              <WalletConnectButton />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
