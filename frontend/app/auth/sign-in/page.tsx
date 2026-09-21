"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormField, FormShell } from "@/components/ui/FormShell";
import { SignedInRedirect } from "@/components/auth/SignedInRedirect";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { createClient } from "@/lib/supabase/client";
import { authConfirmUrl } from "@/lib/auth/oauthRedirect";
import { homeForRole, type AccountRole } from "@/lib/auth/home";
import { consumeAuthReturnTo, storeAuthReturnTo } from "@/lib/auth/returnTo";
import { provisionWallet, registerOpenGuide } from "@/lib/api";
import { ensureTouristProfile } from "@/lib/auth/ensureProfile";
import { readPendingOpenGuideProfile, clearPendingOpenGuideProfile } from "@/lib/auth/openGuideSignup";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";

function friendlySignInError(message: string): string {
  if (message.toLowerCase().includes("invalid login credentials")) {
    return "Invalid email or password. If you usually sign in with Google, tap Continue with Google below.";
  }
  return message;
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshProfile } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    storeAuthReturnTo(searchParams.get("returnTo"));
  }, [searchParams]);

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authConfirmUrl(window.location.origin) },
    });
    if (oauthError) {
      setError(oauthError.message);
      toast(oauthError.message, "error");
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    try {
      const trimmedEmail = email.trim();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signInError) throw signInError;

      const userId = data.user.id;
      const pendingOpenGuide = readPendingOpenGuideProfile(trimmedEmail);
      let profile: { role: string } | null;
      if (pendingOpenGuide) {
        await registerOpenGuide(data.session.access_token);
        clearPendingOpenGuideProfile(trimmedEmail);
        profile = { role: "guide" };
      } else {
        profile = await ensureTouristProfile(
          supabase,
          userId,
          trimmedEmail,
          data.user.user_metadata as Record<string, unknown>
        );
      }
      if (profile?.role === "guide") {
        await provisionWallet(data.session.access_token);
      }
      await refreshProfile();
      toast("Signed in successfully", "success");
      const returnTo = consumeAuthReturnTo();
      router.replace(returnTo ?? homeForRole((profile?.role ?? "tourist") as AccountRole));
    } catch (err) {
      const message = friendlySignInError((err as Error).message);
      setError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  const returnToParam = searchParams.get("returnTo");
  const signUpHref = returnToParam
    ? `/auth/sign-up?returnTo=${encodeURIComponent(returnToParam)}`
    : "/auth/sign-up";

  return (
    <SignedInRedirect>
      <FormShell
        title="Sign in"
        subtitle="Tourists and guides sign in here. New guides can create a beta account without waiting for vetting."
        footer={
          <>
            Don&apos;t have an account?{" "}
            <a href={signUpHref} className="font-semibold text-brand-accent underline">
              Register as a tourist
            </a>
            {" · "}
            <a href="/auth/sign-up/guide" className="font-semibold text-brand-accent underline">
              Sign up as a guide
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
          <FormField label="Email *">
            <input required type="email" className="form-input-light" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField label="Password *">
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
            <div className="mt-2 text-right">
              <a href="/auth/forgot-password" className="text-xs font-semibold text-brand-accent hover:underline">
                Forgot password?
              </a>
            </div>
          </FormField>

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-amber py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-blueDark transition hover:bg-brand-amberDark disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-brand-border" />
            <span className="text-xs text-brand-muted">or</span>
            <div className="h-px flex-1 bg-brand-border" />
          </div>

          <GoogleSignInButton onClick={handleGoogleSignIn} disabled={loading} loading={loading} />
          <p className="mt-3 text-center text-xs text-brand-muted">
            Signed in with Google before? Use Continue with Google, no password needed.
          </p>
        </form>
      </FormShell>
    </SignedInRedirect>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-brand-muted">Loading…</p>}>
      <SignInForm />
    </Suspense>
  );
}
