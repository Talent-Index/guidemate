import { Router } from "express";
import { getFxRates } from "../fx.js";

export const fxRouter = Router();

fxRouter.get("/", async (_req, res) => {
  try {
    const snapshot = await getFxRates();
    res.json(snapshot);
  } catch (err) {
    console.error("[fx] route failed", err);
    res.status(502).json({ error: "live rates unavailable" });
  }
});
