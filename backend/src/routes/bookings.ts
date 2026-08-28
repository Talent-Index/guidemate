import { Router } from "express";
import { getBooking, listBookings } from "../bookings.js";
import { signBookingToken } from "../qr.js";
import { getUserIdFromAuthHeader } from "../supabase.js";

export const bookingsRouter = Router();

/// Returns bookings for the authenticated user, whether they're the tourist
/// or the guide on the booking (a demo account could plausibly be both).
/// No token = no bookings, since there's no account to scope the list to.
bookingsRouter.get("/", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) {
    return res.json({ bookings: [] });
  }

  const [asTourist, asGuide] = await Promise.all([
    listBookings({ touristId: userId }),
    listBookings({ guideId: userId }),
  ]);
  const merged = new Map(asTourist.concat(asGuide).map((b) => [b.bookingId, b]));
  res.json({ bookings: Array.from(merged.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
});

bookingsRouter.get("/:id", async (req, res) => {
  const booking = await getBooking(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: "booking not found" });
  }
  res.json({ booking });
});

/// The QR token is a deterministic HMAC of the bookingId, so it's safe to
/// regenerate on demand for the Guide view without storing it server-side.
bookingsRouter.get("/:id/qr-token", async (req, res) => {
  const booking = await getBooking(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: "booking not found" });
  }
  res.json({ qrToken: signBookingToken(booking.bookingId) });
});
