"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { RoleGate } from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";

export default function NewExperiencePage() {
  const router = useRouter();
  const { loading: authLoading, session, profile } = useAuth();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!session || startedRef.current) return;
    startedRef.current = true;

    async function createDraft() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("experiences")
        .insert({
          guide_id: session!.user.id,
          title: "",
          description: "",
          tags: [],
          price_usdc: 0,
          duration_minutes: 0,
          status: "draft",
          is_active: false,
          wizard_step: 1,
        })
        .select("id")
        .single();

      if (error || !data) {
        startedRef.current = false;
        return;
      }

      router.replace(`/guide/experiences/${data.id}/edit`);
    }

    void createDraft();
  }, [session, router]);

  if (authLoading || (session && !profile)) {
    return <p className="text-sm text-brand-muted">Loading…</p>;
  }

  if (!session || profile?.role !== "guide") {
    return (
      <RoleGate
        role="guide"
        title="Guide sign-in required"
        body="Sign in with a guide account to create an experience."
      />
    );
  }

  return <p className="text-sm text-brand-muted">Starting setup…</p>;
}
