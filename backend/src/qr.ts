import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.QR_SIGNING_SECRET ?? "change_me_super_secret";

/// Signs a bookingId so the QR code cannot be forged by anyone who doesn't
/// know the backend's secret. Token format: <bookingId>.<hexHmac>
export function signBookingToken(bookingId: string): string {
  const hmac = createHmac("sha256", SECRET).update(bookingId).digest("hex");
  return `${bookingId}.${hmac}`;
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
