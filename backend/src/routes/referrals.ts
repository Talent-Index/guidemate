import { Router } from "express";
import { z } from "zod";
import { getUserIdFromAuthHeader } from "../supabase.js";
import {
  claimReferralExperience,
  getReferralSummary,
  resolveReferrerProfileId,
  setVanityReferralCode,
  tryQualifyGuideReferrals,
} from "../referrals.js";

export const referralsRouter = Router();

referralsRouter.get("/me", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  try {
    const summary = await getReferralSummary(userId);
    const appUrl = (process.env.FRONTEND_URL ?? "https://yourguidemate.top").replace(/\/$/, "");
    res.json({
      summary,
      links: {
        apply: `${appUrl}/become-a-guide?ref=${encodeURIComponent(summary.referralCode)}`,
        short: `${appUrl}/r/${encodeURIComponent(summary.referralCode)}`,
        campaign: `${appUrl}/refer-a-guide`,
      },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

referralsRouter.get("/resolve/:code", async (req, res) => {
  try {
    const referrerId = await resolveReferrerProfileId(req.params.code);
    if (!referrerId) {
      return res.json({ valid: false });
    }
    res.json({ valid: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const claimSchema = z.object({
  experienceId: z.string().uuid(),
});

referralsRouter.post("/claim", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  const parsed = claimSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const result = await claimReferralExperience(userId, parsed.data.experienceId);
    const summary = await getReferralSummary(userId);
    res.json({ ok: true, claimId: result.claimId, summary });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

const vanitySchema = z.object({
  vanityCode: z.string().min(4).max(24),
});

referralsRouter.patch("/me/code", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  const parsed = vanitySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const referralCode = await setVanityReferralCode(userId, parsed.data.vanityCode);
    const summary = await getReferralSummary(userId);
    const appUrl = (process.env.FRONTEND_URL ?? "https://yourguidemate.top").replace(/\/$/, "");
    res.json({
      referralCode,
      summary,
      links: {
        apply: `${appUrl}/become-a-guide?ref=${encodeURIComponent(referralCode)}`,
        short: `${appUrl}/r/${encodeURIComponent(referralCode)}`,
        campaign: `${appUrl}/refer-a-guide`,
      },
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

referralsRouter.post("/qualify", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  try {
    const result = await tryQualifyGuideReferrals(userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
