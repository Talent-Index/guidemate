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
  getStreamStats,
  initiateMpesaPayment,
  joinStream,
  listStreamComments,
  listStreamTips,
  notifyStreamCommunity,
  postStreamComment,
  postStreamReaction,
  recordStreamTip,
  startScheduledStream,
  SNOWTRACE_TX_BASE,
  type LiveStreamRecord,
  type StreamComment,
  type StreamTip,
} from "@/lib/api";
import { Price } from "@/lib/fx";
import { ViewGuideProfileButton } from "@/components/ViewGuideProfileButton";

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
  const [starting, setStarting] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [tipAmount, setTipAmount] = useState("1");
  const [payError, setPayError] = useState<string | null>(null);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [comments, setComments] = useState<StreamComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [stats, setStats] = useState({ viewerCount: 0, reactionCount: 0 });
  const [flowers, setFlowers] = useState(0);

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

  async function handleJoin(opts?: { txHash?: string; paymentIntentId?: string }) {
    setJoining(true);
    setError(null);
    try {
      const result = await joinStream(streamId, session?.access_token, opts);
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
      await handleJoin({ txHash: hash });
    } catch (err) {
      setPayError((err as Error).message);
    }
  }

  async function handleMpesaPayToWatch() {
    if (!session || !stream) return;
    if (!mpesaPhone.trim()) {
      setPayError("Enter your M-Pesa phone number");
      return;
    }
    setPayError(null);
    try {
      const payment = await initiateMpesaPayment(
        {
          purpose: "stream_ppv",
          referenceId: stream.id,
          amountUsdc: stream.priceUsdc,
          phone: mpesaPhone.trim(),
        },
        session.access_token
      );
      await handleJoin({ paymentIntentId: payment.intentId });
    } catch (err) {
      setPayError((err as Error).message);
    }
  }

  useEffect(() => {
    if (!stream || stream.status !== "live") return;
    const refresh = () => {
      getStreamStats(streamId).then(setStats).catch(() => {});
      listStreamComments(streamId).then((r) => setComments(r.comments)).catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [streamId, stream?.status]);

  async function handleTapFlower() {
    setFlowers((f) => f + 1);
    try {
      await postStreamReaction(streamId, "flower", session?.access_token);
    } catch {
      // best effort
    }
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    try {
      const { comment } = await postStreamComment(streamId, commentBody.trim(), session?.access_token);
      setComments((prev) => [...prev, comment]);
      setCommentBody("");
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

  async function handleStartEarly() {
    if (!session) return;
    setStarting(true);
    setError(null);
    try {
      const { stream: updated, token: publishToken } = await startScheduledStream(streamId, session.access_token);
      setStream(updated);
      setToken(publishToken);
      setRole("publisher");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStarting(false);
    }
  }

  async function handleNotifyCommunity() {
    if (!session) return;
    setNotifying(true);
    setError(null);
    try {
      const { stream: updated } = await notifyStreamCommunity(streamId, session.access_token);
      setStream(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setNotifying(false);
    }
  }

  function formatWhen(iso: string) {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }

  function timeUntil(iso: string) {
    const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
    if (mins <= 0) return "starting soon";
    if (mins < 60) return `in ${mins} min`;
    const hours = Math.round(mins / 60);
    return `in ~${hours} hour${hours === 1 ? "" : "s"}`;
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
          <ViewGuideProfileButton guideId={stream.guideId} className="mt-3 inline-block" />
          {stream.recordingUrl ? (
            <video className="mt-4 w-full rounded-lg bg-black" src={stream.recordingUrl} controls playsInline />
          ) : (
            <p className="mt-4 text-sm text-brand-muted">This stream has ended and no recording was saved.</p>
          )}
        </Card>
      </div>
    );
  }

  if (stream.status === "scheduled") {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-24">
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
            <ViewGuideProfileButton guideId={stream.guideId} className="mt-3 inline-block" />
          </div>
          <Chip tone="neutral" label="Scheduled" />
        </div>

        <Card>
          {stream.communityNotifiedAt ? (
            <p className="text-sm font-semibold text-brand-success">
              Announced to the community
              {stream.scheduledAt ? ` · Goes live ${timeUntil(stream.scheduledAt)}` : ""}
            </p>
          ) : (
            <p className="text-sm text-brand-muted">Not announced to the community yet.</p>
          )}
          {stream.scheduledAt && (
            <p className="mt-2 text-sm text-brand-muted">Planned start: {formatWhen(stream.scheduledAt)}</p>
          )}
          {stream.priceUsdc > 0 && (
            <p className="mt-2 text-sm text-brand-muted">
              Planned price: <Price amountUsdc={stream.priceUsdc} size="sm" align="start" />
            </p>
          )}
        </Card>

        {isGuide && (
          <Card>
            <h2 className="text-sm font-bold text-brand-blueDark">Guide controls</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {!stream.communityNotifiedAt && (
                <Button variant="secondary" disabled={notifying} onClick={handleNotifyCommunity}>
                  {notifying ? "Notifying..." : "Notify: live in 1 hour"}
                </Button>
              )}
              <Button variant="primary" disabled={starting} onClick={handleStartEarly}>
                {starting ? "Starting..." : "Start stream early"}
              </Button>
            </div>
          </Card>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  const showEndBar = isGuide && stream.status === "live" && Boolean(token);

  return (
    <div className={`flex flex-col gap-4 ${showEndBar ? "pb-28" : ""}`}>
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
          <ViewGuideProfileButton guideId={stream.guideId} className="mt-3 inline-block" />
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
        <div className="relative overflow-hidden rounded-card border border-brand-border" data-lk-theme="default">
          <div
            className="absolute inset-0 z-10 md:pointer-events-none"
            onClick={handleTapFlower}
            aria-hidden
          />
          <div className="pointer-events-none absolute left-3 top-3 z-20 flex gap-2">
            <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
              {stats.viewerCount} watching
            </span>
            <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
              {stats.reactionCount + flowers} flowers
            </span>
          </div>
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
          <div className="absolute bottom-0 left-0 right-0 z-20 max-h-32 overflow-y-auto bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8">
            {comments.slice(-5).map((c) => (
              <p key={c.id} className="text-xs text-white">
                <span className="font-semibold">{c.displayName}</span> {c.body}
              </p>
            ))}
          </div>
        </div>
      ) : needsPayment ? (
        <Card>
          <h2 className="flex flex-wrap items-baseline gap-2 text-lg font-bold text-brand-blueDark">
            Pay-per-view
            <Price amountUsdc={stream.priceUsdc} size="sm" align="start" />
          </h2>
          <p className="mt-1 text-sm text-brand-muted">Pay with M-Pesa or crypto wallet to watch.</p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm font-medium">M-Pesa phone</label>
              <input
                className="form-input-light mt-1 w-full"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="+2547..."
              />
              <Button
                variant="primary"
                className="mt-2 w-full"
                disabled={!session || joining}
                onClick={handleMpesaPayToWatch}
              >
                {joining ? "Processing…" : `Pay with M-Pesa & watch`}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <WalletConnectButton />
              <Button variant="secondary" disabled={!address || writing || joining} onClick={handlePayToWatch}>
                {writing || joining ? "Paying..." : `Pay ${stream.priceUsdc} USDC`}
              </Button>
            </div>
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

      {showEndBar && (
        <div
          className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 border-t border-brand-border bg-[var(--gm-nav)]/95 px-4 py-3 backdrop-blur-md md:bottom-6 md:mx-auto md:max-w-lg md:rounded-full md:border md:shadow-lg"
        >
          <button
            type="button"
            disabled={ending}
            onClick={handleEnd}
            className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60 md:w-full"
            aria-label="End live stream"
          >
            <EndStreamIcon />
            {ending ? "Ending stream..." : "End stream"}
          </button>
        </div>
      )}

      <Card>
        <h2 className="text-sm font-bold text-brand-blueDark">Live chat</h2>
        <form onSubmit={handlePostComment} className="mt-2 flex gap-2">
          <input
            className="form-input-light flex-1 text-sm"
            placeholder="Say something…"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={!commentBody.trim()}>
            Send
          </Button>
        </form>
      </Card>

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

function EndStreamIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  );
}
