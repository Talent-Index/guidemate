"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  type ExperienceSlot,
  formatSlotDate,
  formatSlotTimeRange,
  spotsLeft,
} from "@/lib/slots";

export function ExperienceSlotPicker({
  experienceId,
  selectedSlotId,
  onSelect,
  compact,
  variant = "default",
}: {
  experienceId: string;
  selectedSlotId?: string | null;
  onSelect?: (slot: ExperienceSlot) => void;
  compact?: boolean;
  variant?: "default" | "sidebar";
}) {
  const [slots, setSlots] = useState<ExperienceSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("experience_slots")
        .select("id, experience_id, guide_id, starts_at, ends_at, max_guests, booked_guests, is_cancelled")
        .eq("experience_id", experienceId)
        .order("starts_at", { ascending: true })
        .limit(compact ? 4 : 12);

      if (!cancelled) {
        setSlots((data as ExperienceSlot[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [experienceId, compact]);

  if (loading) {
    return <p className="text-sm text-brand-muted">Loading available times...</p>;
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-brand-muted">
        No upcoming times yet. Check back soon or message the guide.
      </p>
    );
  }

  return (
    <ul className={`flex flex-col ${variant === "sidebar" ? "gap-3" : "gap-2"}`}>
      {slots.map((slot) => {
        const left = spotsLeft(slot);
        const selected = selectedSlotId === slot.id;
        const itemClass =
          variant === "sidebar"
            ? `rounded-xl border px-4 py-3 text-sm transition ${
                selected
                  ? "border-brand-accent bg-brand-accent/5"
                  : "border-brand-border hover:border-brand-accent/50"
              }`
            : `rounded-xl border px-4 py-3 text-left text-sm transition ${
                selected
                  ? "border-brand-accent bg-brand-accent/5"
                  : "border-brand-border hover:border-brand-accent/50"
              }`;

        return (
          <li key={slot.id}>
            <button
              type="button"
              onClick={() => onSelect?.(slot)}
              disabled={!onSelect}
              className={`flex w-full items-center justify-between gap-3 text-left ${itemClass} ${
                !onSelect ? "cursor-default" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="font-semibold text-[var(--gm-ink)]">{formatSlotDate(slot.starts_at)}</p>
                <p className="text-brand-muted">{formatSlotTimeRange(slot.starts_at, slot.ends_at)}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-[var(--gm-ink)]">
                {left} {left === 1 ? "spot" : "spots"} available
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
