import { randomUUID } from "node:crypto";
import { Router } from "express";
import { parseUnits } from "ethers";
import { z } from "zod";
import { getExperienceById } from "../experiences.js";
import { bookingIdToBytes32, requireChain } from "../chain.js";
import { saveBooking } from "../bookings.js";
import { ensureConversation } from "../chat.js";
import { recordWalletTransaction } from "../ledger.js";
import { getCompletedPaymentIntent } from "./payments.js";
import { signBookingToken } from "../qr.js";
import { getUserIdFromAuthHeader } from "../supabase.js";

export const bookRouter = Router();

const bookSchema = z.object({
  request: z.string().min(3),
  experienceId: z.string().uuid(),
  matchReason: z.string().optional().default("Matched by Guidemate AI agent."),
  hotelName: z.string().optional(),
  hotelWallet: z.string().optional(),
  paymentMethod: z.enum(["demo", "mpesa", "custodial", "external"]).optional().default("demo"),
  paymentIntentId: z.string().uuid().optional(),
  txHash: z.string().optional(),
});

bookRouter.post("/", async (req, res) => {
  const parsed = bookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { request, experienceId, matchReason, hotelName, hotelWallet, paymentMethod, paymentIntentId } =
    parsed.data;

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
    if (!touristId && paymentMethod !== "demo") {
      return res.status(401).json({ error: "sign in required for this payment method" });
    }

    if (paymentMethod === "mpesa") {
      if (!paymentIntentId) {
        return res.status(400).json({ error: "paymentIntentId required for M-Pesa payments" });
      }
      const intent = await getCompletedPaymentIntent(paymentIntentId, touristId!);
      if (!intent || intent.reference_id !== experienceId) {
        return res.status(402).json({ error: "M-Pesa payment not completed for this experience" });
      }
    }

    const bookingId = randomUUID();
    const bytes32Id = bookingIdToBytes32(bookingId);
    const decimals = await usdc.decimals();
    const amountUnits = parseUnits(experience.priceUsdc.toString(), decimals);
    const resolvedHotelWallet = hotelWallet ?? (await escrow.protocolTreasury());

    if (paymentMethod === "demo" || paymentMethod === "mpesa" || paymentMethod === "custodial") {
      const mintTx = await usdc.mint(await signer.getAddress(), amountUnits);
      await mintTx.wait();
    }

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
      paymentMethod,
      paymentRef: paymentIntentId ?? undefined,
    });

    if (touristId) {
      await recordWalletTransaction({
        profileId: touristId,
        type: "escrow_lock",
        amountUsdc: -experience.priceUsdc,
        referenceType: "booking",
        referenceId: bookingId,
        txHash: receipt?.hash ?? lockTx.hash,
        metadata: { paymentMethod },
      });
      await ensureConversation(bookingId, touristId, experience.guide.id);
    }

    res.status(201).json({
      booking: record,
      qrToken: signBookingToken(bookingId),
    });
  } catch (err) {
    console.error("[book] failed", err);
    res.status(500).json({ error: (err as Error).message ?? "booking failed" });
  }
});
