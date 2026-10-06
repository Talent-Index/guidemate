const STORAGE_KEY = "guidemate_utm";

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

/** Persist UTM query params from a landing URL (client only). */
export function captureUtmFromSearch(search: string): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const next: UtmParams = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim();
    if (value) next[key] = value.slice(0, 200);
  }
  if (Object.keys(next).length === 0) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readStoredUtm(): UtmParams {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as UtmParams;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
