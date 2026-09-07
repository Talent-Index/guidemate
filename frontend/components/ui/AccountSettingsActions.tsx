"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/lib/auth/AuthProvider";

export function AccountSettingsActions() {
  const router = useRouter();
  const { signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-brand-blueDark">Account</h2>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand-blueDark">Appearance</p>
          <p className="text-xs text-brand-muted">Switch between light and dark mode.</p>
        </div>
        <ThemeToggle />
      </div>
      <div className="mt-4 border-t border-brand-border pt-4">
        <Button variant="secondary" type="button" onClick={() => void handleSignOut()}>
          Sign out
        </Button>
      </div>
    </Card>
  );
}
