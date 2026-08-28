import { Router } from "express";
import { formatUnits } from "ethers";
import { z } from "zod";
import { bookingIdToBytes32, requireChain } from "../chain.js";
import { getBooking, updateBooking } from "../store.js";
import { verifyBookingToken } from "../qr.js";
import { simulateMpesaPayout } from "../payout.js";

export const completeRouter = Router();

const completeSchema = z.object({
  token: z.string().min(1),
});

completeRouter.post("/", async (req, res) => {
  const parsed = completeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { valid, bookingId } = verifyBookingToken(parsed.data.token);
  if (!valid || !bookingId) {
    return res.status(400).json({ error: "invalid or tampered QR token" });
  }

  const booking = getBooking(bookingId);
  if (!booking) {
    return res.status(404).json({ error: "booking not found" });
  }
  if (booking.status !== "locked") {
    return res.status(409).json({ error: `booking already ${booking.status}`, booking });
  }

  try {
    const { escrow, usdc } = requireChain();
    const bytes32Id = bookingIdToBytes32(bookingId);
    const decimals = await usdc.decimals();

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
        // not our event, ignore
      }
    }

    updateBooking(bookingId, {
      status: "released",
      releaseTxHash: receipt?.hash ?? tx.hash,
      splits,
    });

    const payout = await simulateMpesaPayout(splits.guideAmount, booking.guide.phone);
    const updated = updateBooking(bookingId, { status: "paid", payout });

    res.json({ booking: updated });
  } catch (err) {
    console.error("[complete] failed", err);
    res.status(500).json({ error: (err as Error).message ?? "release failed" });
  }
});
