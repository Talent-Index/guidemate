"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MobilePageBanner } from "@/components/ui/MobilePageBanner";
import { AccountSettingsActions } from "@/components/ui/AccountSettingsActions";
import { AnalyticsGate, SuperAdminGate } from "@/components/auth/AdminGate";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSuperAdmin } from "@/lib/auth/roles";
import { createStaff, listStaff, revokeStaff, type StaffMember } from "@/lib/api";

export default function AdminSettingsPage() {
  const { session, profile } = useAuth();
  const superAdmin = isSuperAdmin(profile?.role);

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(superAdmin);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !superAdmin) return;
    setLoadingStaff(true);
    listStaff(session.access_token)
      .then(({ staff: rows }) => setStaff(rows))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoadingStaff(false));
  }, [session, superAdmin]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!session || !superAdmin) return;
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      await createStaff({ email, fullName, password }, session.access_token);
      const { staff: rows } = await listStaff(session.access_token);
      setStaff(rows);
      setFullName("");
      setEmail("");
      setPassword("");
      setMessage("Staff login created. They can sign in and open Analytics.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(userId: string) {
    if (!session || !superAdmin) return;
    const confirmed = window.confirm("Revoke this staff member's analytics access?");
    if (!confirmed) return;
    setRevokingId(userId);
    setError(null);
    setMessage(null);
    try {
      await revokeStaff(userId, session.access_token);
      setStaff((prev) => prev.filter((row) => row.id !== userId));
      setMessage("Staff access revoked.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <AnalyticsGate>
      <div className="flex flex-col gap-6">
        <div>
          <MobilePageBanner eyebrow="Admin" title="Settings" />
          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-brand-blueDark">Settings</h1>
            <p className="text-sm text-brand-muted">
              {superAdmin
                ? "Create staff logins for analytics access, and manage your account."
                : "Manage your staff account."}
            </p>
          </div>
        </div>

        {superAdmin ? (
          <SuperAdminGate>
            <Card>
              <h2 className="text-lg font-bold text-brand-blueDark">Staff logins</h2>
              <p className="mt-1 text-sm text-brand-muted">
                Staff can sign in with email and password and view platform analytics. They cannot approve guides or
                manage applications.
              </p>

              <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleCreate}>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-brand-blueDark">Full name</span>
                  <input
                    required
                    className="form-input-light"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-brand-blueDark">Work email</span>
                  <input
                    required
                    type="email"
                    className="form-input-light"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                  <span className="font-medium text-brand-blueDark">Password</span>
                  <input
                    required
                    type="password"
                    minLength={8}
                    className="form-input-light"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </label>
                <Button variant="primary" type="submit" disabled={creating} className="w-fit sm:col-span-2">
                  {creating ? "Creating…" : "Create staff login"}
                </Button>
              </form>

              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-muted">Active staff</h3>
                {loadingStaff ? (
                  <p className="mt-3 text-sm text-brand-muted">Loading staff…</p>
                ) : staff.length === 0 ? (
                  <p className="mt-3 text-sm text-brand-muted">No staff logins yet.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-brand-border">
                    {staff.map((row) => (
                      <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div>
                          <p className="font-semibold text-brand-blueDark">{row.fullName ?? "Staff member"}</p>
                          <p className="text-sm text-brand-muted">{row.email ?? "No email"}</p>
                          <p className="text-xs text-brand-muted">
                            Added {new Date(row.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          type="button"
                          disabled={revokingId === row.id}
                          onClick={() => void handleRevoke(row.id)}
                        >
                          {revokingId === row.id ? "Revoking…" : "Revoke access"}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </SuperAdminGate>
        ) : (
          <Card className="p-4">
            <p className="text-sm text-brand-muted">
              You have analytics access only. Contact a super admin if you need guide approvals or staff management.
            </p>
            <Link href="/admin" className="mt-3 inline-block font-semibold text-brand-accent hover:underline">
              Open analytics
            </Link>
          </Card>
        )}

        {message && <p className="text-sm text-brand-success">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <AccountSettingsActions />
      </div>
    </AnalyticsGate>
  );
}
