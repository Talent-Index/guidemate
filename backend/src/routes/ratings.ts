import { Router } from "express";
import { z } from "zod";
import { getBooking } from "../bookings.js";
import { getUserIdFromAuthHeader, supabaseAdmin } from "../supabase.js";

export const ratingsRouter = Router();

const ratingSchema = z.object({
  bookingId: z.string().uuid(),
  stars: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

/// Tourists rate the guide once their tour has actually completed (booking
/// status "paid" - funds already released), same moment Uber prompts a
/// rider after a ride ends. The trigger on the ratings table recomputes the
/// guide's rating_avg/rating_count automatically.
ratingsRouter.post("/", async (req, res) => {
  const parsed = ratingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const touristId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!touristId) {
    return res.status(401).json({ error: "sign in required to rate a guide" });
  }

  const { bookingId, stars, comment } = parsed.data;

  const booking = await getBooking(bookingId);
  if (!booking) {
    return res.status(404).json({ error: "booking not found" });
  }
  if (booking.touristId !== touristId) {
    return res.status(403).json({ error: "this isn't your booking" });
  }
  if (booking.status !== "paid") {
    return res.status(409).json({ error: "you can rate a guide once the tour is complete and paid out" });
  }
  if (booking.rating) {
    return res.status(409).json({ error: "you've already rated this booking" });
  }

  const { data, error } = await supabaseAdmin
    .from("ratings")
    .insert({
      booking_id: bookingId,
      guide_id: booking.guideId,
      tourist_id: touristId,
      stars,
      comment: comment || null,
    })
    .select("stars, comment")
    .single();

  if (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "you've already rated this booking" });
    }
    console.error("[ratings] failed to save rating", error.message);
    return res.status(500).json({ error: "failed to save rating" });
  }

  res.status(201).json({ rating: { stars: data.stars, comment: data.comment } });
});

/// Guides rate the tourist once the tour is complete and paid out.
ratingsRouter.post("/tourist", async (req, res) => {
  const parsed = ratingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const guideId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!guideId) {
    return res.status(401).json({ error: "sign in required to rate a tourist" });
  }

  const { bookingId, stars, comment } = parsed.data;

  const booking = await getBooking(bookingId);
  if (!booking) {
    return res.status(404).json({ error: "booking not found" });
  }
  if (booking.guideId !== guideId) {
    return res.status(403).json({ error: "only the assigned guide can rate this tourist" });
  }
  if (!booking.touristId) {
    return res.status(409).json({ error: "this booking has no tourist account to rate" });
  }
  if (booking.status !== "paid") {
    return res.status(409).json({ error: "you can rate a tourist once the tour is complete and paid out" });
  }
  if (booking.touristRating) {
    return res.status(409).json({ error: "you've already rated this tourist" });
  }

  const { data, error } = await supabaseAdmin
    .from("tourist_ratings")
    .insert({
      booking_id: bookingId,
      guide_id: guideId,
      tourist_id: booking.touristId,
      stars,
      comment: comment || null,
    })
    .select("stars, comment")
    .single();

  if (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "you've already rated this tourist" });
    }
    console.error("[ratings] failed to save tourist rating", error.message);
    return res.status(500).json({ error: "failed to save rating" });
  }

  res.status(201).json({ rating: { stars: data.stars, comment: data.comment } });
});
