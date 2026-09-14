"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { flowFromTypeParam } from "@/lib/auth/callbackSession";
import { destinationAfterAuth } from "@/lib/auth/completeSignIn";
import { useAuth } from "@/lib/auth/AuthProvider";

function AuthContinueInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError(sessionError?.message ?? "Could not complete sign-in");
        return;
      }

      const flow = flowFromTypeParam(searchParams.get("type")) ?? "oauth";
      const href = await destinationAfterAuth({
        supabase,
        session,
        flow,
        hadCallbackParams: true,
      });
      await refreshProfile();
      router.replace(href);
    })();
  }, [router, refreshProfile, searchParams]);

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

export default function AuthContinuePage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-brand-muted">Completing sign-in…</p>}>
      <AuthContinueInner />
    </Suspense>
  );
}
