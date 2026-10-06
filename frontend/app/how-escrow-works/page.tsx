import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/marketingMetadata";
import { MarketingArticle, MarketingSection } from "@/components/marketing/MarketingArticle";

export const metadata: Metadata = pageMetadata({
  title: "How escrow works",
  description:
    "Guidemate holds trip payments in on-chain escrow until the tourist confirms completion with a PIN or QR, then pays the guide.",
  path: "/how-escrow-works",
});

export default function HowEscrowWorksPage() {
  return (
    <MarketingArticle
      eyebrow="Trust & payments"
      title="How escrow works on Guidemate"
      intro="Escrow protects both sides: tourists pay only for trips that happen, and guides get paid as soon as the experience is confirmed complete."
      cta={{ label: "Browse experiences", href: "/explore" }}
    >
      <MarketingSection title="1. You book and pay">
        <p>The price on the listing is what you pay. Funds move into Guidemate escrow on Avalanche when you confirm booking.</p>
      </MarketingSection>
      <MarketingSection title="2. The trip happens">
        <p>You meet your guide and complete the experience. Chat and booking details stay in your Guidemate account.</p>
      </MarketingSection>
      <MarketingSection title="3. You end the trip">
        <p>
          You reveal a 6-digit PIN and QR code. Your guide enters the PIN or scans the code to mark the trip complete.
          Nothing releases without your confirmation.
        </p>
      </MarketingSection>
      <MarketingSection title="4. The guide gets paid">
        <p>
          Escrow releases to the guide&apos;s payout wallet. Guides can withdraw to M-Pesa according to the payout settings
          in their dashboard.
        </p>
      </MarketingSection>
      <MarketingSection title="Legal">
        <p>
          Full terms:{" "}
          <Link href="/terms" className="font-semibold text-brand-accent underline">
            Terms and conditions
          </Link>
          .
        </p>
      </MarketingSection>
    </MarketingArticle>
  );
}
