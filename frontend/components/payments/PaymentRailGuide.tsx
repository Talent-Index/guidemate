"use client";

import type { PaymentQuote } from "@/lib/api";
import { useCurrency } from "@/lib/fx";

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
  const { formatFiat } = useCurrency();

  if (rail === "mpesa") {
    if (processing) return <p className="mt-3 text-sm font-semibold text-brand-accent">Enter PIN on your phone.</p>;
    return (
      <p className="mt-3 text-sm text-brand-muted">M-Pesa prompt on this number.</p>
    );
  }

  const kesLine = quote ? formatFiat(quote.amountUsdc, "KES") : null;

  return (
    <p className="mt-3 text-sm text-brand-muted">
      {kesLine ? `${kesLine} · ` : ""}
      {quote ? `${quote.amountUsdc.toFixed(2)} USDC · ` : ""}Pay on Minisend, then return here.
    </p>
  );
}
