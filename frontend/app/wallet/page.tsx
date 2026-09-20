"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { RoleGate } from "@/components/auth/RoleGate";
import { firstNameFromProfile, useAuth } from "@/lib/auth/AuthProvider";
import {
  getWallet,
  provisionWallet,
  withdrawWallet,
  friendlyWalletError,
  type WalletSummary,
  SNOWTRACE_TX_BASE,
} from "@/lib/api";
import { Price, useCurrency } from "@/lib/fx";
import { useToast } from "@/components/ui/Toast";
import { WithdrawMpesaPanel } from "@/components/wallet/WithdrawMpesaPanel";

function txLabel(type: string) {
  const labels: Record<string, string> = {
    booking_release: "Trip payout",
    mpesa_withdraw: "M-Pesa withdraw",
    mpesa_onramp: "M-Pesa top-up",
    escrow_lock: "Booking payment",
    transfer_in: "Received",
    transfer_out: "Sent",
    stream_ppv: "Live access",
    stream_tip: "Tip",
  };
  return labels[type] ?? type.replace(/_/g, " ");
}

export default function WalletPage() {
  const { loading: authLoading, session, profile, user } = useAuth();
  const { formatFiat } = useCurrency();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [triedProvision, setTriedProvision] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isGuide = profile?.role === "guide";
  const phone = profile?.phone?.trim() || "";
  const settingsHref = isGuide ? "/guide/settings" : "/tourist/settings";

  async function refresh() {
    if (!session) return;
    setLoading(true);
    try {
      const summary = await getWallet(session.access_token);
      setWallet(summary);
    } catch {
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!session || loading || triedProvision || !wallet || wallet.address) return;
    setTriedProvision(true);
    void provisionWallet(session.access_token)
      .then(() => refresh())
      .catch((err) => setError((err as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading, wallet, triedProvision]);

  async function handleWithdraw(amount: number) {
    if (!session) return;
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount to withdraw.");
      return;
    }
    if (!phone) {
      setError("Add an M-Pesa phone number in settings first.");
      return;
    }
    setWithdrawing(true);
    setError(null);
    try {
      const result = await withdrawWallet(amount, session.access_token, phone);
      const next = result.pending
        ? `Withdrawal started, about KES ${result.kesAmount.toLocaleString()} should arrive on M-Pesa shortly · Ref ${result.reference}`
        : `KES ${result.kesAmount.toLocaleString()} sent to M-Pesa · Ref ${result.reference}`;
      setMessage(next);
      toast(next, "success");
      setWithdrawOpen(false);
      await refresh();
    } catch (err) {
      const next = friendlyWalletError((err as Error).message);
      setError(next);
      toast(next, "error");
    } finally {
      setWithdrawing(false);
    }
  }

  if (authLoading || (session && !profile)) {
    return <p className="text-sm text-brand-muted">Loading…</p>;
  }

  if (!session || (profile?.role !== "guide" && profile?.role !== "tourist")) {
    return (
      <RoleGate
        role="tourist"
        title="Sign in to open your wallet"
        body="Create an account or sign in to see your balance and withdraw to M-Pesa."
      />
    );
  }

  const first = firstNameFromProfile(profile, user?.email);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 pb-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">Wallet</p>
        <h1 className="mt-1 text-2xl font-bold text-brand-blueDark">Hi, {first}</h1>
        <p className="mt-2 text-sm text-brand-muted">
          {isGuide
            ? "Your 85% share from trips and live streams. Withdraw to M-Pesa when you are ready."
            : "Your Guidemate balance. Withdraw to M-Pesa when you are ready."}
        </p>
      </div>

      <div className="rounded-2xl border border-brand-border bg-gradient-to-br from-brand-blueDark to-brand-blue p-6 text-white shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Available balance</p>
            {loading ? (
              <p className="mt-3 text-sm text-white/80">Loading…</p>
            ) : hideAmounts ? (
              <p className="mt-3 text-3xl font-bold tracking-widest">••••</p>
            ) : (
              <div className="mt-3">
                <p className="text-3xl font-bold tabular-nums">
                  {formatFiat(wallet?.balanceUsdc ?? 0) ?? `${wallet?.balanceUsdc ?? 0} USDC`}
                </p>
                <p className="mt-1 text-sm text-white/75 tabular-nums">{wallet?.balanceUsdc ?? 0} USDC</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setHideAmounts((v) => !v)}
            className="rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-white/90 hover:bg-white/10"
          >
            {hideAmounts ? "Show" : "Hide"}
          </button>
        </div>
      </div>

      <WithdrawMpesaPanel
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        balanceUsdc={wallet?.balanceUsdc ?? 0}
        phone={phone}
        settingsHref={settingsHref}
        isGuide={isGuide}
        withdrawing={withdrawing}
        onWithdraw={(amount) => void handleWithdraw(amount)}
      />
      {!withdrawOpen && (wallet?.balanceUsdc ?? 0) <= 0 && !loading && (
        <p className="-mt-4 text-center text-xs text-brand-muted">Nothing to withdraw yet.</p>
      )}

      {message && <p className="text-sm text-brand-success">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <h2 className="text-sm font-bold uppercase tracking-wide text-brand-muted">Recent transactions</h2>
        {loading ? (
          <p className="mt-3 text-sm text-brand-muted">Loading…</p>
        ) : !wallet?.transactions.length ? (
          <p className="mt-3 text-sm text-brand-muted">No transactions yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-brand-border">
            {wallet.transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold capitalize text-brand-blueDark">{txLabel(tx.type)}</p>
                  <p className="text-xs text-brand-muted">{new Date(tx.createdAt).toLocaleString()}</p>
                  {tx.txHash && (
                    <a
                      href={`${SNOWTRACE_TX_BASE}/${tx.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-brand-accent hover:underline"
                    >
                      View on Snowtrace
                    </a>
                  )}
                </div>
                {hideAmounts ? (
                  <span className="text-sm text-brand-muted">••••</span>
                ) : (
                  <Price amountUsdc={tx.amountUsdc} size="sm" />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
