"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import {
  type ExperienceSlot,
  formatSlotDate,
  formatSlotTimeRange,
  spotsLeft,
  toDatetimeLocalValue,
} from "@/lib/slots";
import { useToast } from "@/components/ui/Toast";

export function GuideAvailabilityPanel({
  experienceId,
  guideId,
  durationMinutes,
}: {
  experienceId: string;
  guideId: string;
  durationMinutes: number;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<ExperienceSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [startsAt, setStartsAt] = useState("");
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
    setSlots((data as ExperienceSlot[]) ?? []);
    setLoading(false);
  }, [experienceId, guideId]);

  useEffect(() => {
    if (open) loadSlots();
  }, [open, loadSlots]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!startsAt) return;
    setSaving(true);
    const start = new Date(startsAt);
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    const supabase = createClient();
    const { error } = await supabase.from("experience_slots").insert({
      experience_id: experienceId,
      guide_id: guideId,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      max_guests: Number(maxGuests) || 6,
    });
    setSaving(false);
    if (error) {
      toast(error.message, "error");
      return;
    }
    setStartsAt("");
    toast("Time slot added", "success");
    await loadSlots();
  }

  async function handleCancel(slot: ExperienceSlot) {
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

  const upcoming = slots.filter((s) => !s.is_cancelled);

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
          <p className="text-xs text-brand-muted">
            Add times when tourists can book. Each slot lasts {durationMinutes} minutes.
          </p>

          <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]" onSubmit={handleAdd}>
            <input
              type="datetime-local"
              className="form-input-light w-full text-sm"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
              min={toDatetimeLocalValue(new Date().toISOString())}
              aria-label="Slot start time"
            />
            <input
              type="number"
              min={1}
              max={50}
              className="form-input-light w-20 text-sm"
              value={maxGuests}
              onChange={(e) => setMaxGuests(e.target.value)}
              aria-label="Maximum guests"
              title="Max guests"
            />
            <Button type="submit" variant="primary" disabled={saving} className="whitespace-nowrap px-3 py-2 text-xs">
              {saving ? "Adding..." : "Add slot"}
            </Button>
          </form>

          <div className="mt-3">
            {loading && <p className="text-xs text-brand-muted">Loading slots...</p>}
            {!loading && upcoming.length === 0 && (
              <p className="text-xs text-brand-muted">No upcoming slots. Add your first time above.</p>
            )}
            <ul className="mt-1 flex flex-col gap-2">
              {upcoming.map((slot) => (
                <li
                  key={slot.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-border bg-white px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-semibold text-brand-blueDark">{formatSlotDate(slot.starts_at)}</p>
                    <p className="text-brand-muted">
                      {formatSlotTimeRange(slot.starts_at, slot.ends_at)} · {spotsLeft(slot)} of {slot.max_guests} spots
                    </p>
                  </div>
                  {slot.booked_guests === 0 && (
                    <button
                      type="button"
                      onClick={() => handleCancel(slot)}
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
      )}
    </div>
  );
}
