"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Price } from "@/lib/fx";
import {
  getWallet,
  provisionWallet,
  withdrawWallet,
  type WalletSummary,
  SNOWTRACE_TX_BASE,
} from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

export function WalletPanel({
  accessToken,
  canWithdraw = false,
  phone,
}: {
  accessToken: string;
  canWithdraw?: boolean;
  phone?: string | null;
}) {
  const { toast } = useToast();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const summary = await getWallet(accessToken);
      setWallet(summary);
    } catch {
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [accessToken]);

  async function handleProvision() {
    setProvisioning(true);
    setError(null);
    try {
      await provisionWallet(accessToken);
      await refresh();
      setMessage("Wallet created.");
      toast("Wallet created", "success");
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toast(message, "error");
    } finally {
      setProvisioning(false);
    }
  }

  async function handleWithdraw() {
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setWithdrawing(true);
    setError(null);
    try {
      const result = await withdrawWallet(amount, accessToken, phone ?? undefined);
      if (result.pending) {
        const msg = `Withdrawal initiated — KES ${result.kesAmount.toLocaleString()} will arrive on M-Pesa shortly`;
        setMessage(msg);
        toast(msg, "success");
      } else {
        const msg = `KES ${result.kesAmount.toLocaleString()} sent to M-Pesa`;
        setMessage(`${msg} · Ref ${result.reference}`);
        toast(msg, "success");
      }
      setWithdrawAmount("");
      await refresh();
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toast(message, "error");
    } finally {
      setWithdrawing(false);
    }
  }

  if (loading) return <p className="text-sm text-brand-muted">Loading wallet…</p>;

  if (!wallet?.address) {
    return (
      <Card className="p-4">
        <p className="text-sm text-brand-muted">No in-app wallet yet.</p>
        <Button variant="primary" className="mt-3" disabled={provisioning} onClick={handleProvision}>
          {provisioning ? "Creating…" : "Create wallet"}
        </Button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Wallet balance</p>
          <Price amountUsdc={wallet.balanceUsdc} className="mt-1" />
          <p className="mt-1 text-xs text-brand-muted">
            ≈ KES {wallet.balanceKes.toLocaleString()}
          </p>
        </div>
        <p className="font-mono text-xs text-brand-muted">{wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}</p>
      </div>

      {canWithdraw && wallet.balanceUsdc > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            className="form-input-light w-28 text-sm"
            placeholder="USDC"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
          />
          <Button variant="accent" disabled={withdrawing} onClick={handleWithdraw}>
            {withdrawing ? "Sending…" : "Withdraw to M-Pesa"}
          </Button>
        </div>
      )}

      {message && <p className="mt-3 text-sm text-brand-success">{message}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {wallet.transactions.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Recent activity</p>
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
            {wallet.transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between text-sm">
                <span className="capitalize text-brand-muted">{tx.type.replace(/_/g, " ")}</span>
                <span className={tx.amountUsdc >= 0 ? "text-brand-success" : "text-brand-blueDark"}>
                  {tx.amountUsdc >= 0 ? "+" : ""}
                  {tx.amountUsdc} USDC
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
