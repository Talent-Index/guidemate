"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField, FormShell } from "@/components/ui/FormShell";
import { SignedInRedirect } from "@/components/auth/SignedInRedirect";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { createClient } from "@/lib/supabase/client";
import { homeForRole } from "@/lib/auth/home";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";

const ROLE = "tourist" as const;

export default function SignUpPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleGoogleSignUp() {
    setError(null);
    setLoading(true);
    localStorage.setItem(
      `guidemate_pending_profile_${email || "google"}`,
      JSON.stringify({ fullName: fullName || "User", phone: phone || null })
    );
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: ROLE, full_name: fullName, phone: phone || null } },
      });
      if (signUpError) {
        const message = signUpError.message.toLowerCase();
        if (message.includes("already") || message.includes("registered")) {
          throw new Error("This email already has an account. Sign in instead.");
        }
        throw signUpError;
      }
      if (!data.user) throw new Error("sign up did not return a user");

      if (data.session) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          role: ROLE,
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
            await refreshProfile();
            router.replace(homeForRole(existing.role as "guide" | "tourist" | "admin"));
            return;
          }
          throw profileError;
        }
        await refreshProfile();
        toast("Account created — welcome to Guidemate", "success");
        router.replace(homeForRole(ROLE));
      } else {
        localStorage.setItem(
          `guidemate_pending_profile_${email}`,
          JSON.stringify({ fullName, phone: phone || null })
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
        subtitle="Register as a tourist to book local experiences. Guides apply separately and are vetted before access."
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
          <FormField label="Phone number">
            <input
              className="form-input-light"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254 7XX XXX XXX"
            />
          </FormField>

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-amber py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-blueDark transition hover:bg-brand-amberDark disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-brand-border" />
            <span className="text-xs text-brand-muted">or</span>
            <div className="h-px flex-1 bg-brand-border" />
          </div>

          <GoogleSignInButton onClick={handleGoogleSignUp} disabled={loading} loading={loading} />
        </form>
      </FormShell>
    </SignedInRedirect>
  );
}
