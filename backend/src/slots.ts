import { supabaseAdmin } from "./supabase.js";

export interface ExperienceSlotRow {
  id: string;
  experienceId: string;
  guideId: string;
  startsAt: string;
  endsAt: string;
  maxGuests: number;
  bookedGuests: number;
  isCancelled: boolean;
}

export async function getSlotById(slotId: string): Promise<ExperienceSlotRow | null> {
  const { data, error } = await supabaseAdmin
    .from("experience_slots")
    .select("id, experience_id, guide_id, starts_at, ends_at, max_guests, booked_guests, is_cancelled")
    .eq("id", slotId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    experienceId: data.experience_id,
    guideId: data.guide_id,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    maxGuests: data.max_guests,
    bookedGuests: data.booked_guests,
    isCancelled: data.is_cancelled,
  };
}

/** Reserve a slot exclusively — one booking party per time slot. */
export async function reserveSlot(slotId: string, experienceId: string, guests = 1): Promise<void> {
  const slot = await getSlotById(slotId);
  if (!slot) throw new Error("This time slot is no longer available");
  if (slot.experienceId !== experienceId) throw new Error("This time slot does not match the experience");
  if (slot.isCancelled) throw new Error("This time slot was cancelled");
  if (new Date(slot.startsAt).getTime() <= Date.now()) throw new Error("This time slot has already started");
  if (slot.bookedGuests > 0) throw new Error("This time slot is no longer available");
  if (guests > slot.maxGuests) {
    throw new Error(`This slot allows up to ${slot.maxGuests} guest${slot.maxGuests === 1 ? "" : "s"}`);
  }

  const { data: updated, error } = await supabaseAdmin
    .from("experience_slots")
    .update({ booked_guests: slot.maxGuests })
    .eq("id", slotId)
    .eq("booked_guests", 0)
    .select("id")
    .maybeSingle();

  if (error || !updated) throw new Error("This time slot is no longer available");
}

/** Free a slot after a failed booking attempt. */
export async function releaseSlot(slotId: string): Promise<void> {
  await supabaseAdmin.from("experience_slots").update({ booked_guests: 0 }).eq("id", slotId);
}
