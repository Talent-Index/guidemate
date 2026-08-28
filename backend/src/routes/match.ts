import { Router } from "express";
import { z } from "zod";
import { matchExperience } from "../match.js";

export const matchRouter = Router();

const matchSchema = z.object({
  request: z.string().min(3, "request is too short"),
});

matchRouter.post("/", async (req, res) => {
  const parsed = matchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const result = await matchExperience(parsed.data.request);
    res.json(result);
  } catch (err) {
    console.error("[match] failed", err);
    res.status(500).json({ error: (err as Error).message ?? "matching failed" });
  }
});
