import { Router } from "express";
import { listGuides } from "../match.js";

export const guidesRouter = Router();

guidesRouter.get("/", (_req, res) => {
  res.json({ guides: listGuides() });
});
