import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/marketingMetadata";
import { getKenyaDestination, KENYA_DESTINATIONS } from "@/lib/kenyaDestinations";
import { MarketingSection } from "@/components/marketing/MarketingArticle";

export function generateStaticParams() {
  return KENYA_DESTINATIONS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dest = getKenyaDestination(slug);
  if (!dest) return { title: "Destination not found" };
  return pageMetadata({
    title: dest.title,
    description: dest.metaDescription,
    path: `/destinations/${dest.slug}`,
  });
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dest = getKenyaDestination(slug);
  if (!dest) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 text-[var(--gm-ink)] sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-accent">Kenya destinations</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{dest.title}</h1>
      <p className="mt-4 text-base leading-relaxed text-brand-muted">{dest.intro}</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-brand-muted">
        <MarketingSection title="Why book on Guidemate">
          <ul className="list-disc space-y-2 pl-5">
            {dest.highlights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </MarketingSection>
        <MarketingSection title="Find a guide">
          <p>
            <Link href={dest.exploreHref} className="font-semibold text-brand-accent underline">
              {dest.exploreLabel}
            </Link>
            , or{" "}
            <Link href="/live" className="font-semibold text-brand-accent underline">
              watch guides live
            </Link>{" "}
            before you book.
          </p>
        </MarketingSection>
        <p>
          <Link href="/destinations" className="text-sm font-semibold text-brand-muted hover:text-brand-accent">
            ← All destinations
          </Link>
        </p>
      </div>
    </article>
  );
}
