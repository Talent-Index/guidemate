"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ReturnInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const intentId = params.get("paymentIntentId") ?? params.get("session_id");
    const bookingDraft = typeof window !== "undefined" ? sessionStorage.getItem("guidemate-checkout-draft") : null;
    const liveDraft = typeof window !== "undefined" ? sessionStorage.getItem("guidemate-live-checkout-draft") : null;

    if (bookingDraft) {
      try {
        const draft = JSON.parse(bookingDraft) as { experienceId: string };
        const qs = intentId ? `?paymentIntentId=${encodeURIComponent(intentId)}` : "";
        router.replace(`/book/${draft.experienceId}${qs}`);
        return;
      } catch {
        // fall through
      }
    }

    if (liveDraft) {
      try {
        const draft = JSON.parse(liveDraft) as { streamId: string };
        const qs = intentId ? `?paymentIntentId=${encodeURIComponent(intentId)}` : "";
        router.replace(`/live/${draft.streamId}${qs}`);
        return;
      } catch {
        // fall through
      }
    }

    router.replace("/explore");
  }, [params, router]);

  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <p className="text-sm text-brand-muted">Finishing your payment…</p>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-brand-muted">Loading…</p>}>
      <ReturnInner />
    </Suspense>
  );
}
