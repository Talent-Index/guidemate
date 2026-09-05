import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { recordWalletTransaction } from "../ledger.js";
import { getRampProvider } from "../ramp/index.js";
import { usdcToKes } from "../fx.js";
import { getUserIdFromAuthHeader, supabaseAdmin } from "../supabase.js";

export const paymentsRouter = Router();

const initiateSchema = z.object({
  purpose: z.enum(["booking", "stream_ppv", "stream_tip"]),
  referenceId: z.string().min(1),
  amountUsdc: z.number().positive(),
  phone: z.string().min(9),
});

paymentsRouter.post("/mpesa/initiate", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  const parsed = initiateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const { purpose, referenceId, amountUsdc, phone } = parsed.data;
    const ramp = getRampProvider();
    const quote = await ramp.getQuote(amountUsdc, "on");
    const amountKes = quote.kes + quote.fee;

    const { data: intent, error } = await supabaseAdmin
      .from("payment_intents")
      .insert({
        payer_id: userId,
        purpose,
        reference_id: referenceId,
        amount_kes: amountKes,
        amount_usdc: amountUsdc,
        phone,
        status: "processing",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { checkoutRequestId } = await ramp.createOnRamp({
      intentId: intent.id,
      phone,
      amountKes,
      amountUsdc,
      purpose,
      referenceId,
    });

    // Simulate mode: auto-complete STK push after short delay simulation
    const mpesaReceipt = `SIM-${randomUUID().slice(0, 8).toUpperCase()}`;
    await supabaseAdmin
      .from("payment_intents")
      .update({
        status: "completed",
        checkout_request_id: checkoutRequestId,
        mpesa_receipt: mpesaReceipt,
        completed_at: new Date().toISOString(),
      })
      .eq("id", intent.id);

    await recordWalletTransaction({
      profileId: userId,
      type: "mpesa_onramp",
      amountUsdc,
      amountKes,
      referenceType: purpose,
      referenceId,
      mpesaRef: mpesaReceipt,
      status: "completed",
    });

    res.status(201).json({
      intentId: intent.id,
      checkoutRequestId,
      mpesaReceipt,
      amountKes,
      amountUsdc,
      status: "completed",
    });
  } catch (err) {
    console.error("[payments] mpesa initiate failed", err);
    res.status(500).json({ error: (err as Error).message ?? "payment initiation failed" });
  }
});

paymentsRouter.get("/mpesa/:intentId", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  const { data, error } = await supabaseAdmin
    .from("payment_intents")
    .select("*")
    .eq("id", req.params.intentId)
    .eq("payer_id", userId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "payment intent not found" });

  res.json({
    intentId: data.id,
    status: data.status,
    mpesaReceipt: data.mpesa_receipt,
    amountKes: Number(data.amount_kes),
    amountUsdc: Number(data.amount_usdc),
    purpose: data.purpose,
    referenceId: data.reference_id,
  });
});

paymentsRouter.post("/mpesa/webhook", async (req, res) => {
  // Placeholder for Kotani/Yellow Card webhook - simulate mode auto-completes in initiate
  res.json({ ok: true });
});

paymentsRouter.get("/quote", async (req, res) => {
  const amountUsdc = Number(req.query.amountUsdc ?? 1);
  if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
    return res.status(400).json({ error: "amountUsdc must be positive" });
  }
  const ramp = getRampProvider();
  const [onQuote, offQuote] = await Promise.all([
    ramp.getQuote(amountUsdc, "on"),
    ramp.getQuote(amountUsdc, "off"),
  ]);
  const kesDirect = await usdcToKes(amountUsdc);
  res.json({ amountUsdc, kesDirect, onRamp: onQuote, offRamp: offQuote });
});

export async function getCompletedPaymentIntent(intentId: string, payerId: string) {
  const { data } = await supabaseAdmin
    .from("payment_intents")
    .select("*")
    .eq("id", intentId)
    .eq("payer_id", payerId)
    .eq("status", "completed")
    .maybeSingle();
  return data;
}
