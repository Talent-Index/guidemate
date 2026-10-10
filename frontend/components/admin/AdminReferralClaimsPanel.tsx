"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { listAdminReferralClaims, updateAdminReferralClaim, type AdminReferralClaim } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthProvider";

export function AdminReferralClaimsPanel() {
  const { session } = useAuth();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [claims, setClaims] = useState<AdminReferralClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const { claims: rows } = await listAdminReferralClaims(session.access_token, statusFilter);
      setClaims(rows);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(claimId: string, status: "approved" | "redeemed" | "cancelled") {
    if (!session?.access_token) return;
    setBusyId(claimId);
    try {
      await updateAdminReferralClaim(claimId, status, session.access_token);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="mt-8 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-brand-blueDark">Referral reward claims</h2>
          <p className="text-sm text-brand-muted">Approve comp trips and mark redeemed after the tourist books.</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-brand-border px-3 py-2 text-sm"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="redeemed">Redeemed</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All</option>
        </select>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {loading && <p className="mt-4 text-sm text-brand-muted">Loading claims…</p>}

      {!loading && claims.length === 0 && (
        <p className="mt-4 text-sm text-brand-muted">No claims in this view.</p>
      )}

      <ul className="mt-4 space-y-3">
        {claims.map((c) => (
          <li key={c.id} className="rounded-lg border border-brand-border p-3 text-sm">
            <p className="font-semibold text-brand-blueDark">{c.experienceTitle ?? c.experienceId}</p>
            <p className="text-brand-muted">
              {c.profileName ?? c.profileId} · {c.xpSpent} XP · {new Date(c.createdAt).toLocaleString()}
            </p>
            <p className="mt-1 font-medium">Status: {c.status}</p>
            {c.status === "pending" && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  disabled={busyId === c.id}
                  onClick={() => void setStatus(c.id, "approved")}
                >
                  Approve comp
                </Button>
                <Button
                  variant="secondary"
                  disabled={busyId === c.id}
                  onClick={() => void setStatus(c.id, "cancelled")}
                >
                  Cancel (refund XP)
                </Button>
              </div>
            )}
            {c.status === "approved" && (
              <Button
                className="mt-2"
                variant="primary"
                disabled={busyId === c.id}
                onClick={() => void setStatus(c.id, "redeemed")}
              >
                Mark redeemed
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
