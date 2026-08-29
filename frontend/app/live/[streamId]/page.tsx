"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { parseUnits } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { wagmiConfig } from "@/lib/wagmi";
import mockUsdcAbi from "@/lib/abi/MockUSDC.json";
import {
  endStream,
  getStream,
  joinStream,
  listStreamTips,
  recordStreamTip,
  SNOWTRACE_TX_BASE,
  type LiveStreamRecord,
  type StreamTip,
} from "@/lib/api";

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "";
const USDC_ADDRESS = (process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS ?? "") as `0x${string}`;

export default function LiveStreamPage() {
  const params = useParams<{ streamId: string }>();
  const streamId = params.streamId;
  const { session, profile } = useAuth();
  const { address } = useAccount();
  const { writeContractAsync, isPending: writing } = useWriteContract();

  const [stream, setStream] = useState<LiveStreamRecord | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<"publisher" | "viewer" | null>(null);
  const [tips, setTips] = useState<StreamTip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [ending, setEnding] = useState(false);
  const [tipAmount, setTipAmount] = useState("1");
  const [payError, setPayError] = useState<string | null>(null);

  const isGuide = Boolean(session && stream && session.user.id === stream.guideId);
  const needsPayment = Boolean(stream && stream.status === "live" && stream.priceUsdc > 0 && !isGuide && !token);

  const refreshTips = useCallback(async () => {
    try {
      const { tips: latest } = await listStreamTips(streamId);
      setTips(latest);
    } catch {
      // tip feed is best-effort
    }
  }, [streamId]);

  useEffect(() => {
    let cancelled = false;
    getStream(streamId)
      .then(({ stream: latest }) => {
        if (!cancelled) setStream(latest);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });
    refreshTips();
    const interval = setInterval(refreshTips, 6000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [streamId, refreshTips]);

  async function handleJoin(txHash?: string) {
    setJoining(true);
    setError(null);
    try {
      const result = await joinStream(streamId, session?.access_token, txHash);
      setToken(result.token);
      setRole(result.role);
      setStream(result.stream);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setJoining(false);
    }
  }

  async function transferUsdc(to: `0x${string}`, amount: number) {
    if (!USDC_ADDRESS) throw new Error("NEXT_PUBLIC_MOCK_USDC_ADDRESS is not set");
    const hash = await writeContractAsync({
      address: USDC_ADDRESS,
      abi: mockUsdcAbi,
      functionName: "transfer",
      args: [to, parseUnits(amount.toString(), 6)],
    });
    await waitForTransactionReceipt(wagmiConfig, { hash });
    return hash;
  }

  async function handlePayToWatch() {
    if (!stream?.guideWallet) {
      setPayError("This guide has not set a payout wallet yet.");
      return;
    }
    setPayError(null);
    try {
      const hash = await transferUsdc(stream.guideWallet as `0x${string}`, stream.priceUsdc);
      await handleJoin(hash);
    } catch (err) {
      setPayError((err as Error).message);
    }
  }

  async function handleTip() {
    if (!stream?.guideWallet) {
      setPayError("This guide has not set a payout wallet yet.");
      return;
    }
    const amount = Number(tipAmount);
    if (!amount || amount <= 0) return;
    setPayError(null);
    try {
      const hash = await transferUsdc(stream.guideWallet as `0x${string}`, amount);
      await recordStreamTip(
        streamId,
        { amountUsdc: amount, txHash: hash, tipperWallet: address },
        session?.access_token
      );
      await refreshTips();
    } catch (err) {
      setPayError((err as Error).message);
    }
  }

  async function handleEnd() {
    if (!session) return;
    setEnding(true);
    try {
      const { stream: updated } = await endStream(streamId, session.access_token);
      setStream(updated);
      setToken(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnding(false);
    }
  }

  if (error && !stream) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/live">
          <Button className="mt-4">Back to live</Button>
        </Link>
      </Card>
    );
  }

  if (!stream) {
    return <p className="text-sm text-brand-muted">Loading stream...</p>;
  }

  if (stream.status === "ended") {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link href="/live" className="text-sm font-semibold text-brand-accent hover:underline">
          ← All live streams
        </Link>
        <Card>
          <Chip tone="neutral" label="Ended" />
          <h1 className="mt-2 text-xl font-bold text-brand-blueDark">{stream.title}</h1>
          <p className="text-sm text-brand-muted">with {stream.guideName}</p>
          {stream.recordingUrl ? (
            <video className="mt-4 w-full rounded-lg bg-black" src={stream.recordingUrl} controls playsInline />
          ) : (
            <p className="mt-4 text-sm text-brand-muted">This stream has ended and no recording was saved.</p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/live" className="text-sm font-semibold text-brand-accent hover:underline">
            ← All live streams
          </Link>
          <h1 className="mt-1 text-xl font-bold text-brand-blueDark">{stream.title}</h1>
          <p className="text-sm text-brand-muted">
            with {stream.guideName}
            {stream.experienceTitle ? ` · ${stream.experienceTitle}` : ""}
          </p>
        </div>
        <Chip tone="paid" label="Live" />
      </div>

      {!LIVEKIT_URL && (
        <Card>
          <p className="text-sm text-red-600">
            LiveKit is not configured. Set NEXT_PUBLIC_LIVEKIT_URL (and matching backend LIVEKIT_* keys) to watch or
            broadcast.
          </p>
        </Card>
      )}

      {token && LIVEKIT_URL ? (
        <div className="overflow-hidden rounded-card border border-brand-border" data-lk-theme="default">
          <LiveKitRoom
            serverUrl={LIVEKIT_URL}
            token={token}
            connect
            video={role === "publisher"}
            audio={role === "publisher"}
            style={{ height: "min(70vh, 560px)" }}
          >
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>
        </div>
      ) : needsPayment ? (
        <Card>
          <h2 className="text-lg font-bold text-brand-blueDark">Pay-per-view · {stream.priceUsdc} USDC</h2>
          <p className="mt-1 text-sm text-brand-muted">
            This stream is paid. Transfer MockUSDC on Fuji straight to the guide&apos;s wallet, then you&apos;ll get a
            viewer token.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <WalletConnectButton />
            <Button variant="primary" disabled={!address || writing || joining} onClick={handlePayToWatch}>
              {writing || joining ? "Paying..." : `Pay ${stream.priceUsdc} USDC & watch`}
            </Button>
          </div>
          {payError && <p className="mt-2 text-sm text-red-600">{payError}</p>}
        </Card>
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-brand-muted">
            {isGuide ? "Ready to publish from this device." : "Join as a viewer - free stream."}
          </p>
          <Button variant="primary" disabled={joining || !LIVEKIT_URL} onClick={() => handleJoin()}>
            {joining ? "Joining..." : isGuide ? "Start broadcasting" : "Watch now"}
          </Button>
        </Card>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isGuide && token && (
        <Button variant="secondary" disabled={ending} onClick={handleEnd}>
          {ending ? "Ending..." : "End stream"}
        </Button>
      )}

      <Card>
        <h2 className="text-sm font-bold text-brand-blueDark">Tip the guide</h2>
        <p className="mt-1 text-xs text-brand-muted">
          Wallet-to-wallet MockUSDC on Fuji. Guidemate just logs the receipt for the feed.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <WalletConnectButton />
          <input
            className="form-input-light w-24"
            type="number"
            min="0.01"
            step="0.01"
            value={tipAmount}
            onChange={(e) => setTipAmount(e.target.value)}
            aria-label="Tip amount in USDC"
          />
          <Button variant="secondary" disabled={!address || writing || !stream.guideWallet} onClick={handleTip}>
            {writing ? "Sending..." : "Send tip"}
          </Button>
        </div>
        {payError && <p className="mt-2 text-sm text-red-600">{payError}</p>}
        {!stream.guideWallet && (
          <p className="mt-2 text-xs text-brand-muted">This guide hasn&apos;t set a wallet address yet, so tips are paused.</p>
        )}

        {tips.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {tips.map((tip) => (
              <li key={tip.id} className="flex items-center justify-between text-sm">
                <span className="text-brand-muted">
                  {tip.amountUsdc} USDC
                  {tip.tipperWallet ? ` · ${tip.tipperWallet.slice(0, 6)}…${tip.tipperWallet.slice(-4)}` : ""}
                </span>
                <a
                  href={`${SNOWTRACE_TX_BASE}/${tip.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-brand-accent underline"
                >
                  tx
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {profile?.role !== "guide" && !session && (
        <p className="text-xs text-brand-muted">
          Watching as a guest.{" "}
          <Link href="/auth/sign-in" className="font-semibold text-brand-accent">
            Sign in
          </Link>{" "}
          if you want tips attributed to you.
        </p>
      )}
    </div>
  );
}
