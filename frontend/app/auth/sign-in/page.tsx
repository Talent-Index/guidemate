"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField, FormShell } from "@/components/ui/FormShell";
import { createClient } from "@/lib/supabase/client";
import { provisionWallet } from "@/lib/api";

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
        if (created?.role === "guide") {
          await provisionWallet(data.session.access_token);
        }
      }

      if (profile?.role === "admin") {
        router.push("/admin/applications");
      } else if (profile?.role === "guide") {
        router.push("/guide/dashboard");
      } else {
        router.push("/explore");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormShell
      title="Sign in"
      subtitle="Welcome back to Guidemate."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <a href="/auth/sign-up" className="font-semibold text-white underline">
            Create one
          </a>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <FormField label="Email *">
          <input required type="email" className="form-input-dark" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField label="Password *">
          <input
            required
            type="password"
            className="form-input-dark"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>

        {error && <p className="mb-4 text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-amber py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-blueDark transition hover:bg-brand-amberDark disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </FormShell>
  );
}
