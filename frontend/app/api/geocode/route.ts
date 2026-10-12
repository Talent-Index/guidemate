import { NextRequest, NextResponse } from "next/server";
import { localKenyaPlaceHints, mergeGeocodeResults } from "@/lib/kenyaGeocode";
import { searchKenyaPlaces } from "@/lib/nominatim";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const local = localKenyaPlaceHints(q);
  const remote = await searchKenyaPlaces(q, 8);
  const results = mergeGeocodeResults(local, remote, 8);

  return NextResponse.json({ results });
}
