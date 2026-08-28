"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const userId = data.user.id;
      let { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();

      if (!profile) {
        // First sign-in after confirming email - finish creating the profile
        // from what was stashed at signup time.
        const pendingRaw = localStorage.getItem(`guidemate_pending_profile_${email}`);
        const pending = pendingRaw
          ? (JSON.parse(pendingRaw) as { role: "guide" | "tourist"; fullName: string; phone: string | null })
          : { role: "tourist" as const, fullName: email, phone: null };

        const { data: created, error: profileError } = await supabase
          .from("profiles")
          .insert({ id: userId, role: pending.role, full_name: pending.fullName, phone: pending.phone })
          .select("role")
          .single();
        if (profileError) throw profileError;
        localStorage.removeItem(`guidemate_pending_profile_${email}`);
        profile = created;
      }

      router.push(profile?.role === "guide" ? "/guide/dashboard" : "/explore");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-xl font-bold text-brand-blueDark">Sign in to Guidemate</h1>

        <form className="mt-6 flex flex-col gap-3" onSubmit={handleSubmit}>
          <Field label="Email">
            <input required type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <input
              required
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button variant="primary" type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-muted">
          Don&apos;t have an account?{" "}
          <a href="/auth/sign-up" className="font-semibold text-brand-accent">
            Create one
          </a>
        </p>
      </Card>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-brand-blueDark">{label}</span>
      {children}
    </label>
  );
}
