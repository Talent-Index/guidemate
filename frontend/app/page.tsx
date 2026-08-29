import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const EXPERIENCES = [
  {
    icon: "🍢",
    title: "Street Food & Markets",
    body: "CBD food crawls, Eastleigh stalls and local markets, led by the guides who know every stand worth stopping at.",
  },
  {
    icon: "🦁",
    title: "Wildlife & Safari",
    body: "Nairobi National Park day trips with former rangers who know where the animals actually are.",
  },
  {
    icon: "🎨",
    title: "Art, History & Culture",
    body: "Museums, galleries and colonial-era architecture, narrated by guides with real subject-matter depth.",
  },
  {
    icon: "🛍️",
    title: "Shopping & Nightlife",
    body: "Curated, concierge-grade experiences for guests who want the well-vetted version of a night out.",
  },
  {
    icon: "🥾",
    title: "Hiking & Adventure",
    body: "Ngong Hills and day trips beyond the city with guides who plan the route, not just walk it.",
  },
];

const EXPERIENCE_TONES = ["bg-brand-accent/10", "bg-brand-amber/20", "bg-brand-blue/10", "bg-brand-successBg", "bg-brand-accent/10"];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Traveler requests",
    body: "A traveler types what the guest wants - e.g. \"authentic street food tonight\" - into the Guidemate agent.",
  },
  {
    step: "2",
    title: "AI agent curates a match",
    body: "Our agent scans vetted, reputation-vouched guides and picks the best fit for the guest's request in seconds.",
  },
  {
    step: "3",
    title: "Guide runs the tour",
    body: "No app friction, no WhatsApp back-and-forth. The guide just shows up and delivers the experience they're known for.",
  },
  {
    step: "4",
    title: "QR scan = instant payout",
    body: "One QR scan at tour's end verifies completion and pays the guide to M-Pesa in seconds - same day, not next month.",
  },
];

const FLOWS = [
  {
    title: "Guide onboarding & trust",
    tag: "Becoming vetted",
    accent: "bg-brand-accent",
    steps: [
      "Signs up with name, photo, tours offered and M-Pesa number.",
      "Completes tours through the platform (or imports history from WhatsApp bookings).",
      "The system tracks punctuality, completion and guest feedback over time.",
      "Enough history builds a trust score - graduating from open-marketplace-only to \"partner-eligible.\"",
    ],
  },
  {
    title: "Tourist books directly",
    tag: "Primary flow",
    accent: "bg-brand-amber",
    steps: [
      "Browses tours and guide profiles with visible trust scores and reviews.",
      "Pays by card - FX/stablecoin conversion happens here for international guests.",
      "Payment goes into escrow, not straight to the guide.",
      "Guide completes the tour and marks it done; tourist can confirm.",
      "Funds release to the guide's M-Pesa instantly, minus Guidemate's cut.",
    ],
  },
  {
    title: "Booking partner books (B2B)",
    tag: "Secondary flow",
    accent: "bg-brand-success",
    steps: [
      "Guest asks a partner's concierge or front desk, \"what's there to do here?\"",
      "The partner opens the Guidemate dashboard instead of calling around on WhatsApp.",
      "Sees only pre-vetted guides - no manual vetting needed.",
      "Books directly and charges the guest; the guide is notified and runs the tour.",
      "Same instant M-Pesa payout on completion - no OTA can offer a partner this today.",
    ],
  },
];

const MONEY_STEPS = [
  { icon: "💳", label: "Guest pays by card" },
  { icon: "🔄", label: "Converted to stablecoin (intl.) or KES (local)" },
  { icon: "🔒", label: "Held in Guidemate escrow" },
  { icon: "🏁", label: "Tour marked complete" },
  { icon: "✂️", label: "Commission + FX fee kept" },
  { icon: "📲", label: "Remainder auto-pays to M-Pesa" },
];

const FEES = [
  { label: "Viator / GetYourGuide / Klook", pct: 25, tone: "bg-brand-muted/30 text-brand-muted" },
  { label: "Guidemate commission", pct: 6.5, tone: "bg-brand-accent text-white" },
];

const AUDIENCES = [
  {
    icon: "🤝",
    title: "For booking partners",
    body: "A B2B API that lets any partner - hotels, tour desks, travel apps and more - offer verified, instantly-bookable local excursions to their guests - no manual coordination, no vetting risk, and a 10% referral cut on every booking.",
  },
  {
    icon: "🧭",
    title: "For independent local guides",
    body: "Get discovered through a reputation you build tour by tour, keep 85% of every booking, and get paid to M-Pesa the moment a tour is verified - same day, not weeks later.",
  },
];

