import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/marketingMetadata";
import { ReferAGuideClient } from "@/components/referrals/ReferAGuideClient";

export const metadata: Metadata = pageMetadata({
  title: "Refer a guide",
  description:
    "Invite vetted guides to Guidemate. Earn XP when they are approved and list an experience, then claim a complimentary trip.",
  path: "/refer-a-guide",
});

export default function ReferAGuidePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-[var(--gm-ink)]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-accent">Campaign</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Refer a guide</h1>
      <p className="mt-4 text-sm leading-relaxed text-brand-muted">
        Know someone who would be a great Guidemate guide? Share your personal link. When they complete vetting,
        publish at least one experience, you earn XP. Save up XP to claim a complimentary experience on us.
      </p>

      <ol className="mt-8 list-decimal space-y-3 pl-5 text-sm text-brand-muted">
        <li>Sign in and copy your referral link below.</li>
        <li>Send it to your friend. It opens the guide application on Guidemate.</li>
        <li>After we approve them and they publish a listing, you receive XP automatically.</li>
        <li>At 300 XP, request a free experience from the marketplace (Guidemate pays).</li>
      </ol>

      <ReferAGuideClient />

      <p className="mt-10 text-sm text-brand-muted">
        Applying yourself?{" "}
        <Link href="/become-a-guide" className="font-semibold text-brand-accent underline">
          Become a guide
        </Link>
        .
      </p>
    </div>
  );
}
