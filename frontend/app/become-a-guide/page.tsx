import type { Metadata } from "next";
import Link from "next/link";
import { GuideApplyWizard } from "@/components/apply/GuideApplyWizard";
import { pageMetadata } from "@/lib/marketingMetadata";
import { MarketingSection } from "@/components/marketing/MarketingArticle";

export const metadata: Metadata = pageMetadata({
  title: "Become a guide",
  description:
    "Apply to host on Guidemate: go live from your phone, list experiences, keep 85% of bookings, and get paid to M-Pesa after each trip.",
  path: "/become-a-guide",
});

export default function BecomeAGuidePage() {
  return (
    <div className="bg-[var(--gm-canvas)] text-[var(--gm-ink)]">
      <header className="mx-auto max-w-3xl px-4 pt-10 text-center sm:pt-14">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-accent">Guides</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Become a Guidemate guide</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-brand-muted">
          Submit your application below. We vet every guide (TRA documents, references, and experience pitch). Approved
          guides can go live, publish listings, and receive M-Pesa payouts when tourists complete trips.
        </p>
      </header>

      <div className="mx-auto max-w-3xl px-4 pb-6">
        <GuideApplyWizard />
      </div>

      <section className="border-t border-[var(--gm-border)] bg-[var(--gm-canvas)]">
        <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 text-sm leading-relaxed text-brand-muted">
          <MarketingSection title="How you get paid">
            <ul className="list-disc space-y-2 pl-5">
              <li>You keep 85% of your listed rate; Guidemate takes a 15% platform fee.</li>
              <li>When a tourist books, payment locks in on-chain escrow (Avalanche).</li>
              <li>After the experience, the tourist ends the trip with a PIN or QR; payout releases to your wallet.</li>
              <li>Completed tour earnings can settle to M-Pesa through the payout flow in your guide dashboard.</li>
            </ul>
          </MarketingSection>
          <MarketingSection title="Escrow in plain language">
            <p>
              Escrow means the tourist&apos;s money is held safely until the trip is done. You are not chasing invoices;
              the platform releases funds when the tourist confirms. Details:{" "}
              <Link href="/how-escrow-works" className="font-semibold text-brand-accent underline">
                How escrow works
              </Link>
              .
            </p>
          </MarketingSection>
          <MarketingSection title="Guide terms">
            <p>
              By applying you agree to our{" "}
              <Link href="/guide/terms" className="font-semibold text-brand-accent underline">
                guide terms
              </Link>
              .
            </p>
          </MarketingSection>
        </div>
      </section>
    </div>
  );
}
