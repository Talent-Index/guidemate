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
    return (
      <p className="mt-3 text-sm text-brand-muted">
        {processing
          ? "Check your phone and enter your M-Pesa PIN. Keep this page open."
          : quote
            ? `You'll be charged about KES ${quote.touristKes.toLocaleString()}. A prompt is sent to this number.`
            : "A prompt is sent to this number. Keep this page open."}
      </p>
    );
  }

  return (
    <p className="mt-3 text-sm text-brand-muted">
      {quote
        ? `Pay ${quote.amountUsdc.toFixed(2)} USDC (or USDT) on Minisend, then you'll come back here.`
        : "You'll pay on Minisend, then return here."}
    </p>
  );
}
