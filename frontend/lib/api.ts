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
  experienceImageUrls: string[];
  experienceLocation: string | null;
  experienceDurationMinutes: number | null;
  hotelName: string | null;
  hotelWallet: string | null;
  touristName: string | null;
  touristPhone: string | null;
  touristBio: string | null;
  touristLanguages: string[];
  touristCompletedTripCount: number;
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
  touristRating: RatingInfo | null;
  touristRatingAvg: number;
  touristRatingCount: number;
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
    paymentMethod?: "demo" | "mpesa" | "custodial" | "external";
    paymentIntentId?: string;
    txHash?: string;
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

/// Guide-only: settles a booking as a tourist no-show, refunding 80% back
/// through escrow (minus a 20% inconvenience fee) instead of paying the guide.
export function reportNoShow(bookingId: string, accessToken: string) {
  return request<{ booking: BookingRecord }>(`/api/bookings/${bookingId}/no-show`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}

export function getCompletionQrValue(qrToken: string): string {
  const publicBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (publicBase && !/localhost|127\.0\.0\.1/.test(publicBase)) {
    return `${publicBase}/verify?token=${encodeURIComponent(qrToken)}`;
  }
  // Local dev: localhost URLs fail when scanned with a phone camera — encode the raw token
  // so the guide's in-app scanner (Tour → Scan tourist QR) can read it.
  return qrToken;
}

/** @deprecated use getCompletionQrValue */
export function getVerifyUrl(qrToken: string) {
  return getCompletionQrValue(qrToken);
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

export function submitTouristRating(
  input: { bookingId: string; stars: number; comment?: string },
  accessToken: string
) {
  return request<{ rating: RatingInfo }>("/api/ratings/tourist", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export interface GuidePublicReview {
  stars: number;
  comment: string | null;
  createdAt: string;
  touristFirstName: string;
}

export interface GuidePublicExperience {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: string | null;
  priceUsdc: number;
  durationMinutes: number;
  location: string | null;
  imageUrl: string | null;
}

export interface GuidePublicProfile {
  id: string;
  fullName: string;
  bio: string | null;
  languages: string[];
  ratingAvg: number;
  ratingCount: number;
  isVetted: boolean;
  completedTripCount: number;
  reviews: GuidePublicReview[];
  experiences: GuidePublicExperience[];
}

export function getGuideProfile(guideId: string) {
  return request<{ guide: GuidePublicProfile }>(`/api/guides/${guideId}`);
}

export interface TouristPublicReview {
  stars: number;
  comment: string | null;
  createdAt: string;
  guideFirstName: string;
  experienceTitle: string | null;
}

export interface TouristPublicProfile {
  id: string;
  fullName: string;
  phone: string | null;
  bio: string | null;
  languages: string[];
  ratingAvg: number;
  ratingCount: number;
  completedTripCount: number;
  reviews: TouristPublicReview[];
}

export function getTouristProfile(touristId: string, accessToken: string) {
  return request<{ tourist: TouristPublicProfile }>(`/api/tourists/${touristId}`, {
    headers: authHeaders(accessToken),
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
  scheduledAt: string | null;
  communityNotifiedAt: string | null;
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

export function listUpcomingStreams() {
  return request<{ streams: LiveStreamRecord[] }>("/api/streams/upcoming");
}

export function listMyScheduledStreams(accessToken: string) {
  return request<{ streams: LiveStreamRecord[] }>("/api/streams/mine/scheduled", {
    headers: authHeaders(accessToken),
  });
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

export function scheduleStream(
  input: { title: string; scheduledAt: string; experienceId?: string; priceUsdc?: number },
  accessToken: string
) {
  return request<{ stream: LiveStreamRecord }>("/api/streams/schedule", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export function notifyStreamCommunity(streamId: string, accessToken: string) {
  return request<{ stream: LiveStreamRecord }>(`/api/streams/${streamId}/notify`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}

export function startScheduledStream(streamId: string, accessToken: string) {
  return request<{ stream: LiveStreamRecord; token: string }>(`/api/streams/${streamId}/start`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}

export function joinStream(
  streamId: string,
  accessToken?: string,
  opts?: { txHash?: string; paymentIntentId?: string }
) {
  return request<{ token: string; stream: LiveStreamRecord; role: "publisher" | "viewer" }>(
    `/api/streams/${streamId}/join-token`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(opts ?? {}),
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

export interface WalletTransaction {
  id: string;
  profileId: string;
  type: string;
  amountUsdc: number;
  amountKes: number | null;
  referenceType: string | null;
  referenceId: string | null;
  txHash: string | null;
  mpesaRef: string | null;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface WalletSummary {
  address: string | null;
  balanceUsdc: number;
  balanceKes: number;
  transactions: WalletTransaction[];
}

export function getWallet(accessToken: string) {
  return request<WalletSummary>("/api/wallet", { headers: authHeaders(accessToken) });
}

export function withdrawWallet(amountUsdc: number, accessToken: string, phone?: string) {
  return request<{ withdrawalId: string; reference: string; kesAmount: number; pending?: true }>("/api/wallet/withdraw", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ amountUsdc, phone }),
  });
}

export function initiateMpesaPayment(
  input: { purpose: "booking" | "stream_ppv" | "stream_tip"; referenceId: string; amountUsdc: number; phone: string },
  accessToken: string
) {
  return request<{
    intentId: string;
    checkoutRequestId: string;
    mpesaReceipt?: string;
    amountKes: number;
    amountUsdc: number;
    status: "completed" | "processing" | "failed";
    message?: string;
  }>("/api/payments/mpesa/initiate", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export function getMpesaPaymentStatus(intentId: string, accessToken: string) {
  return request<{
    intentId: string;
    status: string;
    mpesaReceipt: string | null;
    amountKes: number;
    amountUsdc: number;
    purpose: string;
    referenceId: string;
  }>(`/api/payments/mpesa/${intentId}`, { headers: authHeaders(accessToken) });
}

export async function pollMpesaPayment(
  intentId: string,
  accessToken: string,
  opts?: { timeoutMs?: number; intervalMs?: number }
): Promise<{ status: string; mpesaReceipt: string | null }> {
  const timeoutMs = opts?.timeoutMs ?? 120_000;
  const intervalMs = opts?.intervalMs ?? 2500;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const status = await getMpesaPaymentStatus(intentId, accessToken);
    if (status.status === "completed") {
      return { status: status.status, mpesaReceipt: status.mpesaReceipt };
    }
    if (status.status === "failed" || status.status === "cancelled") {
      throw new Error("M-Pesa payment was not completed");
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for M-Pesa payment — check your phone and try again");
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export function getChat(bookingId: string, accessToken: string) {
  return request<{ conversation: { id: string; bookingId: string }; messages: ChatMessage[] }>(
    `/api/chat/${bookingId}`,
    { headers: authHeaders(accessToken) }
  );
}

export function sendChatMessage(bookingId: string, body: string, accessToken: string) {
  return request<{ message: ChatMessage }>(`/api/chat/${bookingId}/messages`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ body }),
  });
}

export interface StreamComment {
  id: string;
  profileId: string | null;
  displayName: string;
  body: string;
  createdAt: string;
}

export interface StreamStats {
  viewerCount: number;
  reactionCount: number;
  tipCount: number;
  tipTotalUsdc: number;
}

export function listStreamComments(streamId: string) {
  return request<{ comments: StreamComment[] }>(`/api/streams/${streamId}/comments`);
}

export function postStreamComment(streamId: string, body: string, accessToken?: string) {
  return request<{ comment: StreamComment }>(`/api/streams/${streamId}/comments`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ body }),
  });
}

export function postStreamReaction(streamId: string, type: "like" | "flower", accessToken?: string) {
  return request<{ reaction: unknown; total: number }>(`/api/streams/${streamId}/reactions`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ type }),
  });
}

export function getStreamStats(streamId: string) {
  return request<StreamStats>(`/api/streams/${streamId}/stats`);
}

export interface AnalyticsOverview {
  guides: number;
  tourists: number;
  admins: number;
  bookingsTotal: number;
  bookingsLocked: number;
  bookingsPaid: number;
  bookingsRefunded: number;
  gmvUsdc: number;
  platformRevenueUsdc: number;
  guideEarningsUsdc: number;
  streamsTotal: number;
  streamsLive: number;
  streamTipsUsdc: number;
  waitlistCount: number;
  pendingApplications: number;
}

export function getAdminOverview(accessToken: string, from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return request<{ overview: AnalyticsOverview }>(`/api/admin/analytics/overview${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(accessToken),
  });
}

export function getAdminTransactions(accessToken: string, opts?: { limit?: number; type?: string }) {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.type) params.set("type", opts.type);
  const qs = params.toString();
  return request<{ transactions: WalletTransaction[] }>(`/api/admin/transactions${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(accessToken),
  });
}

export function getAdminReportUrl(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return `${API_BASE}/api/admin/reports/export${qs ? `?${qs}` : ""}`;
}

export async function downloadAdminReport(accessToken: string, from?: string, to?: string) {
  const url = getAdminReportUrl(from, to);
  const res = await fetch(url, { headers: authHeaders(accessToken) });
  if (!res.ok) throw new Error("Failed to download report");
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "guidemate-report.csv";
  a.click();
  URL.revokeObjectURL(a.href);
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
