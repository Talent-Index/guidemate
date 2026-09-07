"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { RoleGate } from "@/components/auth/RoleGate";
import { ExperienceWizard } from "@/components/experience/ExperienceWizard";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { ExperienceDraftRow } from "@/lib/experienceDraft";

export default function EditExperiencePage() {
  const { experienceId } = useParams<{ experienceId: string }>();
  const searchParams = useSearchParams();
  const { loading: authLoading, session, profile } = useAuth();
  const [draft, setDraft] = useState<ExperienceDraftRow | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const guideId = session?.user.id;
    if (!guideId) return;

    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("experiences")
        .select(
          "id, guide_id, title, description, tags, category, price_usdc, duration_minutes, location, image_url, image_urls, itinerary, is_active, status, wizard_step, meeting_lat, meeting_lng, meeting_label, created_at"
        )
        .eq("id", experienceId)
        .eq("guide_id", guideId)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
        setDraft(null);
      } else {
        setDraft(data as ExperienceDraftRow);
        setNotFound(false);
      }
      setLoading(false);
    }

    void load();
  }, [session, experienceId]);

  if (authLoading || (session && !profile) || loading) {
    return <p className="text-sm text-brand-muted">Loading…</p>;
  }

  if (!session || profile?.role !== "guide") {
    return (
      <RoleGate
        role="guide"
        title="Guide sign-in required"
        body="Sign in with a guide account to edit this experience."
      />
    );
  }

  if (notFound || !draft) {
    return (
      <RoleGate role="guide" title="Not found" body="This experience does not exist or you do not have access.">
        <p className="text-sm text-brand-muted">Experience not found.</p>
      </RoleGate>
    );
  }

  const stepParam = searchParams.get("step");
  const parsedStep = stepParam ? Number.parseInt(stepParam, 10) : NaN;
  const initialStep =
    Number.isFinite(parsedStep) && parsedStep >= 1 && parsedStep <= 6
      ? parsedStep
      : draft.wizard_step;

  return <ExperienceWizard draft={draft} initialStep={initialStep} />;
}
