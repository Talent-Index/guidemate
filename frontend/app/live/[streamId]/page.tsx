"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter, usePathname } from "next/navigation";
import { StreamRoom } from "@/components/StreamRoom";
import { parseUnits } from "viem";
import { useAccount, useChainId, useSwitchChain, useWriteContract } from "wagmi";
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
  friendlyPaymentError,
  getPaymentQuote,
  getStream,
  getStreamStats,
  initiateCheckoutPayment,
  initiateMpesaPayment,
  pollMpesaPayment,
  joinStream,
  listStreamComments,
  listStreamTips,
  notifyStreamCommunity,
  postStreamComment,
  postStreamReaction,
  recordStreamTip,
  startScheduledStream,
  type LiveStreamRecord,
  type PaymentQuote,
  type StreamStats,
  type StreamComment,
  type StreamTip,
} from "@/lib/api";
import { StreamMetricsCard } from "@/components/live/StreamMetricsCard";
import { BASE_EXPLORER_TX, BASE_USDC_ADDRESS, splitStreamRevenue } from "@/lib/streamRevenue";
import { base } from "@/lib/wagmi";
import { Price } from "@/lib/fx";
import { PaymentRailGuide } from "@/components/payments/PaymentRailGuide";
import { ViewGuideProfileButton } from "@/components/ViewGuideProfileButton";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { getStreamSharePath, getGuideSharePath } from "@/lib/share";
import { consumeLivePublishToken } from "@/lib/livePublishToken";
import { useToast } from "@/components/ui/Toast";
import "@livekit/components-styles";

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "";
const USDC_ADDRESS = (process.env.NEXT_PUBLIC_BASE_USDC_ADDRESS ?? BASE_USDC_ADDRESS) as `0x${string}`;
const PLATFORM_USDC_WALLET = process.env.NEXT_PUBLIC_PLATFORM_USDC_WALLET as `0x${string}` | undefined;
const LIVE_CHECKOUT_KEY = "guidemate-live-checkout-draft";
const LIVEKIT_TOKEN_REFRESH_MS = 45 * 60 * 1000;

