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

  async function handleGoLive() {
    if (!session) return;
    setStarting(true);
    setStartError(null);
    try {
      const { stream } = await startStream(
        { title: title.trim(), priceUsdc: Number(price) || 0 },
        session.access_token
      );
      router.push(`/live/${stream.id}`);
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
      const { stream } = await startScheduledStream(streamId, session.access_token);
      router.push(`/live/${stream.id}`);
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

      {profile?.role === "guide" && (
        <Card>
          <h2 className="text-lg font-bold text-brand-blueDark">Host a stream</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Go live now, schedule for later, or tell the community you&apos;ll be on in about an hour.
          </p>
          {!session ? (
            <Link href="/auth/sign-in">
              <Button variant="primary" className="mt-4">
                Sign in to go live
              </Button>
            </Link>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              <input
                className="form-input-light"
                placeholder="e.g. Umoja market walk, live"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="form-input-light"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  aria-label="Price in USDC"
                />
                <input
                  className="form-input-light"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  aria-label="Scheduled start time"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  type="button"
                  disabled={starting || title.trim().length < 2}
                  onClick={handleGoLive}
                >
                  {starting ? "Starting..." : "Go live now"}
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  disabled={scheduling || title.trim().length < 2}
                  onClick={handleSchedule}
                >
                  {scheduling ? "Scheduling..." : "Schedule stream"}
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  disabled={announcing || title.trim().length < 2}
                  onClick={handleAnnounceInHour}
                >
                  {announcing ? "Announcing..." : "Notify: live in 1 hour"}
                </Button>
              </div>
            </div>
          )}
          {startError && <p className="mt-2 text-sm text-red-600">{startError}</p>}

          {myScheduled.length > 0 && (
            <div className="mt-6 border-t border-brand-border pt-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-brand-muted">Your scheduled streams</h3>
              <ul className="mt-3 flex flex-col gap-3">
                {myScheduled.map((stream) => (
                  <li
                    key={stream.id}
                    className="flex flex-col gap-2 rounded-lg border border-brand-border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-brand-blueDark">{stream.title}</p>
                      <p className="text-sm text-brand-muted">
                        {stream.scheduledAt ? formatWhen(stream.scheduledAt) : "Time TBD"}
                        {stream.communityNotifiedAt ? " · Announced to community" : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ShareLinkButton
                        path={getStreamSharePath(stream.id)}
                        label="Share link"
                        shareTitle={stream.title}
                        shareText={`Join my live stream: ${stream.title}`}
                        className="px-4 py-2 text-xs"
                      />
                      {!stream.communityNotifiedAt && (
                        <Button
                          variant="secondary"
                          type="button"
                          disabled={guideActionId === stream.id}
                          onClick={() => handleNotify(stream.id)}
                        >
                          Notify community
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        type="button"
                        disabled={guideActionId === stream.id}
                        onClick={() => handleStartEarly(stream.id)}
                      >
                        Start early
                      </Button>
                      <Link href={`/live/${stream.id}`}>
                        <Button variant="secondary" type="button">View</Button>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {upcoming.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-brand-blueDark">Coming up</h2>
          <p className="mt-1 text-sm text-brand-muted">Guides who announced they&apos;ll be live soon.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {upcoming.map((stream) => (
              <StreamCard
                key={stream.id}
                stream={stream}
                badge={stream.scheduledAt ? timeUntil(stream.scheduledAt) : "Soon"}
              />
            ))}
          </div>
        </div>
      )}

      <div>
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
        {!loading && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {live.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        )}
      </div>

      {recorded.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-brand-blueDark">Watch again</h2>
          <p className="mt-1 text-sm text-brand-muted">Recordings from recent streams, saved for on-demand replay.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {recorded.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        </div>
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
      <Link href={`/live/${stream.id}`}>
        <Button variant="primary" className="mt-4 w-full">
          {isLive ? "Watch live" : isScheduled ? "View details" : "Play recording"}
        </Button>
      </Link>
      <ViewGuideProfileButton guideId={stream.guideId} className="mt-2 block" fullWidth />
    </Card>
  );
}
