/** Kenya bounding box for Nominatim viewbox bias (left, top, right, bottom). */
export const KENYA_VIEWBOX = "33.9,5.0,41.9,-4.7";

export type GeocodeHit = { lat: number; lng: number; label: string; county?: string };

/** Well-known places guides search for (Nairobi & major hubs). */
const KENYA_PLACE_HINTS: { match: RegExp; hits: GeocodeHit[] }[] = [
  {
    match: /^nation\s*cent(er|re)$/i,
    hits: [
      {
        lat: -1.2876,
        lng: 36.8235,
        label: "Nation Centre, Nairobi CBD, Nairobi, Kenya",
        county: "Nairobi County",
      },
    ],
  },
  {
    match: /^kicc$/i,
    hits: [
      {
        lat: -1.2892,
        lng: 36.8219,
        label: "KICC, City Square, Nairobi, Kenya",
        county: "Nairobi County",
      },
    ],
  },
  {
    match: /^westlands$/i,
    hits: [{ lat: -1.2674, lng: 36.807, label: "Westlands, Nairobi, Kenya", county: "Nairobi County" }],
  },
  {
    match: /^karen$/i,
    hits: [{ lat: -1.3197, lng: 36.7073, label: "Karen, Nairobi, Kenya", county: "Nairobi County" }],
  },
  {
    match: /^cbd|nairobi\s*cbd$/i,
    hits: [{ lat: -1.2864, lng: 36.8172, label: "Nairobi CBD, Nairobi, Kenya", county: "Nairobi County" }],
  },
  {
    match: /^mombasa$/i,
    hits: [{ lat: -4.0435, lng: 39.6682, label: "Mombasa, Kenya", county: "Mombasa County" }],
  },
  {
    match: /^kisumu$/i,
    hits: [{ lat: -0.0917, lng: 34.768, label: "Kisumu, Kenya", county: "Kisumu County" }],
  },
  {
    match: /^nakuru$/i,
    hits: [{ lat: -0.3031, lng: 36.08, label: "Nakuru, Kenya", county: "Nakuru County" }],
  },
  {
    match: /^eldoret$/i,
    hits: [{ lat: 0.5143, lng: 35.2698, label: "Eldoret, Kenya", county: "Uasin Gishu County" }],
  },
];

export function normalizeKenyaCounty(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const c = raw.trim();
  if (/county/i.test(c)) return c;
  return `${c} County`;
}

export function countyFromNominatimAddress(address?: Record<string, string>): string | undefined {
  if (!address) return undefined;
  const raw =
    address.county ??
    address.state ??
    address.region ??
    address.city ??
    address.town;
  return normalizeKenyaCounty(raw);
}

export function localKenyaPlaceHints(query: string): GeocodeHit[] {
  const q = query.trim();
  if (!q) return [];
  for (const { match, hits } of KENYA_PLACE_HINTS) {
    if (match.test(q)) return hits;
  }
  return [];
}

export function kenyaNominatimQuery(query: string): string {
  const q = query.trim();
  if (!q) return q;
  const lower = q.toLowerCase();
  if (
    lower.includes("kenya") ||
    lower.includes("nairobi") ||
    lower.includes("mombasa") ||
    lower.includes("kisumu") ||
    lower.includes("nakuru")
  ) {
    return q;
  }
  return `${q}, Kenya`;
}

export function isInKenyaBounds(lat: number, lng: number): boolean {
  return lat >= -4.8 && lat <= 5.1 && lng >= 33.8 && lng <= 42.0;
}

export function formatKenyaPlaceLabel(displayName: string): string {
  const parts = displayName.split(",").map((p) => p.trim());
  const kenyaIdx = parts.findIndex((p) => p.toLowerCase() === "kenya");
  if (kenyaIdx >= 0) {
    return parts.slice(0, kenyaIdx + 1).join(", ");
  }
  return displayName;
}

export function mergeGeocodeResults(local: GeocodeHit[], remote: GeocodeHit[], limit = 8): GeocodeHit[] {
  const seen = new Set<string>();
  const out: GeocodeHit[] = [];
  for (const hit of [...local, ...remote]) {
    const key = `${hit.lat.toFixed(4)}:${hit.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
    if (out.length >= limit) break;
  }
  return out;
}
