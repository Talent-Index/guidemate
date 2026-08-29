"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ExperienceGridSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  listLiveStreams,
  listRecordedStreams,
  startStream,
  type LiveStreamRecord,
} from "@/lib/api";

export default function LiveBrowsePage() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const [live, setLive] = useState<LiveStreamRecord[]>([]);
  const [recorded, setRecorded] = useState<LiveStreamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("0");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const [liveRes, recordedRes] = await Promise.all([listLiveStreams(), listRecordedStreams()]);
        if (cancelled) return;
        setLive(liveRes.streams);
        setRecorded(recordedRes.streams);
        setError(null);
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
  }, []);

  async function handleGoLive(e: FormEvent) {
    e.preventDefault();
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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-brand-blueDark">Live experiences</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Watch a guide stream from their phone. This list is empty until a signed-in guide starts a
          stream with <span className="font-semibold text-brand-blueDark">Go live</span> - then it
          appears here for everyone.
        </p>
      </div>

      {profile?.role === "guide" && (
        <Card>
          <h2 className="text-lg font-bold text-brand-blueDark">Go live</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Starts a room immediately and opens your camera. Set a price for pay-per-view, or leave it at 0 for free.
          </p>
          {!session ? (
            <Link href="/auth/sign-in">
              <Button variant="primary" className="mt-4">
                Sign in to go live
              </Button>
            </Link>
          ) : (
            <form onSubmit={handleGoLive} className="mt-4 grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
              <input
                className="form-input-light"
                placeholder="e.g. Umoja market walk, live"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <input
                className="form-input-light"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-label="Price in USDC"
              />
              <Button variant="primary" type="submit" disabled={starting || title.trim().length < 2}>
                {starting ? "Starting..." : "Start stream"}
              </Button>
            </form>
          )}
          {startError && <p className="mt-2 text-sm text-red-600">{startError}</p>}
        </Card>
      )}

      <div>
        <h2 className="text-lg font-bold text-brand-blueDark">Happening now</h2>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {loading && <ExperienceGridSkeleton count={2} />}
        {!loading && live.length === 0 && (
          <Card className="mt-4">
            <p className="font-semibold text-brand-blueDark">Nobody is live right now</p>
            <p className="mt-2 text-sm text-brand-muted">
              This page lists streams that a signed-in guide has started. Until someone clicks{" "}
              <span className="font-semibold text-brand-blueDark">Start stream</span> on this page
              (guide accounts only), the list stays empty on purpose.
            </p>
            {profile?.role !== "guide" && (
              <p className="mt-2 text-sm text-brand-muted">
                Want to host?{" "}
                <Link href="/apply" className="font-semibold text-brand-accent hover:underline">
                  Apply to be a guide
                </Link>
                , or use instant guide sign-up for the demo.
              </p>
            )}
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

function StreamCard({ stream }: { stream: LiveStreamRecord }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-brand-blueDark">{stream.title}</p>
          <p className="text-sm text-brand-muted">
            with {stream.guideName}
            {stream.experienceTitle ? ` · ${stream.experienceTitle}` : ""}
          </p>
        </div>
        <Chip
          tone={stream.status === "live" ? "paid" : "neutral"}
          label={stream.status === "live" ? "Live" : "Recording"}
        />
      </div>
      <p className="mt-3 text-sm font-semibold text-brand-blueDark">
        {stream.priceUsdc > 0 ? `${stream.priceUsdc} USDC to watch` : "Free"}
      </p>
      <Link href={`/live/${stream.id}`}>
        <Button variant="primary" className="mt-4 w-full">
          {stream.status === "live" ? "Watch live" : "Play recording"}
        </Button>
      </Link>
    </Card>
  );
}
