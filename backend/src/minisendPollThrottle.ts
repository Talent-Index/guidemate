/** Avoid hammering Minisend order/status APIs while the client polls M-Pesa payment status. */
const lastPollByIntent = new Map<string, number>();
export const MINISEND_STATUS_POLL_MS = 8_000;

export function shouldPollMinisend(intentId: string): boolean {
  const now = Date.now();
  const last = lastPollByIntent.get(intentId) ?? 0;
  if (now - last < MINISEND_STATUS_POLL_MS) return false;
  lastPollByIntent.set(intentId, now);
  return true;
}
