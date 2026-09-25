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
  open,
  onOpenChange,
  balanceUsdc,
  phone,
  settingsHref,
  isGuide,
  withdrawing,
  onWithdraw,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balanceUsdc: number;
  phone: string;
  settingsHref: string;
  isGuide: boolean;
  withdrawing: boolean;
  onWithdraw: (amountUsdc: number) => void;
}) {
  const { convert, formatFiat } = useCurrency();
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

  const canWithdraw = balanceUsdc > 0;

  if (!open) {
    return (
      <Button
        type="button"
        variant="primary"
        className="w-full"
        disabled={!canWithdraw}
        onClick={() => onOpenChange(true)}
      >
        Withdraw to M-Pesa
      </Button>
    );
  }

  if (!phone) {
    return (
      <Card className="p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-bold text-brand-blueDark">Withdraw to M-Pesa</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-sm font-semibold text-brand-muted hover:text-brand-blueDark"
          >
            Cancel
          </button>
        </div>
        <p className="mt-2 text-sm text-brand-muted">Add your Safaricom number in settings to cash out.</p>
        <Link href={settingsHref} className="mt-4 inline-block">
          <Button variant="primary">Add M-Pesa number</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-bold text-brand-blueDark">Withdraw to M-Pesa</h2>
        <button
          type="button"
          disabled={withdrawing}
          onClick={() => onOpenChange(false)}
          className="text-sm font-semibold text-brand-muted hover:text-brand-blueDark disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      <p className="mt-1 text-sm text-brand-muted">
        {isGuide
          ? "Trip payouts and live earnings in your wallet (your 85% share)."
          : "Send USDC from your Guidemate wallet to your phone."}
      </p>

      <div className="mt-4 rounded-xl border border-brand-border bg-brand-bg/40 px-4 py-3 text-sm">
        <p className="font-semibold text-brand-blueDark">
          {formatFiat(balanceUsdc, "KES") ?? `KES ${formatKes(balanceKes ?? 0)}`} available
        </p>
        <p className="mt-0.5 text-brand-muted">{balanceUsdc.toFixed(2)} USDC at today&apos;s rate</p>
        <p className="mt-1 text-xs text-brand-muted">To {phone}</p>
      </div>

      <label className="mt-4 block text-sm font-medium text-brand-blueDark">Amount (USDC)</label>
      <div className="mt-1 flex gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          className="form-input-light flex-1 text-lg font-semibold tabular-nums"
          placeholder="0.00"
          value={amountUsdc}
          onChange={(e) => setAmountUsdc(e.target.value)}
        />
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 px-4"
          onClick={() => setAmountUsdc(String(Math.round(balanceUsdc * 100) / 100))}
        >
          Max
        </Button>
      </div>

      {validAmount && quote && !quoteLoading && receiveKes != null && (
        <div className="mt-4 rounded-xl border border-brand-accent/25 bg-brand-accent/5 px-4 py-3 text-sm">
          <p className="font-semibold text-brand-blueDark">You receive on M-Pesa</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-blueDark">KES {formatKes(receiveKes)}</p>
          {feeKes != null && feeKes > 0 && (
            <p className="mt-1 text-xs text-brand-muted">Includes Minisend fee KES {formatKes(feeKes)}</p>
          )}
        </div>
      )}

      {quoteLoading && validAmount && (
        <p className="mt-3 text-xs text-brand-muted">Getting live M-Pesa quote…</p>
      )}

      <Button
        variant="primary"
        className="mt-5 w-full"
        disabled={withdrawing || !validAmount || quoteLoading || !quote}
        onClick={() => onWithdraw(parsedUsdc)}
      >
        {withdrawing ? "Sending to M-Pesa…" : "Withdraw to M-Pesa"}
      </Button>
    </Card>
  );
}
