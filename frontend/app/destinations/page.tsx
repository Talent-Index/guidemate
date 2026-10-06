import Link from "next/link";
import { pageMetadata } from "@/lib/marketingMetadata";
import { KENYA_DESTINATIONS } from "@/lib/kenyaDestinations";

export const metadata = pageMetadata({
  title: "Kenya destinations",
  description:
    "Plan Mt Kenya treks, Nairobi city walks, Aberdare trips, and Kakamega Forest hikes with vetted Guidemate guides.",
  path: "/destinations",
});

export default function DestinationsIndexPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 text-[var(--gm-ink)] sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-accent">Kenya</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Destinations we serve</h1>
      <p className="mt-4 text-base leading-relaxed text-brand-muted">
        Start with the regions our guides actually run. Each page links into live listings on Guidemate.
      </p>
      <ul className="mt-10 flex flex-col gap-4">
        {KENYA_DESTINATIONS.map((d) => (
          <li key={d.slug}>
            <Link
              href={`/destinations/${d.slug}`}
              className="block border border-[var(--gm-border)] bg-[var(--gm-surface)] p-5 transition hover:border-brand-accent"
            >
              <h2 className="text-lg font-bold">{d.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-brand-muted">{d.intro.slice(0, 160)}…</p>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
