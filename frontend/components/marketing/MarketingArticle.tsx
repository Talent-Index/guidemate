import type { ReactNode } from "react";
import Link from "next/link";

export function MarketingArticle({
  eyebrow,
  title,
  intro,
  children,
  cta,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children?: ReactNode;
  cta?: { label: string; href: string; external?: boolean };
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 text-[var(--gm-ink)] sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-accent">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-4 text-base leading-relaxed text-brand-muted">{intro}</p>
      {children ? <div className="mt-10 space-y-8 text-sm leading-relaxed text-brand-muted">{children}</div> : null}
      {cta ? (
        <p className="mt-12">
          {cta.external ? (
            <a
              href={cta.href}
              target="_blank"
              rel="noreferrer"
              className="inline-block bg-brand-blue px-7 py-3 text-sm font-semibold text-white transition hover:bg-brand-accent"
            >
              {cta.label}
            </a>
          ) : (
            <Link
              href={cta.href}
              className="inline-block bg-brand-amber px-7 py-3 text-sm font-semibold text-brand-blueDark transition hover:bg-brand-amberDark"
            >
              {cta.label}
            </Link>
          )}
        </p>
      ) : null}
    </article>
  );
}

export function MarketingSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-[var(--gm-ink)]">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
