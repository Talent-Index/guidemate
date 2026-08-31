"use client";

import { useState, type FormEvent } from "react";
import { FormField, FormShell } from "@/components/ui/FormShell";
import { createClient } from "@/lib/supabase/client";

export default function WaitlistPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("waitlist").insert({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        interest: interest.trim() || null,
      });
      if (insertError) {
        if (insertError.code === "23505") {
          throw new Error("That email is already on the waitlist.");
        }
        throw insertError;
      }
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <FormShell title="You're on the list">
        <p className="text-center text-sm text-[var(--gm-muted)]">
          Thanks {fullName}. You&apos;re on the waitlist in the admin dashboard. We do not send automated emails
          yet — an admin will reach out when Guidemate is ready.
        </p>
      </FormShell>
    );
  }

  return (
    <FormShell
      title="Join the waitlist"
      subtitle="For travelers and partners who want in before we open more widely."
    >
      <form onSubmit={handleSubmit}>
        <FormField label="Full name *">
          <input required className="form-input-light" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </FormField>
        <FormField label="Email *">
          <input required type="email" className="form-input-light" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField label="What are you interested in?">
          <input
            className="form-input-light"
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            placeholder="Booking trips, partnering as a hotel, watching live..."
          />
        </FormField>
        {error && <p className="mb-4 text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-amber py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-blueDark transition hover:bg-brand-amberDark disabled:opacity-50"
        >
          {loading ? "Joining..." : "Join waitlist"}
        </button>
      </form>
    </FormShell>
  );
}
