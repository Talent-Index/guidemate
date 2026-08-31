import type { ReactNode } from "react";

export function FormShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-lg border border-[var(--gm-border)] bg-[var(--gm-surface)] px-8 py-12 sm:px-12">
      <h1 className="text-center text-2xl font-bold tracking-tight text-[var(--gm-ink)] sm:text-3xl">{title}</h1>
      {subtitle && (
        <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-[var(--gm-muted)]">{subtitle}</p>
      )}
      <div className="mt-10">{children}</div>
      {footer && <div className="mt-8 text-center text-sm text-[var(--gm-muted)]">{footer}</div>}
    </div>
  );
}

export function FormField({
  label,
  children,
  tone = "light",
}: {
  label: string;
  children: ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <label className="mb-7 flex flex-col gap-2 text-sm">
      <span className={`font-medium ${tone === "dark" ? "text-white" : "text-[var(--gm-ink)]"}`}>{label}</span>
      {children}
    </label>
  );
}
