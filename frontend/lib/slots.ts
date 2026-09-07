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

export function spotsLeft(slot: ExperienceSlot): number {
  return Math.max(0, slot.max_guests - slot.booked_guests);
}

export function formatSlotDate(startsAt: string): string {
  const date = new Date(startsAt);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  let prefix = date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  if (sameDay(date, now)) prefix = "Today";
  else if (sameDay(date, tomorrow)) prefix = "Tomorrow";

  return prefix;
}

export function formatSlotTimeRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${start.toLocaleTimeString(undefined, opts)} to ${end.toLocaleTimeString(undefined, opts)}`;
}

export function formatSlotLabel(slot: ExperienceSlot): string {
  return `${formatSlotDate(slot.starts_at)}, ${formatSlotTimeRange(slot.starts_at, slot.ends_at)}`;
}

export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): Date {
  return new Date(value);
}
