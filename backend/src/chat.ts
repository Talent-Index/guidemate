import { supabaseAdmin } from "./supabase.js";

export interface Conversation {
  id: string;
  bookingId: string;
  touristId: string;
  guideId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export async function ensureConversation(bookingId: string, touristId: string, guideId: string): Promise<Conversation> {
  const { data: existing } = await supabaseAdmin
    .from("conversations")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (existing) return mapConversation(existing);

  const { data, error } = await supabaseAdmin
    .from("conversations")
    .insert({ booking_id: bookingId, tourist_id: touristId, guide_id: guideId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapConversation(data);
}

function mapConversation(row: Record<string, unknown>): Conversation {
  return {
    id: row.id as string,
    bookingId: row.booking_id as string,
    touristId: row.tourist_id as string,
    guideId: row.guide_id as string,
    createdAt: row.created_at as string,
  };
}

function mapMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    senderId: row.sender_id as string,
    body: row.body as string,
    readAt: (row.read_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function getConversationByBooking(bookingId: string): Promise<Conversation | null> {
  const { data } = await supabaseAdmin
    .from("conversations")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();
  return data ? mapConversation(data) : null;
}

export async function listMessages(conversationId: string, limit = 100): Promise<Message[]> {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMessage);
}

export async function sendMessage(conversationId: string, senderId: string, body: string): Promise<Message> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("message cannot be empty");
  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body: trimmed })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapMessage(data);
}

export async function markMessagesRead(conversationId: string, readerId: string): Promise<void> {
  await supabaseAdmin
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", readerId)
    .is("read_at", null);
}
