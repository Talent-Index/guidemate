import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");
  if (!lat || !lng) return NextResponse.json({ label: null });
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lng);
  url.searchParams.set("format", "json");
  const res = await fetch(url, {
    headers: { "User-Agent": "Guidemate/1.0 (experience-setup)", Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return NextResponse.json({ label: null }, { status: 502 });
  const data = (await res.json()) as { display_name?: string };
  return NextResponse.json({ label: data.display_name ?? null });
}
