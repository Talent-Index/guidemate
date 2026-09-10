"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
import { AnalyticsGate } from "@/components/auth/AdminGate";
import { AdminIntakePanel } from "@/components/admin/AdminIntakePanel";
import { BarChart } from "@/components/admin/BarChart";
import { DonutChart } from "@/components/admin/DonutChart";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSuperAdmin } from "@/lib/auth/roles";
import {
  getAdminOverview,
  getAdminTransactions,
  downloadAdminReport,
  type AnalyticsOverview,
  type WalletTransaction,
} from "@/lib/api";

export default function AdminDashboardPage() {
  const { session, profile } = useAuth();
  const superAdmin = isSuperAdmin(profile?.role);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadDashboard = useCallback(() => {
    if (!session) return;
    Promise.all([
      getAdminOverview(session.access_token),
      getAdminTransactions(session.access_token, { limit: 20 }),
    ])
      .then(([ov, tx]) => {
        setOverview(ov.overview);
        setTransactions(tx.transactions);
      })
      .catch((err) => setError((err as Error).message));
  }, [session]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, refreshKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;
    const target = document.querySelector(window.location.hash);
    target?.scrollIntoView({ behavior: "smooth" });
  }, [overview]);

  return (
    <AnalyticsGate>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <MobilePageBanner eyebrow="Admin" title="Dashboard" />
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-brand-blueDark">Platform audit</h1>
              <p className="text-sm text-brand-muted">
                Volume, custody, intake pipeline, and financial breakdown for Guidemate.
              </p>
            </div>
          </div>
          <Button
            variant="accent"
            onClick={() => session && downloadAdminReport(session.access_token).catch((e) => setError(e.message))}
          >
            Export audit report
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {overview && (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <DonutChart
                  title="Booking custody"
                  subtitle="Escrow and settlement status across all bookings"
                  segments={[
                    { label: "Locked (in escrow)", value: overview.bookingsLocked, color: "#FFB700" },
                    { label: "Paid / released", value: overview.bookingsPaid, color: "#008009" },
                    { label: "Refunded", value: overview.bookingsRefunded, color: "#5B6B82" },
                  ]}
                />
              </Card>
              <Card>
                <DonutChart
                  title="Guide application pipeline"
                  subtitle="Status of /apply submissions"
                  segments={[
                    { label: "Pending review", value: overview.pendingApplications, color: "#FFB700" },
                    { label: "Approved", value: overview.applicationsApproved, color: "#008009" },
                    { label: "Rejected", value: overview.applicationsRejected, color: "#C53030" },
                  ]}
                />
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <BarChart
                  title="Financial breakdown (USDC)"
                  subtitle="Gross volume vs platform take vs guide earnings"
                  valuePrefix=""
                  series={[
                    { label: "Gross volume (GMV)", value: overview.gmvUsdc, color: "#5B6B82" },
                    { label: "Platform revenue", value: overview.platformRevenueUsdc, color: "#003B95" },
                    { label: "Guide earnings", value: overview.guideEarningsUsdc, color: "#008009" },
                    { label: "Stream tips", value: overview.streamTipsUsdc, color: "#0071C2" },
                  ]}
                />
              </Card>
              <Card>
                <h3 className="text-sm font-bold text-brand-blueDark">Platform snapshot</h3>
                <p className="mt-0.5 text-xs text-brand-muted">Key counts at a glance</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <StatCard label="Guides" value={overview.guides} />
                  <StatCard label="Tourists" value={overview.tourists} />
                  <StatCard label="Waitlist" value={overview.waitlistCount} accent="amber" />
                  <StatCard label="Pending apps" value={overview.pendingApplications} accent="amber" />
                  <StatCard label="Live streams" value={overview.streamsLive} />
                  <StatCard label="Total bookings" value={overview.bookingsTotal} />
                </div>
              </Card>
            </div>

            <Card>
              <h2 className="text-lg font-bold text-brand-blueDark">Metrics summary</h2>
              <p className="mt-1 text-sm text-brand-muted">Detailed breakdown matching the audit report export.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-brand-border text-xs uppercase text-brand-muted">
                      <th className="py-2 pr-4">Metric</th>
                      <th className="py-2 pr-4 text-right">Count / value</th>
                      <th className="py-2">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    <MetricRow label="Guides onboarded" value={overview.guides} category="Users" tone="blue" />
                    <MetricRow label="Tourists registered" value={overview.tourists} category="Users" tone="blue" />
                    <MetricRow label="Waitlist signups" value={overview.waitlistCount} category="Intake" tone="amber" />
                    <MetricRow label="Applications pending" value={overview.pendingApplications} category="Intake" tone="amber" />
                    <MetricRow label="Applications approved" value={overview.applicationsApproved} category="Intake" tone="green" />
                    <MetricRow label="Applications rejected" value={overview.applicationsRejected} category="Intake" tone="muted" />
                    <MetricRow label="Bookings locked" value={overview.bookingsLocked} category="Bookings" tone="amber" />
                    <MetricRow label="Bookings paid" value={overview.bookingsPaid} category="Bookings" tone="green" />
                    <MetricRow label="Bookings refunded" value={overview.bookingsRefunded} category="Bookings" tone="muted" />
                    <MetricRow label="GMV (USDC)" value={overview.gmvUsdc} category="Financials" tone="muted" formatted />
                    <MetricRow label="Platform revenue (USDC)" value={overview.platformRevenueUsdc} category="Financials" tone="blue" formatted />
                    <MetricRow label="Guide earnings (USDC)" value={overview.guideEarningsUsdc} category="Financials" tone="green" formatted />
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {superAdmin && <AdminIntakePanel onChanged={() => setRefreshKey((k) => k + 1)} />}

        <Card>
          <h2 className="text-lg font-bold text-brand-blueDark">Recent transactions</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border text-xs uppercase text-brand-muted">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-brand-border/50">
                    <td className="py-2 pr-4 text-brand-muted">{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 pr-4 capitalize">{tx.type.replace(/_/g, " ")}</td>
                    <td className="py-2 pr-4">{tx.amountUsdc} USDC</td>
                    <td className="py-2 capitalize">{tx.status}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-brand-muted">
                      No transactions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AnalyticsGate>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "amber" | "green" | "blue";
}) {
  const accentClass =
    accent === "amber"
      ? "border-brand-amber/40 bg-brand-amber/10"
      : accent === "green"
        ? "border-brand-success/30 bg-brand-successBg"
        : accent === "blue"
          ? "border-brand-accent/30 bg-brand-accent/5"
          : "border-brand-border bg-white";

  return (
    <div className={`rounded-xl border p-3 ${accentClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-brand-blueDark">{value.toLocaleString()}</p>
    </div>
  );
}

function MetricRow({
  label,
  value,
  category,
  tone,
  formatted,
}: {
  label: string;
  value: number;
  category: string;
  tone: "blue" | "green" | "amber" | "muted";
  formatted?: boolean;
}) {
  const toneClass =
    tone === "blue"
      ? "text-brand-accent"
      : tone === "green"
        ? "text-brand-success"
        : tone === "amber"
          ? "text-brand-amberDark"
          : "text-brand-muted";

  const display = formatted
    ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : value.toLocaleString();

  return (
    <tr className="border-b border-brand-border/50">
      <td className="py-2.5 pr-4 font-medium text-brand-blueDark">{label}</td>
      <td className={`py-2.5 pr-4 text-right font-semibold ${toneClass}`}>{display}</td>
      <td className="py-2.5 text-brand-muted">{category}</td>
    </tr>
  );
}
