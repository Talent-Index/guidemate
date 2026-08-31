"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormField, FormShell } from "@/components/ui/FormShell";
import { SignedInRedirect } from "@/components/auth/SignedInRedirect";
import { createClient } from "@/lib/supabase/client";
import { homeForRole } from "@/lib/auth/home";
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (role === "guide" && !acceptedTerms) {
      setError("Agree to the guide terms to continue.");
      return;
    }
    setError(null);
    setLoading(true);

    const supabase = createClient();

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role, full_name: fullName, phone: phone || null } },
      });
      if (signUpError) {
        const message = signUpError.message.toLowerCase();
        if (message.includes("already") || message.includes("registered")) {
          throw new Error("This email already has an account. Sign in — the role cannot be changed.");
        }
        throw signUpError;
      }
      if (!data.user) throw new Error("sign up did not return a user");

      if (data.session) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          role,
          full_name: fullName,
          phone: phone || null,
        });
        if (profileError) {
          const { data: existing } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .maybeSingle();
          if (existing) {
            router.push(homeForRole(existing.role as "guide" | "tourist" | "admin"));
            return;
          }
          throw profileError;
        }
        if (role === "guide") {
          await provisionWallet(data.session.access_token);
        }
        router.push(homeForRole(role));
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
        <p className="text-center text-sm text-[var(--gm-muted)]">
          We sent a confirmation link to <strong className="text-[var(--gm-ink)]">{email}</strong>. Click it, then come back and
          sign in.
        </p>
      </FormShell>
    );
  }

  return (
    <SignedInRedirect>
    <FormShell
      title="Create your account"
      subtitle="Pick tourist or guide once. That role stays on this email."
      footer={
        <>
          Already have an account?{" "}
          <a href="/auth/sign-in" className="font-semibold text-brand-accent underline">
            Sign in
          </a>
          <br />
          Want to be a vetted guide?{" "}
          <a href="/apply" className="font-semibold text-brand-accent underline">
            Apply here
          </a>
        </>
      }
    >
      <div className="mb-8 flex border border-[var(--gm-border)]">
        <RoleTab label="I'm a tourist" active={role === "tourist"} onClick={() => setRole("tourist")} />
        <RoleTab label="I'm a guide" active={role === "guide"} onClick={() => setRole("guide")} />
      </div>

      <form onSubmit={handleSubmit}>
        <FormField label="Full name *">
          <input
            required
            className="form-input-light"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
          />
        </FormField>
        <FormField label="Email *">
          <input
            required
            type="email"
            className="form-input-light"
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
            className="form-input-light"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </FormField>
        <FormField label={role === "guide" ? "M-Pesa phone number *" : "Phone number"}>
          <input
            required={role === "guide"}
            className="form-input-light"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+254 7XX XXX XXX"
          />
        </FormField>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {role === "guide" && (
          <label className="mb-6 flex items-start gap-3 text-sm text-[var(--gm-muted)]">
            <input
              type="checkbox"
              required
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1"
            />
            <span>
              I agree to the{" "}
              <a href="/guide/terms" className="font-semibold text-brand-accent underline" target="_blank" rel="noreferrer">
                guide terms
              </a>
              : the platform takes 15% of my rate, and tourist cancellations carry a 20% inconvenience fee.
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={loading || (role === "guide" && !acceptedTerms)}
          className="w-full bg-brand-amber py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-blueDark transition hover:bg-brand-amberDark disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </FormShell>
    </SignedInRedirect>
  );
}

function RoleTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition ${
        active ? "bg-brand-blue text-white" : "text-[var(--gm-muted)] hover:text-[var(--gm-ink)]"
      }`}
    >
      {label}
    </button>
  );
}
