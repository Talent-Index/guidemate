"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import {
  type ExperienceSlot,
  canAddAnotherSlot,
  defaultEndFromStart,
  eatWallClockToIso,
  formatSlotDate,
  formatSlotTimeRange,
  MAX_UPCOMING_SLOTS,
  toDatetimeLocalValue,
  validateSlotRange,
} from "@/lib/slots";
import { useToast } from "@/components/ui/Toast";

export function SlotTimeFields({
  experienceId,
  guideId,
  durationMinutes,
  onSlotsChanged,
}: {
  experienceId: string;
  guideId: string;
  /** Used only to suggest an end time when the guide picks a start time. */
  durationMinutes?: number;
  onSlotsChanged?: (futureCount: number) => void;
}) {
  const { toast } = useToast();
  const startInputRef = useRef<HTMLInputElement>(null);
  const [slots, setSlots] = useState<ExperienceSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [maxGuests, setMaxGuests] = useState("6");
  const [saving, setSaving] = useState(false);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("experience_slots")
      .select("id, experience_id, guide_id, starts_at, ends_at, max_guests, booked_guests, is_cancelled")
      .eq("experience_id", experienceId)
      .eq("guide_id", guideId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true });
    const next = (data as ExperienceSlot[]) ?? [];
    setSlots(next);
    setLoading(false);
    onSlotsChanged?.(next.filter((s) => !s.is_cancelled).length);
  }, [experienceId, guideId, onSlotsChanged]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const upcoming = slots.filter((s) => !s.is_cancelled);

  const previewRange =
    startsAt && endsAt
      ? formatSlotTimeRange(eatWallClockToIso(startsAt), eatWallClockToIso(endsAt))
      : null;

  function handleStartChange(value: string) {
    setStartsAt(value);
    if (!value) return;

    const suggestedEnd = defaultEndFromStart(value, durationMinutes ?? 0);
    if (!endsAt || eatWallClockToIso(endsAt) <= eatWallClockToIso(value)) {
      if (suggestedEnd) setEndsAt(suggestedEnd);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!startsAt || !endsAt) return;

    const startsAtIso = eatWallClockToIso(startsAt);
    const endsAtIso = eatWallClockToIso(endsAt);
    const rangeError = validateSlotRange(startsAtIso, endsAtIso);
    if (rangeError) {
      toast(rangeError, "error");
      return;
    }

    if (!canAddAnotherSlot(upcoming.length)) {
      toast(`Maximum ${MAX_UPCOMING_SLOTS} upcoming slots`, "error");
      return;
    }

    if (upcoming.some((s) => s.starts_at === startsAtIso)) {
      toast("A slot with this start time already exists", "error");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("experience_slots").insert({
      experience_id: experienceId,
      guide_id: guideId,
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      max_guests: Number(maxGuests) || 6,
    });
    setSaving(false);

    if (error) {
      toast(error.message, "error");
      return;
    }

    setStartsAt("");
    setEndsAt("");
    toast("Time slot added", "success");
    await loadSlots();
  }

  async function handleRemove(slot: ExperienceSlot) {
    if (slot.booked_guests > 0) {
      toast("Cannot remove a slot that already has bookings", "error");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("experience_slots").delete().eq("id", slot.id);
    if (error) {
      toast(error.message, "error");
      return;
    }
    toast("Slot removed", "success");
    await loadSlots();
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-brand-muted">
        Add as many times as you can host. Pick a start and end for each slot, for example 11:00 AM to 3:00 PM (East
        Africa Time).
      </p>

      <form className="grid gap-2" onSubmit={handleAdd}>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-brand-blueDark">Start (EAT)</span>
          <input
            ref={startInputRef}
            type="datetime-local"
            className="form-input-light w-full text-sm"
            value={startsAt}
            onChange={(e) => handleStartChange(e.target.value)}
            required
            min={toDatetimeLocalValue(new Date().toISOString())}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-brand-blueDark">End (EAT)</span>
          <input
            type="datetime-local"
            className="form-input-light w-full text-sm"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            required
            min={startsAt || toDatetimeLocalValue(new Date().toISOString())}
          />
        </label>

        {previewRange && <p className="text-xs text-brand-muted">Preview: {previewRange}</p>}

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-brand-blueDark">Max guests</span>
            <input
              type="number"
              min={1}
              max={50}
              className="form-input-light w-20 text-sm"
              value={maxGuests}
              onChange={(e) => setMaxGuests(e.target.value)}
              aria-label="Maximum guests"
            />
          </label>
          <Button type="submit" variant="primary" disabled={saving} className="px-4 py-2 text-xs">
            {saving ? "Adding..." : "Add slot"}
          </Button>
        </div>
      </form>

      <button
        type="button"
        onClick={() => startInputRef.current?.focus()}
        className="self-start text-xs font-semibold text-brand-accent hover:underline"
      >
        Add another time
      </button>

      <div>
        {loading && <p className="text-xs text-brand-muted">Loading slots...</p>}
        {!loading && upcoming.length === 0 && (
          <p className="text-xs text-brand-muted">No upcoming slots yet. Add your first time above.</p>
        )}
        <ul className="mt-1 flex flex-col gap-2">
          {upcoming.map((slot) => (
            <li
              key={slot.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-border bg-white px-3 py-2 text-xs"
            >
              <div>
                <p className="font-semibold text-brand-blueDark">{formatSlotDate(slot.starts_at)}</p>
                <p className="text-brand-muted">{formatSlotTimeRange(slot.starts_at, slot.ends_at)}</p>
              </div>
              {slot.booked_guests === 0 && (
                <button
                  type="button"
                  onClick={() => handleRemove(slot)}
                  className="font-semibold text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
