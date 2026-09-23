import type { BookingRecord, PayoutInfo } from "./bookings.js";
import { updateBooking } from "./bookings.js";
import { usdcToKes } from "./fx.js";
import { isSimulatedRamp } from "./ramp/index.js";
import { supabaseAdmin } from "./supabase.js";
import { withdrawToMpesa } from "./wallet.js";

export type PayoutDestination = "mpesa" | "wallet";

function asDestination(value: unknown): PayoutDestination | null {
  return value === "mpesa" || value === "wallet" ? value : null;
}

export async function resolvePayoutDestination(
  guideId: string,
  experienceId: string | null
): Promise<PayoutDestination> {
  if (experienceId) {
    const { data: experience } = await supabaseAdmin
      .from("experiences")
      .select("payout_destination")
      .eq("id", experienceId)
      .maybeSingle();
    const fromExperience = asDestination(experience?.payout_destination);
    if (fromExperience) return fromExperience;
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("payout_destination")
    .eq("id", guideId)
    .maybeSingle();
  return asDestination(profile?.payout_destination) ?? "mpesa";
}

function randomRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `MPESA-${out}`;
}

export async function simulateMpesaPayout(guideUsdcAmount: number, guidePhone: string): Promise<PayoutInfo> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const kesAmount = await usdcToKes(guideUsdcAmount);
  return {
    reference: randomRef(),
    phone: guidePhone,
    kesAmount,
    usdcAmount: guideUsdcAmount,
    completedAt: new Date().toISOString(),
    destination: "mpesa",
  };
}

/** After escrow release: send to M-Pesa, or leave the 85% in the guide's wallet. */
export async function autoPayoutOnRelease(
  booking: BookingRecord,
  guideAmountUsdc: number
): Promise<PayoutInfo | null> {
  if (guideAmountUsdc <= 0) return null;

  const destination = await resolvePayoutDestination(booking.guideId, booking.experienceId);
  if (destination === "wallet") {
    const payout: PayoutInfo = {
      reference: "WALLET",
      phone: booking.guidePhone ?? "",
      kesAmount: 0,
      usdcAmount: guideAmountUsdc,
      completedAt: new Date().toISOString(),
      destination: "wallet",
    };
    await updateBooking(booking.bookingId, { payout });
    return payout;
  }

  const phone = booking.guidePhone?.trim();
  if (!phone) {
    console.warn(`[payout] guide ${booking.guideId} has no phone, skipping auto M-Pesa payout`);
    return null;
  }

  if (isSimulatedRamp()) {
    const payout = await simulateMpesaPayout(guideAmountUsdc, phone);
    await updateBooking(booking.bookingId, { payout });
    return payout;
  }

  try {
    const result = await withdrawToMpesa(booking.guideId, guideAmountUsdc, phone, {
      bookingId: booking.bookingId,
    });

    const payout: PayoutInfo = {
      reference: result.reference,
      phone,
      kesAmount: result.kesAmount,
      usdcAmount: guideAmountUsdc,
      completedAt: new Date().toISOString(),
      destination: "mpesa",
    };

    if (!result.pending) {
      await updateBooking(booking.bookingId, { payout });
    }

    return payout;
  } catch (err) {
    console.error("[payout] auto M-Pesa off-ramp failed", err);
    return null;
  }
}
