const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export interface ExperienceGuide {
  id: string;
  fullName: string;
  phone: string | null;
  walletAddress: string | null;
  bio: string | null;
  languages: string[];
}

export interface Experience {
  id: string;
  title: string;
  description: string;
  tags: string[];
  priceUsdc: number;
  durationMinutes: number;
  location: string | null;
  guide: ExperienceGuide;
}

export interface MatchResult {
  experience: Experience;
  reason: string;
  source: "gemini" | "local";
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
  touristId: string | null;
  guideId: string;
  guideName: string;
  guideWallet: string;
  guidePhone: string | null;
  experienceId: string | null;
  experienceTitle: string | null;
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

function authHeaders(accessToken?: string): HeadersInit {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export function matchExperience(text: string) {
  return request<MatchResult>("/api/match", {
    method: "POST",
    body: JSON.stringify({ request: text }),
  });
}

export function createBooking(
  input: {
    request: string;
    experienceId: string;
    matchReason: string;
    hotelName?: string;
    hotelWallet?: string;
  },
  accessToken?: string
) {
  return request<{ booking: BookingRecord; qrToken: string }>("/api/book", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export function getBooking(bookingId: string) {
  return request<{ booking: BookingRecord }>(`/api/bookings/${bookingId}`);
}

/// Returns bookings for the signed-in user (as tourist and/or guide).
export function listMyBookings(accessToken: string) {
  return request<{ bookings: BookingRecord[] }>("/api/bookings", {
    headers: authHeaders(accessToken),
  });
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
