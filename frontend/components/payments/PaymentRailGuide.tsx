"use client";

import type { PaymentQuote } from "@/lib/api";

const PAY_LINK = process.env.NEXT_PUBLIC_MINISEND_PAY_LINK ?? "https://merchant.minisend.xyz/pay/guidemate";

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
      <div className="mt-4 rounded-xl border border-brand-border bg-brand-bg/40 p-4 text-sm">
        <p className="font-semibold text-brand-blueDark">How M-Pesa payment works</p>
        {quote && (
          <p className="mt-2 text-brand-blueDark">
            You will be charged about{" "}
            <span className="font-bold">KES {quote.touristKes.toLocaleString()}</span>
            {quote.touristFeeKes > 0 ? ` (includes KES ${quote.touristFeeKes.toLocaleString()} conversion fee)` : ""}.
          </p>
        )}
        {processing ? (
          <p className="mt-3 font-semibold text-brand-accent">Check your phone for the M-Pesa prompt… keep this page open.</p>
        ) : (
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-brand-muted">
            <li>Enter the Safaricom number that receives M-Pesa (yours or a friend in Kenya).</li>
            <li>Tap Confirm and pay — an M-Pesa prompt (STK push) arrives on that phone within about 30 seconds.</li>
            <li>Enter your M-Pesa PIN on the phone. Do not close this page.</li>
            <li>We confirm payment here, then lock your booking in escrow.</li>
          </ol>
        )}
        <p className="mt-3 text-xs text-brand-muted">
          No prompt? Check the number is Safaricom, has M-Pesa enabled, and has enough balance.
        </p>
        <p className="mt-2 text-xs text-brand-muted">
          Your payment is held in escrow until the experience ends — the guide is paid only after your trip.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-brand-border bg-brand-bg/40 p-4 text-sm">
      <p className="font-semibold text-brand-blueDark">How USDC / USDT payment works</p>
      {quote && (
        <p className="mt-2 text-brand-blueDark">
          You will pay{" "}
          <span className="font-bold">{quote.amountUsdc.toFixed(2)} USDC</span> (or the USDT equivalent) on Minisend Checkout.
        </p>
      )}
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-brand-muted">
        <li>You open a secure Minisend Checkout page — keep this tab available to return.</li>
        <li>Connect MetaMask, Coinbase Wallet, Rainbow, or another supported wallet.</li>
        <li>Pay in USDC or USDT on Base, Ethereum, or another network shown on that page.</li>
        <li>After confirmation you return here and your booking is confirmed.</li>
      </ol>
      <p className="mt-3 text-xs text-brand-muted">
        Don&apos;t have crypto yet? Buy USDC on Coinbase or Binance, send it to your wallet, then pay. We accept USDC and
        USDT — not Bitcoin.
      </p>
      <p className="mt-2 text-xs text-brand-muted">
        Want to see the payment page first?{" "}
        <a href={PAY_LINK} target="_blank" rel="noreferrer" className="font-semibold text-brand-accent hover:underline">
          Preview Minisend checkout
        </a>{" "}
        (demo — your booking uses a page with the exact amount pre-filled).
      </p>
      <p className="mt-2 text-xs text-brand-muted">
        Payment stuck? Wait 1–3 minutes for chain confirmation. Do not pay twice. Use the network Minisend shows.
      </p>
      <p className="mt-2 text-xs text-brand-muted">
        Your payment is held in escrow until the experience ends — the guide is paid only after your trip.
      </p>
    </div>
  );
}
