"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";

export function SignOutSection() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  async function handleSignOut() {
    try {
      await signOut();
      toast("Signed out successfully", "success");
      router.push("/");
    } catch (err) {
      toast((err as Error).message || "Could not sign out", "error");
    }
  }

  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-brand-muted">Account</h2>
      <p className="mt-2 text-sm text-brand-muted">Sign out of Guidemate on this device.</p>
      <Button variant="secondary" className="mt-4" onClick={() => void handleSignOut()}>
        Sign out
      </Button>
    </Card>
  );
}
