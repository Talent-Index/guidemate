"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { approveApplication } from "@/lib/api";

type ApplicationStatus = "pending" | "approved" | "rejected";
type AdminTab = "guides" | "waitlist";

interface WaitlistRow {
  id: string;
  full_name: string;
  email: string;
  interest: string | null;
  created_at: string;
}

interface ApplicationRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  id_number: string | null;
  location: string;
  experience_pitch: string;
  portfolio_links: string[];
  cv_path: string | null;
  proof_of_work_path: string | null;
  referee_name: string | null;
  referee_phone: string | null;
  referee_email: string | null;
  status: ApplicationStatus;
  created_at: string;
}

export function AdminIntakePanel({ onChanged }: { onChanged?: () => void }) {
  const { session, profile } = useAuth();
  const [tab, setTab] = useState<AdminTab>("guides");
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ApplicationStatus | "all">("pending");
  const [actingId, setActingId] = useState<string | null>(null);
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const [cvUrls, setCvUrls] = useState<Record<string, string>>({});

  async function loadApplications() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    let query = supabase
      .from("guide_applications")
      .select(
        "id, full_name, email, phone, id_number, location, experience_pitch, portfolio_links, cv_path, proof_of_work_path, referee_name, referee_phone, referee_email, status, created_at"
      )
      .order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);

    const { data, error: loadError } = await query;
    if (loadError) {
      setError(loadError.message);
      setApplications([]);
      setLoading(false);
      return;
    }

    const rows = (data as ApplicationRow[]) ?? [];
    setApplications(rows);

    const urls: Record<string, string> = {};
    const cvSigned: Record<string, string> = {};
    await Promise.all(
      rows.flatMap((row) => {
        const tasks: Promise<void>[] = [];
        if (row.proof_of_work_path) {
          tasks.push(
            supabase.storage.from("guide-proofs").createSignedUrl(row.proof_of_work_path, 3600).then(({ data: signed }) => {
              if (signed?.signedUrl) urls[row.id] = signed.signedUrl;
            })
          );
        }
        if (row.cv_path) {
          tasks.push(
            supabase.storage.from("guide-proofs").createSignedUrl(row.cv_path, 3600).then(({ data: signed }) => {
              if (signed?.signedUrl) cvSigned[row.id] = signed.signedUrl;
            })
          );
        }
        return tasks;
      })
    );
    setProofUrls(urls);
    setCvUrls(cvSigned);
    setLoading(false);
  }

  async function loadWaitlist() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: loadError } = await supabase
      .from("waitlist")
      .select("id, full_name, email, interest, created_at")
      .order("created_at", { ascending: false });
    if (loadError) {
      setError(loadError.message);
      setWaitlist([]);
    } else {
      setWaitlist((data as WaitlistRow[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!session || profile?.role !== "admin") return;
    if (tab === "guides") void loadApplications();
    else void loadWaitlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profile, filter, tab]);

  async function handleApprove(id: string) {
    if (!session) return;
    setActingId(id);
    setError(null);
    try {
      await approveApplication(id, session.access_token);
      await loadApplications();
      onChanged?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(id: string) {
    if (!session) return;
    setActingId(id);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("guide_applications")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: session.user.id,
        })
        .eq("id", id);
      if (updateError) throw updateError;
      await loadApplications();
      onChanged?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActingId(null);
    }
  }

  return (
    <Card id="intake" className="scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-brand-blueDark">Guide intake</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Review guide applications and waitlist signups in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("guides")}
            className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wide ${
              tab === "guides" ? "bg-brand-blue text-white" : "border border-brand-border text-brand-muted"
            }`}
          >
            Guide applicants
          </button>
          <button
            type="button"
            onClick={() => setTab("waitlist")}
            className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wide ${
              tab === "waitlist" ? "bg-brand-blue text-white" : "border border-brand-border text-brand-muted"
            }`}
          >
            Waitlist ({waitlist.length || "…"})
          </button>
        </div>
      </div>

      {tab === "guides" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${
                filter === status
                  ? "bg-brand-blue text-white"
                  : "border border-brand-border text-brand-muted hover:border-brand-accent hover:text-brand-accent"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {loading && <div className="mt-4"><ListRowSkeleton count={3} /></div>}

      {!loading && tab === "waitlist" && waitlist.length === 0 && (
        <p className="mt-4 text-sm text-brand-muted">No one has joined the waitlist yet.</p>
      )}

      {!loading && tab === "waitlist" && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-border text-xs uppercase text-brand-muted">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Interest</th>
                <th className="py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {waitlist.map((row) => (
                <tr key={row.id} className="border-b border-brand-border/50">
                  <td className="py-2 pr-4 font-medium text-brand-blueDark">{row.full_name}</td>
                  <td className="py-2 pr-4 text-brand-muted">{row.email}</td>
                  <td className="py-2 pr-4 text-brand-blueDark">{row.interest ?? "—"}</td>
                  <td className="py-2 text-brand-muted">{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === "guides" && applications.length === 0 && (
        <p className="mt-4 text-sm text-brand-muted">No applications in this view.</p>
      )}

      {!loading &&
        tab === "guides" &&
        applications.map((app) => (
          <div key={app.id} className="mt-4 rounded-xl border border-brand-border bg-brand-bg/30 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-brand-blueDark">{app.full_name}</h3>
                <p className="text-sm text-brand-muted">
                  {app.email} · {app.phone} · {app.location}
                </p>
                {app.id_number && <p className="text-sm text-brand-muted">ID: {app.id_number}</p>}
                <p className="mt-1 text-xs text-brand-muted">{new Date(app.created_at).toLocaleString()}</p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                  app.status === "approved"
                    ? "bg-brand-successBg text-brand-success"
                    : app.status === "rejected"
                      ? "bg-red-50 text-red-600"
                      : "bg-brand-amber/20 text-brand-blueDark"
                }`}
              >
                {app.status}
              </span>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm text-brand-blueDark">{app.experience_pitch}</p>

            {app.portfolio_links.length > 0 && (
              <div className="mt-3 flex flex-col gap-1">
                {app.portfolio_links.map((link) => (
                  <a
                    key={link}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-brand-accent hover:underline"
                  >
                    {link}
                  </a>
                ))}
              </div>
            )}

            {app.referee_name && (
              <div className="mt-3 rounded-lg border border-brand-border bg-white/60 p-3 text-sm">
                <p className="font-semibold text-brand-blueDark">Referee</p>
                <p className="text-brand-muted">
                  {app.referee_name}
                  {app.referee_phone ? ` · ${app.referee_phone}` : ""}
                  {app.referee_email ? ` · ${app.referee_email}` : ""}
                </p>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-4">
              {cvUrls[app.id] && (
                <a
                  href={cvUrls[app.id]}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-brand-accent hover:underline"
                >
                  View CV
                </a>
              )}
              {proofUrls[app.id] && (
                <a
                  href={proofUrls[app.id]}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-brand-accent hover:underline"
                >
                  View proof of work
                </a>
              )}
            </div>

            {app.status === "pending" && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="primary" disabled={actingId === app.id} onClick={() => handleApprove(app.id)}>
                  {actingId === app.id ? "Working..." : "Approve"}
                </Button>
                <Button variant="secondary" disabled={actingId === app.id} onClick={() => handleReject(app.id)}>
                  Reject
                </Button>
              </div>
            )}
          </div>
        ))}
    </Card>
  );
}
