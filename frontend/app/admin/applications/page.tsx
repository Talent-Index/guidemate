"use client";

import Link from "next/link";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
import { AnalyticsGate } from "@/components/auth/AdminGate";
import { AdminIntakePanel } from "@/components/admin/AdminIntakePanel";

export default function AdminApplicationsPage() {
  return (
    <AnalyticsGate>
      <div className="flex flex-col gap-6">
        <div>
          <MobilePageBanner eyebrow="Admin" title="Applications" />
          <div className="hidden md:flex md:items-end md:justify-between md:gap-4">
            <div>
              <h1 className="text-xl font-bold text-brand-blueDark">Guide applications</h1>
              <p className="text-sm text-brand-muted">
                Spreadsheet view of every applicant and waitlist signup. Approve, reject, or resend sign-in links.
              </p>
            </div>
            <Link
              href="/admin"
              className="rounded-lg border border-brand-border px-4 py-1.5 text-sm font-semibold text-brand-muted hover:border-brand-accent hover:text-brand-accent"
            >
              ← Back to dashboard
            </Link>
          </div>
        </div>

        <AdminIntakePanel />
      </div>
    </AnalyticsGate>
  );
}
