import { Router } from "express";
import { z } from "zod";
import {
  ensureConversation,
  getConversationByBooking,
  listMessages,
  markMessagesRead,
  sendMessage,
} from "../chat.js";
import { getBooking } from "../bookings.js";
import { getUserIdFromAuthHeader } from "../supabase.js";

export const chatRouter = Router();

chatRouter.get("/:bookingId", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  const booking = await getBooking(req.params.bookingId);
  if (!booking) return res.status(404).json({ error: "booking not found" });
  if (booking.touristId !== userId && booking.guideId !== userId) {
    return res.status(403).json({ error: "not a participant on this booking" });
  }
  if (booking.status !== "locked") {
    return res.status(409).json({ error: "chat is only available for active bookings" });
  }

  const touristId = booking.touristId!;
  const conversation = await ensureConversation(booking.bookingId, touristId, booking.guideId);
  const messages = await listMessages(conversation.id);
  await markMessagesRead(conversation.id, userId);
  res.json({ conversation, messages });
});

const sendSchema = z.object({ body: z.string().min(1).max(2000) });

chatRouter.post("/:bookingId/messages", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const booking = await getBooking(req.params.bookingId);
  if (!booking) return res.status(404).json({ error: "booking not found" });
  if (booking.touristId !== userId && booking.guideId !== userId) {
    return res.status(403).json({ error: "not a participant on this booking" });
  }
  if (booking.status !== "locked") {
    return res.status(409).json({ error: "chat is only available for active bookings" });
  }

  let conversation = await getConversationByBooking(booking.bookingId);
  if (!conversation) {
    conversation = await ensureConversation(booking.bookingId, booking.touristId!, booking.guideId);
  }

  const message = await sendMessage(conversation.id, userId, parsed.data.body);
  res.status(201).json({ message });
});
