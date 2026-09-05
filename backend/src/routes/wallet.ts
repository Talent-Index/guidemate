import { Router } from "express";
import { z } from "zod";
import { getUserIdFromAuthHeader, supabaseAdmin } from "../supabase.js";
import {
  getWalletSummary,
  provisionCustodialWallet,
  withdrawToMpesa,
} from "../wallet.js";

export const walletRouter = Router();

walletRouter.post("/provision", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  try {
    const walletAddress = await provisionCustodialWallet(userId);
    res.json({ walletAddress });
  } catch (err) {
    console.error("[wallet] provision failed", err);
    res.status(500).json({ error: (err as Error).message ?? "wallet provision failed" });
  }
});

walletRouter.get("/", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  try {
    const summary = await getWalletSummary(userId);
    res.json(summary);
  } catch (err) {
    console.error("[wallet] summary failed", err);
    res.status(500).json({ error: (err as Error).message ?? "wallet lookup failed" });
  }
});

walletRouter.get("/transactions", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  try {
    const summary = await getWalletSummary(userId);
    res.json({ transactions: summary.transactions });
  } catch (err) {
    console.error("[wallet] transactions failed", err);
    res.status(500).json({ error: (err as Error).message ?? "transactions lookup failed" });
  }
});

const withdrawSchema = z.object({
  amountUsdc: z.number().positive(),
  phone: z.string().min(9).optional(),
});

walletRouter.post("/withdraw", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("phone, role")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.role !== "guide") {
      return res.status(403).json({ error: "only guides can withdraw to M-Pesa" });
    }
    const phone = parsed.data.phone ?? (profile?.phone as string);
    if (!phone) return res.status(400).json({ error: "M-Pesa phone number required" });

    const result = await withdrawToMpesa(userId, parsed.data.amountUsdc, phone);
    res.json(result);
  } catch (err) {
    console.error("[wallet] withdraw failed", err);
    res.status(500).json({ error: (err as Error).message ?? "withdrawal failed" });
  }
});
