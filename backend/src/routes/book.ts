import { randomUUID } from "node:crypto";
import { Router } from "express";
import { parseUnits } from "ethers";
import { z } from "zod";
import { getExperienceById } from "../experiences.js";
import { bookingIdToBytes32, requireChain } from "../chain.js";
import { saveBooking } from "../bookings.js";
import { signBookingToken } from "../qr.js";
import { getUserIdFromAuthHeader } from "../supabase.js";

export const bookRouter = Router();

const bookSchema = z.object({
  request: z.string().min(3),
  experienceId: z.string().uuid(),
  matchReason: z.string().optional().default("Matched by Guidemate AI agent."),
  // Only set for the secondary concierge/B2B flow - a real hotel is charging the guest.
  hotelName: z.string().optional(),
  hotelWallet: z.string().optional(),
});

bookRouter.post("/", async (req, res) => {
  const parsed = bookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { request, experienceId, matchReason, hotelName, hotelWallet } = parsed.data;

  const experience = await getExperienceById(experienceId);
  if (!experience) {
    return res.status(404).json({ error: `unknown experienceId: ${experienceId}` });
  }
  if (!experience.guide.walletAddress) {
    return res.status(422).json({ error: "this guide has not set a payout wallet address yet" });
  }

  try {
    const { signer, escrow, usdc } = requireChain();
    const touristId = await getUserIdFromAuthHeader(req.headers.authorization);

    const bookingId = randomUUID();
    const bytes32Id = bookingIdToBytes32(bookingId);
    const decimals = await usdc.decimals();
    const amountUnits = parseUnits(experience.priceUsdc.toString(), decimals);

    // Direct tourist-to-guide bookings have no hotel in the loop - route that
    // 10% share to the protocol treasury instead of requiring a hotel address.
    const resolvedHotelWallet = hotelWallet ?? (await escrow.protocolTreasury());

    // Simulates the tourist's card/wallet charge being instantly converted to stablecoin.
    const mintTx = await usdc.mint(await signer.getAddress(), amountUnits);
    await mintTx.wait();

    const lockTx = await escrow.createBooking(
      bytes32Id,
      experience.guide.walletAddress,
      resolvedHotelWallet,
      amountUnits
    );
    const receipt = await lockTx.wait();

    const record = await saveBooking({
      bookingId,
      touristId: touristId ?? null,
      guideId: experience.guide.id,
      guideWallet: experience.guide.walletAddress,
      experienceId: experience.id,
      hotelName: hotelName ?? null,
      hotelWallet: hotelWallet ?? null,
      request,
      matchReason,
      amountUsdc: experience.priceUsdc,
      lockTxHash: receipt?.hash ?? lockTx.hash,
    });

    res.status(201).json({
      booking: record,
      qrToken: signBookingToken(bookingId),
    });
  } catch (err) {
    console.error("[book] failed", err);
    res.status(500).json({ error: (err as Error).message ?? "booking failed" });
  }
});
