"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ExperienceGridSkeleton } from "@/components/ui/Skeleton";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  aiStreamTitle,
  listLiveStreams,
  listMyScheduledStreams,
  listRecordedStreams,
  listUpcomingStreams,
  notifyStreamCommunity,
  scheduleStream,
  startScheduledStream,
  startStream,
  type LiveStreamRecord,
} from "@/lib/api";
import { Price } from "@/lib/fx";
import { ViewGuideProfileButton } from "@/components/ViewGuideProfileButton";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { getStreamSharePath } from "@/lib/share";
import { storeLivePublishToken } from "@/lib/livePublishToken";

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

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function LiveBrowsePage() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const [live, setLive] = useState<LiveStreamRecord[]>([]);
  const [upcoming, setUpcoming] = useState<LiveStreamRecord[]>([]);
  const [myScheduled, setMyScheduled] = useState<LiveStreamRecord[]>([]);
  const [recorded, setRecorded] = useState<LiveStreamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("0");
  const [scheduledAt, setScheduledAt] = useState(() =>
    toDatetimeLocalValue(new Date(Date.now() + 2 * 60 * 60 * 1000))
  );
  const [starting, setStarting] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [announcing, setAnnouncing] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [guideActionId, setGuideActionId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const [liveRes, upcomingRes, recordedRes] = await Promise.all([
          listLiveStreams(),
          listUpcomingStreams(),
          listRecordedStreams(),
        ]);
        if (cancelled) return;
        setLive(liveRes.streams);
        setUpcoming(upcomingRes.streams);
        setRecorded(recordedRes.streams);
        setError(null);

        if (session?.access_token && profile?.role === "guide") {
          const mine = await listMyScheduledStreams(session.access_token);
          if (!cancelled) setMyScheduled(mine.streams);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    refresh();
    const interval = setInterval(refresh, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session?.access_token, profile?.role]);

  async function handleSuggestTitle() {
    if (!session) return;
    const topic = title.trim();
    if (topic.length < 2) {
      setStartError("Type a word or two about your stream, then tap Suggest.");
      return;
    }
    setSuggesting(true);
    setStartError(null);
    try {
      const { title: suggested } = await aiStreamTitle(topic, session.access_token);
      if (suggested) setTitle(suggested);
    } catch (err) {
      setStartError((err as Error).message);
    } finally {
      setSuggesting(false);
    }
  }

  async function handleGoLive() {
    if (!session) return;
    setStarting(true);
    setStartError(null);
    try {
      const { stream, token } = await startStream(
        { title: title.trim(), priceUsdc: Number(price) || 0 },
        session.access_token
      );
      storeLivePublishToken(stream.id, token);
      router.push(getStreamSharePath(stream.id, stream.slug));
    } catch (err) {
      setStartError((err as Error).message);
    } finally {
      setStarting(false);
    }
  }

  async function handleSchedule() {
    if (!session) return;
    setScheduling(true);
    setStartError(null);
    try {
      await scheduleStream(
        {
          title: title.trim(),
          priceUsdc: Number(price) || 0,
          scheduledAt: new Date(scheduledAt).toISOString(),
        },
        session.access_token
      );
      setTitle("");
      const mine = await listMyScheduledStreams(session.access_token);
      setMyScheduled(mine.streams);
    } catch (err) {
      setStartError((err as Error).message);
    } finally {
      setScheduling(false);
    }
  }

  async function handleAnnounceInHour() {
    if (!session || title.trim().length < 2) {
      setStartError("Add a stream title first.");
      return;
    }
    setAnnouncing(true);
    setStartError(null);
    try {
      const when = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { stream } = await scheduleStream(
        { title: title.trim(), priceUsdc: Number(price) || 0, scheduledAt: when },
        session.access_token
      );
      await notifyStreamCommunity(stream.id, session.access_token);
      setTitle("");
      const [mine, upcomingRes] = await Promise.all([
        listMyScheduledStreams(session.access_token),
        listUpcomingStreams(),
      ]);
      setMyScheduled(mine.streams);
      setUpcoming(upcomingRes.streams);
    } catch (err) {
      setStartError((err as Error).message);
    } finally {
      setAnnouncing(false);
    }
  }

  async function handleNotify(streamId: string) {
    if (!session) return;
    setGuideActionId(streamId);
    setStartError(null);
    try {
      await notifyStreamCommunity(streamId, session.access_token);
      const [mine, upcomingRes] = await Promise.all([
        listMyScheduledStreams(session.access_token),
        listUpcomingStreams(),
      ]);
      setMyScheduled(mine.streams);
      setUpcoming(upcomingRes.streams);
    } catch (err) {
      setStartError((err as Error).message);
    } finally {
      setGuideActionId(null);
    }
  }

  async function handleStartEarly(streamId: string) {
    if (!session) return;
    setGuideActionId(streamId);
    setStartError(null);
    try {
      const { stream, token } = await startScheduledStream(streamId, session.access_token);
      storeLivePublishToken(stream.id, token);
      router.push(getStreamSharePath(stream.id, stream.slug));
    } catch (err) {
      setStartError((err as Error).message);
      setGuideActionId(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <MobilePageBanner eyebrow="Live" title="Watch a guide stream from their phone" />
        <div className="hidden md:block">
          <h1 className="text-xl font-bold text-brand-blueDark">Live experiences</h1>
          <p className="mt-1 text-sm text-brand-muted">
            Watch guides live from their phone, or see what&apos;s coming up soon.
          </p>
        </div>
      </div>

      {profile?.role === "guide" ? (
        <div className="flex flex-col gap-8">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-bold text-brand-blueDark">Host & schedule</h2>
              <p className="text-xs text-brand-muted">Set title and price, then go live or pick a time.</p>
            </div>
            {!session ? (
              <Link href="/auth/sign-in">
                <Button variant="primary" className="mt-4">
                  Sign in to go live
                </Button>
              </Link>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto_7rem] md:items-end">
                  <div className="min-w-0">
                    <label className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Title</label>
                    <input
                      className="form-input-light mt-1 w-full"
                      placeholder="e.g. Umoja market walk"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    variant="secondary"
                    type="button"
                    className="md:mb-0.5 md:self-end"
                    disabled={suggesting || title.trim().length < 2}
                    onClick={handleSuggestTitle}
                  >
                    {suggesting ? "…" : "Suggest title"}
                  </Button>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-brand-muted">USDC</label>
                    <input
                      className="form-input-light mt-1 w-full"
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      aria-label="Price in USDC"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-brand-muted md:-mt-1">
                  0 = free stream. Paid tickets: you keep 85%, Guidemate 15%.
                </p>

                <div className="flex flex-col gap-3 border-t border-brand-border pt-4 lg:flex-row lg:flex-wrap lg:items-center">
                  <Button
                    variant="primary"
                    type="button"
                    className="shrink-0 lg:min-w-[10rem]"
                    disabled={starting || title.trim().length < 2}
                    onClick={handleGoLive}
                  >
                    {starting ? "Starting…" : "Start broadcast"}
                  </Button>

                  <div className="hidden h-8 w-px shrink-0 bg-brand-border lg:block" aria-hidden />

                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <label className="sr-only" htmlFor="stream-schedule-at">Scheduled start</label>
                    <input
                      id="stream-schedule-at"
                      className="form-input-light min-w-[12rem] flex-1 sm:max-w-xs"
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      aria-label="Scheduled start time"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        type="button"
                        disabled={scheduling || title.trim().length < 2}
                        onClick={handleSchedule}
                      >
                        {scheduling ? "Saving…" : "Save to calendar"}
                      </Button>
                      <Button
                        variant="secondary"
                        type="button"
                        disabled={announcing || title.trim().length < 2}
                        onClick={handleAnnounceInHour}
                      >
                        {announcing ? "Sending…" : "Live in 1 hour"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {startError && <p className="mt-3 text-sm text-red-600">{startError}</p>}
          </Card>

          {myScheduled.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-brand-blueDark">Your scheduled streams</h3>
              <ul className="mt-3 flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
                {myScheduled.map((stream) => (
                  <li
                    key={stream.id}
                    className="min-w-[min(100%,18rem)] shrink-0 snap-start rounded-xl border border-brand-border bg-[var(--gm-canvas)] p-4 sm:min-w-[16rem]"
                  >
                    <p className="font-semibold leading-snug text-brand-blueDark">{stream.title}</p>
                    <p className="mt-1 text-xs text-brand-muted">
                      {stream.scheduledAt ? formatWhen(stream.scheduledAt) : "Time TBD"}
                      {stream.communityNotifiedAt ? " · Announced" : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="primary"
                        type="button"
                        className="text-xs"
                        disabled={guideActionId === stream.id}
                        onClick={() => handleStartEarly(stream.id)}
                      >
                        Start early
                      </Button>
                      {!stream.communityNotifiedAt && (
                        <Button
                          variant="secondary"
                          type="button"
                          className="text-xs"
                          disabled={guideActionId === stream.id}
                          onClick={() => handleNotify(stream.id)}
                        >
                          Notify
                        </Button>
                      )}
                      <ShareLinkButton
                        path={getStreamSharePath(stream.id, stream.slug)}
                        label="Share"
                        shareTitle={stream.title}
                        shareText={`Join my live stream: ${stream.title}`}
                        className="px-3 py-2 text-xs"
                      />
                      <Link href={getStreamSharePath(stream.id, stream.slug)}>
                        <Button variant="secondary" type="button" className="text-xs">View</Button>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <LiveBrowseMain
            live={live}
            upcoming={upcoming}
            recorded={recorded}
            loading={loading}
            error={error}
            gridCols="md:grid-cols-2 xl:grid-cols-3"
          />
        </div>
      ) : (
        <LiveBrowseMain
          live={live}
          upcoming={upcoming}
          recorded={recorded}
          loading={loading}
          error={error}
          gridCols="sm:grid-cols-2"
        />
      )}
    </div>
  );
}

function LiveBrowseMain({
  live,
  upcoming,
  recorded,
  loading,
  error,
  gridCols,
}: {
  live: LiveStreamRecord[];
  upcoming: LiveStreamRecord[];
  recorded: LiveStreamRecord[];
  loading: boolean;
  error: string | null;
  gridCols: string;
}) {
  return (
    <div className="flex flex-col gap-10">
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-brand-blueDark">Coming up</h2>
          <p className="mt-1 text-sm text-brand-muted">Guides who announced they&apos;ll be live soon.</p>
          <div className={`mt-4 grid gap-4 ${gridCols}`}>
            {upcoming.map((stream) => (
              <StreamCard
                key={stream.id}
                stream={stream}
                badge={stream.scheduledAt ? timeUntil(stream.scheduledAt) : "Soon"}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold text-brand-blueDark">Happening now</h2>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {loading && <ExperienceGridSkeleton count={2} />}
        {!loading && live.length === 0 && (
          <Card className="mt-4">
            <p className="font-semibold text-brand-blueDark">Nobody is live right now</p>
            <p className="mt-2 text-sm text-brand-muted">
              Check back soon or look at the coming-up list above.
            </p>
          </Card>
        )}
        {!loading && live.length > 0 && (
          <div className={`mt-4 grid gap-4 ${gridCols}`}>
            {live.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        )}
      </section>

      {recorded.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-brand-blueDark">Watch again</h2>
          <p className="mt-1 text-sm text-brand-muted">Recordings from recent streams, saved for on-demand replay.</p>
          <div className={`mt-4 grid gap-4 ${gridCols}`}>
            {recorded.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StreamCard({ stream, badge }: { stream: LiveStreamRecord; badge?: string }) {
  const isLive = stream.status === "live";
  const isScheduled = stream.status === "scheduled";

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-brand-blueDark">{stream.title}</p>
          <p className="text-sm text-brand-muted">
            with {stream.guideName}
            {stream.experienceTitle ? ` · ${stream.experienceTitle}` : ""}
          </p>
          {isScheduled && stream.scheduledAt && (
            <p className="mt-1 text-xs text-brand-muted">{formatWhen(stream.scheduledAt)}</p>
          )}
        </div>
        <Chip
          tone={isLive ? "paid" : "neutral"}
          label={badge ?? (isLive ? "Live" : isScheduled ? "Scheduled" : "Recording")}
        />
      </div>
      <div className="mt-3">
        {stream.priceUsdc > 0 ? (
          <span className="inline-flex items-baseline gap-1.5">
            <Price amountUsdc={stream.priceUsdc} size="sm" align="start" />
            <span className="text-sm text-brand-muted">{isLive ? "to watch" : "planned price"}</span>
          </span>
        ) : (
          <p className="text-sm font-semibold text-brand-blueDark">Free</p>
        )}
      </div>
      <Link href={getStreamSharePath(stream.id, stream.slug)}>
        <Button variant="primary" className="mt-4 w-full">
          {isLive ? "Watch live" : isScheduled ? "View details" : "Play recording"}
        </Button>
      </Link>
      <ViewGuideProfileButton guideId={stream.guideId} className="mt-2 block" fullWidth />
    </Card>
  );
}
