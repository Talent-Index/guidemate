"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getAdminOverview,
  getAdminTransactions,
  downloadAdminReport,
  type AnalyticsOverview,
  type WalletTransaction,
} from "@/lib/api";

export default function AdminDashboardPage() {
  const { loading: authLoading, session, profile } = useAuth();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || profile?.role !== "admin") return;
    Promise.all([
      getAdminOverview(session.access_token),
      getAdminTransactions(session.access_token, { limit: 20 }),
    ])
      .then(([ov, tx]) => {
        setOverview(ov.overview);
        setTransactions(tx.transactions);
      })
      .catch((err) => setError((err as Error).message));
  }, [session, profile]);

  if (authLoading) return null;

  if (!session || profile?.role !== "admin") {
    return (
      <Card className="mx-auto max-w-md text-center">
        <p className="text-sm text-brand-muted">Admin access required.</p>
        <Link href="/auth/sign-in">
          <Button className="mt-4">Sign in</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <MobilePageBanner eyebrow="Admin" title="Dashboard" />
        <div className="hidden md:block">
          <h1 className="text-xl font-bold text-brand-blueDark">Admin dashboard</h1>
          <p className="text-sm text-brand-muted">Monitor users, bookings, revenue, and transactions.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/applications">
          <Button variant="secondary">Applications</Button>
        </Link>
        <Button
          variant="accent"
          onClick={() => session && downloadAdminReport(session.access_token).catch((e) => setError(e.message))}
        >
          Export CSV report
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {overview && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Guides" value={overview.guides} />
          <StatCard label="Tourists" value={overview.tourists} />
          <StatCard label="Bookings paid" value={overview.bookingsPaid} />
          <StatCard label="GMV (USDC)" value={overview.gmvUsdc} />
          <StatCard label="Platform revenue" value={overview.platformRevenueUsdc} highlight />
          <StatCard label="Guide earnings" value={overview.guideEarningsUsdc} />
          <StatCard label="Live streams" value={overview.streamsTotal} />
          <StatCard label="Stream tips" value={overview.streamTipsUsdc} />
          <StatCard label="Locked bookings" value={overview.bookingsLocked} />
          <StatCard label="Waitlist" value={overview.waitlistCount} />
          <StatCard label="Pending applications" value={overview.pendingApplications} />
        </div>
      )}

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
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={`p-4 ${highlight ? "border-brand-accent bg-brand-accent/5" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand-blueDark">{value.toLocaleString()}</p>
    </Card>
  );
}
