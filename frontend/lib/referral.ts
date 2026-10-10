const STORAGE_KEY = "guidemate_referral_code";

export function captureReferralFromSearch(search: string): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const ref = params.get("ref")?.trim();
  if (!ref) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, ref.slice(0, 32));
  } catch {
    /* ignore */
  }
}

export function readStoredReferralCode(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw?.trim() || undefined;
  } catch {
    return undefined;
  }
}
