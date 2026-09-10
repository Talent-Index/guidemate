"use client";

import { useState, type FormEvent } from "react";
import { submitGuideApplication, type GuideApplicationFilePayload } from "@/lib/api";

async function fileToPayload(file: File): Promise<GuideApplicationFilePayload> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error(`Could not read ${file.name}.`));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });

  return {
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    base64,
  };
}

function friendlyApplyError(message: string): string {
  if (message === "Failed to fetch") {
    return "Could not reach the server. Check your connection and try again.";
  }
  return message;
}

const REQUIRED_DOCUMENTS = [
  {
    title: "National ID or passport",
    detail: "You'll enter your ID number — have the document nearby for reference.",
  },
  {
    title: "CV or résumé",
    detail: "PDF or Word file showing your guiding or tourism experience.",
  },
  {
    title: "Referee details",
    detail: "Name and phone of someone who can vouch for you (employer, partner, or community leader).",
  },
] as const;

const OPTIONAL_DOCUMENTS = [
  {
    title: "Proof of work",
    detail: "Photo or PDF of past tours, certificates, or client reviews.",
  },
  {
    title: "Portfolio links",
    detail: "Instagram, TripAdvisor, website, or similar — optional but helpful.",
  },
] as const;

const STEPS = [
  {
    id: "prepare",
    title: "Before you begin",
    hint: "Gather these items so you can finish in one sitting — about 5 minutes.",
  },
  {
    id: "intro",
    title: "Become a Guidemate guide",
    hint: "Approved guides get a payout wallet and can list experiences on the platform.",
  },
  {
    id: "name",
    title: "What's your full name?",
    hint: "As it appears on your ID or passport.",
  },
  {
    id: "id",
    title: "National ID or passport number",
    hint: "We use this for vetting only.",
  },
  {
    id: "contact",
    title: "How can we reach you?",
    hint: "We'll email you if you're approved.",
  },
  {
    id: "location",
    title: "Where are you based?",
    hint: "City or area you guide in most often.",
  },
  {
    id: "experience",
    title: "What experience do you want to bring?",
    hint: "Describe the tours or experiences you'd love to host.",
  },
  {
    id: "portfolio",
    title: "Share your work (optional)",
    hint: "Instagram, TripAdvisor, website — comma-separated links.",
  },
  {
    id: "cv",
    title: "Upload your CV",
    hint: "PDF or Word document.",
  },
  {
    id: "proof",
    title: "Proof of work (optional)",
    hint: "Photo or PDF showing past guiding work.",
  },
  {
    id: "referee",
    title: "Someone who can vouch for you",
    hint: "A past employer, tourism partner, or community leader.",
  },
  {
    id: "terms",
    title: "Almost done",
    hint: "Review and submit your application.",
  },
] as const;

const fileInputClass =
  "block w-full text-sm text-[var(--gm-muted)] file:mr-3 file:border-0 file:bg-brand-amber file:px-3 file:py-1.5 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-brand-blueDark";

