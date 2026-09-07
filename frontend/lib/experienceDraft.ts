import { createClient } from "@/lib/supabase/client";
import type { ItineraryStep } from "@/lib/itinerary";

export type ExperienceStatus = "draft" | "published";

export interface ExperienceDraftRow {
  id: string;
  guide_id: string;
  title: string;
  description: string;
  tags: string[];
  category: string | null;
  price_usdc: number;
  duration_minutes: number;
  location: string | null;
  image_url: string | null;
  image_urls: string[];
  itinerary: ItineraryStep[] | unknown;
  is_active: boolean;
  status: ExperienceStatus;
  wizard_step: number;
  meeting_lat: number | null;
  meeting_lng: number | null;
  meeting_label: string | null;
  created_at: string;
}

export async function patchExperienceDraft(
  id: string,
  patch: Partial<ExperienceDraftRow>
) {
  const supabase = createClient();
  const { error } = await supabase.from("experiences").update(patch).eq("id", id);
  if (error) throw error;
}
