import type { Guide } from "./match.js";

export type BookingStatus = "locked" | "released" | "paid";

export interface PayoutInfo {
  reference: string;
  phone: string;
  kesAmount: number;
  usdcAmount: number;
  completedAt: string;
}

export interface BookingRecord {
  bookingId: string; // human-readable id, also used (keccak'd) as the on-chain bytes32 id
  guide: Guide;
  hotel: { name: string; wallet: string };
  request: string;
  matchReason: string;
  amountUsdc: number;
  status: BookingStatus;
  lockTxHash?: string;
  releaseTxHash?: string;
  splits?: { guideAmount: number; hotelAmount: number; protocolAmount: number };
  payout?: PayoutInfo;
  createdAt: string;
}

/// In-memory store - perfectly fine for a hackathon demo (single backend process,
/// no restarts expected mid-demo). Swap for a real DB post-hackathon.
const bookings = new Map<string, BookingRecord>();

export function saveBooking(record: BookingRecord) {
  bookings.set(record.bookingId, record);
}

export function getBooking(bookingId: string): BookingRecord | undefined {
  return bookings.get(bookingId);
}

export function updateBooking(bookingId: string, patch: Partial<BookingRecord>) {
  const existing = bookings.get(bookingId);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch };
  bookings.set(bookingId, updated);
  return updated;
}

export function listBookings(): BookingRecord[] {
  return Array.from(bookings.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
