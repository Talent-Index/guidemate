"use client";

import { useRouter } from "next/navigation";

export function PageBackButton({
  fallbackHref,
  returnTo,
  label = "Back",
}: {
  fallbackHref: string;
  returnTo?: string | null;
  label?: string;
}) {
  const router = useRouter();

  function handleBack() {
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent hover:underline"
    >
      <span aria-hidden>←</span>
      {label}
    </button>
  );
}
