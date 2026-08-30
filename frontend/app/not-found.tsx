import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative -mx-4 -mb-8 -mt-24 flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-brand-blueDark px-4 text-center text-white">
      <Image
        src="/hero-beach.png"
        alt=""
        fill
        className="object-cover opacity-40"
        sizes="100vw"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-blueDark via-brand-blueDark/80 to-brand-blueDark/50" />

      <div className="relative max-w-xl px-4 py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-amber">404</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
          This experience isn&apos;t on the map.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/70">
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
            className="border border-white/30 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-blueDark"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
