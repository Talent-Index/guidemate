"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { FormField, FormShell } from "@/components/ui/FormShell";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const trimmed = email.trim();

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <FormShell
        title="Check your email"
        subtitle={`If ${email.trim()} has a Guidemate account, we sent a link to reset your password.`}
        footer={
          <Link href="/auth/sign-in" className="font-semibold text-brand-accent underline">
            Back to sign in
          </Link>
        }
      >
        <p className="text-sm text-brand-muted">
          Open the link on this device. You will choose a new password, then return to Guidemate signed in.
        </p>
        <p className="mt-4 text-sm text-brand-muted">
          Usually sign in with Google? Use <strong>Continue with Google</strong> on the sign-in page instead.
        </p>
      </FormShell>
    );
  }

  return (
    <FormShell
      title="Reset password"
      subtitle="Enter your email and we will send a link to choose a new password."
      footer={
        <Link href="/auth/sign-in" className="font-semibold text-brand-accent underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit}>
        <FormField label="Email *">
          <input
            required
            type="email"
            className="form-input-light"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </FormField>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-amber py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-blueDark transition hover:bg-brand-amberDark disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </FormShell>
  );
}