export default function LiveStreamPage() {
  const params = useParams<{ streamId: string }>();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const streamRouteKey = params.streamId;
  const { session, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending: writing } = useWriteContract();

  const [stream, setStream] = useState<LiveStreamRecord | null>(null);
  const apiStreamId = stream?.id ?? streamRouteKey;
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<"publisher" | "viewer" | null>(null);
  const [tips, setTips] = useState<StreamTip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [paying, setPaying] = useState(false);
  const [ending, setEnding] = useState(false);
  const [starting, setStarting] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [tipAmount, setTipAmount] = useState("1");
  const [payError, setPayError] = useState<string | null>(null);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [liveRail, setLiveRail] = useState<"mpesa" | "checkout">("mpesa");
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [comments, setComments] = useState<StreamComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [stats, setStats] = useState<StreamStats>({
    viewerCount: 0,
    peakViewerCount: 0,
    totalJoins: 0,
    uniqueJoins: 0,
    reactionCount: 0,
    tipCount: 0,
    tipTotalUsdc: 0,
  });
  const [flowers, setFlowers] = useState(0);

  const isGuide = Boolean(session && stream && session.user.id === stream.guideId);
  const needsPayment = Boolean(stream && stream.status === "live" && stream.priceUsdc > 0 && !isGuide && !token);
  const mustSignInToWatch = Boolean(stream?.status === "live" && !session && !token);
  const signInReturnPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const signInHref = `/auth/sign-in?returnTo=${encodeURIComponent(signInReturnPath)}`;

  const refreshTips = useCallback(async () => {
    try {
      const { tips: latest } = await listStreamTips(apiStreamId);
      setTips(latest);
    } catch {
      // tip feed is best-effort
    }
  }, [apiStreamId]);

  useEffect(() => {
    let cancelled = false;
    getStream(streamRouteKey)
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
  }, [streamRouteKey, refreshTips]);

  useEffect(() => {
    if (!stream?.slug || streamRouteKey === stream.slug) return;
    if (typeof window === "undefined") return;
    window.history.replaceState(null, "", `/live/${encodeURIComponent(stream.slug)}`);
  }, [stream?.slug, streamRouteKey]);

  useEffect(() => {
    if (!stream || stream.priceUsdc <= 0) return;
    let cancelled = false;
    getPaymentQuote(stream.priceUsdc, mpesaPhone.trim() || undefined)
      .then((next) => {
        if (!cancelled) setQuote(next);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      });
    return () => {
      cancelled = true;
    };
  }, [stream, mpesaPhone]);

  async function handleJoin(opts?: { txHash?: string; paymentIntentId?: string }) {
    if (!session?.access_token) {
      setError("Sign in to watch this stream.");
      return;
    }
    setJoining(true);
    setError(null);
    try {
      const result = await joinStream(apiStreamId, session.access_token, opts);
      setToken(result.token);
      setRole(result.role);
      setStream(result.stream);
      if (opts?.txHash || opts?.paymentIntentId) {
        toast("Payment received, you can watch now", "success");
      }
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
    } finally {
      setJoining(false);
    }
  }

  const handleJoinStable = useCallback(
    (opts?: { txHash?: string; paymentIntentId?: string }) => handleJoin(opts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiStreamId, session?.access_token]
  );

  useEffect(() => {
    if (!stream || token) return;
    const publishToken = consumeLivePublishToken(stream.id);
    if (publishToken) {
      setToken(publishToken);
      setRole("publisher");
    }
  }, [stream, token]);

  const autoJoinStarted = useRef(false);
  useEffect(() => {
    if (!stream || stream.status !== "live" || token || joining || !LIVEKIT_URL) return;
    if (!session) return;
    if (needsPayment) return;
    if (autoJoinStarted.current) return;
    autoJoinStarted.current = true;
    void handleJoinStable();
  }, [stream, token, joining, needsPayment, isGuide, LIVEKIT_URL, handleJoinStable, session]);

  useEffect(() => {
    if (!token || stream?.status !== "live" || !session?.access_token) return;
    const refresh = () => {
      void joinStream(apiStreamId, session.access_token, undefined)
        .then((result) => {
          setToken(result.token);
          setRole(result.role);
        })
        .catch(() => {});
    };
    const interval = setInterval(refresh, LIVEKIT_TOKEN_REFRESH_MS);
    return () => clearInterval(interval);
  }, [token, stream?.status, apiStreamId, session?.access_token]);

  useEffect(() => {
    if (!session || !stream || token) return;
    const intentId = searchParams.get("paymentIntentId");
    if (!intentId) return;
    let cancelled = false;
    (async () => {
      setPaying(true);
      try {
        const raw = sessionStorage.getItem(LIVE_CHECKOUT_KEY);
        const draft = raw ? (JSON.parse(raw) as { streamId: string; intentId: string }) : null;
        if (draft && draft.streamId === stream.id && draft.intentId !== intentId) {
          throw new Error("Checkout session mismatch. Try paying again.");
        }
        await pollMpesaPayment(intentId, session.access_token);
        if (cancelled) return;
        await handleJoin({ paymentIntentId: intentId });
        sessionStorage.removeItem(LIVE_CHECKOUT_KEY);
      } catch (err) {
        if (!cancelled) showPayError((err as Error).message);
      } finally {
        if (!cancelled) setPaying(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, stream, searchParams, token]);

  async function transferUsdcOnBase(to: `0x${string}`, amount: number) {
    if (!USDC_ADDRESS) throw new Error("Base USDC is not configured");
    if (chainId !== base.id) {
      await switchChainAsync({ chainId: base.id });
    }
    const hash = await writeContractAsync({
      address: USDC_ADDRESS,
      abi: mockUsdcAbi,
      functionName: "transfer",
      args: [to, parseUnits(amount.toString(), 6)],
      chainId: base.id,
    });
    await waitForTransactionReceipt(wagmiConfig, { hash, chainId: base.id });
    return hash;
  }

  function showPayError(message: string) {
    const friendly = friendlyPaymentError(message);
    setPayError(friendly);
    toast(friendly, "error");
  }

  async function handleCheckoutPayToWatch() {
    if (!session || !stream || paying) return;
    setPayError(null);
    setPaying(true);
    try {
      const payment = await initiateCheckoutPayment(
        {
          purpose: "stream_ppv",
          referenceId: stream.id,
          amountUsdc: stream.priceUsdc,
          description: `Watch ${stream.title}`,
          returnPath: `/live/${stream.id}`,
          customerEmail: session.user.email ?? undefined,
        },
        session.access_token
      );
      if (payment.checkoutUrl) {
        sessionStorage.setItem(LIVE_CHECKOUT_KEY, JSON.stringify({ streamId: stream.id, intentId: payment.intentId }));
        window.location.href = payment.checkoutUrl;
        return;
      }
      await handleJoin({ paymentIntentId: payment.intentId });
    } catch (err) {
      showPayError((err as Error).message);
    } finally {
      setPaying(false);
    }
  }

  async function handleMpesaPayToWatch() {
    if (!session || !stream || paying) return;
    if (!mpesaPhone.trim()) {
      setPayError("Enter your M-Pesa phone number");
      return;
    }
    setPayError(null);
    setPaying(true);
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
      if (payment.status === "processing") {
        await pollMpesaPayment(payment.intentId, session.access_token);
      }
      await handleJoin({ paymentIntentId: payment.intentId });
    } catch (err) {
      showPayError((err as Error).message);
    } finally {
      setPaying(false);
    }
  }

  useEffect(() => {
    if (!stream || stream.status !== "live") return;
    const refresh = () => {
      getStreamStats(apiStreamId).then(setStats).catch(() => {});
      listStreamComments(apiStreamId).then((r) => setComments(r.comments)).catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [apiStreamId, stream?.status]);

  async function handleTapFlower() {
    setFlowers((f) => f + 1);
    try {
      await postStreamReaction(apiStreamId, "flower", session?.access_token);
    } catch {
      // best effort
    }
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    try {
      const { comment } = await postStreamComment(apiStreamId, commentBody.trim(), session?.access_token);
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
      const { guideAmount, platformAmount } = splitStreamRevenue(amount);
      const guideWallet = stream.guideWallet as `0x${string}`;
      const hash = await transferUsdcOnBase(guideWallet, guideAmount);
      if (platformAmount >= 0.01 && PLATFORM_USDC_WALLET) {
        await transferUsdcOnBase(PLATFORM_USDC_WALLET, platformAmount);
      }
      await recordStreamTip(
        apiStreamId,
        { amountUsdc: amount, txHash: hash, tipperWallet: address },
        session?.access_token
      );
      await refreshTips();
      toast(`Tip sent, ${amount} USDC`, "success");
    } catch (err) {
      showPayError((err as Error).message);
    }
  }

  async function handleEnd() {
    if (!session) return;
    setEnding(true);
    setError(null);
    try {
      const { stream: updated } = await endStream(apiStreamId, session.access_token);
      setStream(updated);
      setToken(null);
      setRole(null);
      toast("Stream ended", "success");
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
      const { stream: updated, token: publishToken } = await startScheduledStream(apiStreamId, session.access_token);
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
      const { stream: updated } = await notifyStreamCommunity(apiStreamId, session.access_token);
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
      <EndedStreamView stream={stream} apiStreamId={apiStreamId} isGuide={isGuide} />
    );
  }

  if (stream.status === "scheduled") {
    return (
      <div className="mx-auto w-full max-w-6xl pb-24">
        <div className="flex flex-col gap-6 lg:gap-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-border pb-6">
            <div className="min-w-0 flex-1">
              <Link href="/live" className="text-sm font-semibold text-brand-accent hover:underline">
                ← All live streams
              </Link>
              <h1 className="mt-2 text-2xl font-bold text-brand-blueDark sm:text-3xl lg:text-4xl">{stream.title}</h1>
              <p className="mt-2 text-sm text-brand-muted sm:text-base">
                with {stream.guideName}
                {stream.experienceTitle ? (
                  <span className="text-brand-muted"> · {stream.experienceTitle}</span>
                ) : null}
              </p>
              <ViewGuideProfileButton guideId={stream.guideId} className="mt-4 inline-block" />
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <ShareLinkButton
                path={getStreamSharePath(stream.id, stream.slug)}
                label="Share"
                shareTitle={stream.title}
                shareText={`Join my live stream: ${stream.title}`}
                className="px-4 py-2 text-xs"
              />
              <Chip tone="neutral" label="Scheduled" />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
            <div className="flex flex-col gap-6 lg:col-span-7">
              <div className="relative overflow-hidden rounded-2xl border border-brand-border bg-gradient-to-br from-brand-blueDark via-brand-blue to-brand-accent shadow-card">
                <div className="aspect-[16/9] min-h-[220px] w-full p-6 sm:p-8 lg:p-10">
                  <div className="flex h-full flex-col justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">Upcoming live</p>
                      <p className="mt-3 max-w-lg text-lg font-semibold leading-snug text-white sm:text-xl">
                        {stream.communityNotifiedAt
                          ? "Your community has been notified"
                          : "Share the link before you go live"}
                      </p>
                    </div>
                    {stream.scheduledAt && (
                      <div className="mt-6 inline-flex flex-col gap-1 rounded-xl bg-black/25 px-4 py-3 backdrop-blur-sm sm:inline-block">
                        <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Planned start</p>
                        <p className="text-base font-bold text-white sm:text-lg">{formatWhen(stream.scheduledAt)}</p>
                        <p className="text-sm text-white/90">{timeUntil(stream.scheduledAt)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Card className="p-6 sm:p-8">
                <h2 className="text-base font-bold text-brand-blueDark">Event details</h2>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-brand-border bg-brand-bg/40 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Community</dt>
                    <dd className="mt-1 text-sm font-semibold text-brand-blueDark">
                      {stream.communityNotifiedAt ? (
                        <span className="text-brand-success">Announced</span>
                      ) : (
                        "Not announced yet"
                      )}
                    </dd>
                    {stream.communityNotifiedAt && stream.scheduledAt && (
                      <p className="mt-1 text-xs text-brand-muted">Goes live {timeUntil(stream.scheduledAt)}</p>
                    )}
                  </div>
                  {stream.scheduledAt && (
                    <div className="rounded-xl border border-brand-border bg-brand-bg/40 p-4">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Start time</dt>
                      <dd className="mt-1 text-sm font-semibold text-brand-blueDark">{formatWhen(stream.scheduledAt)}</dd>
                    </div>
                  )}
                  <div className="rounded-xl border border-brand-border bg-brand-bg/40 p-4 sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Access</dt>
                    <dd className="mt-2">
                      {stream.priceUsdc > 0 ? (
                        <Price amountUsdc={stream.priceUsdc} size="md" align="start" />
                      ) : (
                        <span className="text-sm font-semibold text-brand-success">Free to watch</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </Card>
            </div>

            <aside className="flex flex-col gap-4 lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
              {isGuide ? (
                <Card className="p-6 sm:p-8">
                  <h2 className="text-base font-bold text-brand-blueDark">Guide controls</h2>
                  <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                    Share this page so viewers can join when you start. Notify the community about an hour before go-live,
                    or start early when you&apos;re ready.
                  </p>
                  <div className="mt-5 flex flex-col gap-2">
                    <ShareLinkButton
                      path={getStreamSharePath(stream.id, stream.slug)}
                      label="Share stream link"
                      shareTitle={stream.title}
                      shareText={`Join my live stream: ${stream.title}`}
                      className="w-full justify-center py-3"
                    />
                    {!stream.communityNotifiedAt && (
                      <Button variant="secondary" disabled={notifying} className="w-full" onClick={handleNotifyCommunity}>
                        {notifying ? "Notifying..." : "Notify: live in 1 hour"}
                      </Button>
                    )}
                    <Button variant="primary" disabled={starting} className="w-full" onClick={handleStartEarly}>
                      {starting ? "Starting..." : "Start stream early"}
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="p-6 sm:p-8">
                  <h2 className="text-base font-bold text-brand-blueDark">Before it starts</h2>
                  <p className="mt-2 text-sm text-brand-muted">
                    Bookmark this page or share it with friends. When {stream.guideName} goes live, you can watch from
                    here{stream.priceUsdc > 0 ? " after pay-per-view checkout" : ""}.
                  </p>
                  <ShareLinkButton
                    path={getStreamSharePath(stream.id, stream.slug)}
                    label="Share with friends"
                    shareTitle={stream.title}
                    shareText={`Join my live stream: ${stream.title}`}
                    className="mt-4 w-full justify-center py-3"
                  />
                </Card>
              )}

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
              )}
            </aside>
          </div>
        </div>
      </div>
    );
  }

  const showEndBar = isGuide && stream.status === "live" && Boolean(token);

  return (
    <div className={`mx-auto w-full max-w-6xl ${showEndBar ? "pb-28" : "pb-8"}`}>
      <div className="flex flex-col gap-6 lg:gap-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-border pb-6">
          <div className="min-w-0 flex-1">
            <Link href="/live" className="text-sm font-semibold text-brand-accent hover:underline">
              ← All live streams
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-brand-blueDark sm:text-3xl">{stream.title}</h1>
            <p className="mt-2 text-sm text-brand-muted sm:text-base">
              with {stream.guideName}
              {stream.experienceTitle ? ` · ${stream.experienceTitle}` : ""}
            </p>
            <ViewGuideProfileButton guideId={stream.guideId} className="mt-4 inline-block" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ShareLinkButton
              path={getStreamSharePath(stream.id, stream.slug)}
              label="Share"
              shareTitle={stream.title}
              shareText={
                stream.status === "live"
                  ? `Watch live now: ${stream.title}`
                  : `Join my live stream: ${stream.title}`
              }
              className="px-4 py-2 text-xs"
            />
            <Chip tone="paid" label="Live" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
          <div className="flex flex-col gap-6 lg:col-span-8">
            {!LIVEKIT_URL && (
              <Card>
                <p className="text-sm text-red-600">
                  LiveKit is not configured. Set NEXT_PUBLIC_LIVEKIT_URL (and matching backend LIVEKIT_* keys) to watch
                  or broadcast.
                </p>
              </Card>
            )}

            {token && LIVEKIT_URL ? (
              <div
                className="relative -mx-4 w-[calc(100%+2rem)] overflow-hidden border-y border-brand-border bg-black sm:mx-0 sm:w-full sm:rounded-2xl sm:border sm:shadow-card"
                data-lk-theme="default"
              >
                <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2">
                  <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white sm:text-xs">
                    {stats.viewerCount} watching · peak {stats.peakViewerCount}
                  </span>
                  <span className="hidden rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white sm:inline">
                    {stats.uniqueJoins} viewers joined
                  </span>
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Live
                  </span>
                  <button
                    type="button"
                    onClick={handleTapFlower}
                    className="pointer-events-auto rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-black/80 sm:text-xs"
                    aria-label="Send a flower"
                  >
                    🌸 Flower
                  </button>
                </div>
                <div className="aspect-[9/16] w-full max-h-[min(85dvh,780px)] sm:aspect-video sm:max-h-[min(70vh,560px)]">
                  <StreamRoom serverUrl={LIVEKIT_URL} token={token} isPublisher={role === "publisher"} />
                </div>
              </div>
            ) : authLoading && stream.status === "live" ? (
              <Card className="flex items-center justify-center p-10 sm:p-12">
                <p className="text-sm font-medium text-brand-muted">Loading…</p>
              </Card>
            ) : mustSignInToWatch ? (
              <Card className="p-6 sm:p-8">
                <h2 className="text-lg font-bold text-brand-blueDark">Sign in to watch</h2>
                <p className="mt-2 text-sm text-brand-muted">
                  Live streams require a Guidemate account so we can count viewers and keep the community accountable.
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Link href={signInHref} className="sm:flex-1">
                    <Button variant="primary" className="w-full">
                      Sign in
                    </Button>
                  </Link>
                  <Link href={`/auth/sign-up?returnTo=${encodeURIComponent(signInReturnPath)}`} className="sm:flex-1">
                    <Button variant="secondary" className="w-full">
                      Create account
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : needsPayment ? (
              <Card className="p-6 sm:p-8">
                <h2 className="flex flex-wrap items-baseline gap-2 text-lg font-bold text-brand-blueDark">
                  Pay-per-view
                  <Price amountUsdc={stream.priceUsdc} size="sm" align="start" />
                </h2>
                <p className="mt-1 text-sm text-brand-muted">
                  Kenya: pay with M-Pesa. Visiting: pay with USDC or USDT. Ticket revenue split: guide 85%, Guidemate 15%.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setLiveRail("mpesa")}
                    className={`rounded-xl border p-3 text-left text-sm ${
                      liveRail === "mpesa" ? "border-brand-accent bg-brand-accent/10" : "border-brand-border"
                    }`}
                  >
                    <p className="font-semibold text-brand-blueDark">M-Pesa</p>
                    <p className="mt-0.5 text-xs text-brand-muted">KES on your Safaricom phone</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiveRail("checkout")}
                    className={`rounded-xl border p-3 text-left text-sm ${
                      liveRail === "checkout" ? "border-brand-accent bg-brand-accent/10" : "border-brand-border"
                    }`}
                  >
                    <p className="font-semibold text-brand-blueDark">USDC / USDT</p>
                    <p className="mt-0.5 text-xs text-brand-muted">Crypto wallet via Minisend</p>
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {liveRail === "mpesa" && (
                    <div>
                      <label className="text-sm font-medium">M-Pesa phone</label>
                      <input
                        className="form-input-light mt-1 w-full"
                        value={mpesaPhone}
                        onChange={(e) => setMpesaPhone(e.target.value)}
                        placeholder="+2547..."
                      />
                      <PaymentRailGuide rail="mpesa" quote={quote} processing={paying || joining} />
                      <Button
                        variant="primary"
                        className="mt-3 w-full"
                        disabled={!session || paying || joining}
                        onClick={handleMpesaPayToWatch}
                      >
                        {paying || joining ? "Processing…" : `Pay with M-Pesa & watch`}
                      </Button>
                    </div>
                  )}
                  {liveRail === "checkout" && (
                    <div>
                      <PaymentRailGuide rail="checkout" quote={quote} />
                      <Button
                        variant="primary"
                        className="mt-3 w-full"
                        disabled={!session || paying || joining}
                        onClick={() => void handleCheckoutPayToWatch()}
                      >
                        {paying || joining ? "Processing…" : `Pay with USDC & watch`}
                      </Button>
                    </div>
                  )}
                </div>
                {payError && <p className="mt-2 text-sm text-red-600">{payError}</p>}
              </Card>
            ) : joining && !token ? (
              <Card className="flex items-center justify-center p-10 sm:p-12">
                <p className="text-sm font-medium text-brand-muted">Connecting to the live stream…</p>
              </Card>
            ) : (
              <Card className="flex flex-wrap items-center justify-between gap-3 p-6 sm:p-8">
                <p className="text-sm text-brand-muted">
                  {isGuide ? "Ready to publish from this device." : "You’re signed in — tap below to join the stream."}
                </p>
                <Button
                  variant="primary"
                  disabled={joining || !LIVEKIT_URL || !session}
                  onClick={() => handleJoin()}
                >
                  {joining ? "Joining..." : isGuide ? "Start broadcasting" : "Watch now"}
                </Button>
              </Card>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <aside className="flex flex-col gap-4 lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
            {isGuide && (
              <StreamMetricsCard stats={stats} title="Your stream metrics" />
            )}
            <Card className="p-5 sm:p-6">
              <h2 className="text-sm font-bold text-brand-blueDark">Live chat</h2>
              <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto lg:max-h-72">
                {comments.length === 0 ? (
                  <li className="text-sm text-brand-muted">Be the first to say something.</li>
                ) : (
                  comments.map((c) => (
                    <li key={c.id} className="text-sm">
                      <span className="font-semibold text-brand-blueDark">{c.displayName}</span>{" "}
                      <span className="text-brand-muted">{c.body}</span>
                    </li>
                  ))
                )}
              </ul>
              <form onSubmit={handlePostComment} className="mt-3 flex gap-2 border-t border-brand-border pt-3">
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

            <Card className="p-5 sm:p-6">
              <h2 className="text-sm font-bold text-brand-blueDark">Tip the guide</h2>
              <p className="mt-1 text-xs text-brand-muted">
                Tips use USDC on Base (same rail as payouts). Guidemate keeps 15%; your guide receives 85%.
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
                <p className="mt-2 text-xs text-brand-muted">
                  This guide hasn&apos;t set a wallet address yet, so tips are paused.
                </p>
              )}

              {tips.length > 0 && (
                <ul className="mt-4 flex flex-col gap-2">
                  {tips.map((tip) => (
                    <li key={tip.id} className="flex items-center justify-between text-sm">
                      <span className="text-brand-muted">
                        {tip.amountUsdc} USDC
                        {tip.tipperWallet ? ` · ${tip.tipperWallet.slice(0, 6)}…${tip.tipperWallet.slice(-4)}` : ""}
                      </span>
                      {!tip.txHash.startsWith("mpesa-") && (
                        <a
                          href={`${BASE_EXPLORER_TX}/${tip.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-brand-accent underline"
                        >
                          tx
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

          </aside>
        </div>
      </div>

      {showEndBar && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 px-4 md:bottom-6 md:mx-auto md:max-w-lg">
          <button
            type="button"
            disabled={ending}
            onClick={handleEnd}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-5 py-3.5 text-sm font-bold text-red-700 shadow-lg transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900/40 dark:bg-[var(--gm-nav)] dark:text-red-300 dark:hover:bg-red-950/40"
            aria-label="End live stream"
          >
            <EndStreamIcon />
            {ending ? "Ending stream…" : "End stream"}
          </button>
        </div>
      )}
    </div>
  );
}

function EndedStreamView({
  stream,
  apiStreamId,
  isGuide,
}: {
  stream: LiveStreamRecord;
  apiStreamId: string;
  isGuide: boolean;
}) {
  const router = useRouter();
  const [stats, setStats] = useState<StreamStats | null>(null);

  useEffect(() => {
    getStreamStats(apiStreamId).then(setStats).catch(() => {});
  }, [apiStreamId]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pb-28">
      <Link href="/live" className="text-sm font-semibold text-brand-accent hover:underline">
        ← All live streams
      </Link>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-brand-border bg-brand-bg/50 px-6 py-5">
          <Chip tone="neutral" label="Ended" />
          <h1 className="mt-3 text-2xl font-bold text-brand-blueDark">{stream.title}</h1>
          <p className="mt-1 text-sm text-brand-muted">with {stream.guideName}</p>
        </div>

        {stream.recordingUrl ? (
          <video className="w-full bg-black" src={stream.recordingUrl} controls playsInline />
        ) : (
          <p className="px-6 py-4 text-sm text-brand-muted">No recording was saved for this stream.</p>
        )}
      </Card>

      {stats && isGuide && <StreamMetricsCard stats={stats} title="Stream recap" compact />}

      <div className="flex flex-col gap-2">
        {isGuide && (
          <Button variant="primary" className="w-full" type="button" onClick={() => router.push("/live")}>
            Host another stream
          </Button>
        )}
        <ShareLinkButton
          path={getStreamSharePath(stream.id, stream.slug)}
          label="Share stream link"
          shareTitle={stream.title}
          shareText={`Watch ${stream.title} on Guidemate`}
          variant="secondary"
          className="w-full"
        />
        <Button
          variant="secondary"
          className="w-full"
          type="button"
          onClick={() => router.push(getGuideSharePath(stream.guideId))}
        >
          View guide profile
        </Button>
        {isGuide && (
          <Button variant="secondary" className="w-full" type="button" onClick={() => router.push("/guide/dashboard")}>
            Open guide dashboard
          </Button>
        )}
      </div>
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
