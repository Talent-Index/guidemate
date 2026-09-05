"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
import { SignOutSection } from "@/components/SignOutSection";
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
    <div className="flex flex-col gap-6">
      <div>
        <MobilePageBanner eyebrow="Admin" title="Settings" />
        <div className="hidden md:block">
          <h1 className="text-xl font-bold text-brand-blueDark">Settings</h1>
          <p className="text-sm text-brand-muted">Signed in as {profile.fullName ?? session.user.email}</p>
        </div>
        <p className="mt-3 text-sm text-brand-muted md:hidden">
          Signed in as {profile.fullName ?? session.user.email}
        </p>
      </div>

      <SignOutSection />
    </div>
  );
}
