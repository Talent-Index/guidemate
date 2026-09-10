"use client";

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
  return (
    <div
      className={`rounded-2xl border border-brand-border bg-[var(--gm-surface)] p-6 shadow-card ${
        compact ? "" : "lg:sticky lg:top-24"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-1">
        <span className="text-sm text-brand-muted">From</span>
        <Price amountUsdc={priceUsdc} size="lg" align="start" className="font-bold" />
        <span className="text-sm text-brand-muted">/ guest</span>
      </div>
      <p className="mt-1 text-xs font-semibold text-brand-accent">Free cancellation within 24 hours</p>

      {selectedSlot ? (
        <Button variant="accent" className="mt-5 w-full rounded-xl py-3.5 text-base font-bold" onClick={onReserve}>
          Reserve
        </Button>
      ) : (
        <p className="mt-5 text-center text-sm font-medium text-brand-muted">Select a time below</p>
      )}

      <div className="mt-4" id="experience-times">
        <ExperienceSlotPicker
          experienceId={experienceId}
          selectedSlotId={selectedSlot?.id}
          onSelect={onSelectSlot}
          compact
          variant="sidebar"
          refreshKey={slotRefreshKey}
        />
      </div>

      <p className="mt-4 text-center text-xs text-brand-muted">You won&apos;t be charged yet</p>
    </div>
  );
}
