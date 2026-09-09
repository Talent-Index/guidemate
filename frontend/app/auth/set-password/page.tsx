"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField, FormShell } from "@/components/ui/FormShell";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { createClient } from "@/lib/supabase/client";
import { homeForRole, type AccountRole } from "@/lib/auth/home";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";

export default function SetPasswordPage() {
  const router = useRouter();
  const { session, profile, loading: authLoading, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guideEmail = session?.user.email ?? "";
  const isApprovedGuide = profile?.role === "guide" && profile.isVetted;
  const waitingForProfile = Boolean(session && !profile);
  const wrongAccount = !authLoading && session && profile && !isApprovedGuide;

  useEffect(() => {
    if (authLoading || waitingForProfile) return;
    if (!session) {
      router.replace("/auth/sign-in");
    }
  }, [authLoading, waitingForProfile, session, router]);

  async function handleSignOutAndRetry() {
    await signOut();
    router.replace("/auth/sign-in");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isApprovedGuide) {
      setError("This page is only for approved guides setting up their account.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await refreshProfile();
      toast("Password set — welcome to Guidemate", "success");
      router.replace(homeForRole((profile?.role ?? "guide") as AccountRole));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || !session || waitingForProfile) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-sm text-brand-muted">Loading…</p>
      </div>
    );
  }

  if (wrongAccount) {
    return (
      <FormShell
        title="Wrong account"
        subtitle={`You are signed in as ${guideEmail}, but this invite link is for an approved guide account.`}
      >
        <p className="mb-4 text-sm text-brand-muted">
          Sign out, then open the invitation email again on the device where you want to set the guide password.
        </p>
        <button
          type="button"
          onClick={() => void handleSignOutAndRetry()}
          className="w-full bg-brand-amber py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-blueDark transition hover:bg-brand-amberDark"
        >
          Sign out and try again
        </button>
      </FormShell>
    );
  }

  return (
    <FormShell
      title="Set your password"
      subtitle={
        guideEmail
          ? `Your guide application was approved. Choose a password for ${guideEmail}.`
          : "Your guide application was approved. Choose a password to finish setting up your account."
      }
    >
      <form onSubmit={handleSubmit}>
        <FormField label="New password *">
          <PasswordInput
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </FormField>
        <FormField label="Confirm password *">
          <PasswordInput
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </FormField>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-amber py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-blueDark transition hover:bg-brand-amberDark disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save password"}
        </button>
      </form>
    </FormShell>
  );
}
