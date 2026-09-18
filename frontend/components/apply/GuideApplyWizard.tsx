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

const UPLOAD_ACCEPT =
  "application/pdf,.pdf,image/jpeg,image/png,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx";

const REQUIRED_DOCUMENTS = [
  {
    title: "National ID",
    detail: "Your ID number plus a clear scan or photo of the card (front, and back if applicable).",
  },
  {
    title: "Certificate of Good Conduct",
    detail: "Issued by the Directorate of Criminal Investigations — required for TRA Class E tour leaders and guides.",
  },
  {
    title: "KRA PIN",
    detail: "Your Kenya Revenue Authority PIN and a copy of your PIN certificate.",
  },
  {
    title: "Professional certificates",
    detail: "Tourism or guiding qualifications (e.g. KPSGA, first aid, language, or sector training certificates).",
  },
  {
    title: "Referee details",
    detail: "Name and phone of someone who can vouch for you (employer, partner, or community leader).",
  },
] as const;

const OPTIONAL_DOCUMENTS = [
  {
    title: "CV or résumé",
    detail: "PDF or Word file summarising your guiding experience.",
  },
  {
    title: "Proof of work",
    detail: "Photos or PDFs of past tours, client reviews, or portfolio links.",
  },
] as const;

const STEPS = [
  {
    id: "prepare",
    title: "Before you begin",
    hint: "Gather these items so you can finish in one sitting, about 5 minutes.",
  },
  {
    id: "intro",
    title: "Become a Guidemate guide",
    hint: "We collect TRA Class E documents (Citizen Tour Leader / Guide) plus a short experience pitch.",
  },
  {
    id: "name",
    title: "What's your full name?",
    hint: "As it appears on your National ID.",
  },
  {
    id: "id",
    title: "National ID",
    hint: "ID number and a scan or photo of your card (PDF or image, max 10 MB).",
  },
  {
    id: "goodConduct",
    title: "Certificate of Good Conduct",
    hint: "Upload the full certificate (PDF or clear photo).",
  },
  {
    id: "kraPin",
    title: "KRA PIN",
    hint: "Enter your PIN and upload your KRA PIN certificate.",
  },
  {
    id: "professionalCerts",
    title: "Professional certificates",
    hint: "Upload one or more tourism or guiding certificates (up to 5 files).",
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
    hint: "Instagram, TripAdvisor, website, comma-separated links.",
  },
  {
    id: "cv",
    title: "Upload your CV (optional)",
    hint: "PDF or Word document — helps us review your experience.",
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
  const [nationalIdFile, setNationalIdFile] = useState<File | null>(null);
  const [goodConductFile, setGoodConductFile] = useState<File | null>(null);
  const [kraPin, setKraPin] = useState("");
  const [kraPinDocFile, setKraPinDocFile] = useState<File | null>(null);
  const [professionalCertFiles, setProfessionalCertFiles] = useState<File[]>([]);
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
        if (!idNumber.trim()) return "Enter your National ID number.";
        if (!nationalIdFile) return "Upload a scan or photo of your National ID.";
        return null;
      case "goodConduct":
        return goodConductFile ? null : "Upload your Certificate of Good Conduct.";
      case "kraPin":
        if (!kraPin.trim()) return "Enter your KRA PIN.";
        if (!kraPinDocFile) return "Upload your KRA PIN certificate.";
        return null;
      case "professionalCerts":
        return professionalCertFiles.length > 0
          ? null
          : "Upload at least one professional certificate.";
      case "contact":
        if (!email.trim()) return "Enter your email.";
        if (!phone.trim()) return "Enter your phone number.";
        return null;
      case "location":
        return location.trim() ? null : "Enter your location.";
      case "experience":
        return experiencePitch.trim() ? null : "Tell us about your experience.";
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
    if (!nationalIdFile || !goodConductFile || !kraPinDocFile || professionalCertFiles.length === 0) {
      setError("Upload all required TRA documents before submitting.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const [nationalIdDoc, goodConduct, kraPinDoc, cv, proof, ...professionalCertificates] = await Promise.all([
        fileToPayload(nationalIdFile),
        fileToPayload(goodConductFile),
        fileToPayload(kraPinDocFile),
        cvFile ? fileToPayload(cvFile) : Promise.resolve(null),
        proofFile ? fileToPayload(proofFile) : Promise.resolve(null),
        ...professionalCertFiles.map((file) => fileToPayload(file)),
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
        nationalIdDoc,
        goodConduct,
        kraPin: kraPin.trim(),
        kraPinDoc,
        professionalCertificates,
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
              <div className="rounded-xl border border-brand-accent/30 bg-brand-accent/5 p-5">
                <p className="text-base font-semibold text-brand-blueDark">Testing Guidemate as a guide?</p>
                <p className="mt-1 text-sm text-brand-muted">
                  Skip this form and{" "}
                  <a href="/auth/sign-up/guide" className="font-semibold text-brand-accent underline">
                    create a beta guide account
                  </a>{" "}
                  to list experiences and go live. Use this application when you&apos;re ready for full TRA Class E
                  vetting.
                </p>
              </div>
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
                    No problem. Take your time to gather your documents. When you&apos;re ready, tap{" "}
                    <span className="font-semibold text-brand-blueDark">Yes</span> to start your application.
                  </p>
                )}
              </div>
            </div>
          )}

          {current.id === "intro" && (
            <p className="text-sm leading-relaxed text-brand-muted">
              Guidemate vets guides before listing experiences. You will upload the documents Tourism Regulatory
              Authority (TRA) lists for Class E Citizen Tour Leaders and Guides, plus a referee contact. Tourists sign
              up separately on the platform.
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
            <div className="space-y-4">
              <input
                autoFocus
                required
                className="form-input-light text-lg"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="National ID number"
                inputMode="numeric"
                autoComplete="off"
              />
              <input
                required
                type="file"
                accept={UPLOAD_ACCEPT}
                onChange={(e) => setNationalIdFile(e.target.files?.[0] ?? null)}
                className={fileInputClass}
              />
              {nationalIdFile && (
                <p className="text-sm text-brand-success">Selected: {nationalIdFile.name}</p>
              )}
            </div>
          )}

          {current.id === "goodConduct" && (
            <>
              <input
                required
                type="file"
                accept={UPLOAD_ACCEPT}
                onChange={(e) => setGoodConductFile(e.target.files?.[0] ?? null)}
                className={fileInputClass}
              />
              {goodConductFile && (
                <p className="mt-2 text-sm text-brand-success">Selected: {goodConductFile.name}</p>
              )}
            </>
          )}

          {current.id === "kraPin" && (
            <div className="space-y-4">
              <input
                autoFocus
                required
                className="form-input-light text-lg uppercase"
                value={kraPin}
                onChange={(e) => setKraPin(e.target.value.toUpperCase())}
                placeholder="KRA PIN (e.g. A123456789X)"
                autoComplete="off"
              />
              <input
                required
                type="file"
                accept={UPLOAD_ACCEPT}
                onChange={(e) => setKraPinDocFile(e.target.files?.[0] ?? null)}
                className={fileInputClass}
              />
              {kraPinDocFile && (
                <p className="text-sm text-brand-success">PIN certificate: {kraPinDocFile.name}</p>
              )}
            </div>
          )}

          {current.id === "professionalCerts" && (
            <>
              <input
                required
                type="file"
                multiple
                accept={UPLOAD_ACCEPT}
                onChange={(e) => setProfessionalCertFiles(Array.from(e.target.files ?? []).slice(0, 5))}
                className={fileInputClass}
              />
              {professionalCertFiles.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-brand-muted">
                  {professionalCertFiles.map((file) => (
                    <li key={file.name}>{file.name}</li>
                  ))}
                </ul>
              )}
            </>
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
                type="file"
                accept="application/pdf,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx"
                onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                className={fileInputClass}
              />
              {cvFile && <p className="mt-2 text-sm text-brand-muted">Selected: {cvFile.name}</p>}
              <button
                type="button"
                onClick={goNext}
                className="mt-4 self-start text-sm font-semibold text-brand-accent hover:underline"
              >
                Skip this step
              </button>
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
