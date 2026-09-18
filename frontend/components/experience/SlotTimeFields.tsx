"use client";

import { WeeklyAvailabilityEditor } from "@/components/experience/WeeklyAvailabilityEditor";

export function SlotTimeFields({
  experienceId,
  guideId,
  onSlotsChanged,
}: {
  experienceId: string;
  guideId: string;
  onSlotsChanged?: (futureCount: number) => void;
}) {
  return (
    <WeeklyAvailabilityEditor experienceId={experienceId} guideId={guideId} onSlotsChanged={onSlotsChanged} />
  );
}
