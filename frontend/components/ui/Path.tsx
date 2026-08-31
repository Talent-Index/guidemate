import Link from "next/link";
import type { ReactNode } from "react";

export function UnitBanner({
  eyebrow,
  title,
  tone = "amber",
}: {
  eyebrow: string;
  title: string;
  tone?: "amber" | "blue";
}) {
  const palette =
    tone === "amber" ? "bg-brand-amber text-brand-blueDark" : "bg-brand-blue text-white";

  return (
    <div className={`rounded-3xl px-5 py-5 ${palette}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-75">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-bold leading-tight tracking-tight">{title}</h2>
    </div>
  );
}

export function PathNode({
  href,
  label,
  current = false,
  broken = false,
  children,
}: {
  href?: string;
  label: string;
  current?: boolean;
  broken?: boolean;
  children: ReactNode;
}) {
  const disk = (
    <span
      className={`flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full shadow-[0_6px_0_0_rgba(0,0,0,0.25)] ${
        broken
          ? "border-4 border-dashed border-white/30 bg-transparent text-white/30"
          : current
            ? "bg-brand-amber text-brand-blueDark"
            : "bg-brand-blue text-white/85"
      }`}
    >
      {children}
    </span>
  );

  const body = (
    <>
      {disk}
      <span className="max-w-[6.5rem] text-center text-xs font-semibold text-[var(--gm-ink)]">{label}</span>
    </>
  );

  if (!href || broken) {
    return <div className="flex flex-col items-center gap-2">{body}</div>;
  }

  return (
    <Link href={href} className="flex flex-col items-center gap-2">
      {body}
    </Link>
  );
}

export function PathTrail({
  items,
}: {
  items: {
    href?: string;
    label: string;
    current?: boolean;
    broken?: boolean;
    icon: ReactNode;
  }[];
}) {
  return (
    <ol className="relative mx-auto flex w-full max-w-xs flex-col items-center gap-7 py-8">
      {items.map((item, i) => (
        <li
          key={`${item.label}-${i}`}
          className={i % 2 === 0 ? "-translate-x-12" : "translate-x-12"}
        >
          <PathNode href={item.href} label={item.label} current={item.current} broken={item.broken}>
            {item.icon}
          </PathNode>
        </li>
      ))}
    </ol>
  );
}
