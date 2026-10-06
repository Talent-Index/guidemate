import type { Metadata } from "next";
import { pageMetadata } from "@/lib/marketingMetadata";
import { CALENDLY_DEMO_URL } from "@/lib/site";
import { MarketingArticle, MarketingSection } from "@/components/marketing/MarketingArticle";

export const metadata: Metadata = pageMetadata({
  title: "For travel agencies",
  description:
    "Partner with Guidemate for live-stream discovery, vetted local guides, escrow bookings, and M-Pesa payouts across Kenya.",
  path: "/for-agencies",
});

export default function ForAgenciesPage() {
  return (
    <MarketingArticle
      eyebrow="Partners"
      title="Guidemate for travel agencies"
      intro="White-label the trust layer your clients expect: vetted guides, transparent pricing, escrow until the trip ends, and fast local payouts. Book a short call to see a live demo and discuss your routes."
      cta={{ label: "Book a 30-minute demo", href: CALENDLY_DEMO_URL, external: true }}
    >
      <MarketingSection title="Why agencies use Guidemate">
        <ul className="list-disc space-y-2 pl-5">
          <li>Live streams as a low-friction preview before clients commit to a full-day tour.</li>
          <li>Published experiences with photos, categories, and guide ratings in one marketplace.</li>
          <li>Escrow on Avalanche: funds release only after the tourist confirms the trip with PIN or QR.</li>
          <li>M-Pesa-friendly payouts so your ground partners are not waiting on weekly settlement batches.</li>
        </ul>
      </MarketingSection>
      <MarketingSection title="What we cover on the call">
        <p>
          We walk through the tourist booking flow, guide dashboard, live streaming, and admin vetting. Bring your
          top Kenya products (city walks, safari add-ons, Mt Kenya treks) and we will map how they appear on
          Guidemate.
        </p>
      </MarketingSection>
      <MarketingSection title="Schedule">
        <p>
          Pick a time that works for you on{" "}
          <a href={CALENDLY_DEMO_URL} target="_blank" rel="noreferrer" className="font-semibold text-brand-accent underline">
            Calendly
          </a>
          . Typical duration is 30 minutes. If email works better first, reach us at{" "}
          <a href="mailto:support@yourguidemate.top" className="font-semibold text-brand-accent underline">
            support@yourguidemate.top
          </a>
          .
        </p>
      </MarketingSection>
    </MarketingArticle>
  );
}
