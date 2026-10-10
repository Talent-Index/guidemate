const TTL_MS = 60_000;
const cache = new Map<string, { expiresAt: number; payload: unknown }>();

export function getCachedQuote(key: string): unknown | undefined {
  const hit = cache.get(key);
  if (!hit || hit.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit.payload;
}

export function setCachedQuote(key: string, payload: unknown): void {
  cache.set(key, { expiresAt: Date.now() + TTL_MS, payload });
}
