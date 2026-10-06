import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/marketingMetadata";
import { MarketingArticle, MarketingSection } from "@/components/marketing/MarketingArticle";

export const metadata: Metadata = pageMetadata({
  title: "For travelers",
  description:
    "Watch guides go live from real destinations, book vetted locals in Kenya, and pay through escrow until your trip is complete.",
  path: "/for-travelers",
});

export default function ForTravelersPage() {
  return (
    <MarketingArticle
      eyebrow="Travelers"
      title="Book real guides, not random listings"
      intro="Guidemate is live-first travel: watch a guide walk a market or park in real time, then book the same person for an in-person experience when you are ready."
      cta={{ label: "Explore experiences", href: "/explore" }}
    >
      <MarketingSection title="How it works">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Browse live streams or published experiences across food, safari, and culture.</li>
          <li>Pay the listed price; your funds sit in escrow until you end the trip.</li>
          <li>Meet your guide, enjoy the experience, then reveal your PIN or QR to release payment.</li>
        </ol>
      </MarketingSection>
      <MarketingSection title="Why escrow matters">
        <p>
          Your payment is locked on-chain until you confirm completion. Guides only get paid after you tap End trip.
          Read more in our{" "}
          <Link href="/how-escrow-works" className="font-semibold text-brand-accent underline">
            escrow guide
          </Link>
          .
        </p>
      </MarketingSection>
      <MarketingSection title="Questions">
        <p>
          See the{" "}
          <Link href="/faq" className="font-semibold text-brand-accent underline">
            FAQ
          </Link>{" "}
          or email{" "}
          <a href="mailto:support@yourguidemate.top" className="font-semibold text-brand-accent underline">
            support@yourguidemate.top
          </a>
          .
        </p>
      </MarketingSection>
    </MarketingArticle>
  );
}
