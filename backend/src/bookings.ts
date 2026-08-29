import { supabaseAdmin } from "./supabase.js";

export type BookingStatus = "locked" | "released" | "paid";

export interface PayoutInfo {
  reference: string;
  phone: string;
  kesAmount: number;
  usdcAmount: number;
  completedAt: string;
}

export interface RatingInfo {
  stars: number;
  comment: string | null;
}

export interface BookingRecord {
  bookingId: string; // uuid, also keccak'd (bookingIdToBytes32) to derive the on-chain id
  touristId: string | null;
  guideId: string;
  guideName: string;
  guideWallet: string;
  guidePhone: string | null;
  experienceId: string | null;
  experienceTitle: string | null;
  experienceImageUrl: string | null;
  experienceLocation: string | null;
  experienceDurationMinutes: number | null;
  hotelName: string | null;
  hotelWallet: string | null;
  request: string | null;
  matchReason: string | null;
  amountUsdc: number;
  status: BookingStatus;
  lockTxHash: string | null;
  releaseTxHash: string | null;
  splits?: { guideAmount: number; hotelAmount: number; protocolAmount: number };
  payout: PayoutInfo | null;
  rating: RatingInfo | null;
  createdAt: string;
}

const SELECT = `
  id, tourist_id, guide_id, experience_id, request_text, match_reason, amount_usdc, status,
  guide_wallet, hotel_name, hotel_wallet, lock_tx_hash, release_tx_hash,
  guide_split, hotel_split, protocol_split, payout, created_at,
  guide:guide_id ( full_name, phone ),
  experience:experience_id ( title, image_url, location, duration_minutes )
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBookingRecord(row: any, rating: RatingInfo | null = null): BookingRecord {
  return {
    bookingId: row.id,
    touristId: row.tourist_id,
    guideId: row.guide_id,
    guideName: row.guide?.full_name ?? "Guide",
    guideWallet: row.guide_wallet,
    guidePhone: row.guide?.phone ?? null,
    experienceId: row.experience_id,
    experienceTitle: row.experience?.title ?? null,
    experienceImageUrl: row.experience?.image_url ?? null,
    experienceLocation: row.experience?.location ?? null,
    experienceDurationMinutes: row.experience?.duration_minutes ?? null,
    hotelName: row.hotel_name,
    hotelWallet: row.hotel_wallet,
    request: row.request_text,
    matchReason: row.match_reason,
    amountUsdc: Number(row.amount_usdc),
    status: row.status,
    lockTxHash: row.lock_tx_hash,
    releaseTxHash: row.release_tx_hash,
    splits:
      row.guide_split != null
        ? {
            guideAmount: Number(row.guide_split),
            hotelAmount: Number(row.hotel_split ?? 0),
            protocolAmount: Number(row.protocol_split ?? 0),
          }
        : undefined,
    payout: row.payout ?? null,
    rating,
    createdAt: row.created_at,
  };
}

/// Batch-fetches ratings for a set of bookings, keyed by booking id, so
/// list/detail endpoints can attach "already rated" state in one extra query.
async function fetchRatingsByBookingId(bookingIds: string[]): Promise<Map<string, RatingInfo>> {
  if (bookingIds.length === 0) return new Map();
  const { data } = await supabaseAdmin.from("ratings").select("booking_id, stars, comment").in("booking_id", bookingIds);
  return new Map((data ?? []).map((r) => [r.booking_id as string, { stars: r.stars, comment: r.comment } as RatingInfo]));
}

export interface CreateBookingInput {
  bookingId: string;
  touristId: string | null;
  guideId: string;
  guideWallet: string;
  experienceId: string | null;
  hotelName: string | null;
  hotelWallet: string | null;
  request: string;
  matchReason: string;
  amountUsdc: number;
  lockTxHash: string;
}

export async function saveBooking(input: CreateBookingInput): Promise<BookingRecord> {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .insert({
      id: input.bookingId,
      tourist_id: input.touristId,
      guide_id: input.guideId,
      guide_wallet: input.guideWallet,
      experience_id: input.experienceId,
      hotel_name: input.hotelName,
      hotel_wallet: input.hotelWallet,
      request_text: input.request,
      match_reason: input.matchReason,
      amount_usdc: input.amountUsdc,
      status: "locked",
      lock_tx_hash: input.lockTxHash,
    })
    .select(SELECT)
    .single();

  if (error || !data) throw new Error(error?.message ?? "failed to save booking");
  return toBookingRecord(data);
}

export async function getBooking(bookingId: string): Promise<BookingRecord | undefined> {
  const { data, error } = await supabaseAdmin.from("bookings").select(SELECT).eq("id", bookingId).maybeSingle();
  if (error || !data) return undefined;
  const ratings = await fetchRatingsByBookingId([bookingId]);
  return toBookingRecord(data, ratings.get(bookingId) ?? null);
}

export interface UpdateBookingPatch {
  status?: BookingStatus;
  releaseTxHash?: string;
  splits?: { guideAmount: number; hotelAmount: number; protocolAmount: number };
  payout?: PayoutInfo;
}

export async function updateBooking(bookingId: string, patch: UpdateBookingPatch): Promise<BookingRecord | undefined> {
  const update: Record<string, unknown> = {};
  if (patch.status) update.status = patch.status;
  if (patch.releaseTxHash) update.release_tx_hash = patch.releaseTxHash;
  if (patch.splits) {
    update.guide_split = patch.splits.guideAmount;
    update.hotel_split = patch.splits.hotelAmount;
    update.protocol_split = patch.splits.protocolAmount;
  }
  if (patch.payout) update.payout = patch.payout;

  const { data, error } = await supabaseAdmin.from("bookings").update(update).eq("id", bookingId).select(SELECT).single();

  if (error || !data) return undefined;
  return toBookingRecord(data);
}

export interface ListBookingsFilter {
  touristId?: string;
  guideId?: string;
}

export async function listBookings(filter: ListBookingsFilter = {}): Promise<BookingRecord[]> {
  let query = supabaseAdmin.from("bookings").select(SELECT).order("created_at", { ascending: false });
  if (filter.touristId) query = query.eq("tourist_id", filter.touristId);
  if (filter.guideId) query = query.eq("guide_id", filter.guideId);

  const { data, error } = await query;
  if (error || !data) return [];
  const ratings = await fetchRatingsByBookingId(data.map((row) => row.id as string));
  return data.map((row) => toBookingRecord(row, ratings.get(row.id as string) ?? null));
}
