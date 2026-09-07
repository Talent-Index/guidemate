"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField, FormShell } from "@/components/ui/FormShell";
import { createClient } from "@/lib/supabase/client";
import { homeForRole, type AccountRole } from "@/lib/auth/home";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";

export default function SetPasswordPage() {
  const router = useRouter();
  const { session, profile, loading: authLoading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace("/auth/sign-in");
    }
  }, [authLoading, session, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

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

  if (authLoading || !session) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-sm text-brand-muted">Loading…</p>
      </div>
    );
  }

  return (
    <FormShell
      title="Set your password"
      subtitle="Your guide application was approved. Choose a password to finish setting up your account."
    >
      <form onSubmit={handleSubmit}>
        <FormField label="New password *">
          <input
            required
            type="password"
            minLength={6}
            className="form-input-light"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </FormField>
        <FormField label="Confirm password *">
          <input
            required
            type="password"
            minLength={6}
            className="form-input-light"
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
