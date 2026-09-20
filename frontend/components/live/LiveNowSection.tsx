"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { listLiveStreams, type LiveStreamRecord } from "@/lib/api";
import { getStreamSharePath } from "@/lib/share";

export function LiveNowSection() {
  const [streams, setStreams] = useState<LiveStreamRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    listLiveStreams()
      .then(({ streams: live }) => {
        if (!cancelled) setStreams(live.slice(0, 3));
      })
      .catch(() => {});
    const interval = setInterval(() => {
      listLiveStreams()
        .then(({ streams: live }) => setStreams(live.slice(0, 3)))
        .catch(() => {});
    }, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (streams.length === 0) return null;

  return (
    <section className="border-y border-brand-border bg-brand-blueDark/5 py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">Live now</p>
            <h2 className="mt-1 text-2xl font-bold text-brand-blueDark">Watch guides go live</h2>
          </div>
          <Link href="/live">
            <Button variant="secondary">See all live</Button>
          </Link>
        </div>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {streams.map((stream) => (
            <li key={stream.id}>
              <Link
                href={getStreamSharePath(stream.id, stream.slug)}
                className="flex h-full flex-col rounded-2xl border border-brand-border bg-white p-4 shadow-card transition hover:border-brand-accent/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-brand-blueDark line-clamp-2">{stream.title}</p>
                  <Chip tone="paid" label="Live" />
                </div>
                <p className="mt-2 text-sm text-brand-muted">with {stream.guideName}</p>
                <p className="mt-3 text-xs font-semibold text-brand-accent">
                  {stream.priceUsdc > 0 ? `${stream.priceUsdc} USDC to watch` : "Free to watch →"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
