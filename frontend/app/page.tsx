import Image from "next/image";
import Link from "next/link";
import { SignedInRedirect } from "@/components/auth/SignedInRedirect";

const OFFERINGS = [
  {
    title: "Street Food & Markets",
    body: "CBD food crawls, Eastleigh stalls and local markets, led by the guides who know every stand worth stopping at.",
    category: "Food & Drink",
    image: "/offering-food.jpg",
    imageAlt: "Street food being prepared at a night market",
  },
  {
    title: "Wildlife & Safari",
    body: "Nairobi National Park day trips with former rangers who know where the animals actually are.",
    category: "Wildlife & Safari",
    image: "/offering-safari.jpg",
    imageAlt: "Safari landscape at dusk",
  },
  {
    title: "Art, History & Culture",
    body: "Museums, galleries and colonial-era architecture, narrated by guides with real subject-matter depth.",
    category: "Art & Culture",
    image: "/offering-culture.jpg",
    imageAlt: "Gallery interior with artwork on the walls",
  },
];

const FEATURES = [
  {
    title: "Book a local guide",
    body: "Browse food, safari and culture experiences and lock a slot in a few taps.",
  },
  {
    title: "AI matching",
    body: "Describe what you want. The agent pairs you with a vetted guide who actually fits.",
  },
  {
    title: "On-chain escrow",
    body: "Payment locks in GuidemateEscrow on Avalanche until the trip is confirmed complete.",
  },
  {
    title: "End trip PIN or QR",
    body: "The tourist reveals a 6-digit PIN and QR. The guide enters the PIN or scans to get paid.",
  },
  {
    title: "Live streams",
    body: "Guides and creators go live from their phone - free or pay-per-view, with recordings after.",
  },
  {
    title: "Guide dashboard",
    body: "Publish listings, set an M-Pesa number, provision a payout wallet, and track past tours.",
  },
];

const ROLE_ADVANTAGES = [
  {
    role: "Tourists",
    items: [
      "Pay only for a trip that actually happens - funds sit in escrow until you tap End trip.",
      "Book vetted locals, not anonymous listings. Ratings and completions follow the guide.",
      "Describe a request and get an AI match, or pick an experience yourself.",
      "You hold the PIN and QR. Nothing releases without you.",
    ],
  },
  {
    role: "Guides",
    items: [
      "Keep 85% of every booking. Guidemate takes 15% of your listed rate.",
      "Get paid the moment the tourist ends the trip. No weekly settlement wait.",
      "List food, safari and culture experiences with photos, prices and categories.",
      "A custodial payout wallet is provisioned for you. M-Pesa payout is simulated in this demo.",
    ],
  },
  {
    role: "Influencers",
    items: [
      "Go live from your phone and sell a pay-per-view stream, or keep it free.",
      "Recordings stay on Guidemate so a live walk can keep earning after you hang up.",
      "Same trust layer as tours: identity, ratings, and on-chain settlement.",
      "Use Live as a top-of-funnel for in-person experiences you already host.",
    ],
  },
];

export default function HomePage() {
  return (
    <SignedInRedirect>
      <div className="bg-[var(--gm-canvas)] text-[var(--gm-ink)]">
        <section className="relative min-h-[100svh] w-full overflow-hidden">
          <Image
            src="/hero-beach.png"
            alt="Golden sunset over a coastal shoreline"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
          <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col items-start justify-center px-4 pb-20 pt-28">
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl">
              Local experiences,
              <br />
              curated with trust.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
              Guidemate connects travelers with independent local guides - vetted over time by an AI
              reputation agent, verified on completion, paid instantly.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/explore"
                className="bg-brand-amber px-7 py-3 text-sm font-semibold text-brand-blueDark transition hover:bg-brand-amberDark"
              >
                Explore experiences
              </Link>
              <Link
                href="/apply"
                className="bg-brand-blue px-7 py-3 text-sm font-semibold text-white transition hover:bg-brand-accent"
              >
                Apply to be a guide
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="bg-[var(--gm-canvas)]">
          <div className="mx-auto max-w-6xl px-4 py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-accent">The platform</p>
            <h2 className="mt-3 max-w-lg text-3xl font-bold tracking-tight sm:text-4xl">What Guidemate actually does</h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-brand-muted">
              One product for booking a local, locking payment, proving the trip happened, and paying
              the guide the same day.
            </p>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((item) => (
                <div key={item.title} className="border-t border-[var(--gm-border)] pt-5">
                  <h3 className="text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-brand-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="experiences" className="bg-[var(--gm-canvas)]">
          <div className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24">
            <div className="max-w-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-accent">What we offer</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Curated local experiences</h2>
              <p className="mt-4 text-sm leading-relaxed text-brand-muted">
                A bench of vetted guides, ready to book - food, wildlife, culture, and whatever else your
                day in the city should feel like.
              </p>
            </div>

            <div className="mt-16 flex flex-col gap-20">
              {OFFERINGS.map((item, idx) => (
                <Link
                  key={item.title}
                  href={`/explore?category=${encodeURIComponent(item.category)}`}
                  className={`grid items-center gap-10 md:grid-cols-2 ${idx % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`}
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image src={item.image} alt={item.imageAlt} fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-brand-muted">{item.body}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[var(--gm-canvas)]">
          <div className="mx-auto max-w-6xl px-4 py-24">
            <div className="max-w-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-accent">Who it&apos;s for</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">The Guidemate advantage</h2>
              <p className="mt-5 text-sm leading-relaxed text-brand-muted">
                Built so travelers stop googling strangers, guides stop waiting weeks to get paid, and
                creators can turn a live walk into a booked tour.
              </p>
            </div>
            <div className="mt-14 grid gap-12 md:grid-cols-3">
              {ROLE_ADVANTAGES.map((group) => (
                <div key={group.role}>
                  <h3 className="text-lg font-bold">{group.role}</h3>
                  <ul className="mt-4 flex flex-col gap-3">
                    {group.items.map((item) => (
                      <li key={item} className="text-sm leading-relaxed text-brand-muted">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--gm-border)] bg-[var(--gm-canvas)]">
          <div className="mx-auto max-w-3xl px-4 py-24 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Get in early</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-brand-muted">
              Apply to host as a guide, or join the waitlist if you want access when we open more widely.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link
                href="/apply"
                className="bg-brand-amber px-7 py-3 text-sm font-semibold text-brand-blueDark transition hover:bg-brand-amberDark"
              >
                Apply to be a guide
              </Link>
              <Link
                href="/waitlist"
                className="bg-brand-blue px-7 py-3 text-sm font-semibold text-white transition hover:bg-brand-accent"
              >
                Join waitlist
              </Link>
            </div>
            <p className="mt-8 text-xs text-brand-muted">
              By using Guidemate you agree to our{" "}
              <Link href="/terms" className="font-semibold text-brand-accent underline">
                Terms and conditions
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </SignedInRedirect>
  );
}
