"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminApplicationsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin#intake");
  }, [router]);

  return (
    <p className="text-sm text-brand-muted">Redirecting to dashboard intake…</p>
  );
}
