import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-brand-border bg-white p-6 shadow-card ${className}`}
      {...props}
    />
  );
}
