"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { listLiveStreams, listUpcomingStreams, type LiveStreamRecord } from "@/lib/api";
import { getStreamSharePath } from "@/lib/share";
import { KesPrice } from "@/lib/fx";
import { useAuth } from "@/lib/auth/AuthProvider";
import { destinationIfSignedIn } from "@/lib/auth/gatedPath";

function formatScheduled(iso: string) {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function StreamCard({ stream, href }: { stream: LiveStreamRecord; href: string }) {
  const isLive = stream.status === "live";

  return (
    <Link
      href={href}
      className="group flex w-[min(72vw,16rem)] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-[var(--gm-border)] bg-[var(--gm-surface)] transition hover:border-brand-accent/50 sm:w-64"
    >
      <div className="relative aspect-[9/16] bg-gradient-to-br from-brand-blueDark via-brand-blue to-brand-accent/80">
        {stream.guideAvatarUrl ? (
          <Image
            src={stream.guideAvatarUrl}
            alt=""
            fill
            className="object-cover opacity-90 transition group-hover:scale-[1.02]"
            sizes="256px"
            unoptimized={stream.guideAvatarUrl.startsWith("http")}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
        <div className="absolute inset-0 flex flex-col justify-between p-3">
          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              isLive ? "bg-red-600 text-white" : "bg-black/40 text-white backdrop-blur-sm"
            }`}
          >
            {isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />}
            {isLive ? "Live" : "Scheduled"}
          </span>
          <p className="line-clamp-3 text-sm font-semibold leading-snug text-white drop-shadow-sm">{stream.title}</p>
        </div>
      </div>
      <div className="flex flex-col gap-0.5 px-3 py-3">
        <p className="truncate text-xs text-brand-muted">{stream.guideName}</p>
        <p className="text-xs font-semibold text-brand-blueDark">
          {stream.priceUsdc > 0 ? (
            <KesPrice amountUsdc={stream.priceUsdc} className="inline text-brand-blueDark" suffix="" />
          ) : (
            "Free"
          )}
          {stream.scheduledAt && !isLive && (
            <span className="mt-1 block font-normal text-brand-muted">{formatScheduled(stream.scheduledAt)}</span>
          )}
        </p>
      </div>
    </Link>
  );
}

export function LiveStreamsShowcase() {
  const { session } = useAuth();
  const signedIn = Boolean(session);
  const [live, setLive] = useState<LiveStreamRecord[]>([]);
  const [upcoming, setUpcoming] = useState<LiveStreamRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [liveRes, upcomingRes] = await Promise.all([listLiveStreams(), listUpcomingStreams()]);
        if (cancelled) return;
        setLive(liveRes.streams);
        setUpcoming(upcomingRes.streams);
      } catch {
        if (!cancelled) {
          setLive([]);
          setUpcoming([]);
        }
      }
    }
    void load();
    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const streams = useMemo(() => {
    const seen = new Set<string>();
    const merged: LiveStreamRecord[] = [];
    for (const s of [...live, ...upcoming]) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      merged.push(s);
    }
    return merged.slice(0, 12);
  }, [live, upcoming]);

  const liveHref = destinationIfSignedIn("/live", signedIn);

  return (
    <section id="live-streams" className="scroll-mt-24 border-b border-[var(--gm-border)] bg-[var(--gm-canvas)] py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-accent">Live</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-blueDark sm:text-3xl">On air &amp; coming up</h2>
            <p className="mt-2 text-sm text-brand-muted">Tap a stream to watch — sign in when you join.</p>
          </div>
          <Link
            href={liveHref}
            className="text-sm font-semibold text-brand-accent hover:underline"
          >
            All live streams →
          </Link>
        </div>

        {streams.length === 0 ? (
          <p className="mt-10 rounded-xl border border-dashed border-[var(--gm-border)] px-4 py-10 text-center text-sm text-brand-muted">
            No live or scheduled streams right now. Follow a guide or check back soon.
          </p>
        ) : (
          <div className="relative mt-8 -mx-4 px-4">
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin [scrollbar-width:thin]">
              {streams.map((stream) => (
                <StreamCard
                  key={stream.id}
                  stream={stream}
                  href={destinationIfSignedIn(getStreamSharePath(stream.id, stream.slug), signedIn)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
