import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--gm-border)] bg-[var(--gm-canvas)] text-[var(--gm-ink)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/" className="inline-flex items-center border border-[var(--gm-border)] bg-[#ffffff] px-3 py-1.5 dark:bg-[#000000]">
            <BrandLogo className="h-6 w-auto" />
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--gm-muted)]">
            Curated local experiences from vetted guides, settled instantly on Avalanche.
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <Link href="/terms" className="text-[var(--gm-muted)] transition hover:text-[var(--gm-ink)]">
            Terms and conditions
          </Link>
          <Link href="/guide/terms" className="text-[var(--gm-muted)] transition hover:text-[var(--gm-ink)]">
            Guide terms
          </Link>
          <Link href="/privacy" className="text-[var(--gm-muted)] transition hover:text-[var(--gm-ink)]">
            Privacy Policy
          </Link>
          <Link href="/accessibility" className="text-[var(--gm-muted)] transition hover:text-[var(--gm-ink)]">
            Accessibility Statement
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <SocialLink href="https://www.linkedin.com/company/your-guidemate/" label="LinkedIn">
            <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S.02 4.88.02 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8.5h4.56V24H.22V8.5zM8.34 8.5h4.37v2.12h.06c.61-1.16 2.1-2.38 4.32-2.38 4.62 0 5.47 3.04 5.47 7v8.76h-4.56v-7.77c0-1.85-.03-4.23-2.58-4.23-2.58 0-2.98 2.01-2.98 4.1V24H8.34V8.5z" />
          </SocialLink>
          <SocialLink href="https://www.instagram.com/" label="Instagram">
            <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zm5.25-3.25a1 1 0 1 1-1 1 1 1 0 0 1 1-1z" />
          </SocialLink>
          <SocialLink href="https://x.com/" label="X">
            <path d="M18.9 2H22l-8.2 9.4L23.2 22h-6.6l-5.2-6.8L5.4 22H2.2l8.8-10L1 2h6.7l4.7 6.2L18.9 2zm-1.2 18h1.8L6.4 3.9H4.5L17.7 20z" />
          </SocialLink>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center border border-[var(--gm-border)] text-[var(--gm-ink)]/70 transition hover:border-brand-accent hover:text-brand-accent"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
        {children}
      </svg>
    </a>
  );
}
