"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { ExperienceItineraryEditor } from "@/components/experience/ExperienceItineraryEditor";
import { itineraryForSave, normalizeItinerary, type ItineraryStep } from "@/lib/itinerary";
import { useToast } from "@/components/ui/Toast";

export function ExperienceItineraryPanel({
  experienceId,
  guideId,
  initialItinerary,
  onSaved,
}: {
  experienceId: string;
  guideId: string;
  initialItinerary: unknown;
  onSaved?: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<ItineraryStep[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const normalized = normalizeItinerary(initialItinerary);
      setSteps(normalized.length > 0 ? normalized : [{ title: "", body: "", image_url: null }]);
    }
  }, [open, initialItinerary]);

  async function handleSave() {
    const itinerary = itineraryForSave(steps);
    if (itinerary.length === 0) {
      toast("Add at least one itinerary step with a title and description", "error");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("experiences").update({ itinerary }).eq("id", experienceId);
    setSaving(false);
    if (error) {
      toast(error.message, "error");
      return;
    }
    toast("Itinerary saved", "success");
    onSaved?.();
    setOpen(false);
  }

  const stepCount = normalizeItinerary(initialItinerary).length;

  return (
    <div className="mt-2 w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-brand-accent hover:underline"
      >
        {open ? "Hide itinerary" : `Edit itinerary${stepCount ? ` (${stepCount} steps)` : ""}`}
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-brand-border bg-brand-bg p-3">
          <ExperienceItineraryEditor steps={steps} onChange={setSteps} guideId={guideId} />
          <Button type="button" variant="primary" className="mt-3 text-xs" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save itinerary"}
          </Button>
        </div>
      )}
    </div>
  );
}
