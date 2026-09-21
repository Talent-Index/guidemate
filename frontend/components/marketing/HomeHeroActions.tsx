"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { destinationIfSignedIn } from "@/lib/auth/gatedPath";

const btnPrimary =
  "bg-brand-amber px-7 py-3 text-sm font-semibold text-brand-blueDark transition hover:bg-brand-amberDark";
const btnOutline =
  "border border-white/40 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20";
const btnGuide = "bg-brand-blue px-7 py-3 text-sm font-semibold text-white transition hover:bg-brand-accent";

export function HomeHeroActions() {
  const { session } = useAuth();
  const signedIn = Boolean(session);

  const liveHref = destinationIfSignedIn("/live", signedIn);
  const exploreHref = destinationIfSignedIn("/explore", signedIn);

  return (
    <div className="mt-10 flex flex-wrap items-center gap-3">
      <Link href={liveHref} className={btnPrimary}>
        Watch live
      </Link>
      <Link href={exploreHref} className={btnOutline}>
        Book an experience
      </Link>
      <Link href="/auth/sign-up/guide" className={btnGuide}>
        Go live as a guide
      </Link>
    </div>
  );
}
