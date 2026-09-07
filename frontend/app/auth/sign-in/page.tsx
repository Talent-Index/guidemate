"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField, FormShell } from "@/components/ui/FormShell";
import { SignedInRedirect } from "@/components/auth/SignedInRedirect";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { createClient } from "@/lib/supabase/client";
import { homeForRole, type AccountRole } from "@/lib/auth/home";
import { provisionWallet } from "@/lib/api";
import { ensureTouristProfile } from "@/lib/auth/ensureProfile";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";

export default function SignInPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
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
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const userId = data.user.id;
      const profile = await ensureTouristProfile(
        supabase,
        userId,
        email,
        data.user.user_metadata as Record<string, unknown>
      );
      if (profile?.role === "guide") {
        await provisionWallet(data.session.access_token);
      }
      await refreshProfile();
      toast("Signed in successfully", "success");
      router.replace(homeForRole((profile?.role ?? "tourist") as AccountRole));
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SignedInRedirect>
      <FormShell
        title="Sign in"
        subtitle="Tourists and approved guides sign in here. Guides receive an email invite after vetting."
        footer={
          <>
            Don&apos;t have an account?{" "}
            <a href="/auth/sign-up" className="font-semibold text-brand-accent underline">
              Register as a tourist
            </a>
            <br />
            Want to guide?{" "}
            <a href="/apply" className="font-semibold text-brand-accent underline">
              Apply here
            </a>
            <br />
            Admin? Use this same form. Your profile must have role{" "}
            <span className="text-[var(--gm-ink)]">admin</span> — there is no separate admin password.
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

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-brand-border" />
            <span className="text-xs text-brand-muted">or</span>
            <div className="h-px flex-1 bg-brand-border" />
          </div>

          <GoogleSignInButton onClick={handleGoogleSignIn} disabled={loading} loading={loading} />
        </form>
      </FormShell>
    </SignedInRedirect>
  );
}
