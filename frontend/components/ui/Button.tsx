import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "secondary";

const variantClasses: Record<Variant, string> = {
  // Amber CTA - reserved for the single key action per screen (Booking.com-style).
  primary:
    "bg-brand-amber text-brand-blueDark hover:bg-brand-amberDark focus-visible:ring-brand-amberDark",
  accent: "bg-brand-accent text-white hover:bg-brand-blue focus-visible:ring-brand-blue",
  secondary:
    "bg-white text-brand-blue border border-brand-border hover:bg-brand-bg focus-visible:ring-brand-accent",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", disabled, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
