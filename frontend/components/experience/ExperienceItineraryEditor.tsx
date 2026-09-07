"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ExperiencePhoto } from "@/components/ui/ExperiencePhoto";
import { emptyItineraryStep, type ItineraryStep } from "@/lib/itinerary";
import { uploadExperiencePhoto } from "@/lib/uploads";

export function ExperienceItineraryEditor({
  steps,
  onChange,
  guideId,
  label = "Itinerary (What you'll do)",
}: {
  steps: ItineraryStep[];
  onChange: (steps: ItineraryStep[]) => void;
  guideId: string;
  label?: string;
}) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  function updateStep(index: number, patch: Partial<ItineraryStep>) {
    onChange(steps.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }

  function addStep() {
    onChange([...steps, emptyItineraryStep()]);
  }

  function removeStep(index: number) {
    onChange(steps.filter((_, i) => i !== index));
  }

  async function handleImageUpload(index: number, file: File) {
    setUploadingIndex(index);
    try {
      const url = await uploadExperiencePhoto(file, guideId);
      updateStep(index, { image_url: url });
    } finally {
      setUploadingIndex(null);
    }
  }

  const list = steps.length > 0 ? steps : [emptyItineraryStep()];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-brand-blueDark">{label}</p>
        <p className="text-xs text-brand-muted">
          Add each part of the experience. Tourists see this as the timeline on your listing.
        </p>
      </div>

      {list.map((step, index) => (
        <div key={index} className="rounded-xl border border-brand-border bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Step {index + 1}</p>
            {list.length > 1 && (
              <button
                type="button"
                onClick={() => removeStep(index)}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center gap-2">
              <ExperiencePhoto
                src={step.image_url}
                alt={step.title || `Step ${index + 1}`}
                className="h-20 w-20 rounded-lg"
                sizes="80px"
              />
              <label className="cursor-pointer text-xs font-semibold text-brand-accent hover:underline">
                {uploadingIndex === index ? "Uploading..." : "Add photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingIndex === index}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImageUpload(index, file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <div className="grid gap-2">
              <input
                className="form-input-light w-full text-sm"
                placeholder="Step title (e.g. Ride a local matatu)"
                value={step.title}
                onChange={(e) => updateStep(index, { title: e.target.value })}
                required
              />
              <textarea
                className="form-input-light w-full text-sm"
                rows={2}
                placeholder="What happens in this step?"
                value={step.body}
                onChange={(e) => updateStep(index, { body: e.target.value })}
                required
              />
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="secondary" className="text-xs" onClick={addStep}>
        + Add step
      </Button>
    </div>
  );
}
