"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField, FormShell } from "@/components/ui/FormShell";
import { SignedInRedirect } from "@/components/auth/SignedInRedirect";
import { createClient } from "@/lib/supabase/client";
import { homeForRole, type AccountRole } from "@/lib/auth/home";
import { provisionWallet } from "@/lib/api";

function intendedRole(meta: Record<string, unknown> | undefined, pendingRole?: string): "guide" | "tourist" {
  const fromMeta = meta?.role;
  if (fromMeta === "guide" || fromMeta === "tourist") return fromMeta;
  if (pendingRole === "guide" || pendingRole === "tourist") return pendingRole;
  return "tourist";
}

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
        const pendingRaw = localStorage.getItem(`guidemate_pending_profile_${email}`);
        const pending = pendingRaw
          ? (JSON.parse(pendingRaw) as { role: "guide" | "tourist"; fullName: string; phone: string | null })
          : null;
        const meta = data.user.user_metadata as Record<string, unknown> | undefined;
        const role = intendedRole(meta, pending?.role);
        const fullName =
          (typeof meta?.full_name === "string" && meta.full_name) || pending?.fullName || email;
        const phone =
          (typeof meta?.phone === "string" && meta.phone) || pending?.phone || null;

        const { data: created, error: profileError } = await supabase
          .from("profiles")
          .insert({ id: userId, role, full_name: fullName, phone })
          .select("role")
          .single();
        if (profileError) {
          const { data: existing } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
          if (!existing) throw profileError;
          profile = existing;
        } else {
          profile = created;
        }
        localStorage.removeItem(`guidemate_pending_profile_${email}`);
        if (profile?.role === "guide") {
          await provisionWallet(data.session.access_token);
        }
      }

      router.push(homeForRole((profile?.role ?? "tourist") as AccountRole));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SignedInRedirect>
    <FormShell
      title="Sign in"
      subtitle="Welcome back. You land in the portal for the role this email signed up with."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <a href="/auth/sign-up" className="font-semibold text-brand-accent underline">
            Create one
          </a>
          <br />
          Admin? Use this same form. Your profile must have role <span className="text-[var(--gm-ink)]">admin</span> — there is
          no separate admin password.
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <FormField label="Email *">
          <input required type="email" className="form-input-light" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField label="Password *">
          <input
            required
            type="password"
            className="form-input-light"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-amber py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-blueDark transition hover:bg-brand-amberDark disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </FormShell>
    </SignedInRedirect>
  );
}
