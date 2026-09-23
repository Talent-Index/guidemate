"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
import { AnalyticsGate } from "@/components/auth/AdminGate";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  isoRangeFromDateInputs,
  reportPeriodLabel,
  todayDateInputValue,
} from "@/lib/adminReportDates";
import { getAdminTransactions, type WalletTransaction } from "@/lib/api";

const TYPE_OPTIONS = ["all", "booking", "stream_ppv", "stream_tip", "payout", "refund"] as const;

export default function AdminTransactionsPage() {
  const { session } = useAuth();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]>("all");

  const { from: rangeFrom, to: rangeTo } = useMemo(
    () => isoRangeFromDateInputs(fromDate || undefined, toDate || undefined),
    [fromDate, toDate]
  );
  const periodLabel = reportPeriodLabel(fromDate || undefined, toDate || undefined);
  const filtered = Boolean(fromDate || toDate);

  const load = useCallback(() => {
    if (!session) return;
    setLoading(true);
    getAdminTransactions(session.access_token, {
      limit: 500,
      from: rangeFrom,
      to: rangeTo,
      type: type === "all" ? undefined : type,
    })
      .then((res) => {
        setTransactions(res.transactions);
        setError(null);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [session, rangeFrom, rangeTo, type]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    let usdc = 0;
    let kes = 0;
    for (const tx of transactions) {
      usdc += tx.amountUsdc ?? 0;
      kes += tx.amountKes ?? 0;
    }
    return { usdc: Math.round(usdc * 100) / 100, kes: Math.round(kes) };
  }, [transactions]);

  return (
    <AnalyticsGate>
      <div className="flex flex-col gap-6">
        <div>
          <MobilePageBanner eyebrow="Admin" title="Transactions" />
          <div className="hidden md:flex md:items-end md:justify-between md:gap-4">
            <div>
              <h1 className="text-xl font-bold text-brand-blueDark">Transactions</h1>
              <p className="text-sm text-brand-muted">
                Full ledger of bookings, tips, payouts and refunds. {filtered ? `Showing ${periodLabel}.` : "All time."}
              </p>
            </div>
            <Link
              href="/admin"
              className="rounded-lg border border-brand-border px-4 py-1.5 text-sm font-semibold text-brand-muted hover:border-brand-accent hover:text-brand-accent"
            >
              ← Back to dashboard
            </Link>
          </div>
        </div>

        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted">
              From
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-blueDark"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted">
              To <span className="font-normal">(optional)</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-blueDark"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted">
              Type
              <select
                value={type}
                onChange={(e) => setType(e.target.value as (typeof TYPE_OPTIONS)[number])}
                className="rounded-lg border border-brand-border bg-white px-3 py-2 text-sm capitalize text-brand-blueDark"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t === "all" ? "All types" : t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" variant="secondary" onClick={() => setFromDate(todayDateInputValue())}>
              Today
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
            >
              All time
            </Button>
          </div>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-brand-blueDark">
              {transactions.length} {transactions.length === 1 ? "entry" : "entries"}
            </h2>
            <p className="text-sm text-brand-muted">
              Total: <span className="font-semibold text-brand-blueDark">{totals.usdc.toLocaleString()} USDC</span>
              {totals.kes > 0 ? ` · ${totals.kes.toLocaleString()} KES` : ""}
            </p>
          </div>

          {loading && <div className="mt-4"><ListRowSkeleton count={6} /></div>}

          {!loading && transactions.length === 0 && (
            <p className="mt-4 text-sm text-brand-muted">No transactions in this view.</p>
          )}

          {!loading && transactions.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-brand-border">
              <table className="w-full min-w-[840px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-brand-bg/60 text-[11px] uppercase tracking-wide text-brand-muted">
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Type</th>
                    <th className="px-3 py-2 text-right font-semibold">USDC</th>
                    <th className="px-3 py-2 text-right font-semibold">KES</th>
                    <th className="px-3 py-2 font-semibold">Reference</th>
                    <th className="px-3 py-2 font-semibold">M-Pesa ref</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => (
                    <tr key={tx.id} className={i % 2 ? "bg-white" : "bg-brand-bg/20"}>
                      <td className="border-t border-brand-border/60 px-3 py-2 whitespace-nowrap text-xs text-brand-muted">
                        {new Date(tx.createdAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                      <td className="border-t border-brand-border/60 px-3 py-2 capitalize text-brand-blueDark">
                        {tx.type.replace(/_/g, " ")}
                      </td>
                      <td className="border-t border-brand-border/60 px-3 py-2 text-right font-semibold text-brand-blueDark">
                        {tx.amountUsdc.toLocaleString()}
                      </td>
                      <td className="border-t border-brand-border/60 px-3 py-2 text-right text-brand-muted">
                        {tx.amountKes != null ? tx.amountKes.toLocaleString() : "—"}
                      </td>
                      <td className="border-t border-brand-border/60 px-3 py-2 text-xs text-brand-muted">
                        {tx.referenceId ?? `${tx.id.slice(0, 8)}…`}
                      </td>
                      <td className="border-t border-brand-border/60 px-3 py-2 text-xs text-brand-muted">
                        {tx.mpesaRef ?? "—"}
                      </td>
                      <td className="border-t border-brand-border/60 px-3 py-2">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                            tx.status === "paid" || tx.status === "completed" || tx.status === "success"
                              ? "bg-brand-successBg text-brand-success"
                              : tx.status === "failed" || tx.status === "refunded"
                                ? "bg-red-50 text-red-600"
                                : "bg-brand-amber/20 text-brand-blueDark"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AnalyticsGate>
  );
}
