import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/marketingMetadata";
import { MarketingArticle, MarketingSection } from "@/components/marketing/MarketingArticle";
import { CALENDLY_DEMO_URL } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "FAQ",
  description: "Frequently asked questions about booking guides, going live, escrow, payouts, and partnering with Guidemate.",
  path: "/faq",
});

const FAQ = [
  {
    q: "Is Guidemate only for Kenya?",
    a: "We are focused on Kenya-first experiences and M-Pesa payouts, with live streams and bookings built for local guides and travelers visiting the region.",
  },
  {
    q: "How do I become a guide?",
    a: "Apply on the Become a guide page with your TRA documents and experience pitch. After vetting, you receive login instructions by email.",
  },
  {
    q: "When does a guide get paid?",
    a: "After the tourist ends the trip with PIN or QR. Escrow releases to the guide wallet; M-Pesa withdrawal is configured in the guide dashboard.",
  },
  {
    q: "Can travel agencies work with Guidemate?",
    a: "Yes. Book a demo call to see the platform and discuss your product catalog.",
  },
  {
    q: "Where do live streams appear?",
    a: "On the Live page and on the home page showcase. Guides start streams from their dashboard or Go Live flow.",
  },
] as const;

export default function FaqPage() {
  return (
    <MarketingArticle
      eyebrow="Help"
      title="Frequently asked questions"
      intro="Quick answers for travelers, guides, and agency partners. Need something else? Email support@yourguidemate.top."
    >
      {FAQ.map((item) => (
        <MarketingSection key={item.q} title={item.q}>
          <p>{item.a}</p>
        </MarketingSection>
      ))}
      <MarketingSection title="Agency demos">
        <p>
          <a href={CALENDLY_DEMO_URL} target="_blank" rel="noreferrer" className="font-semibold text-brand-accent underline">
            Schedule a 30-minute demo on Calendly
          </a>{" "}
          or visit{" "}
          <Link href="/for-agencies" className="font-semibold text-brand-accent underline">
            For agencies
          </Link>
          .
        </p>
      </MarketingSection>
    </MarketingArticle>
  );
}
