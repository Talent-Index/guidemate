const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export interface ExperienceGuide {
  id: string;
  fullName: string;
  phone: string | null;
  walletAddress: string | null;
  bio: string | null;
  languages: string[];
  ratingAvg: number;
  ratingCount: number;
  isVetted: boolean;
}

export interface Experience {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: string | null;
  priceUsdc: number;
  durationMinutes: number;
  location: string | null;
  imageUrl: string | null;
  guide: ExperienceGuide;
}

export interface MatchResult {
  experience: Experience;
  reason: string;
  source: "gemini" | "local";
}

export type BookingStatus = "locked" | "released" | "paid" | "refunded";

export interface PayoutInfo {
  reference: string;
  phone: string;
  kesAmount: number;
  usdcAmount: number;
  completedAt: string;
}

export interface FxSnapshot {
  base: "USDC";
  rates: Record<string, number>;
  asOf: string;
  source: string;
}

export interface RatingInfo {
  stars: number;
  comment: string | null;
}

export interface RefundInfo {
  feeAmount: number;
  refundAmount: number;
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
  experienceImageUrl: string | null;
  experienceLocation: string | null;
  experienceDurationMinutes: number | null;
  hotelName: string | null;
  hotelWallet: string | null;
  touristName: string | null;
  touristPhone: string | null;
  request: string | null;
  matchReason: string | null;
  amountUsdc: number;
  status: BookingStatus;
  lockTxHash: string | null;
  releaseTxHash: string | null;
  refundTxHash: string | null;
  splits?: { guideAmount: number; hotelAmount: number; protocolAmount: number };
  payout: PayoutInfo | null;
  refund: RefundInfo | null;
  rating: RatingInfo | null;
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

export function getFxRates() {
  return request<FxSnapshot>("/api/fx");
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

export function getCompletionCode(bookingId: string, accessToken?: string) {
  return request<{ qrToken: string; pin: string }>(`/api/bookings/${bookingId}/completion-code`, {
    headers: authHeaders(accessToken),
  });
}

export const SNOWTRACE_TX_BASE = "https://testnet.snowtrace.io/tx";

export function completeBooking(token: string) {
  return request<{ booking: BookingRecord }>("/api/complete", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function completeBookingWithPin(bookingId: string, pin: string, accessToken: string) {
  return request<{ booking: BookingRecord }>("/api/complete", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ bookingId, pin }),
  });
}

/// Guide-only: settles a booking as a tourist no-show, refunding 50% back
/// through escrow (minus a 50% inconvenience fee) instead of paying the guide.
export function reportNoShow(bookingId: string, accessToken: string) {
  return request<{ booking: BookingRecord }>(`/api/bookings/${bookingId}/no-show`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}

export function getVerifyUrl(qrToken: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/verify?token=${encodeURIComponent(qrToken)}`;
}

export function submitRating(
  input: { bookingId: string; stars: number; comment?: string },
  accessToken: string
) {
  return request<{ rating: RatingInfo }>("/api/ratings", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export type StreamStatus = "scheduled" | "live" | "ended";

export interface LiveStreamRecord {
  id: string;
  guideId: string;
  guideName: string;
  guideWallet: string | null;
  experienceId: string | null;
  experienceTitle: string | null;
  roomName: string;
  title: string;
  status: StreamStatus;
  priceUsdc: number;
  startedAt: string | null;
  endedAt: string | null;
  recordingUrl: string | null;
  createdAt: string;
}

export interface StreamTip {
  id: string;
  tipperId: string | null;
  tipperWallet: string | null;
  amountUsdc: number;
  txHash: string;
  createdAt: string;
}

export function listLiveStreams() {
  return request<{ streams: LiveStreamRecord[] }>("/api/streams/live");
}

export function listRecordedStreams() {
  return request<{ streams: LiveStreamRecord[] }>("/api/streams/recorded");
}

export function getStream(streamId: string) {
  return request<{ stream: LiveStreamRecord }>(`/api/streams/${streamId}`);
}

export function listStreamTips(streamId: string) {
  return request<{ tips: StreamTip[] }>(`/api/streams/${streamId}/tips`);
}

export function startStream(
  input: { title: string; experienceId?: string; priceUsdc?: number },
  accessToken: string
) {
  return request<{ stream: LiveStreamRecord; token: string }>("/api/streams", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export function joinStream(
  streamId: string,
  accessToken?: string,
  txHash?: string
) {
  return request<{ token: string; stream: LiveStreamRecord; role: "publisher" | "viewer" }>(
    `/api/streams/${streamId}/join-token`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(txHash ? { txHash } : {}),
    }
  );
}

export function endStream(streamId: string, accessToken: string) {
  return request<{ stream: LiveStreamRecord }>(`/api/streams/${streamId}/end`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}

export function provisionWallet(accessToken: string) {
  return request<{ walletAddress: string }>("/api/wallet/provision", {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}

export function approveApplication(id: string, accessToken: string) {
  return request<{ ok: true; userId: string; walletAddress: string }>(`/api/admin/applications/${id}/approve`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}

export function recordStreamTip(
  streamId: string,
  input: { amountUsdc: number; txHash: string; tipperWallet?: string },
  accessToken?: string
) {
  return request<{ tip: StreamTip }>(`/api/streams/${streamId}/tip`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}
