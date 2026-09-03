import { Router } from "express";
import { getGuidePublicProfile } from "../guides.js";

export const guidesRouter = Router();

guidesRouter.get("/:guideId", async (req, res) => {
  const guide = await getGuidePublicProfile(req.params.guideId);
  if (!guide) {
    return res.status(404).json({ error: "guide not found" });
  }
  res.json({ guide });
});
