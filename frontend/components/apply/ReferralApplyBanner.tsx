"use client";

import { useEffect, useState } from "react";
import { captureReferralFromSearch, readStoredReferralCode } from "@/lib/referral";

export function ReferralApplyBanner() {
  const [code, setCode] = useState<string | undefined>();

  useEffect(() => {
    captureReferralFromSearch(window.location.search);
    setCode(readStoredReferralCode());
  }, []);

  if (!code) return null;

  return (
    <p className="mb-4 rounded-lg border border-brand-accent/30 bg-brand-accent/10 px-4 py-3 text-center text-sm text-brand-blueDark">
      You were referred by a Guidemate member (code <span className="font-mono font-semibold">{code}</span>). Complete
      this application so they can earn referral XP when you are listed.
    </p>
  );
}
