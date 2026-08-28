import { Router } from "express";
import { getBooking } from "../bookings.js";

export const payoutRouter = Router();

payoutRouter.get("/:id", async (req, res) => {
  const booking = await getBooking(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: "booking not found" });
  }
  if (!booking.payout) {
    return res.json({ status: booking.status, payout: null });
  }
  res.json({ status: booking.status, payout: booking.payout });
});
