import { Router } from "express";
import { formatUnits } from "ethers";
import { z } from "zod";
import { bookingIdToBytes32, escrowForLockTx, requireChain } from "../chain.js";
import { getBooking, updateBooking, type BookingRecord } from "../bookings.js";
import { verifyBookingToken, verifyCompletionPin } from "../qr.js";
import { recordWalletTransaction } from "../ledger.js";
import { getUserIdFromAuthHeader } from "../supabase.js";

export const completeRouter = Router();

const completeSchema = z.union([
  z.object({ token: z.string().min(1) }),
  z.object({
    bookingId: z.string().uuid(),
    pin: z.string().regex(/^\d{6}$/),
  }),
]);

completeRouter.post("/", async (req, res) => {
  const parsed = completeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  let bookingId: string;
  if ("token" in parsed.data) {
    const verified = verifyBookingToken(parsed.data.token);
    if (!verified.valid || !verified.bookingId) {
      return res.status(400).json({ error: "invalid or tampered QR token" });
    }
    bookingId = verified.bookingId;
  } else {
    const userId = await getUserIdFromAuthHeader(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "sign in required" });
    }
    if (!verifyCompletionPin(parsed.data.bookingId, parsed.data.pin)) {
      return res.status(400).json({ error: "incorrect end-trip PIN" });
    }
    bookingId = parsed.data.bookingId;
    const preview = await getBooking(bookingId);
    if (preview && preview.guideId !== userId) {
      return res.status(403).json({ error: "only the assigned guide can enter the PIN" });
    }
  }

  const booking = await getBooking(bookingId);
  if (!booking) {
    return res.status(404).json({ error: "booking not found" });
  }
  if (booking.status !== "locked") {
    return res.status(409).json({ error: `booking already ${booking.status}`, booking });
  }

  try {
    const updated = await releaseAndCredit(booking);
    res.json({ booking: updated });
  } catch (err) {
    console.error("[complete] failed", err);
    res.status(500).json({ error: friendlyChainError(err) });
  }
});

function friendlyChainError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const reverted = message.match(/execution reverted:\s*"([^"]+)"/i);
  if (reverted?.[1]) {
    if (reverted[1] === "booking not found") {
      return "Escrow record not found on-chain for this booking. Create a new booking and try again.";
    }
    return reverted[1];
  }
  if (message.includes("incorrect end-trip PIN")) return message;
  return message.split("\n")[0] ?? "release failed";
}

async function releaseAndCredit(booking: BookingRecord): Promise<BookingRecord> {
  const { usdc } = requireChain();
  const escrow = await escrowForLockTx(booking.lockTxHash);
  const bytes32Id = bookingIdToBytes32(booking.bookingId);
  const decimals = await usdc.decimals();

  const onChain = await escrow.getBooking(bytes32Id);
  if (!onChain.exists) {
    throw new Error("Escrow record not found on-chain for this booking. Create a new booking and try again.");
  }
  if (onChain.released) {
    throw new Error("Payment was already released for this booking.");
  }

  const tx = await escrow.release(bytes32Id);
  const receipt = await tx.wait();

  let splits = { guideAmount: 0, hotelAmount: 0, protocolAmount: 0 };
  for (const log of receipt?.logs ?? []) {
    try {
      const parsedLog = escrow.interface.parseLog(log);
      if (parsedLog?.name === "BookingReleased") {
        splits = {
          guideAmount: Number(formatUnits(parsedLog.args.guideAmount, decimals)),
          hotelAmount: Number(formatUnits(parsedLog.args.hotelAmount, decimals)),
          protocolAmount: Number(formatUnits(parsedLog.args.protocolAmount, decimals)),
        };
      }
    } catch {
      // not our event
    }
  }

  await updateBooking(booking.bookingId, {
    status: "released",
    releaseTxHash: receipt?.hash ?? tx.hash,
    splits,
  });

  await recordWalletTransaction({
    profileId: booking.guideId,
    type: "booking_release",
    amountUsdc: splits.guideAmount,
    referenceType: "booking",
    referenceId: booking.bookingId,
    txHash: receipt?.hash ?? tx.hash,
    metadata: { splits },
  });

  const updated = await updateBooking(booking.bookingId, { status: "paid" });
  if (!updated) {
    throw new Error("booking update failed after release");
  }
  return updated;
}
