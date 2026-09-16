"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getPaymentQuote, type PaymentQuote } from "@/lib/api";
import { useCurrency } from "@/lib/fx";

function formatKes(n: number) {
  return n.toLocaleString("en-KE", { maximumFractionDigits: 0 });
}

export function WithdrawMpesaPanel({
  balanceUsdc,
  phone,
  settingsHref,
  isGuide,
  withdrawing,
  onWithdraw,
}: {
  balanceUsdc: number;
  phone: string;
  settingsHref: string;
  isGuide: boolean;
  withdrawing: boolean;
  onWithdraw: (amountUsdc: number) => void;
}) {
  const { convert } = useCurrency();
  const [amountUsdc, setAmountUsdc] = useState("");
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const parsedUsdc = Number(amountUsdc);
  const validAmount = Number.isFinite(parsedUsdc) && parsedUsdc > 0 && parsedUsdc <= balanceUsdc;

  const balanceKes = useMemo(() => {
    const k = convert(balanceUsdc, "KES");
    return k != null ? Math.round(k) : null;
  }, [balanceUsdc, convert]);

  useEffect(() => {
    if (!phone || !validAmount) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    const t = window.setTimeout(() => {
      getPaymentQuote(parsedUsdc, phone)
        .then((q) => {
          if (!cancelled) setQuote(q);
        })
        .catch(() => {
          if (!cancelled) setQuote(null);
        })
        .finally(() => {
          if (!cancelled) setQuoteLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [parsedUsdc, phone, validAmount]);

  const receiveKes = quote ? Math.round(quote.offRamp.kes) : null;
  const feeKes = quote ? Math.round(quote.offRamp.fee) : null;
  const fxKes = quote ? Math.round(quote.kesDirect) : null;

  if (!phone) {
    return (
      <Card>
        <h2 className="text-sm font-bold text-brand-blueDark">Cash out to M-Pesa</h2>
        <p className="mt-1 text-sm text-brand-muted">Add your M-Pesa number in settings first.</p>
        <Link href={settingsHref} className="mt-3 inline-block">
          <Button variant="primary">Add M-Pesa number</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-brand-border px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Spend from</p>
        <div className="mt-2 flex items-start gap-3 rounded-xl border-2 border-brand-accent bg-brand-accent/5 p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue text-lg text-white">
            G
          </span>
          <div>
            <p className="font-semibold text-brand-blueDark">Guidemate wallet</p>
            <p className="text-sm text-brand-muted">
              {balanceUsdc.toFixed(2)} USDC available
              {balanceKes != null ? ` · about KES ${formatKes(balanceKes)}` : ""}
            </p>
            {isGuide && (
              <p className="mt-0.5 text-xs text-brand-muted">Your share (85%) from completed trips</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-brand-blueDark px-4 py-5 text-white">
        <p className="text-xs font-medium text-white/70">Amount</p>
        <p className="mt-1 text-sm text-white/80">Enter USDC — we show what you get on M-Pesa</p>
        <div className="mt-3 flex items-end gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className="w-full border-0 bg-transparent text-4xl font-bold text-white outline-none placeholder:text-white/30"
            placeholder="0"
            value={amountUsdc}
            onChange={(e) => setAmountUsdc(e.target.value)}
          />
          <span className="pb-1 text-lg font-semibold text-white/80">USDC</span>
        </div>
        {receiveKes != null && !quoteLoading && (
          <p className="mt-3 text-3xl font-bold tabular-nums text-brand-amber">
            → KES {formatKes(receiveKes)} on M-Pesa
          </p>
        )}
        <div className="mt-2 flex items-center justify-between text-xs text-white/60">
          <span>
            {quoteLoading
              ? "Loading Minisend quote…"
              : fxKes != null
                ? `≈ KES ${formatKes(fxKes)} at live FX`
                : balanceKes != null
                  ? `Up to KES ${formatKes(balanceKes)}`
                  : "Enter an amount"}
          </span>
          <button
            type="button"
            className="rounded-full bg-white/15 px-2 py-0.5 font-semibold text-white hover:bg-white/25"
            onClick={() => setAmountUsdc(String(Math.round(balanceUsdc * 100) / 100))}
          >
            Max
          </button>
        </div>
      </div>

      <div className="space-y-2 px-4 py-4">
        {validAmount && quote && (
          <div className="rounded-xl bg-brand-bg px-4 py-3 text-sm">
            <div className="flex justify-between text-brand-muted">
              <span>At live FX</span>
              <span>KES {formatKes(fxKes ?? 0)}</span>
            </div>
            <div className="mt-2 flex justify-between text-brand-muted">
              <span>Minisend fee</span>
              <span>− KES {formatKes(feeKes ?? 0)}</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-brand-border pt-3 font-bold text-brand-blueDark">
              <span>You receive on M-Pesa</span>
              <span className="text-lg">KES {formatKes(receiveKes ?? 0)}</span>
            </div>
            <p className="mt-2 text-xs text-brand-muted">To {phone}</p>
          </div>
        )}

        <Button
          variant="accent"
          className="w-full"
          disabled={withdrawing || !validAmount || quoteLoading || !quote}
          onClick={() => onWithdraw(parsedUsdc)}
        >
          {withdrawing ? "Sending to M-Pesa…" : "Review withdrawal →"}
        </Button>
        <p className="text-center text-xs text-brand-muted">Cashing out to Kenya · KES via Minisend</p>
      </div>
    </Card>
  );
}
