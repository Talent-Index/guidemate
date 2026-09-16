"use client";

import type { PaymentQuote } from "@/lib/api";

export type PaymentRail = "mpesa" | "checkout";

export function PaymentRailGuide({
  rail,
  quote,
  processing,
}: {
  rail: PaymentRail;
  quote: PaymentQuote | null;
  processing?: boolean;
}) {
  if (rail === "mpesa") {
    if (processing) return <p className="mt-3 text-sm font-semibold text-brand-accent">Enter PIN on your phone.</p>;
    return (
      <p className="mt-3 text-sm text-brand-muted">M-Pesa prompt on this number.</p>
    );
  }

  return (
    <p className="mt-3 text-sm text-brand-muted">
      {quote ? `${quote.amountUsdc.toFixed(2)} USDC · ` : ""}Pay on Minisend, then return here.
    </p>
  );
}
