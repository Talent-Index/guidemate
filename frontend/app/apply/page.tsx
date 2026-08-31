"use client";

import { useState, type FormEvent } from "react";
import { FormField, FormShell } from "@/components/ui/FormShell";
import { createClient } from "@/lib/supabase/client";

export default function ApplyPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [experiencePitch, setExperiencePitch] = useState("");
  const [portfolioLinks, setPortfolioLinks] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    try {
      let proofOfWorkPath: string | null = null;
      if (proofFile) {
        const safeName = proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        proofOfWorkPath = `${crypto.randomUUID()}/${safeName}`;
        const { error: uploadError } = await supabase.storage.from("guide-proofs").upload(proofOfWorkPath, proofFile, {
          cacheControl: "3600",
          upsert: false,
        });
        if (uploadError) throw uploadError;
      }

      const { error: insertError } = await supabase.from("guide_applications").insert({
        full_name: fullName,
        email,
        phone,
        location,
        experience_pitch: experiencePitch,
        portfolio_links: portfolioLinks
          .split(",")
          .map((link) => link.trim())
          .filter(Boolean),
        proof_of_work_path: proofOfWorkPath,
      });
      if (insertError) throw insertError;
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <FormShell title="Application received">
        <p className="text-center text-sm text-[var(--gm-muted)]">
          Thanks {fullName}. Your application is saved on the Guidemate admin dashboard. An admin will review it
          there — we do not send automated emails yet. If you are approved, they will invite you to sign in as a
          guide.
        </p>
      </FormShell>
    );
  }

  return (
    <FormShell
      title="Apply as a guide"
      subtitle="Tell us who you are and what you want to host. Approved guides get a custodial payout wallet and can list experiences."
      footer={
        <>
          Just want to try the demo?{" "}
          <a href="/auth/sign-up?role=guide" className="font-semibold text-brand-accent underline">
            Instant guide sign-up
          </a>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <FormField label="Full name *">
          <input required className="form-input-light" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </FormField>
        <FormField label="Email *">
          <input required type="email" className="form-input-light" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField label="Phone *">
          <input
            required
            className="form-input-light"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+254 7XX XXX XXX"
          />
        </FormField>
        <FormField label="Location *">
          <input
            required
            className="form-input-light"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Nairobi, Kenya"
          />
        </FormField>
        <FormField label="Experience you want to bring *">
          <textarea
            required
            className="form-input-light resize-none"
            rows={3}
            value={experiencePitch}
            onChange={(e) => setExperiencePitch(e.target.value)}
            placeholder="Street food crawls in the CBD..."
          />
        </FormField>
        <FormField label="Portfolio / proof links">
          <input
            className="form-input-light"
            value={portfolioLinks}
            onChange={(e) => setPortfolioLinks(e.target.value)}
            placeholder="Instagram, Tripadvisor..."
          />
        </FormField>
        <FormField label="Proof of work (photo or PDF)">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-[var(--gm-muted)] file:mr-3 file:border-0 file:bg-brand-amber file:px-3 file:py-1.5 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-brand-blueDark"
          />
        </FormField>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-amber py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-blueDark transition hover:bg-brand-amberDark disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit application"}
        </button>
      </form>
    </FormShell>
  );
}
