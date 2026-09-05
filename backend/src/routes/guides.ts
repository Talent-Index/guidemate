import { Router } from "express";
import { getGuideInsights, getGuidePublicProfile } from "../guides.js";
import { getUserIdFromAuthHeader } from "../supabase.js";

export const guidesRouter = Router();

guidesRouter.get("/me/insights", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  const insights = await getGuideInsights(userId);
  if (!insights) return res.status(403).json({ error: "guide account required" });

  res.json({ insights });
});

guidesRouter.get("/:guideId", async (req, res) => {
  const guide = await getGuidePublicProfile(req.params.guideId);
  if (!guide) {
    return res.status(404).json({ error: "guide not found" });
  }
  res.json({ guide });
});
