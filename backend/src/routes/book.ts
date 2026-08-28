import { randomUUID } from "node:crypto";
import { Router } from "express";
import { parseUnits } from "ethers";
import { z } from "zod";
import { getGuideById } from "../match.js";
import { bookingIdToBytes32, requireChain } from "../chain.js";
import { saveBooking, type BookingRecord } from "../store.js";
import { signBookingToken } from "../qr.js";

export const bookRouter = Router();

const bookSchema = z.object({
  request: z.string().min(3),
  guideId: z.string(),
  matchReason: z.string().optional().default("Matched by Guidemate AI agent."),
  hotelName: z.string().optional().default("Villa Rosa Kempinski (demo)"),
  hotelWallet: z
    .string()
    .optional()
    .default("0x0900000000000000000000000000000000000009"),
});

bookRouter.post("/", async (req, res) => {
  const parsed = bookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { request, guideId, matchReason, hotelName, hotelWallet } = parsed.data;

  const guide = getGuideById(guideId);
  if (!guide) {
    return res.status(404).json({ error: `unknown guideId: ${guideId}` });
  }

  try {
    const { signer, escrow, usdc } = requireChain();

    const bookingId = randomUUID();
    const bytes32Id = bookingIdToBytes32(bookingId);
    const decimals = await usdc.decimals();
    const amountUnits = parseUnits(guide.priceUsdc.toString(), decimals);

    // Simulates the hotel's card charge being instantly converted to stablecoin.
    const mintTx = await usdc.mint(await signer.getAddress(), amountUnits);
    await mintTx.wait();

    const lockTx = await escrow.createBooking(bytes32Id, guide.wallet, hotelWallet, amountUnits);
    const receipt = await lockTx.wait();

    const record: BookingRecord = {
      bookingId,
      guide,
      hotel: { name: hotelName, wallet: hotelWallet },
      request,
      matchReason,
      amountUsdc: guide.priceUsdc,
      status: "locked",
      lockTxHash: receipt?.hash ?? lockTx.hash,
      createdAt: new Date().toISOString(),
    };
    saveBooking(record);

    res.status(201).json({
      booking: record,
      qrToken: signBookingToken(bookingId),
    });
  } catch (err) {
    console.error("[book] failed", err);
    res.status(500).json({ error: (err as Error).message ?? "booking failed" });
  }
});
