import { NextRequest, NextResponse } from "next/server";
import { reverseKenyaLabel } from "@/lib/nominatim";

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ label: null });
  }

  const label = await reverseKenyaLabel(lat, lng);
  return NextResponse.json({ label });
}
