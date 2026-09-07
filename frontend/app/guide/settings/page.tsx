"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GuideSettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/guide/dashboard?tab=settings");
  }, [router]);
  return <p className="text-sm text-brand-muted">Opening settings…</p>;
}
