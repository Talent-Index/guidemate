"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";
import { ExperienceItineraryEditor } from "@/components/experience/ExperienceItineraryEditor";
import { MeetingMapPicker } from "@/components/experience/MeetingMapPicker";
import { SlotTimeFields } from "@/components/experience/SlotTimeFields";
import { useToast } from "@/components/ui/Toast";
import { EXPERIENCE_CATEGORIES } from "@/lib/categories";
import {
  type ExperienceDraftRow,
  patchExperienceDraft,
} from "@/lib/experienceDraft";
import {
  canPublish,
  missingPublishPieces,
} from "@/lib/experiencePublish";
import {
  emptyItineraryStep,
  itineraryForSave,
  normalizeItinerary,
  type ItineraryStep,
} from "@/lib/itinerary";
import { uploadExperiencePhoto } from "@/lib/uploads";

const STEP_LABELS = [
  "Basics",
  "Photos",
  "Price & time",
  "Itinerary",
  "Meeting point",
  "Dates",
] as const;

const MISSING_LABELS: Record<string, string> = {
  title: "a title",
  price: "a price",
  duration: "a duration",
  "meeting point": "a meeting point",
  "a future time slot": "a future time slot",
};

const inputClass = "form-input-light w-full text-sm";

export function ExperienceWizard({
  draft,
  initialStep,
}: {
  draft: ExperienceDraftRow;
  initialStep: number;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(() =>
    Math.min(6, Math.max(1, initialStep || draft.wizard_step || 1))
  );
  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.description);
  const [category, setCategory] = useState(draft.category ?? "");
  const [tagsInput, setTagsInput] = useState(draft.tags.join(", "));
  const [priceUsdc, setPriceUsdc] = useState(
    draft.price_usdc > 0 ? String(draft.price_usdc) : ""
  );
  const [durationMinutes, setDurationMinutes] = useState(
    draft.duration_minutes > 0 ? String(draft.duration_minutes) : ""
  );
  const [imageUrls, setImageUrls] = useState<string[]>(
    draft.image_urls?.length ? draft.image_urls : draft.image_url ? [draft.image_url] : []
  );
  const [itinerarySteps, setItinerarySteps] = useState<ItineraryStep[]>(() => {
    const normalized = normalizeItinerary(draft.itinerary, imageUrls);
    return normalized.length > 0 ? normalized : [emptyItineraryStep()];
  });
  const [meetingLat, setMeetingLat] = useState<number | null>(draft.meeting_lat);
  const [meetingLng, setMeetingLng] = useState<number | null>(draft.meeting_lng);
  const [meetingLabel, setMeetingLabel] = useState<string | null>(draft.meeting_label);
  const [futureSlotCount, setFutureSlotCount] = useState(0);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const formRef = useRef({
    title,
    description,
    category,
    tagsInput,
    priceUsdc,
    durationMinutes,
    imageUrls,
    itinerarySteps,
    meetingLat,
    meetingLng,
    meetingLabel,
    step,
  });

  formRef.current = {
    title,
    description,
    category,
    tagsInput,
    priceUsdc,
    durationMinutes,
    imageUrls,
    itinerarySteps,
    meetingLat,
    meetingLng,
    meetingLabel,
    step,
  };

  const buildPatch = useCallback(
    (wizardStep = formRef.current.step): Partial<ExperienceDraftRow> => {
      const tags = formRef.current.tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const urls = formRef.current.imageUrls;
      const itinerary = itineraryForSave(formRef.current.itinerarySteps);
      const price = Number(formRef.current.priceUsdc) || 0;
      const duration = Number(formRef.current.durationMinutes) || 0;
      const label = formRef.current.meetingLabel;

      return {
        title: formRef.current.title,
        description: formRef.current.description,
        tags,
        category: formRef.current.category || null,
        price_usdc: price,
        duration_minutes: duration,
        image_urls: urls,
        image_url: urls[0] ?? null,
        itinerary,
        meeting_lat: formRef.current.meetingLat,
        meeting_lng: formRef.current.meetingLng,
        meeting_label: label,
        location: label,
        wizard_step: wizardStep,
      };
    },
    []
  );

  const saveDraft = useCallback(
    async (extra: Partial<ExperienceDraftRow> = {}): Promise<boolean> => {
      const patch = { ...buildPatch(), ...extra };
      try {
        await patchExperienceDraft(draft.id, patch);
        return true;
      } catch {
        toast("Couldn't save — retrying", "error");
        try {
          await patchExperienceDraft(draft.id, patch);
          return true;
        } catch {
          toast("Couldn't save your changes", "error");
          return false;
        }
      }
    },
    [buildPatch, draft.id, toast]
  );

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        void patchExperienceDraft(draft.id, buildPatch()).catch(() => {});
      }
    }

    function handleBeforeUnload() {
      void patchExperienceDraft(draft.id, buildPatch()).catch(() => {});
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void patchExperienceDraft(draft.id, buildPatch()).catch(() => {});
    };
  }, [buildPatch, draft.id]);

  async function goToStep(nextStep: number) {
    const clamped = Math.min(6, Math.max(1, nextStep));
    setNavigating(true);
    const ok = await saveDraft({ wizard_step: clamped });
    setNavigating(false);
    if (!ok) return;
    setStep(clamped);
    router.replace(`/guide/experiences/${draft.id}/edit?step=${clamped}`, { scroll: false });
  }

  async function handleNext() {
    if (step >= 6) return;
    await goToStep(step + 1);
  }

  async function handleBack() {
    if (step <= 1) return;
    await goToStep(step - 1);
  }

  async function handleMeetingChange(next: {
    lat: number;
    lng: number;
    label: string | null;
  }) {
    setMeetingLat(next.lat);
    setMeetingLng(next.lng);
    setMeetingLabel(next.label);
    await saveDraft({
      meeting_lat: next.lat,
      meeting_lng: next.lng,
      meeting_label: next.label,
      location: next.label,
    });
  }

  async function handlePhotoUpload(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploadingPhotos(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(fileList)) {
        newUrls.push(await uploadExperiencePhoto(file, draft.guide_id));
      }
      const merged = [...new Set([...imageUrls, ...newUrls])];
      setImageUrls(merged);
      await saveDraft({ image_urls: merged, image_url: merged[0] ?? null });
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function handleRemovePhoto(url: string) {
    const next = imageUrls.filter((u) => u !== url);
    setImageUrls(next);
    await saveDraft({ image_urls: next, image_url: next[0] ?? null });
  }

  async function handlePublish() {
    const publishInput = {
      title,
      priceUsdc: Number(priceUsdc) || 0,
      durationMinutes: Number(durationMinutes) || 0,
      meetingLat,
      meetingLng,
      futureSlotCount,
    };
    if (!canPublish(publishInput)) return;

    setPublishing(true);
    try {
      await saveDraft({ status: "published", is_active: true, wizard_step: 6 });
      toast("Experience published", "success");
      router.push("/guide/dashboard");
    } catch {
      toast("Couldn't publish — try again", "error");
    } finally {
      setPublishing(false);
    }
  }

  const publishInput = {
    title,
    priceUsdc: Number(priceUsdc) || 0,
    durationMinutes: Number(durationMinutes) || 0,
    meetingLat,
    meetingLng,
    futureSlotCount,
  };
  const missing = missingPublishPieces(publishInput);
  const isPublished = draft.status === "published";
  const progressPct = (step / 6) * 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
            {isPublished ? "Edit experience" : "New experience"}
          </p>
          <h1 className="text-xl font-bold text-brand-blueDark">
            {title.trim() || "Untitled experience"}
          </h1>
        </div>
        <Link
          href="/guide/dashboard"
          className="text-sm font-semibold text-brand-accent hover:underline"
        >
          Back to dashboard
        </Link>
      </div>

      <div className="md:grid md:grid-cols-[220px_1fr] md:gap-6">
        <nav className="hidden md:block">
          <ol className="flex flex-col gap-1">
            {STEP_LABELS.map((label, index) => {
              const stepNum = index + 1;
              const active = step === stepNum;
              const complete = step > stepNum;

              if (isPublished) {
                return (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={() => void goToStep(stepNum)}
                      disabled={navigating}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                        active
                          ? "bg-brand-accent/10 font-semibold text-brand-accent"
                          : "text-brand-muted hover:bg-brand-bg hover:text-brand-blueDark"
                      }`}
                    >
                      <span className="text-xs text-brand-muted">Step {stepNum}</span>
                      <span className="mt-0.5 block">{label}</span>
                    </button>
                  </li>
                );
              }

              return (
                <li
                  key={label}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    active
                      ? "bg-brand-accent/10 font-semibold text-brand-accent"
                      : complete
                        ? "text-brand-blueDark"
                        : "text-brand-muted"
                  }`}
                >
                  <span className="text-xs text-brand-muted">Step {stepNum}</span>
                  <span className="mt-0.5 block">{label}</span>
                </li>
              );
            })}
          </ol>
        </nav>

        <Card className="flex flex-col gap-4">
          <div className="md:hidden">
            <p className="text-sm font-semibold text-brand-blueDark">
              Step {step} of 6 — {STEP_LABELS[step - 1]}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-border">
              <div
                className="h-full rounded-full bg-brand-accent transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="hidden text-sm text-brand-muted md:block">
            Step {step} of 6 — {STEP_LABELS[step - 1]}
          </div>

          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title" className="sm:col-span-2">
                <input
                  className={inputClass}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Nairobi street food walk"
                />
              </Field>
              <Field label="Category">
                <select
                  className={inputClass}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Uncategorized</option>
                  {EXPERIENCE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tags (comma separated)" className="sm:col-span-2">
                <input
                  className={inputClass}
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="street food, walking tours"
                />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <textarea
                  className={inputClass}
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will tourists experience?"
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-brand-blueDark">Photos</p>
                <p className="text-xs text-brand-muted">
                  Optional — add one or more photos for your listing.
                </p>
              </div>
              {imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {imageUrls.map((url) => (
                    <div key={url} className="relative">
                      <ExperiencePhoto
                        src={url}
                        alt="Experience photo"
                        className="h-20 w-28 rounded-lg"
                        sizes="112px"
                      />
                      <button
                        type="button"
                        onClick={() => void handleRemovePhoto(url)}
                        className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploadingPhotos}
                onChange={(e) => {
                  void handlePhotoUpload(e.target.files);
                  e.target.value = "";
                }}
                className="block w-full text-sm text-brand-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand-accent/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-accent hover:file:bg-brand-accent/20"
              />
              {uploadingPhotos && (
                <p className="text-xs text-brand-muted">Uploading photos…</p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Price (USDC)">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceUsdc}
                  onChange={(e) => setPriceUsdc(e.target.value)}
                  placeholder="e.g. 25"
                />
              </Field>
              <Field label="Duration (minutes)">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="e.g. 180"
                />
              </Field>
            </div>
          )}

          {step === 4 && (
            <ExperienceItineraryEditor
              steps={itinerarySteps}
              onChange={setItinerarySteps}
              guideId={draft.guide_id}
              label="Itinerary (optional)"
            />
          )}

          {step === 5 && (
            <MeetingMapPicker
              lat={meetingLat}
              lng={meetingLng}
              label={meetingLabel}
              onChange={(next) => void handleMeetingChange(next)}
            />
          )}

          {step === 6 && (
            <div className="space-y-4">
              <SlotTimeFields
                experienceId={draft.id}
                guideId={draft.guide_id}
                durationMinutes={Number(durationMinutes) || 0}
                onSlotsChanged={setFutureSlotCount}
              />
              <div className="border-t border-brand-border pt-4">
                <Button
                  type="button"
                  variant="primary"
                  disabled={!canPublish(publishInput) || publishing}
                  onClick={() => void handlePublish()}
                >
                  {publishing ? "Publishing…" : "Publish experience"}
                </Button>
                {missing.length > 0 && (
                  <p className="mt-2 text-xs text-brand-muted">
                    Still needed:{" "}
                    {missing.map((piece) => MISSING_LABELS[piece] ?? piece).join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}

          {step < 6 && (
            <div className="flex flex-wrap gap-2 border-t border-brand-border pt-4">
              {step > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={navigating}
                  onClick={() => void handleBack()}
                >
                  Back
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                disabled={navigating}
                onClick={() => void handleNext()}
              >
                {navigating ? "Saving…" : "Next"}
              </Button>
            </div>
          )}

          {step === 6 && (
            <div className="flex flex-wrap gap-2 border-t border-brand-border pt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={navigating}
                onClick={() => void handleBack()}
              >
                Back
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      <span className="font-medium text-brand-blueDark">{label}</span>
      {children}
    </label>
  );
}
