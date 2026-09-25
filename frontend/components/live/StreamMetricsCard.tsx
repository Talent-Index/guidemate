"use client";

import { Card } from "@/components/ui/Card";
import type { StreamStats } from "@/lib/api";

export function StreamMetricsCard({
  stats,
  title = "Live stats",
  compact,
}: {
  stats: Pick<
    StreamStats,
    "viewerCount" | "peakViewerCount" | "totalJoins" | "uniqueJoins" | "reactionCount" | "tipCount" | "tipTotalUsdc"
  >;
  title?: string;
  compact?: boolean;
}) {
  const items = [
    { label: "Watching now", value: stats.viewerCount.toLocaleString() },
    { label: "Peak viewers", value: stats.peakViewerCount.toLocaleString() },
    { label: "Total joins", value: stats.totalJoins.toLocaleString() },
    { label: "Unique viewers", value: stats.uniqueJoins.toLocaleString() },
    { label: "Flowers", value: stats.reactionCount.toLocaleString() },
    { label: "Tips", value: `${stats.tipCount} · ${stats.tipTotalUsdc.toFixed(2)} USDC` },
  ];

  return (
    <Card className={compact ? "p-4" : "p-5 sm:p-6"}>
      <h2 className="text-sm font-bold text-brand-blueDark">{title}</h2>
      <dl className={`mt-3 grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-brand-border bg-brand-bg/30 px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted">{item.label}</dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-brand-blueDark">{item.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
