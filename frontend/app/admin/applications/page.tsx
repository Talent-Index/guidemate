"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  location: string;
  experience_pitch: string;
  portfolio_links: string[];
  proof_of_work_path: string | null;
  status: ApplicationStatus;
  created_at: string;
}

export default function AdminApplicationsPage() {
  const { loading: authLoading, session, profile } = useAuth();
  const [tab, setTab] = useState<AdminTab>("guides");
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ApplicationStatus | "all">("pending");
  const [actingId, setActingId] = useState<string | null>(null);
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});

  async function loadApplications() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    let query = supabase
      .from("guide_applications")
      .select(
        "id, full_name, email, phone, location, experience_pitch, portfolio_links, proof_of_work_path, status, created_at"
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
    await Promise.all(
      rows
        .filter((row) => row.proof_of_work_path)
        .map(async (row) => {
          const { data: signed } = await supabase.storage
            .from("guide-proofs")
            .createSignedUrl(row.proof_of_work_path!, 3600);
          if (signed?.signedUrl) urls[row.id] = signed.signedUrl;
        })
    );
    setProofUrls(urls);
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
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActingId(null);
    }
  }

  if (authLoading) return null;

  if (!session || profile?.role !== "admin") {
    return (
      <div className="mx-auto max-w-md text-center">
        <Card>
          <h1 className="text-xl font-bold text-brand-blueDark">Admin sign-in required</h1>
          <p className="mt-2 text-sm text-brand-muted">
            Sign in with the same email/password you used at sign-up. That account must have{" "}
            <span className="font-semibold text-brand-blueDark">profiles.role = admin</span> — there is no
            separate admin password, and nobody is an admin until you promote an account in Supabase.
          </p>
          <Link href="/auth/sign-in">
            <Button variant="primary" className="mt-4">
              Sign in
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-brand-blueDark">Applications</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Guide applications from /apply, and people who joined the waitlist.
        </p>
        <Link href="/admin" className="mt-2 inline-block text-sm font-semibold text-brand-accent hover:underline">
          ← Back to dashboard
        </Link>
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
          Waitlist
        </button>
      </div>

      {tab === "guides" && (
      <div className="flex flex-wrap gap-2">
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

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <ListRowSkeleton count={3} />}

      {tab === "waitlist" && !loading && waitlist.length === 0 && (
        <p className="text-sm text-brand-muted">No one has joined the waitlist yet.</p>
      )}
      {tab === "waitlist" &&
        waitlist.map((row) => (
          <Card key={row.id}>
            <h2 className="font-semibold text-brand-blueDark">{row.full_name}</h2>
            <p className="text-sm text-brand-muted">{row.email}</p>
            {row.interest && <p className="mt-2 text-sm text-brand-blueDark">{row.interest}</p>}
            <p className="mt-1 text-xs text-brand-muted">{new Date(row.created_at).toLocaleString()}</p>
          </Card>
        ))}

      {tab === "guides" && !loading && applications.length === 0 && (
        <p className="text-sm text-brand-muted">No applications in this view.</p>
      )}

      {tab === "guides" && applications.map((app) => (
        <Card key={app.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-brand-blueDark">{app.full_name}</h2>
              <p className="text-sm text-brand-muted">
                {app.email} · {app.phone} · {app.location}
              </p>
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

          {proofUrls[app.id] && (
            <a
              href={proofUrls[app.id]}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-semibold text-brand-accent hover:underline"
            >
              View proof of work
            </a>
          )}

          {app.status === "pending" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="primary"
                disabled={actingId === app.id}
                onClick={() => handleApprove(app.id)}
              >
                {actingId === app.id ? "Working..." : "Approve"}
              </Button>
              <Button variant="secondary" disabled={actingId === app.id} onClick={() => handleReject(app.id)}>
                Reject
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
