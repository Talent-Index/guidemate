export interface ExperienceSlot {
  id: string;
  experience_id: string;
  guide_id: string;
  starts_at: string;
  ends_at: string;
  max_guests: number;
  booked_guests: number;
  is_cancelled: boolean;
}

export const EAT_TIME_ZONE = "Africa/Nairobi";
export const EAT_OFFSET = "+03:00";
export const MAX_UPCOMING_SLOTS = 100;

export function spotsLeft(slot: ExperienceSlot): number {
  return Math.max(0, slot.max_guests - slot.booked_guests);
}

export function eatWallClockToIso(value: string): string {
  return new Date(`${value}:00${EAT_OFFSET}`).toISOString();
}

export function isoToEatWallClock(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EAT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function slotEndsAtIso(startsAtIso: string, durationMinutes: number): string {
  return new Date(new Date(startsAtIso).getTime() + durationMinutes * 60_000).toISOString();
}

export function validateSlotRange(startsAtIso: string, endsAtIso: string): string | null {
  const start = new Date(startsAtIso);
  const end = new Date(endsAtIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Enter a valid start and end time.";
  }
  if (start < new Date()) {
    return "Start time must be in the future.";
  }
  if (end <= start) {
    return "End time must be after start time.";
  }
  return null;
}

export function defaultEndFromStart(startWallClock: string, durationMinutes: number): string {
  if (!startWallClock || durationMinutes <= 0) return "";
  return isoToEatWallClock(slotEndsAtIso(eatWallClockToIso(startWallClock), durationMinutes));
}

export function formatSlotDate(startsAt: string): string {
  const date = new Date(startsAt);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  let prefix = date.toLocaleDateString(undefined, {
    timeZone: EAT_TIME_ZONE,
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  if (sameDay(date, now)) prefix = "Today";
  else if (sameDay(date, tomorrow)) prefix = "Tomorrow";

  return prefix;
}

export function formatSlotTimeRange(startsAt: string, endsAt: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: EAT_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  const start = new Date(startsAt).toLocaleTimeString("en-US", opts);
  const end = new Date(endsAt).toLocaleTimeString("en-US", opts);
  return `${start} – ${end} EAT`;
}

export function formatSlotLabel(slot: ExperienceSlot): string {
  return `${formatSlotDate(slot.starts_at)}, ${formatSlotTimeRange(slot.starts_at, slot.ends_at)}`;
}

export function toDatetimeLocalValue(iso: string): string {
  return isoToEatWallClock(iso);
}

export function fromDatetimeLocalValue(value: string): Date {
  return new Date(eatWallClockToIso(value));
}

export function canAddAnotherSlot(upcomingCount: number): boolean {
  return upcomingCount < MAX_UPCOMING_SLOTS;
}
