"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Price } from "@/lib/fx";
import { ExperienceSlotPicker } from "@/components/experience/ExperienceSlotPicker";
import type { ExperienceSlot } from "@/lib/slots";

export function ExperienceBookingPanel({
  priceUsdc,
  experienceId,
  compact,
  selectedSlot,
  onSelectSlot,
  onReserve,
  slotRefreshKey = 0,
}: {
  priceUsdc: number;
  experienceId: string;
  compact?: boolean;
  selectedSlot: ExperienceSlot | null;
  onSelectSlot: (slot: ExperienceSlot) => void;
  onReserve: () => void;
  slotRefreshKey?: number;
}) {
  const [showDates, setShowDates] = useState(Boolean(selectedSlot));

  useEffect(() => {
    if (selectedSlot) setShowDates(true);
  }, [selectedSlot]);

  return (
    <div
      className="rounded-2xl border border-brand-border bg-[var(--gm-surface)] p-5 shadow-card"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-baseline gap-1">
            <span className="text-sm text-brand-muted">From</span>
            <Price amountUsdc={priceUsdc} size="lg" align="start" showUsdc={false} className="font-bold" />
            <span className="text-sm text-brand-muted">/ guest</span>
          </div>
          <p className="mt-1 text-xs font-semibold text-brand-accent">Free cancellation</p>
        </div>
        <Button
          variant="accent"
          className="rounded-full px-6 py-3 text-sm font-bold"
          onClick={() => {
            if (selectedSlot) onReserve();
            else setShowDates(true);
          }}
        >
          {selectedSlot ? "Reserve" : "Show dates"}
        </Button>
      </div>

      {showDates && (
        <div className="mt-5" id="experience-times">
          <ExperienceSlotPicker
            experienceId={experienceId}
            selectedSlotId={selectedSlot?.id}
            onSelect={onSelectSlot}
            compact
            variant="sidebar"
            refreshKey={slotRefreshKey}
          />
        </div>
      )}
    </div>
  );
}
