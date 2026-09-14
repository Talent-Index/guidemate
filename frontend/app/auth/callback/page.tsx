"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { completeAuthCallback } from "@/lib/auth/callbackSession";
import { destinationAfterAuth } from "@/lib/auth/completeSignIn";
import { useAuth } from "@/lib/auth/AuthProvider";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlError = searchParams.get("error");
    const code = searchParams.get("code");
    if (code) {
      window.location.replace(`/auth/confirm${window.location.search}`);
      return;
    }

    (async () => {
      if (urlError) {
        setError(urlError);
        return;
      }

      const supabase = createClient();
      const { session, flow, error: callbackError, hadCallbackParams } = await completeAuthCallback(supabase);

      if (callbackError || !session) {
        setError(callbackError ?? "Could not complete sign-in");
        return;
      }

      const href = await destinationAfterAuth({
        supabase,
        session,
        flow,
        hadCallbackParams,
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

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-brand-muted">Completing sign-in…</p>}>
      <AuthCallbackInner />
    </Suspense>
  );
}
