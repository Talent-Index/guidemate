import { Router } from "express";
import { getBooking, listBookings } from "../store.js";
import { signBookingToken } from "../qr.js";

export const bookingsRouter = Router();

bookingsRouter.get("/", (_req, res) => {
  res.json({ bookings: listBookings() });
});

bookingsRouter.get("/:id", (req, res) => {
  const booking = getBooking(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: "booking not found" });
  }
  res.json({ booking });
});

/// The QR token is a deterministic HMAC of the bookingId, so it's safe to
/// regenerate on demand for the Guide view without storing it server-side.
bookingsRouter.get("/:id/qr-token", (req, res) => {
  const booking = getBooking(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: "booking not found" });
  }
  res.json({ qrToken: signBookingToken(booking.bookingId) });
});
