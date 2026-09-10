"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  type ExperienceSlot,
  formatSlotDate,
  formatSlotTimeRange,
} from "@/lib/slots";

async function loadAvailableSlots(experienceId: string, compact?: boolean): Promise<ExperienceSlot[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("experience_slots")
    .select("id, experience_id, guide_id, starts_at, ends_at, max_guests, booked_guests, is_cancelled")
    .eq("experience_id", experienceId)
    .order("starts_at", { ascending: true })
    .limit(compact ? 4 : 12);
  return (data as ExperienceSlot[]) ?? [];
}

export function ExperienceSlotPicker({
  experienceId,
  selectedSlotId,
  onSelect,
  compact,
  variant = "default",
  refreshKey = 0,
}: {
  experienceId: string;
  selectedSlotId?: string | null;
  onSelect?: (slot: ExperienceSlot) => void;
  compact?: boolean;
  variant?: "default" | "sidebar";
  refreshKey?: number;
}) {
  const [slots, setSlots] = useState<ExperienceSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadAvailableSlots(experienceId, compact).then((rows) => {
      if (!cancelled) {
        setSlots(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [experienceId, compact, refreshKey]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`experience-slots-${experienceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "experience_slots", filter: `experience_id=eq.${experienceId}` },
        () => {
          void loadAvailableSlots(experienceId, compact).then(setSlots);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
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
                Up to {slot.max_guests} guest{slot.max_guests === 1 ? "" : "s"}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
