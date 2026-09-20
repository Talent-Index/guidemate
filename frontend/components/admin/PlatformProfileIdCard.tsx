"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSuperAdmin } from "@/lib/auth/roles";

export function PlatformProfileIdCard() {
  const { session, profile } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!isSuperAdmin(profile?.role) || !session?.user.id) return null;

  const id = session.user.id;

  return (
    <Card>
      <h2 className="text-lg font-bold text-brand-blueDark">Platform wallet (Render env)</h2>
      <p className="mt-1 text-sm text-brand-muted">
        Set <code className="text-xs">PLATFORM_PROFILE_ID</code> on the backend to this UUID so the 15% stream share
        accrues to your admin profile ledger.
      </p>
      <p className="mt-3 break-all rounded-lg border border-brand-border bg-brand-bg/40 p-3 font-mono text-xs text-brand-blueDark">
        {id}
      </p>
      <Button
        type="button"
        variant="secondary"
        className="mt-3"
        onClick={async () => {
          await navigator.clipboard.writeText(id);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Copied" : "Copy UUID"}
      </Button>
    </Card>
  );
}
