import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.QR_SIGNING_SECRET ?? "change_me_super_secret";

/// Signs a bookingId so the QR code cannot be forged by anyone who doesn't
/// know the backend's secret. Token format: <bookingId>.<hexHmac>
export function signBookingToken(bookingId: string): string {
  const hmac = createHmac("sha256", SECRET).update(bookingId).digest("hex");
  return `${bookingId}.${hmac}`;
}

/// Deterministic 6-digit end-trip PIN. Shown only to the tourist; the guide
/// types it on their device to release escrow (Uber-style).
export function completionPin(bookingId: string): string {
  const hmac = createHmac("sha256", SECRET).update(`pin:${bookingId}`).digest();
  return (hmac.readUInt32BE(0) % 1_000_000).toString().padStart(6, "0");
}

export function verifyCompletionPin(bookingId: string, pin: string): boolean {
  const expected = completionPin(bookingId);
  const provided = pin.replace(/\D/g, "").padStart(6, "0");
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyBookingToken(token: string): { valid: boolean; bookingId?: string } {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return { valid: false };

  const bookingId = token.slice(0, lastDot);
  const providedHmac = token.slice(lastDot + 1);
  const expectedHmac = createHmac("sha256", SECRET).update(bookingId).digest("hex");

  const a = Buffer.from(providedHmac, "hex");
  const b = Buffer.from(expectedHmac, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false };
  }

  return { valid: true, bookingId };
}
