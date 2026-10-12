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
    if (processing) {
      return (
        <p className="mt-3 text-sm leading-relaxed text-brand-muted">
          <span className="font-semibold text-brand-accent">Keep this page open.</span> Enter your M-Pesa PIN when the
          STK prompt appears. On busy networks it can take <strong className="font-semibold text-brand-blueDark">1–2
          minutes</strong> to show up.
        </p>
      );
    }
    return (
      <p className="mt-3 text-sm text-brand-muted">
        We send an STK push to this number. Use the Safaricom line that receives M-Pesa prompts.
      </p>
    );
  }

  const kesLine = quote ? formatFiat(quote.amountUsdc, "KES") : null;

  return (
    <p className="mt-3 text-sm text-brand-muted">
      {kesLine ? `${kesLine} · ` : ""}Pay on Minisend with USDC or USDT, then return here.
    </p>
  );
}
