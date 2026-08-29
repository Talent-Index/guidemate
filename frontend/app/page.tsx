import Image from "next/image";
import Link from "next/link";
import { HomeInquiryForm } from "@/components/home/HomeInquiryForm";

const OFFERINGS = [
  {
    title: "Street Food & Markets",
    body: "CBD food crawls, Eastleigh stalls and local markets, led by the guides who know every stand worth stopping at.",
    category: "Food & Drink",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Street food being prepared at a night market",
  },
  {
    title: "Wildlife & Safari",
    body: "Nairobi National Park day trips with former rangers who know where the animals actually are.",
    category: "Wildlife & Safari",
    image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Safari landscape at dusk",
  },
  {
    title: "Art, History & Culture",
    body: "Museums, galleries and colonial-era architecture, narrated by guides with real subject-matter depth.",
    category: "Art & Culture",
    image: "https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Gallery interior with artwork on the walls",
  },
];

const ADVANTAGES = [
  {
    title: "Vetted, not just listed",
    body: "An AI reputation agent tracks completions, reviews and consistency so every guide on Guidemate has a record you can actually trust.",
  },
  {
    title: "Held in escrow until it's done",
    body: "Payment locks on-chain when you book. A QR scan at the end releases it - the guide is paid, you are covered if the tour never happens.",
  },
  {
    title: "A 5% cut, not an OTA tax",
    body: "Guides keep 85% of every booking. Guidemate takes a flat 5% platform fee - versus the 20–30% typical of global marketplaces.",
  },
];

export default function HomePage() {
  return (
    <div className="bg-brand-blueDark text-white">
      <section className="relative min-h-[100svh] w-full overflow-hidden">
        <Image
          src="/hero-beach.png"
          alt="Golden sunset over a coastal shoreline"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-blueDark via-brand-blueDark/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-blueDark via-transparent to-brand-blueDark/40" />
        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col items-start justify-center px-4 pb-20 pt-28">
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Local experiences,
            <br />
            curated with trust.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
            Guidemate connects travelers with independent local guides - vetted over time by an AI
            reputation agent, verified on completion, paid instantly.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/explore"
              className="bg-brand-amber px-7 py-3 text-sm font-semibold text-brand-blueDark transition hover:bg-brand-blue hover:text-white"
            >
              Explore experiences
            </Link>
            <Link
              href="/apply"
              className="bg-brand-amber px-7 py-3 text-sm font-semibold text-brand-blueDark transition hover:bg-brand-blue hover:text-white"
            >
              Apply to be a guide
            </Link>
          </div>
        </div>
      </section>

      <section id="experiences" className="bg-white text-brand-blueDark">
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

      <section className="bg-brand-bg text-brand-blueDark">
        <div className="mx-auto grid max-w-6xl gap-16 px-4 py-24 md:grid-cols-[2fr_3fr]">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">The Guidemate advantage</h2>
            <p className="mt-5 text-sm leading-relaxed text-brand-muted">
              Built so travelers stop googling strangers, and guides stop waiting weeks to get paid.
            </p>
          </div>
          <ul>
            {ADVANTAGES.map((item, idx) => (
              <li
                key={item.title}
                className={`py-8 ${idx < ADVANTAGES.length - 1 ? "border-b border-dotted border-brand-border" : ""}`}
              >
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-muted">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <Image
          src="/hero-beach.png"
          alt=""
          fill
          className="object-cover opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-brand-blueDark/80" />
        <div className="relative mx-auto max-w-3xl px-4 py-24">
          <div className="bg-brand-blueDark/95 px-6 py-14 sm:px-16">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Ready for a local experience?</h2>
            <p className="mx-auto mt-3 max-w-md text-center text-sm text-white/65">
              Tell us what you&apos;re after. We&apos;ll take you to the experiences you can book today.
            </p>
            <HomeInquiryForm />
          </div>
        </div>
      </section>
    </div>
  );
}
