"use client";

import { Fragment, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { approveApplication, resendGuideLoginEmail } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

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
  national_id_doc_path: string | null;
  good_conduct_doc_path: string | null;
  kra_pin: string | null;
  kra_pin_doc_path: string | null;
  professional_certificate_paths: string[] | null;
  cv_path: string | null;
  proof_of_work_path: string | null;
  referee_name: string | null;
  referee_phone: string | null;
  referee_email: string | null;
  status: ApplicationStatus;
  created_at: string;
}

type DocLinks = {
  nationalId?: string;
  goodConduct?: string;
  kraPinDoc?: string;
  professionalCerts: string[];
  cv?: string;
  proof?: string;
};

export function AdminIntakePanel({ onChanged }: { onChanged?: () => void }) {
  const { session, profile } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<AdminTab>("guides");
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ApplicationStatus | "all">("pending");
  const [actingId, setActingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const [cvUrls, setCvUrls] = useState<Record<string, string>>({});
  const [docLinks, setDocLinks] = useState<Record<string, DocLinks>>({});

  async function loadApplications() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    let query = supabase
      .from("guide_applications")
      .select(
        "id, full_name, email, phone, id_number, location, experience_pitch, portfolio_links, national_id_doc_path, good_conduct_doc_path, kra_pin, kra_pin_doc_path, professional_certificate_paths, cv_path, proof_of_work_path, referee_name, referee_phone, referee_email, status, created_at"
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
    const traDocs: Record<string, DocLinks> = {};

    async function signPath(path: string): Promise<string | undefined> {
      const { data: signed } = await supabase.storage.from("guide-proofs").createSignedUrl(path, 3600);
      return signed?.signedUrl;
    }

    await Promise.all(
      rows.map(async (row) => {
        const links: DocLinks = { professionalCerts: [] };
        if (row.national_id_doc_path) {
          links.nationalId = await signPath(row.national_id_doc_path);
        }
        if (row.good_conduct_doc_path) {
          links.goodConduct = await signPath(row.good_conduct_doc_path);
        }
        if (row.kra_pin_doc_path) {
          links.kraPinDoc = await signPath(row.kra_pin_doc_path);
        }
        for (const path of row.professional_certificate_paths ?? []) {
          const url = await signPath(path);
          if (url) links.professionalCerts.push(url);
        }
        if (row.cv_path) {
          const cvUrl = await signPath(row.cv_path);
          if (cvUrl) cvSigned[row.id] = cvUrl;
        }
        if (row.proof_of_work_path) {
          const proofUrl = await signPath(row.proof_of_work_path);
          if (proofUrl) urls[row.id] = proofUrl;
        }
        traDocs[row.id] = links;
      })
    );
    setProofUrls(urls);
    setCvUrls(cvSigned);
    setDocLinks(traDocs);
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
      const result = await approveApplication(id, session.access_token);
      const emailHint =
        result.emailType === "magiclink"
          ? "They already had an account, a sign-in link was emailed."
          : "Invite email sent to set their password.";
      toast(emailHint, "success");
      await loadApplications();
      onChanged?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActingId(null);
    }
  }

  async function handleResendLogin(id: string) {
    if (!session) return;
    setActingId(id);
    setError(null);
    try {
      await resendGuideLoginEmail(id, session.access_token);
      toast("Sign-in email sent again.", "success");
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

  const statusBadge = (status: ApplicationStatus) => (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
        status === "approved"
          ? "bg-brand-successBg text-brand-success"
          : status === "rejected"
            ? "bg-red-50 text-red-600"
            : "bg-brand-amber/20 text-brand-blueDark"
      }`}
    >
      {status}
    </span>
  );

  const docChips = (app: ApplicationRow) => {
    const links = docLinks[app.id];
    const chips: { label: string; href?: string }[] = [
      { label: "National ID", href: links?.nationalId },
      { label: "Good conduct", href: links?.goodConduct },
      { label: "KRA cert", href: links?.kraPinDoc },
      ...(links?.professionalCerts ?? []).map((href, i) => ({ label: `Cert ${i + 1}`, href })),
      { label: "CV", href: cvUrls[app.id] },
      { label: "Proof", href: proofUrls[app.id] },
    ];
    const present = chips.filter((c) => c.href);
    if (present.length === 0) return <span className="text-xs text-brand-muted">-</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {present.map((c) => (
          <a
            key={c.label}
            href={c.href}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="rounded-md border border-brand-accent/40 bg-brand-accent/5 px-1.5 py-0.5 text-[11px] font-semibold text-brand-accent hover:bg-brand-accent/10"
          >
            {c.label}
          </a>
        ))}
      </div>
    );
  };

  return (
    <Card id="intake" className="scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-brand-blueDark">Guide intake</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Review guide applications and waitlist signups in one place. Click a row to see the pitch, portfolio and referee.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("guides")}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold uppercase tracking-wide ${
              tab === "guides" ? "bg-brand-blue text-white" : "border border-brand-border text-brand-muted"
            }`}
          >
            Guide applicants
          </button>
          <button
            type="button"
            onClick={() => setTab("waitlist")}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold uppercase tracking-wide ${
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

      {!loading && tab === "waitlist" && waitlist.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-brand-border">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-brand-bg/60 text-[11px] uppercase tracking-wide text-brand-muted">
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Email</th>
                <th className="px-3 py-2 font-semibold">Interest</th>
                <th className="px-3 py-2 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {waitlist.map((row, i) => (
                <tr key={row.id} className={i % 2 ? "bg-white" : "bg-brand-bg/20"}>
                  <td className="border-t border-brand-border/60 px-3 py-2 font-medium text-brand-blueDark">{row.full_name}</td>
                  <td className="border-t border-brand-border/60 px-3 py-2 text-brand-muted">{row.email}</td>
                  <td className="border-t border-brand-border/60 px-3 py-2 text-brand-blueDark">{row.interest ?? "-"}</td>
                  <td className="border-t border-brand-border/60 px-3 py-2 text-brand-muted">{new Date(row.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === "guides" && applications.length === 0 && (
        <p className="mt-4 text-sm text-brand-muted">No applications in this view.</p>
      )}

      {!loading && tab === "guides" && applications.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-brand-border">
          <table className="w-full min-w-[1024px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-brand-bg/60 text-[11px] uppercase tracking-wide text-brand-muted">
                <th className="px-3 py-2 font-semibold">Applicant</th>
                <th className="px-3 py-2 font-semibold">Phone</th>
                <th className="px-3 py-2 font-semibold">Location</th>
                <th className="px-3 py-2 font-semibold">ID / KRA</th>
                <th className="px-3 py-2 font-semibold">Referee</th>
                <th className="px-3 py-2 font-semibold">Documents</th>
                <th className="px-3 py-2 font-semibold">Submitted</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app, i) => (
                <Fragment key={app.id}>
                  <tr
                    onClick={() => setExpandedId((prev) => (prev === app.id ? null : app.id))}
                    className={`cursor-pointer align-top ${i % 2 ? "bg-white" : "bg-brand-bg/20"} hover:bg-brand-accent/5`}
                  >
                    <td className="border-t border-brand-border/60 px-3 py-2">
                      <div className="font-semibold text-brand-blueDark">{app.full_name}</div>
                      <div className="text-xs text-brand-muted">{app.email}</div>
                    </td>
                    <td className="border-t border-brand-border/60 px-3 py-2 whitespace-nowrap text-brand-blueDark">{app.phone}</td>
                    <td className="border-t border-brand-border/60 px-3 py-2 text-brand-blueDark">{app.location}</td>
                    <td className="border-t border-brand-border/60 px-3 py-2 text-xs text-brand-muted">
                      {app.id_number && <div>ID: {app.id_number}</div>}
                      {app.kra_pin && <div>KRA: {app.kra_pin}</div>}
                      {!app.id_number && !app.kra_pin && "-"}
                    </td>
                    <td className="border-t border-brand-border/60 px-3 py-2 text-xs text-brand-muted">
                      {app.referee_name ? (
                        <>
                          <div className="font-medium text-brand-blueDark">{app.referee_name}</div>
                          {app.referee_phone && <div>{app.referee_phone}</div>}
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="border-t border-brand-border/60 px-3 py-2">{docChips(app)}</td>
                    <td className="border-t border-brand-border/60 px-3 py-2 whitespace-nowrap text-xs text-brand-muted">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="border-t border-brand-border/60 px-3 py-2">{statusBadge(app.status)}</td>
                    <td className="border-t border-brand-border/60 px-3 py-2">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {app.status === "pending" && (
                          <>
                            <Button variant="primary" disabled={actingId === app.id} onClick={() => handleApprove(app.id)}>
                              {actingId === app.id ? "…" : "Approve"}
                            </Button>
                            <Button variant="secondary" disabled={actingId === app.id} onClick={() => handleReject(app.id)}>
                              Reject
                            </Button>
                          </>
                        )}
                        {app.status === "approved" && (
                          <Button variant="secondary" disabled={actingId === app.id} onClick={() => handleResendLogin(app.id)}>
                            {actingId === app.id ? "Sending…" : "Resend sign-in"}
                          </Button>
                        )}
                        {app.status === "rejected" && <span className="text-xs text-brand-muted">-</span>}
                      </div>
                    </td>
                  </tr>
                  {expandedId === app.id && (
                    <tr className="bg-brand-accent/5">
                      <td colSpan={9} className="border-t border-brand-border/60 px-4 py-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Experience pitch</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-brand-blueDark">{app.experience_pitch}</p>
                          </div>
                          <div className="flex flex-col gap-3">
                            {app.portfolio_links.length > 0 && (
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Portfolio</p>
                                <div className="mt-1 flex flex-col gap-1">
                                  {app.portfolio_links.map((link) => (
                                    <a key={link} href={link} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-accent hover:underline">
                                      {link}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                            {app.referee_name && (
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Referee</p>
                                <p className="mt-1 text-sm text-brand-blueDark">
                                  {app.referee_name}
                                  {app.referee_phone ? ` · ${app.referee_phone}` : ""}
                                  {app.referee_email ? ` · ${app.referee_email}` : ""}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
