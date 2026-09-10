"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StarRating } from "@/components/ui/StarRating";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getAdminGuidePerformance, type GuidePerformanceRow } from "@/lib/api";
import { Price } from "@/lib/fx";

export function AdminGuidePerformancePanel() {
  const { session } = useAuth();
  const [guides, setGuides] = useState<GuidePerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getAdminGuidePerformance(session.access_token)
      .then((data) => setGuides(data.guides))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [session]);

  return (
    <Card id="guide-performance" className="scroll-mt-24">
      <h2 className="text-lg font-bold text-brand-blueDark">Guide performance</h2>
      <p className="mt-1 text-sm text-brand-muted">
        Guests hosted, earnings split, and reviews per vetted guide.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="mt-4 text-sm text-brand-muted">Loading guide metrics…</p>}

      {!loading && guides.length === 0 && (
        <p className="mt-4 text-sm text-brand-muted">No guides on the platform yet.</p>
      )}

      {!loading && guides.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-brand-border text-xs uppercase text-brand-muted">
                <th className="py-2 pr-4">Guide</th>
                <th className="py-2 pr-4 text-right">Guests</th>
                <th className="py-2 pr-4 text-right">Tours done</th>
                <th className="py-2 pr-4 text-right">Active</th>
                <th className="py-2 pr-4 text-right">Gross volume</th>
                <th className="py-2 pr-4 text-right">Guide earned</th>
                <th className="py-2 pr-4 text-right">Guidemate share</th>
                <th className="py-2">Reviews</th>
              </tr>
            </thead>
            <tbody>
              {guides.map((guide) => (
                <tr key={guide.guideId} className="border-b border-brand-border/50">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/guides/${guide.guideId}`}
                      className="font-semibold text-brand-accent hover:underline"
                    >
                      {guide.guideName}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-brand-accent">{guide.totalGuests}</td>
                  <td className="py-3 pr-4 text-right text-brand-success">{guide.completedTours}</td>
                  <td className="py-3 pr-4 text-right text-brand-amberDark">{guide.activeBookings}</td>
                  <td className="py-3 pr-4 text-right">
                    <Price amountUsdc={guide.grossVolumeUsdc} size="sm" align="end" />
                  </td>
                  <td className="py-3 pr-4 text-right text-brand-success">
                    {guide.guideEarningsUsdc.toLocaleString()} USDC
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="font-semibold text-brand-blueDark">{guide.platformSharePct}%</span>
                    <span className="block text-xs text-brand-muted">
                      {guide.platformRevenueUsdc.toLocaleString()} USDC
                    </span>
                  </td>
                  <td className="py-3">
                    {guide.ratingCount > 0 ? (
                      <StarRating value={guide.ratingAvg} count={guide.ratingCount} size="sm" />
                    ) : (
                      <span className="text-brand-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
