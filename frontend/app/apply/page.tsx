"use client";

import { useState, type FormEvent } from "react";
import { FormField, FormShell } from "@/components/ui/FormShell";
import { createClient } from "@/lib/supabase/client";

async function uploadGuideDoc(supabase: ReturnType<typeof createClient>, file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${crypto.randomUUID()}/${safeName}`;
  const { error: uploadError } = await supabase.storage.from("guide-proofs").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) throw uploadError;
  return path;
}

export default function ApplyPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [location, setLocation] = useState("");
  const [experiencePitch, setExperiencePitch] = useState("");
  const [portfolioLinks, setPortfolioLinks] = useState("");
  const [refereeName, setRefereeName] = useState("");
  const [refereePhone, setRefereePhone] = useState("");
  const [refereeEmail, setRefereeEmail] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    try {
      const [cvPath, proofOfWorkPath] = await Promise.all([
        cvFile ? uploadGuideDoc(supabase, cvFile) : Promise.resolve(null),
        proofFile ? uploadGuideDoc(supabase, proofFile) : Promise.resolve(null),
      ]);

      const { error: insertError } = await supabase.from("guide_applications").insert({
        full_name: fullName,
        email,
        phone,
        id_number: idNumber,
        location,
        experience_pitch: experiencePitch,
        portfolio_links: portfolioLinks
          .split(",")
          .map((link) => link.trim())
          .filter(Boolean),
        cv_path: cvPath,
        proof_of_work_path: proofOfWorkPath,
        referee_name: refereeName,
        referee_phone: refereePhone,
        referee_email: refereeEmail.trim() || null,
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

  const fileInputClass =
    "block w-full text-sm text-[var(--gm-muted)] file:mr-3 file:border-0 file:bg-brand-amber file:px-3 file:py-1.5 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-brand-blueDark";

  return (
    <FormShell
      title="Apply as a guide"
      subtitle="Tell us who you are, share your CV, and name someone who can vouch for you. Approved guides get a custodial payout wallet and can list experiences."
      footer={
        <>
          Already approved?{" "}
          <a href="/auth/sign-up?role=guide" className="font-semibold text-brand-accent underline">
            Register as a guide
          </a>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <FormField label="Full name *">
          <input required className="form-input-light" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </FormField>
        <FormField label="National ID / passport number *">
          <input
            required
            className="form-input-light"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="e.g. 12345678"
            inputMode="numeric"
            autoComplete="off"
          />
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
        <FormField label="CV (PDF or Word) *">
          <input
            required
            type="file"
            accept="application/pdf,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx"
            onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
            className={fileInputClass}
          />
          <p className="mt-1 text-xs text-brand-muted">Upload your résumé or guide profile document.</p>
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
            className={fileInputClass}
          />
        </FormField>

        <div className="mb-6 rounded-2xl border border-brand-border bg-brand-bg/40 p-4">
          <p className="text-sm font-semibold text-brand-blueDark">Referee who can vouch for you</p>
          <p className="mt-1 text-xs text-brand-muted">
            Someone we can contact — a past employer, tourism partner, or community leader who knows your work.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FormField label="Referee full name *">
              <input
                required
                className="form-input-light"
                value={refereeName}
                onChange={(e) => setRefereeName(e.target.value)}
                placeholder="Jane Doe"
              />
            </FormField>
            <FormField label="Referee phone *">
              <input
                required
                className="form-input-light"
                value={refereePhone}
                onChange={(e) => setRefereePhone(e.target.value)}
                placeholder="+254 7XX XXX XXX"
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Referee email (optional)">
                <input
                  type="email"
                  className="form-input-light"
                  value={refereeEmail}
                  onChange={(e) => setRefereeEmail(e.target.value)}
                  placeholder="referee@example.com"
                />
              </FormField>
            </div>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

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
            : Guidemate takes 15% of my listed rate, and if a tourist cancels, a 20% inconvenience fee applies so
            my time is respected.
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !acceptedTerms}
          className="w-full bg-brand-amber py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-blueDark transition hover:bg-brand-amberDark disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit application"}
        </button>
      </form>
    </FormShell>
  );
}
