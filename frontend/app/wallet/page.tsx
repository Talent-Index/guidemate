"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
import { GreetingRow } from "@/components/ui/GreetingRow";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { RoleGate } from "@/components/auth/RoleGate";
import { firstNameFromProfile, useAuth } from "@/lib/auth/AuthProvider";
import {
  getWallet,
  provisionWallet,
  sendWallet,
  withdrawWallet,
  type WalletSummary,
  SNOWTRACE_TX_BASE,
} from "@/lib/api";
import { Price, useCurrency } from "@/lib/fx";
import { useToast } from "@/components/ui/Toast";

function shorten(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function WalletPage() {
  const router = useRouter();
  const { loading: authLoading, session, profile, user } = useAuth();
  const { formatFiat } = useCurrency();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [copied, setCopied] = useState(false);
  const [triedProvision, setTriedProvision] = useState(false);
  const [panel, setPanel] = useState<"fund" | "withdraw" | "send" | "receive" | "pay" | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isGuide = profile?.role === "guide";
  const isTourist = profile?.role === "tourist";

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
    void handleProvision();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading, wallet, triedProvision]);

  async function handleProvision() {
    if (!session) return;
    setProvisioning(true);
    setError(null);
    try {
      await provisionWallet(session.access_token);
      await refresh();
      setMessage("Wallet created.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProvisioning(false);
    }
  }

  async function handleWithdraw() {
    if (!session) return;
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setWithdrawing(true);
    setError(null);
    try {
      const result = await withdrawWallet(amount, session.access_token, profile?.phone ?? undefined);
      if (result.pending) {
        setMessage(
          `Withdrawal initiated — KES ${result.kesAmount.toLocaleString()} will arrive on M-Pesa shortly · Ref ${result.reference}`
        );
      } else {
        setMessage(`KES ${result.kesAmount.toLocaleString()} sent to M-Pesa · Ref ${result.reference}`);
      }
      setWithdrawAmount("");
      setPanel(null);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setWithdrawing(false);
    }
  }

  async function handleSend() {
    if (!session) return;
    const amount = Number(sendAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount to send.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const result = await sendWallet(sendTo.trim(), amount, session.access_token);
      setMessage(`Sent ${amount} USDC · ${result.txHash.slice(0, 10)}…`);
      toast("Transfer sent", "success");
      setSendAmount("");
      setSendTo("");
      setPanel(null);
      await refresh();
    } catch (err) {
      const next = (err as Error).message;
      setError(next);
      toast(next, "error");
    } finally {
      setSending(false);
    }
  }

  async function copyAddress() {
    if (!wallet?.address) return;
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy address.");
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
        body="Create an account or sign in to see balances and activity."
      />
    );
  }

  const first = firstNameFromProfile(profile, user?.email);

  return (
    <div className="flex flex-col gap-6">
      <MobilePageBanner eyebrow="Wallet" title={`Hi, ${first}`} />
      <GreetingRow subtitle={isGuide ? "Earnings, M-Pesa withdrawals, and on-chain activity." : "In-app balance, connected wallets, and recent activity."} />

      <div className="rounded-card bg-brand-blue p-6 text-white shadow-card max-md:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Available balance</p>
            {loading ? (
              <p className="mt-2 text-sm text-white/80">Loading…</p>
            ) : hideAmounts ? (
              <p className="mt-2 text-3xl font-bold tracking-widest">••••</p>
            ) : (
              <div className="mt-2">
                <p className="text-3xl font-bold">
                  {formatFiat(wallet?.balanceUsdc ?? 0) ?? `${wallet?.balanceUsdc ?? 0} USDC`}
                </p>
                <p className="mt-1 text-sm text-white/70">{wallet?.balanceUsdc ?? 0} USDC</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setHideAmounts((v) => !v)}
            className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white/90 hover:bg-white/10"
          >
            {hideAmounts ? "Show" : "Hide"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {wallet?.address ? (
            <>
              <p className="font-mono text-sm text-white/80">{shorten(wallet.address)}</p>
              <button
                type="button"
                onClick={() => void copyAddress()}
                className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </>
          ) : (
            <p className="text-sm text-white/80">No in-app address yet.</p>
          )}
        </div>
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-6">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3">
            <Button variant="primary" onClick={() => setPanel(panel === "fund" ? null : "fund")}>
              Fund wallet
            </Button>
            {isGuide ? (
              <Button variant="secondary" onClick={() => setPanel(panel === "withdraw" ? null : "withdraw")}>
                Withdraw
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => router.push("/explore")}>
                Book a tour
              </Button>
            )}
          </div>

          {panel === "fund" && (
            <Card>
              <h2 className="text-sm font-bold text-brand-blueDark">Fund wallet</h2>
              {!wallet?.address ? (
                <>
                  <p className="mt-2 text-sm text-brand-muted">Create an in-app wallet to hold mUSDC from bookings.</p>
                  <Button variant="primary" className="mt-3" disabled={provisioning} onClick={() => void handleProvision()}>
                    {provisioning ? "Creating…" : "Create wallet"}
                  </Button>
                </>
              ) : isGuide ? (
                <p className="mt-2 text-sm text-brand-muted">
                  Tour earnings credit this balance automatically. Withdraw to M-Pesa after a completed tour.
                </p>
              ) : (
                <p className="mt-2 text-sm text-brand-muted">
                  Bookings can debit this in-app balance. Connect MetaMask or Core below and use the faucet for test mUSDC.
                </p>
              )}
            </Card>
          )}

          {panel === "withdraw" && isGuide && (
            <Card>
              <h2 className="text-sm font-bold text-brand-blueDark">Withdraw to M-Pesa</h2>
              <p className="mt-1 text-sm text-brand-muted">
                Uses the phone number on your guide profile. After a tour is verified, Guidemate sends your 85% share to M-Pesa (Minisend conversion fees apply).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input-light w-28 text-sm"
                  placeholder="USDC"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                <Button variant="accent" disabled={withdrawing || !wallet?.balanceUsdc} onClick={() => void handleWithdraw()}>
                  {withdrawing ? "Sending…" : "Withdraw"}
                </Button>
              </div>
            </Card>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Quick actions</p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {(
                [
                  ["send", "Send"],
                  ["pay", "Pay"],
                  ["receive", "Receive"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPanel(panel === id ? null : id)}
                  className={`rounded-card border p-4 text-center shadow-card ${
                    panel === id
                      ? "border-brand-accent bg-brand-bg"
                      : "border-brand-border bg-white"
                  }`}
                >
                  <p className="text-sm font-semibold text-brand-blueDark">{label}</p>
                </button>
              ))}
            </div>
          </div>

          {panel === "send" && (
            <Card>
              <h2 className="text-sm font-bold text-brand-blueDark">Send USDC</h2>
              <p className="mt-1 text-sm text-brand-muted">
                Send mUSDC from this in-app wallet to another Avalanche Fuji address.
              </p>
              {!wallet?.address ? (
                <>
                  <p className="mt-2 text-sm text-brand-muted">Create a wallet first.</p>
                  <Button variant="primary" className="mt-3" disabled={provisioning} onClick={() => void handleProvision()}>
                    {provisioning ? "Creating…" : "Create wallet"}
                  </Button>
                </>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  <input
                    className="form-input-light text-sm"
                    placeholder="0x recipient address"
                    value={sendTo}
                    onChange={(e) => setSendTo(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input-light w-28 text-sm"
                      placeholder="USDC"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                    />
                    <Button
                      variant="accent"
                      disabled={sending || !sendTo.trim() || !wallet.balanceUsdc}
                      onClick={() => void handleSend()}
                    >
                      {sending ? "Sending…" : "Send"}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {panel === "pay" && (
            <Card>
              <h2 className="text-sm font-bold text-brand-blueDark">Pay</h2>
              <p className="mt-1 text-sm text-brand-muted">
                {isGuide
                  ? "Pay is for booking a tour. Guide earnings stay in this wallet until you withdraw to M-Pesa."
                  : "Book a tour and pay with M-Pesa, USDC, or this in-app balance."}
              </p>
              <Link href="/explore" className="mt-3 inline-block">
                <Button variant="primary">Browse experiences</Button>
              </Link>
            </Card>
          )}

          {panel === "receive" && (
            <Card className="flex flex-col items-center text-center">
              {wallet?.address ? (
                <>
                  <QRCodeSVG value={wallet.address} size={168} />
                  <p className="mt-3 break-all font-mono text-xs text-brand-muted">{wallet.address}</p>
                  <Button variant="secondary" className="mt-3" onClick={() => void copyAddress()}>
                    {copied ? "Copied" : "Copy address"}
                  </Button>
                  <p className="mt-2 text-sm text-brand-muted">
                    Share this QR or address to receive mUSDC on Avalanche Fuji.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-brand-muted">Create a wallet first to get a receive address.</p>
                  <Button variant="primary" className="mt-3" disabled={provisioning} onClick={() => void handleProvision()}>
                    {provisioning ? "Creating…" : "Create wallet"}
                  </Button>
                </>
              )}
            </Card>
          )}

          {isTourist && (
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-brand-blueDark">Connected wallet</h2>
                  <p className="mt-1 text-sm text-brand-muted">
                    MetaMask or Core on Avalanche Fuji. AVAX for gas, mUSDC for bookings.
                  </p>
                </div>
                <WalletConnectButton />
              </div>
            </Card>
          )}

          {message && <p className="text-sm text-brand-success">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wide text-brand-muted">Recent activity</h2>
          {loading ? (
            <p className="mt-3 text-sm text-brand-muted">Loading…</p>
          ) : !wallet?.transactions.length ? (
            <p className="mt-3 text-sm text-brand-muted">No transactions yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-brand-border">
              {wallet.transactions.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold capitalize text-brand-blueDark">{tx.type.replace(/_/g, " ")}</p>
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
    </div>
  );
}
