import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  const res = await fetch(url, {
    headers: { "User-Agent": "Guidemate/1.0 (experience-setup)", Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return NextResponse.json({ results: [] }, { status: 502 });
  const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  return NextResponse.json({
    results: data.map((row) => ({
      lat: Number(row.lat),
      lng: Number(row.lon),
      label: row.display_name,
    })),
  });
}
