import {
  KENYA_VIEWBOX,
  countyFromNominatimAddress,
  formatKenyaPlaceLabel,
  isInKenyaBounds,
  kenyaNominatimQuery,
  type GeocodeHit,
} from "@/lib/kenyaGeocode";

const NOMINATIM_HEADERS = {
  "User-Agent": "Guidemate/1.0 (kenya-experiences)",
  Accept: "application/json",
};

export async function searchKenyaPlaces(query: string, limit = 8): Promise<GeocodeHit[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", kenyaNominatimQuery(query));
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("countrycodes", "ke");
  url.searchParams.set("viewbox", KENYA_VIEWBOX);
  url.searchParams.set("bounded", "0");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url, { headers: NOMINATIM_HEADERS, next: { revalidate: 3600 } });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    lat: string;
    lon: string;
    display_name: string;
    address?: Record<string, string>;
  }[];

  return data
    .map((row) => ({
      lat: Number(row.lat),
      lng: Number(row.lon),
      label: formatKenyaPlaceLabel(row.display_name),
      county: countyFromNominatimAddress(row.address),
    }))
    .filter((row) => isInKenyaBounds(row.lat, row.lng));
}

export async function reverseKenyaLabel(lat: number, lng: number): Promise<string | null> {
  if (!isInKenyaBounds(lat, lng)) return null;
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("zoom", "16");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url, { headers: NOMINATIM_HEADERS, next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const data = (await res.json()) as { display_name?: string; address?: Record<string, string> };
  if (data.address?.country_code?.toLowerCase() !== "ke") return null;
  const label = data.display_name ? formatKenyaPlaceLabel(data.display_name) : null;
  const county = countyFromNominatimAddress(data.address);
  if (label && county && !label.toLowerCase().includes(county.toLowerCase().replace(" county", ""))) {
    return `${label} · ${county}`;
  }
  return label;
}
