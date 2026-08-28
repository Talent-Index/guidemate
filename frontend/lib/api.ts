const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export interface Guide {
  id: string;
  name: string;
  wallet: string;
  phone: string;
  tags: string[];
  languages: string[];
  reputationScore: number;
  completedTours: number;
  priceUsdc: number;
  bio: string;
}

export interface MatchResult {
  guide: Guide;
  reason: string;
  source: "openai" | "local";
}

export type BookingStatus = "locked" | "released" | "paid";

export interface PayoutInfo {
  reference: string;
  phone: string;
  kesAmount: number;
  usdcAmount: number;
  completedAt: string;
}

export interface BookingRecord {
  bookingId: string;
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = (body as { error?: unknown }).error ?? `Request failed: ${res.status}`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }

  return body as T;
}

export function matchGuide(text: string) {
  return request<MatchResult>("/api/match", {
    method: "POST",
    body: JSON.stringify({ request: text }),
  });
}

export function createBooking(input: {
  request: string;
  guideId: string;
  matchReason: string;
  hotelName?: string;
  hotelWallet?: string;
}) {
  return request<{ booking: BookingRecord; qrToken: string }>("/api/book", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getBooking(bookingId: string) {
  return request<{ booking: BookingRecord }>(`/api/bookings/${bookingId}`);
}

export function listBookings() {
  return request<{ bookings: BookingRecord[] }>("/api/bookings");
}

export function getQrToken(bookingId: string) {
  return request<{ qrToken: string }>(`/api/bookings/${bookingId}/qr-token`);
}

export const SNOWTRACE_TX_BASE = "https://testnet.snowtrace.io/tx";

export function completeBooking(token: string) {
  return request<{ booking: BookingRecord }>("/api/complete", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function getVerifyUrl(qrToken: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/verify?token=${encodeURIComponent(qrToken)}`;
}
