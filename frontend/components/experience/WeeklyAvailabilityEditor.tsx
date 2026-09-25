"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import {
  type ExperienceSlot,
  formatSlotDate,
  formatSlotTimeRange,
  spotsLeft,
} from "@/lib/slots";
import {
  type AvailabilityRule,
  durationMinutesFromHours,
  formatRuleSummary,
  loadAvailabilityRules,
  removeAvailabilityRule,
  saveWeeklySchedule,
  syncRecurringSlots,
  WEEKDAY_OPTIONS,
} from "@/lib/recurringSlots";
import { useToast } from "@/components/ui/Toast";

export function WeeklyAvailabilityEditor({
  experienceId,
  guideId,
  onSlotsChanged,
  compact,
}: {
  experienceId: string;
  guideId: string;
  onSlotsChanged?: (futureCount: number) => void;
  compact?: boolean;
}) {
  const { toast } = useToast();
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [slots, setSlots] = useState<ExperienceSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("11:00");
  const [durationHours, setDurationHours] = useState("4");
  const [maxGuests, setMaxGuests] = useState("6");

  const loadAll = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      const [nextRules, slotsRes] = await Promise.all([
        loadAvailabilityRules(supabase, experienceId),
        supabase
          .from("experience_slots")
          .select("id, experience_id, guide_id, starts_at, ends_at, max_guests, booked_guests, is_cancelled")
          .eq("experience_id", experienceId)
          .eq("guide_id", guideId)
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true }),
      ]);
      setRules(nextRules);
      const nextSlots = ((slotsRes.data as ExperienceSlot[]) ?? []).filter((s) => !s.is_cancelled);
      setSlots(nextSlots);
      onSlotsChanged?.(nextSlots.length);

      if (nextRules.length > 0) {
        const first = nextRules[0];
        setStartTime(first.start_time.slice(0, 5));
        setDurationHours(String(first.duration_minutes / 60));
        setMaxGuests(String(first.max_guests));
        setWeekdays([...new Set(nextRules.map((r) => r.weekday))].sort((a, b) => a - b));
      }
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [experienceId, guideId, onSlotsChanged, toast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  function toggleWeekday(day: number) {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const hours = Number(durationHours);
    if (!Number.isFinite(hours) || hours <= 0) {
      toast("Enter a valid duration in hours.", "error");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      await saveWeeklySchedule({
        supabase,
        experienceId,
        guideId,
        weekdays,
        startTime,
        durationMinutes: durationMinutesFromHours(hours),
        maxGuests: Number(maxGuests) || 6,
      });
      toast("Weekly schedule saved. Bookable times updated for the next 12 weeks.", "success");
      await loadAll();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleRefreshSlots() {
    setSaving(true);
    try {
      const supabase = createClient();
      const count = await syncRecurringSlots(supabase, experienceId, guideId);
      toast(count > 0 ? `Refreshed ${count} upcoming slots.` : "Schedule is up to date.", "success");
      await loadAll();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveRule(ruleId: string) {
    try {
      const supabase = createClient();
      await removeAvailabilityRule(supabase, ruleId, experienceId);
      toast("Removed that weekly time.", "success");
      await loadAll();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className={compact ? "text-xs text-brand-muted" : "text-sm text-brand-muted"}>
        Choose which days you host, a start time (East Africa Time), and how long each session runs. We list
        bookable slots for the next 12 weeks automatically.
      </p>

      <form className="grid gap-3" onSubmit={handleSave}>
        <div>
          <p className="text-xs font-semibold text-brand-blueDark">Days available</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setWeekdays(WEEKDAY_OPTIONS.map((d) => d.value))}
              className="rounded-full border border-brand-border px-3 py-1 text-xs font-semibold text-brand-accent hover:border-brand-accent"
            >
              Every day
            </button>
            {WEEKDAY_OPTIONS.map((day) => {
              const active = weekdays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleWeekday(day.value)}
                  className={`min-w-[2.75rem] rounded-full px-3 py-1 text-xs font-semibold transition ${
                    active ? "bg-brand-blue text-white" : "border border-brand-border text-brand-muted"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-brand-blueDark">Start time (EAT)</span>
            <input
              type="time"
              required
              className="form-input-light text-sm"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-brand-blueDark">Duration (hours)</span>
            <input
              type="number"
              required
              min={0.5}
              max={12}
              step={0.5}
              className="form-input-light text-sm"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              placeholder="4"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-brand-blueDark">Max guests</span>
            <input
              type="number"
              min={1}
              max={50}
              className="form-input-light text-sm"
              value={maxGuests}
              onChange={(e) => setMaxGuests(e.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" disabled={saving} className="px-4 py-2 text-xs">
            {saving ? "Saving..." : "Save weekly schedule"}
          </Button>
          <Button type="button" variant="secondary" disabled={saving} className="px-4 py-2 text-xs" onClick={() => void handleRefreshSlots()}>
            Refresh slots
          </Button>
        </div>
      </form>

      {rules.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-brand-blueDark">Saved weekly pattern</p>
          <ul className="mt-2 flex flex-col gap-1">
            {rules.map((rule) => (
              <li key={rule.id} className="flex items-center justify-between gap-2 text-xs text-brand-muted">
                <span>{formatRuleSummary(rule)} · max {rule.max_guests} guests</span>
                <button type="button" className="font-semibold text-red-600 hover:underline" onClick={() => void handleRemoveRule(rule.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-brand-blueDark">Upcoming bookable times</p>
        {loading && <p className="mt-1 text-xs text-brand-muted">Loading...</p>}
        {!loading && slots.length === 0 && (
          <p className="mt-1 text-xs text-brand-muted">No upcoming slots yet. Save a weekly schedule above.</p>
        )}
        <ul className="mt-2 flex max-h-48 flex-col gap-2 overflow-y-auto">
          {slots.slice(0, compact ? 6 : 20).map((slot) => (
            <li key={slot.id} className="rounded-lg border border-brand-border bg-white px-3 py-2 text-xs">
              <p className="font-semibold text-brand-blueDark">{formatSlotDate(slot.starts_at)}</p>
              <p className="text-brand-muted">
                {formatSlotTimeRange(slot.starts_at, slot.ends_at)} · {spotsLeft(slot)} of {slot.max_guests} spots
              </p>
            </li>
          ))}
        </ul>
        {!loading && slots.length > (compact ? 6 : 20) && (
          <p className="mt-1 text-xs text-brand-muted">+ {slots.length - (compact ? 6 : 20)} more times listed for booking</p>
        )}
      </div>
    </div>
  );
}
