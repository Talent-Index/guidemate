import type { SupabaseClient } from "@supabase/supabase-js";
import { EAT_TIME_ZONE, eatWallClockToIso, slotEndsAtIso } from "./slots";

/** 0 = Sunday … 6 = Saturday (East Africa wall calendar). */
export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;

export interface AvailabilityRule {
  id: string;
  experience_id: string;
  guide_id: string;
  weekday: number;
  start_time: string;
  duration_minutes: number;
  max_guests: number;
}

export const WEEKS_TO_MATERIALIZE = 12;

function eatWeekday(instant: Date): number {
  const short = instant.toLocaleDateString("en-US", { timeZone: EAT_TIME_ZONE, weekday: "short" });
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[short] ?? 0;
}

function eatDateYmd(instant: Date): string {
  return instant.toLocaleDateString("en-CA", { timeZone: EAT_TIME_ZONE });
}

export function normalizeStartTime(startTime: string): string {
  const parts = startTime.split(":");
  const h = parts[0]?.padStart(2, "0") ?? "00";
  const m = (parts[1] ?? "00").slice(0, 2).padStart(2, "0");
  return `${h}:${m}`;
}

export function durationHoursFromMinutes(minutes: number): string {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

export function durationMinutesFromHours(hours: number): number {
  return Math.round(hours * 60);
}

export function formatRuleSummary(rule: Pick<AvailabilityRule, "weekday" | "start_time" | "duration_minutes">): string {
  const day = WEEKDAY_OPTIONS.find((d) => d.value === rule.weekday)?.label ?? "?";
  const start = normalizeStartTime(rule.start_time);
  const hours = rule.duration_minutes / 60;
  const durationLabel = Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
  return `${day} · ${start} EAT · ${durationLabel}`;
}

export function buildSlotTimesFromRule(
  rule: Pick<AvailabilityRule, "weekday" | "start_time" | "duration_minutes">,
  weeks = WEEKS_TO_MATERIALIZE
): { starts_at: string; ends_at: string }[] {
  const startHm = normalizeStartTime(rule.start_time);
  const now = Date.now();
  const slots: { starts_at: string; ends_at: string }[] = [];

  for (let dayOffset = 0; dayOffset < weeks * 7; dayOffset++) {
    const day = new Date(now + dayOffset * 86_400_000);
    if (eatWeekday(day) !== rule.weekday) continue;
    const ymd = eatDateYmd(day);
    const startsAt = eatWallClockToIso(`${ymd}T${startHm}`);
    if (new Date(startsAt).getTime() <= now) continue;
    const endsAt = slotEndsAtIso(startsAt, rule.duration_minutes);
    slots.push({ starts_at: startsAt, ends_at: endsAt });
  }

  return slots;
}

export async function loadAvailabilityRules(
  supabase: SupabaseClient,
  experienceId: string
): Promise<AvailabilityRule[]> {
  const { data, error } = await supabase
    .from("experience_availability_rules")
    .select("id, experience_id, guide_id, weekday, start_time, duration_minutes, max_guests")
    .eq("experience_id", experienceId)
    .order("weekday")
    .order("start_time");
  if (error) throw new Error(error.message);
  return (data as AvailabilityRule[]) ?? [];
}

export async function saveWeeklySchedule(input: {
  supabase: SupabaseClient;
  experienceId: string;
  guideId: string;
  weekdays: number[];
  startTime: string;
  durationMinutes: number;
  maxGuests: number;
}): Promise<void> {
  const { supabase, experienceId, guideId, weekdays, startTime, durationMinutes, maxGuests } = input;
  const startHm = normalizeStartTime(startTime);
  if (durationMinutes <= 0) throw new Error("Duration must be at least 30 minutes.");
  if (weekdays.length === 0) throw new Error("Select at least one day.");

  const { error: deleteRulesError } = await supabase
    .from("experience_availability_rules")
    .delete()
    .eq("experience_id", experienceId);
  if (deleteRulesError) throw new Error(deleteRulesError.message);

  const rows = weekdays.map((weekday) => ({
    experience_id: experienceId,
    guide_id: guideId,
    weekday,
    start_time: `${startHm}:00`,
    duration_minutes: durationMinutes,
    max_guests: maxGuests,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("experience_availability_rules")
    .insert(rows)
    .select("id, experience_id, guide_id, weekday, start_time, duration_minutes, max_guests");
  if (insertError) throw new Error(insertError.message);

  await syncRecurringSlots(supabase, experienceId, guideId, (inserted as AvailabilityRule[]) ?? []);
}

export async function syncRecurringSlots(
  supabase: SupabaseClient,
  experienceId: string,
  guideId: string,
  rules?: AvailabilityRule[]
): Promise<number> {
  const activeRules = rules ?? (await loadAvailabilityRules(supabase, experienceId));

  const { data: existingRecurring, error: loadError } = await supabase
    .from("experience_slots")
    .select("id, booked_guests")
    .eq("experience_id", experienceId)
    .not("rule_id", "is", null)
    .gte("starts_at", new Date().toISOString());
  if (loadError) throw new Error(loadError.message);

  const toDelete = (existingRecurring ?? []).filter((s) => s.booked_guests === 0).map((s) => s.id);
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase.from("experience_slots").delete().in("id", toDelete);
    if (deleteError) throw new Error(deleteError.message);
  }

  const { data: remaining } = await supabase
    .from("experience_slots")
    .select("starts_at")
    .eq("experience_id", experienceId)
    .gte("starts_at", new Date().toISOString());

  const takenStarts = new Set((remaining ?? []).map((r) => r.starts_at as string));
  const inserts: {
    experience_id: string;
    guide_id: string;
    starts_at: string;
    ends_at: string;
    max_guests: number;
    rule_id: string;
  }[] = [];

  for (const rule of activeRules) {
    for (const slot of buildSlotTimesFromRule(rule)) {
      if (takenStarts.has(slot.starts_at)) continue;
      takenStarts.add(slot.starts_at);
      inserts.push({
        experience_id: experienceId,
        guide_id: guideId,
        starts_at: slot.starts_at,
        ends_at: slot.ends_at,
        max_guests: rule.max_guests,
        rule_id: rule.id,
      });
    }
  }

  if (inserts.length === 0) return 0;

  const { error: insertSlotsError } = await supabase.from("experience_slots").insert(inserts);
  if (insertSlotsError) throw new Error(insertSlotsError.message);
  return inserts.length;
}

export async function removeAvailabilityRule(
  supabase: SupabaseClient,
  ruleId: string,
  experienceId: string
): Promise<void> {
  const { error } = await supabase.from("experience_availability_rules").delete().eq("id", ruleId);
  if (error) throw new Error(error.message);
  await supabase
    .from("experience_slots")
    .delete()
    .eq("experience_id", experienceId)
    .eq("rule_id", ruleId)
    .eq("booked_guests", 0);
}
