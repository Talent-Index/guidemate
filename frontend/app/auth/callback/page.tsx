"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { homeForRole, type AccountRole } from "@/lib/auth/home";
import { provisionWallet } from "@/lib/api";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session) {
        setError(sessionError?.message ?? "Could not complete sign-in");
        return;
      }

      const user = data.session.user;
      const email = user.email ?? "";
      const meta = user.user_metadata as Record<string, unknown> | undefined;

      let { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (!profile) {
        const pendingRaw =
          localStorage.getItem(`guidemate_pending_profile_${email}`) ??
          localStorage.getItem("guidemate_pending_profile_google");
        const pending = pendingRaw
          ? (JSON.parse(pendingRaw) as { role: "guide" | "tourist"; fullName: string; phone: string | null })
          : null;
        const role = meta?.role === "guide" || pending?.role === "guide" ? "guide" : "tourist";
        const fullName =
          (typeof meta?.full_name === "string" && meta.full_name) ||
          (typeof meta?.name === "string" && meta.name) ||
          pending?.fullName ||
          email;
        const phone = (typeof meta?.phone === "string" && meta.phone) || pending?.phone || null;
        const { data: created, error: profileError } = await supabase
          .from("profiles")
          .insert({ id: user.id, role, full_name: fullName, phone })
          .select("role")
          .single();
        if (profileError) {
          const { data: existing } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
          if (!existing) {
            setError(profileError.message);
            return;
          }
          profile = existing;
        } else {
          profile = created;
        }
        localStorage.removeItem(`guidemate_pending_profile_${email}`);
        localStorage.removeItem("guidemate_pending_profile_google");
        if (profile?.role === "guide") {
          await provisionWallet(data.session.access_token);
        }
      }

      router.replace(homeForRole((profile?.role ?? "tourist") as AccountRole));
    })();
  }, [router]);

  if (error) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <p className="text-sm text-brand-muted">Completing sign-in…</p>
    </div>
  );
}
