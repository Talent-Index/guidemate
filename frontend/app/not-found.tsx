import Link from "next/link";
import { PathTrail, UnitBanner } from "@/components/ui/Path";

function IconExplore() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
      <path d="M12 2.5A9.5 9.5 0 1 0 21.5 12 9.51 9.51 0 0 0 12 2.5zm3.6 5.2-1.5 5.1-5.1 1.5 1.5-5.1 5.1-1.5z" />
    </svg>
  );
}

function IconGap() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
      <path d="M7 11h10v2H7z" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
      <path d="M12 3.2 3.5 10.2V21h6.2v-6.3h4.6V21h6.2V10.2L12 3.2z" />
    </svg>
  );
}

export default function NotFound() {
  return (
    <>
      <div className="px-1 pb-4 md:hidden">
        <UnitBanner eyebrow="404" title="This experience isn’t on the map" />
        <PathTrail
          items={[
            { href: "/explore", label: "Explore", current: true, icon: <IconExplore /> },
            { label: "Missing", broken: true, icon: <IconGap /> },
            { href: "/", label: "Home", icon: <IconHome /> },
          ]}
        />
        <Link
          href="/explore"
          className="block rounded-full bg-brand-amber py-3.5 text-center text-sm font-bold text-brand-blueDark"
        >
          Explore experiences
        </Link>
      </div>

      <div className="hidden py-16 text-center md:block">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-amber">404</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-brand-blueDark sm:text-4xl">
          This experience isn&apos;t on the map.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-brand-muted">
          The page you&apos;re looking for has moved, or the link is out of date. Head back to
          experiences you can actually book.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/explore"
            className="bg-brand-amber px-7 py-3 text-sm font-semibold text-brand-blueDark transition hover:bg-brand-blue hover:text-white"
          >
            Explore experiences
          </Link>
          <Link
            href="/"
            className="border border-brand-border px-7 py-3 text-sm font-semibold text-brand-blueDark transition hover:bg-brand-bg"
          >
            Back home
          </Link>
        </div>
      </div>
    </>
  );
}
