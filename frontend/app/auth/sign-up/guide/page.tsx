"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField, FormShell } from "@/components/ui/FormShell";
import { SignedInRedirect } from "@/components/auth/SignedInRedirect";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { createClient } from "@/lib/supabase/client";
import { authConfirmUrl } from "@/lib/auth/oauthRedirect";
import { homeForRole } from "@/lib/auth/home";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { registerOpenGuide } from "@/lib/api";
import { storePendingOpenGuideProfile } from "@/lib/auth/openGuideSignup";

export default function GuideSignUpPage() {
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

  async function finishGuideSignup(accessToken: string) {
    await registerOpenGuide(accessToken);
    await refreshProfile();
    toast("Guide account ready — welcome to Guidemate", "success");
    router.replace(homeForRole("guide"));
  }

  async function handleGoogleSignUp() {
    setError(null);
    setLoading(true);
    storePendingOpenGuideProfile({ email: email || "google", fullName: fullName || "Guide", phone: phone || null });
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authConfirmUrl(window.location.origin) },
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
        options: { data: { full_name: fullName, phone: phone || null } },
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
        await finishGuideSignup(data.session.access_token);
      } else {
        storePendingOpenGuideProfile({ email, fullName, phone: phone || null });
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
          We sent a confirmation link to <strong className="text-[var(--gm-ink)]">{email}</strong>. After you confirm,
          sign in and we&apos;ll finish setting up your guide profile.
        </p>
      </FormShell>
    );
  }

  return (
    <SignedInRedirect>
      <FormShell
        title="Create a guide account"
        subtitle="Beta access: list experiences, go live, and test payouts without waiting for TRA vetting. Full licensing apply remains available separately."
        footer={
          <>
            Already have an account?{" "}
            <a href="/auth/sign-in" className="font-semibold text-brand-accent underline">
              Sign in
            </a>
            <br />
            Applying for TRA Class E vetting?{" "}
            <a href="/apply" className="font-semibold text-brand-accent underline">
              Full application
            </a>
            <br />
            Booking as a tourist?{" "}
            <a href="/auth/sign-up" className="font-semibold text-brand-accent underline">
              Tourist sign up
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
            <PasswordInput
              required
              minLength={6}
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
            {loading ? "Creating account..." : "Create guide account"}
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