export function GuideApplyWizard() {
  const [step, setStep] = useState(0);
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
  const [notReadyYet, setNotReadyYet] = useState(false);

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;
  const isLast = step === STEPS.length - 1;

  function validateStep(): string | null {
    switch (current.id) {
      case "name":
        return fullName.trim() ? null : "Enter your full name.";
      case "id":
        return idNumber.trim() ? null : "Enter your ID or passport number.";
      case "contact":
        if (!email.trim()) return "Enter your email.";
        if (!phone.trim()) return "Enter your phone number.";
        return null;
      case "location":
        return location.trim() ? null : "Enter your location.";
      case "experience":
        return experiencePitch.trim() ? null : "Tell us about your experience.";
      case "cv":
        return cvFile ? null : "Upload your CV to continue.";
      case "referee":
        if (!refereeName.trim()) return "Enter your referee's name.";
        if (!refereePhone.trim()) return "Enter your referee's phone.";
        return null;
      case "terms":
        return acceptedTerms ? null : "Accept the guide terms to submit.";
      default:
        return null;
    }
  }

  function goNext() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    if (isLast) {
      void handleSubmit();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setNotReadyYet(false);
    setStep((s) => Math.max(s - 1, 0));
  }

  function handlePrepareYes() {
    setError(null);
    setNotReadyYet(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handlePrepareNo() {
    setError(null);
    setNotReadyYet(true);
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!cvFile) {
      setError("Upload your CV to continue.");
      setStep(STEPS.findIndex((s) => s.id === "cv"));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const [cv, proof] = await Promise.all([
        fileToPayload(cvFile),
        proofFile ? fileToPayload(proofFile) : Promise.resolve(null),
      ]);

      await submitGuideApplication({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        idNumber: idNumber.trim(),
        location: location.trim(),
        experiencePitch: experiencePitch.trim(),
        portfolioLinks: portfolioLinks
          .split(",")
          .map((link) => link.trim())
          .filter(Boolean),
        refereeName: refereeName.trim(),
        refereePhone: refereePhone.trim(),
        refereeEmail: refereeEmail.trim() || null,
        cv,
        proof,
      });

      setSubmitted(true);
    } catch (err) {
      setError(friendlyApplyError((err as Error).message));
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6 py-12">
        <div className="rounded-2xl border border-brand-border bg-white p-8 text-center shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">Application received</p>
          <h1 className="mt-3 text-2xl font-bold text-brand-blueDark">Thanks, {fullName}!</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-brand-muted">
            Your application is on the Guidemate admin dashboard. If you are approved, you will receive an email with
            a link to set your password and sign in to your guide dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col px-6 py-8">
      <div className="mb-8">
        <div className="h-1.5 overflow-hidden rounded-full bg-brand-border">
          <div className="h-full rounded-full bg-brand-accent transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand-muted">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>

      <div className="flex flex-1 flex-col">
        <h1 className="text-2xl font-bold leading-tight text-brand-blueDark sm:text-3xl">{current.title}</h1>
        <p className="mt-2 text-sm text-brand-muted">{current.hint}</p>

        <form
          className="mt-8 flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (current.id === "prepare") return;
            goNext();
          }}
        >
          {current.id === "prepare" && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-blueDark">Required</p>
                <ul className="mt-3 space-y-3">
                  {REQUIRED_DOCUMENTS.map((item) => (
                    <li key={item.title} className="rounded-xl border border-brand-border bg-brand-bg/40 p-4">
                      <p className="font-semibold text-brand-blueDark">{item.title}</p>
                      <p className="mt-1 text-sm text-brand-muted">{item.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Optional</p>
                <ul className="mt-3 space-y-3">
                  {OPTIONAL_DOCUMENTS.map((item) => (
                    <li key={item.title} className="rounded-xl border border-dashed border-brand-border p-4">
                      <p className="font-semibold text-brand-blueDark">{item.title}</p>
                      <p className="mt-1 text-sm text-brand-muted">{item.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-brand-accent/30 bg-brand-accent/5 p-5">
                <p className="text-base font-semibold text-brand-blueDark">Ready to continue?</p>
                <p className="mt-1 text-sm text-brand-muted">
                  You&apos;ll need the required items above before you can submit.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handlePrepareYes}
                    className="min-w-[120px] flex-1 bg-brand-amber py-3 text-xs font-bold uppercase tracking-[0.2em] text-brand-blueDark transition hover:bg-brand-amberDark sm:flex-none sm:px-8"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={handlePrepareNo}
                    className="min-w-[120px] flex-1 border border-brand-border bg-white py-3 text-xs font-bold uppercase tracking-[0.2em] text-brand-muted transition hover:border-brand-blueDark hover:text-brand-blueDark sm:flex-none sm:px-8"
                  >
                    No
                  </button>
                </div>
                {notReadyYet && (
                  <p className="mt-4 text-sm leading-relaxed text-brand-muted">
                    No problem — take your time to gather your documents. When you&apos;re ready, tap{" "}
                    <span className="font-semibold text-brand-blueDark">Yes</span> to start your application.
                  </p>
                )}
              </div>
            </div>
          )}

          {current.id === "intro" && (
            <p className="text-sm leading-relaxed text-brand-muted">
              You will share contact details, your experience pitch, CV, and a referee. Tourists sign up separately —
              guides are vetted before listing experiences.
            </p>
          )}

          {current.id === "name" && (
            <input
              autoFocus
              required
              className="form-input-light text-lg"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
            />
          )}

          {current.id === "id" && (
            <input
              autoFocus
              required
              className="form-input-light text-lg"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="e.g. 12345678"
              inputMode="numeric"
              autoComplete="off"
            />
          )}

          {current.id === "contact" && (
            <div className="space-y-4">
              <input
                autoFocus
                required
                type="email"
                className="form-input-light"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <input
                required
                className="form-input-light"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 7XX XXX XXX"
              />
            </div>
          )}

          {current.id === "location" && (
            <input
              autoFocus
              required
              className="form-input-light text-lg"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Nairobi, Kenya"
            />
          )}

          {current.id === "experience" && (
            <textarea
              autoFocus
              required
              className="form-input-light min-h-[140px] resize-none"
              value={experiencePitch}
              onChange={(e) => setExperiencePitch(e.target.value)}
              placeholder="Street food crawls in the CBD, Maasai Mara day trips..."
            />
          )}

          {current.id === "portfolio" && (
            <input
              autoFocus
              className="form-input-light"
              value={portfolioLinks}
              onChange={(e) => setPortfolioLinks(e.target.value)}
              placeholder="https://instagram.com/..., https://..."
            />
          )}

          {current.id === "cv" && (
            <>
              <input
                required
                type="file"
                accept="application/pdf,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx"
                onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                className={fileInputClass}
              />
              {cvFile && <p className="mt-2 text-sm text-brand-success">Selected: {cvFile.name}</p>}
            </>
          )}

          {current.id === "proof" && (
            <>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                className={fileInputClass}
              />
              {proofFile && <p className="mt-2 text-sm text-brand-muted">Selected: {proofFile.name}</p>}
              <button
                type="button"
                onClick={goNext}
                className="mt-4 self-start text-sm font-semibold text-brand-accent hover:underline"
              >
                Skip this step
              </button>
            </>
          )}

          {current.id === "referee" && (
            <div className="space-y-4">
              <input
                autoFocus
                required
                className="form-input-light"
                value={refereeName}
                onChange={(e) => setRefereeName(e.target.value)}
                placeholder="Referee full name"
              />
              <input
                required
                className="form-input-light"
                value={refereePhone}
                onChange={(e) => setRefereePhone(e.target.value)}
                placeholder="Referee phone"
              />
              <input
                type="email"
                className="form-input-light"
                value={refereeEmail}
                onChange={(e) => setRefereeEmail(e.target.value)}
                placeholder="Referee email (optional)"
              />
            </div>
          )}

          {current.id === "terms" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-brand-border bg-brand-bg/50 p-4 text-sm text-brand-muted">
                <p>
                  <span className="font-semibold text-brand-blueDark">{fullName}</span> · {email} · {location}
                </p>
                <p className="mt-2 line-clamp-3">{experiencePitch}</p>
              </div>
              <label className="flex items-start gap-3 text-sm text-brand-muted">
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
                  : Guidemate takes 15% of my listed rate, and if a tourist cancels, a 20% inconvenience fee applies.
                </span>
              </label>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-auto flex flex-wrap items-center gap-3 pt-10">
            {step > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="px-4 py-3 text-sm font-semibold text-brand-muted hover:text-brand-blueDark"
              >
                ← Back
              </button>
            )}
            {current.id !== "prepare" && (
              <button
                type="submit"
                disabled={loading}
                className="min-w-[140px] flex-1 bg-brand-amber py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-blueDark transition hover:bg-brand-amberDark disabled:opacity-50 sm:flex-none sm:px-8"
              >
                {loading ? "Submitting..." : isLast ? "Submit application" : current.id === "intro" ? "Start" : "Continue"}
              </button>
            )}
          </div>
        </form>
      </div>

      <p className="mt-8 text-center text-sm text-brand-muted">
        Already approved?{" "}
        <a href="/auth/sign-in" className="font-semibold text-brand-accent underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
