import { Router } from "express";
import { getUserIdFromAuthHeader } from "../supabase.js";
import { provisionGuideWallet } from "../wallet.js";

export const walletRouter = Router();

walletRouter.post("/provision", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: "sign in required" });
  }

  try {
    const walletAddress = await provisionGuideWallet(userId);
    res.json({ walletAddress });
  } catch (err) {
    console.error("[wallet] provision failed", err);
    res.status(500).json({ error: (err as Error).message ?? "wallet provision failed" });
  }
});
