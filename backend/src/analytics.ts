import { supabaseAdmin } from "./supabase.js";
import { listAllTransactions } from "./ledger.js";

export interface AnalyticsOverview {
  guides: number;
  tourists: number;
  admins: number;
  bookingsTotal: number;
  bookingsLocked: number;
  bookingsPaid: number;
  bookingsRefunded: number;
  gmvUsdc: number;
  platformRevenueUsdc: number;
  guideEarningsUsdc: number;
  streamsTotal: number;
  streamsLive: number;
  streamTipsUsdc: number;
  waitlistCount: number;
  pendingApplications: number;
}

export async function getAnalyticsOverview(from?: string, to?: string): Promise<AnalyticsOverview> {
  const [{ count: guides }, { count: tourists }, { count: admins }] = await Promise.all([
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "guide"),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "tourist"),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "admin"),
  ]);

  let bookingsQuery = supabaseAdmin.from("bookings").select("status, amount_usdc, guide_split, protocol_split, hotel_split");
  if (from) bookingsQuery = bookingsQuery.gte("created_at", from);
  if (to) bookingsQuery = bookingsQuery.lte("created_at", to);
  const { data: bookings } = await bookingsQuery;

  const rows = bookings ?? [];
  const paid = rows.filter((b) => b.status === "paid" || b.status === "released");
  const gmvUsdc = paid.reduce((s, b) => s + Number(b.amount_usdc ?? 0), 0);
  const guideEarningsUsdc = paid.reduce((s, b) => s + Number(b.guide_split ?? 0), 0);
  const platformRevenueUsdc = paid.reduce(
    (s, b) => s + Number(b.protocol_split ?? 0) + Number(b.hotel_split ?? 0),
    0
  );

  const [{ count: streamsTotal }, { count: streamsLive }, { count: waitlistCount }, { count: pendingApplications }] =
    await Promise.all([
      supabaseAdmin.from("live_streams").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("live_streams").select("*", { count: "exact", head: true }).eq("status", "live"),
      supabaseAdmin.from("waitlist").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("guide_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    ]);

  const { data: tips } = await supabaseAdmin.from("stream_tips").select("amount_usdc");
  const streamTipsUsdc = (tips ?? []).reduce((s, t) => s + Number(t.amount_usdc ?? 0), 0);

  return {
    guides: guides ?? 0,
    tourists: tourists ?? 0,
    admins: admins ?? 0,
    bookingsTotal: rows.length,
    bookingsLocked: rows.filter((b) => b.status === "locked").length,
    bookingsPaid: rows.filter((b) => b.status === "paid").length,
    bookingsRefunded: rows.filter((b) => b.status === "refunded").length,
    gmvUsdc: Math.round(gmvUsdc * 100) / 100,
    platformRevenueUsdc: Math.round(platformRevenueUsdc * 100) / 100,
    guideEarningsUsdc: Math.round(guideEarningsUsdc * 100) / 100,
    streamsTotal: streamsTotal ?? 0,
    streamsLive: streamsLive ?? 0,
    streamTipsUsdc: Math.round(streamTipsUsdc * 100) / 100,
    waitlistCount: waitlistCount ?? 0,
    pendingApplications: pendingApplications ?? 0,
  };
}

export async function getSignupsTimeseries(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("role, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const byDay: Record<string, { guides: number; tourists: number }> = {};
  for (const row of data ?? []) {
    const day = (row.created_at as string).slice(0, 10);
    if (!byDay[day]) byDay[day] = { guides: 0, tourists: 0 };
    if (row.role === "guide") byDay[day].guides += 1;
    if (row.role === "tourist") byDay[day].tourists += 1;
  }
  return Object.entries(byDay).map(([date, counts]) => ({ date, ...counts }));
}

export async function getAdminTransactions(opts: {
  limit?: number;
  offset?: number;
  type?: string;
  from?: string;
  to?: string;
}) {
  return listAllTransactions(opts);
}

export async function buildReportCsv(from?: string, to?: string): Promise<string> {
  const overview = await getAnalyticsOverview(from, to);
  const transactions = await listAllTransactions({ limit: 5000, from, to });
  const lines: string[] = [
    "Guidemate Analytics Report",
    `Generated,${new Date().toISOString()}`,
    `Period,${from ?? "all"} to ${to ?? "now"}`,
    "",
    "Metric,Value",
    `Guides,${overview.guides}`,
    `Tourists,${overview.tourists}`,
    `Bookings Total,${overview.bookingsTotal}`,
    `Bookings Locked,${overview.bookingsLocked}`,
    `Bookings Paid,${overview.bookingsPaid}`,
    `GMV USDC,${overview.gmvUsdc}`,
    `Platform Revenue USDC,${overview.platformRevenueUsdc}`,
    `Guide Earnings USDC,${overview.guideEarningsUsdc}`,
    `Streams Total,${overview.streamsTotal}`,
    `Stream Tips USDC,${overview.streamTipsUsdc}`,
    "",
    "Transaction ID,Profile ID,Type,Amount USDC,Amount KES,Status,Reference,Tx Hash,Created At",
  ];
  for (const tx of transactions) {
    lines.push(
      [
        tx.id,
        tx.profileId,
        tx.type,
        tx.amountUsdc,
        tx.amountKes ?? "",
        tx.status,
        tx.referenceId ?? "",
        tx.txHash ?? "",
        tx.createdAt,
      ].join(",")
    );
  }
  return lines.join("\n");
}
