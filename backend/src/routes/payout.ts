import { Router } from "express";
import { getBooking } from "../store.js";

export const payoutRouter = Router();

payoutRouter.get("/:id", (req, res) => {
  const booking = getBooking(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: "booking not found" });
  }
  if (!booking.payout) {
    return res.json({ status: booking.status, payout: null });
  }
  res.json({ status: booking.status, payout: booking.payout });
});
