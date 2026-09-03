import { Router } from "express";
import { getUserIdFromAuthHeader } from "../supabase.js";
import { getTouristPublicProfile, viewerCanSeeTourist } from "../tourists.js";

export const touristsRouter = Router();

touristsRouter.get("/:touristId", async (req, res) => {
  const viewerId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!viewerId) {
    return res.status(401).json({ error: "sign in required to view a tourist profile" });
  }

  const touristId = req.params.touristId;
  const allowed = await viewerCanSeeTourist(viewerId, touristId);
  if (!allowed) {
    return res.status(403).json({ error: "only the tourist or a guide who hosted them can view this profile" });
  }

  const tourist = await getTouristPublicProfile(touristId);
  if (!tourist) {
    return res.status(404).json({ error: "tourist not found" });
  }
  res.json({ tourist });
});
