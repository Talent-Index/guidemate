"use client";

import { useState } from "react";
import { WeeklyAvailabilityEditor } from "@/components/experience/WeeklyAvailabilityEditor";

export function GuideAvailabilityPanel({
  experienceId,
  guideId,
}: {
  experienceId: string;
  guideId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2 w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-brand-accent hover:underline"
      >
        {open ? "Hide schedule" : "Manage availability"}
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-brand-border bg-brand-bg p-3">
          <WeeklyAvailabilityEditor experienceId={experienceId} guideId={guideId} compact />
        </div>
      )}
    </div>
  );
}
