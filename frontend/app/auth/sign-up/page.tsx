"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormField, FormShell } from "@/components/ui/FormShell";
import { createClient } from "@/lib/supabase/client";
import { provisionWallet } from "@/lib/api";

type Role = "tourist" | "guide";

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<Role>(searchParams.get("role") === "guide" ? "guide" : "tourist");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;
      if (!data.user) throw new Error("sign up did not return a user");

      if (data.session) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          role,
          full_name: fullName,
          phone: phone || null,
        });
        if (profileError) throw profileError;
        if (role === "guide") {
          await provisionWallet(data.session.access_token);
        }
        router.push(role === "guide" ? "/guide/dashboard" : "/explore");
      } else {
        // Email confirmation is required - stash the intended profile so
        // /auth/sign-in can finish creating it once they confirm and log in.
        localStorage.setItem(
          `guidemate_pending_profile_${email}`,
          JSON.stringify({ role, fullName, phone: phone || null })
        );
        setNeedsConfirmation(true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (needsConfirmation) {
    return (
      <FormShell title="Check your email">
        <p className="text-center text-sm text-white/70">
          We sent a confirmation link to <strong className="text-white">{email}</strong>. Click it, then come back and
          sign in.
        </p>
      </FormShell>
    );
  }

  return (
    <FormShell
      title="Create your account"
      subtitle="Travelers book in minutes. Guides list once and get paid on completion."
      footer={
        <>
          Already have an account?{" "}
          <a href="/auth/sign-in" className="font-semibold text-white underline">
            Sign in
          </a>
          <br />
          Want to be a vetted guide?{" "}
          <a href="/apply" className="font-semibold text-white underline">
            Apply here
          </a>
        </>
      }
    >
      <div className="mb-8 flex border border-white/15">
        <RoleTab label="I'm a tourist" active={role === "tourist"} onClick={() => setRole("tourist")} />
        <RoleTab label="I'm a guide" active={role === "guide"} onClick={() => setRole("guide")} />
      </div>

      <form onSubmit={handleSubmit}>
        <FormField label="Full name *">
          <input
            required
            className="form-input-dark"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
          />
        </FormField>
        <FormField label="Email *">
          <input
            required
            type="email"
            className="form-input-dark"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </FormField>
        <FormField label="Password *">
          <input
            required
            type="password"
            minLength={6}
            className="form-input-dark"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </FormField>
        <FormField label={role === "guide" ? "M-Pesa phone number *" : "Phone number"}>
          <input
            required={role === "guide"}
            className="form-input-dark"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+254 7XX XXX XXX"
          />
        </FormField>

        {error && <p className="mb-4 text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-indigo py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </FormShell>
  );
}

function RoleTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition ${
        active ? "bg-brand-indigo text-white" : "text-white/60 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
