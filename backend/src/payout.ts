import type { BookingRecord, PayoutInfo } from "./bookings.js";
import { updateBooking } from "./bookings.js";
import { usdcToKes } from "./fx.js";
import { isSimulatedRamp } from "./ramp/index.js";
import { withdrawToMpesa } from "./wallet.js";

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
  };
}

/** After escrow release, auto-send the guide's 85% share to their M-Pesa number. */
export async function autoPayoutOnRelease(
  booking: BookingRecord,
  guideAmountUsdc: number
): Promise<PayoutInfo | null> {
  if (guideAmountUsdc <= 0) return null;

  const phone = booking.guidePhone?.trim();
  if (!phone) {
    console.warn(`[payout] guide ${booking.guideId} has no phone — skipping auto M-Pesa payout`);
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