function Band({
  id,
  tone = "white",
  className = "",
  children,
}: {
  id?: string;
  tone?: "white" | "tint" | "dark";
  className?: string;
  children: ReactNode;
}) {
  const toneClasses =
    tone === "dark"
      ? "bg-gradient-to-br from-brand-blueDark via-brand-blue to-brand-accent"
      : tone === "tint"
        ? "bg-brand-bg"
        : "bg-white";

  return (
    <section
      id={id}
      className={`relative left-1/2 right-1/2 -mx-[50vw] w-screen ${toneClasses} ${id ? "scroll-mt-24" : ""} ${className}`}
    >
      <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">{children}</div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  light = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  light?: boolean;
}) {
  return (
    <div className="mb-10 text-center">
      {eyebrow && (
        <span
          className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            light ? "bg-white/15 text-white" : "bg-brand-accent/10 text-brand-accent"
          }`}
        >
          {eyebrow}
        </span>
      )}
      <h2 className={`text-2xl font-bold sm:text-3xl ${light ? "text-white" : "text-brand-blueDark"}`}>{title}</h2>
      {subtitle && (
        <p className={`mx-auto mt-3 max-w-2xl ${light ? "text-white/80" : "text-brand-muted"}`}>{subtitle}</p>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="pb-6">
      {/* Full-bleed photo hero */}
      <section className="relative left-1/2 right-1/2 -mx-[50vw] -mt-8 w-screen overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/hero-beach.png"
            alt="Golden sunset over a coastal shoreline"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-blueDark/90 via-brand-blueDark/60 to-brand-blueDark/85" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>
        <div className="relative mx-auto flex min-h-[520px] max-w-5xl flex-col items-center justify-center gap-6 px-4 py-24 text-center sm:min-h-[600px] sm:py-32">
          <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur">
            Curated local experiences · Vetted guides
          </span>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white drop-shadow-sm sm:text-5xl">
            Curated local experiences, from guides you can trust.
          </h1>
          <p className="max-w-2xl text-sm font-semibold uppercase tracking-wide text-white/80 sm:text-base">
            Vetted guides · Verified on completion · Paid instantly
          </p>
          <p className="max-w-2xl text-white/90 sm:text-lg">
            Guidemate connects travelers with independent local guides and curators, vetted and
            vouched for over time by an AI reputation agent - so every excursion feels hand-picked,
            not googled.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/explore">
              <Button variant="primary">Find an experience</Button>
            </Link>
            <Link href="/auth/sign-up?role=guide">
              <Button variant="outline">Become a guide</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* What we offer: curated experiences */}
      <Band id="experiences">
        <SectionHeader
          eyebrow="Curated experiences"
          title="What we offer"
          subtitle="A curated bench of vetted local guides, ready to book for whatever your guest is into."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXPERIENCES.map((exp, idx) => (
            <Card
              key={exp.title}
              className="flex flex-col gap-3 transition duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${EXPERIENCE_TONES[idx % EXPERIENCE_TONES.length]}`}
              >
                {exp.icon}
              </span>
              <h3 className="font-semibold text-brand-blueDark">{exp.title}</h3>
              <p className="text-sm text-brand-muted">{exp.body}</p>
            </Card>
          ))}
        </div>
      </Band>

      {/* Trust / vetting */}
      <Band tone="tint">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-accent/10 text-3xl">
            🛡️
          </span>
          <h2 className="text-2xl font-bold text-brand-blueDark">Every guide is vetted, not just listed</h2>
          <p className="max-w-2xl text-brand-muted">
            Guidemate&apos;s AI agent vouches for guide reliability and quality over time - tracking
            completed tours, reviews and consistency to build an on-chain reputation score. Booking
            partners get the confidence of a vetted guide; guides get credit for a track record they
            actually own.
          </p>
        </div>
      </Band>

      {/* How it works - the pitched happy path */}
      <Band id="how-it-works">
        <SectionHeader title="How Guidemate works" subtitle="The happy path we demo, end to end, secured on-chain." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item, idx) => (
            <div key={item.step} className="relative">
              <Card className="flex h-full flex-col gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-sm font-bold text-white">
                  {item.step}
                </span>
                <h3 className="font-semibold text-brand-blueDark">{item.title}</h3>
                <p className="text-sm text-brand-muted">{item.body}</p>
              </Card>
              {idx < HOW_IT_WORKS.length - 1 && (
                <span className="absolute -right-2 top-8 z-10 hidden -translate-y-1/2 text-xl font-bold text-brand-accent lg:block">
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </Band>

      {/* Three flows through the platform */}
      <Band tone="tint">
        <SectionHeader
          title="Three flows, one platform"
          subtitle="Guides, tourists and booking partners each move through Guidemate differently."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {FLOWS.map((flow) => (
            <Card key={flow.title} className="flex flex-col gap-3 overflow-hidden">
              <span className={`-mx-6 -mt-6 h-1.5 ${flow.accent}`} aria-hidden />
              <span className="w-fit rounded-full bg-brand-accent/10 px-3 py-1 text-xs font-semibold text-brand-accent">
                {flow.tag}
              </span>
              <h3 className="font-bold text-brand-blueDark">{flow.title}</h3>
              <ol className="flex flex-col gap-2">
                {flow.steps.map((step, idx) => (
                  <li key={step} className="flex gap-2 text-sm text-brand-muted">
                    <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-bg text-xs font-bold text-brand-blueDark">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </div>
      </Band>

      {/* Money journey */}
      <Band>
        <SectionHeader
          title="Where the money goes"
          subtitle="The plumbing behind every booking - collapsing weeks of waiting into seconds."
        />
        <Card className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {MONEY_STEPS.map((step, idx) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="flex w-28 flex-col items-center gap-1 rounded-2xl bg-brand-bg px-3 py-3 text-center">
                  <span className="text-xl">{step.icon}</span>
                  <span className="text-xs font-medium text-brand-blueDark">{step.label}</span>
                </div>
                {idx < MONEY_STEPS.length - 1 && <span className="text-brand-muted">→</span>}
              </div>
            ))}
          </div>
        </Card>
      </Band>

      {/* Audiences */}
      <Band tone="tint">
        <SectionHeader title="Built for both sides of the booking" />
        <div className="grid gap-6 sm:grid-cols-2">
          {AUDIENCES.map((audience) => (
            <Card key={audience.title} className="flex flex-col gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-accent/10 text-2xl">
                {audience.icon}
              </span>
              <h3 className="text-lg font-bold text-brand-blueDark">{audience.title}</h3>
              <p className="text-sm text-brand-muted">{audience.body}</p>
            </Card>
          ))}
        </div>
      </Band>

      {/* Fee comparison */}
      <Band>
        <SectionHeader
          title="A fairer cut, by design"
          subtitle="Guidemate charges a 5-8% booking commission plus a 1.5% FX fee - meaningfully under what global OTAs take."
        />
        <Card className="mx-auto flex max-w-2xl flex-col gap-5">
          <span className="mx-auto w-fit rounded-full bg-brand-successBg px-4 py-1 text-sm font-semibold text-brand-success">
            Guides keep ~18.5% more revenue
          </span>
          {FEES.map((fee) => (
            <div key={fee.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-brand-blueDark">{fee.label}</span>
                <span className="font-semibold text-brand-muted">{fee.pct}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-brand-bg">
                <div
                  className={`h-full rounded-full transition-all ${fee.tone}`}
                  style={{ width: `${(fee.pct / 30) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </Card>
      </Band>

      {/* Demo launcher */}
      <Band id="demo" tone="dark">
        <SectionHeader
          light
          eyebrow="Live demo"
          title="Try it yourself"
          subtitle="Walk through the exact happy path we pitch: AI match, escrow lock, QR verification, instant payout."
        />
        <div className="grid w-full gap-4 sm:grid-cols-4">
          <Card className="flex flex-col items-center gap-3 text-center">
            <span className="text-sm font-semibold text-brand-accent">Step 1</span>
            <p className="text-sm text-brand-muted">Guide signs up &amp; lists an experience</p>
            <Link href="/auth/sign-up?role=guide" className="mt-auto w-full">
              <Button className="w-full" variant="accent">
                Become a Guide
              </Button>
            </Link>
          </Card>
          <Card className="flex flex-col items-center gap-3 text-center">
            <span className="text-sm font-semibold text-brand-accent">Step 2</span>
            <p className="text-sm text-brand-muted">Tourist explores &amp; books with escrow</p>
            <Link href="/explore" className="mt-auto w-full">
              <Button className="w-full" variant="accent">
                Open Explore
              </Button>
            </Link>
          </Card>
          <Card className="flex flex-col items-center gap-3 text-center">
            <span className="text-sm font-semibold text-brand-accent">Step 3</span>
            <p className="text-sm text-brand-muted">Guide shows their completion QR</p>
            <Link href="/guide" className="mt-auto w-full">
              <Button className="w-full" variant="accent">
                Open Guide View
              </Button>
            </Link>
          </Card>
          <Card className="flex flex-col items-center gap-3 text-center">
            <span className="text-sm font-semibold text-brand-accent">Step 4</span>
            <p className="text-sm text-brand-muted">Tourist scans to verify &amp; settle</p>
            <Link href="/verify" className="mt-auto w-full">
              <Button className="w-full" variant="accent">
                Open Verify
              </Button>
            </Link>
          </Card>
        </div>
        <p className="mt-6 text-center text-sm text-white/70">
          Also building a secondary B2B path for booking partners -{" "}
          <Link href="/concierge" className="underline">
            try the Concierge dashboard
          </Link>
          .
        </p>
      </Band>

      {/* Footer */}
      <footer className="border-t border-brand-border pt-8 text-center text-sm text-brand-muted">
        <p className="font-semibold text-brand-blueDark">Guidemate</p>
        <p className="mt-1">Curated local experiences from vetted guides, settled instantly on Avalanche.</p>
      </footer>
    </div>
  );
}
