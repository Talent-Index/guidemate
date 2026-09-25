import { emailLayout, escapeHtml, frontendBaseUrl, sendTransactionalEmailBatch } from "./email.js";
import { supabaseAdmin } from "./supabase.js";
import type { LiveStreamRecord } from "./streams.js";
import { listFollowerEmails } from "./guideFollows.js";

function streamPublicPath(stream: LiveStreamRecord): string {
  return stream.slug ? `/live/${encodeURIComponent(stream.slug)}` : `/live/${stream.id}`;
}

async function collectRecipientEmails(guideId: string): Promise<string[]> {
  const emails = new Set<string>();

  const { data: waitlist } = await supabaseAdmin.from("waitlist").select("email").limit(500);
  for (const row of waitlist ?? []) {
    const email = (row.email as string | undefined)?.trim().toLowerCase();
    if (email) emails.add(email);
  }

  const followerEmails = await listFollowerEmails(guideId);
  for (const email of followerEmails) emails.add(email);

  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select("tourist_id")
    .eq("guide_id", guideId)
    .in("status", ["locked", "paid"]);

  const touristIds = [...new Set((bookings ?? []).map((b) => b.tourist_id as string).filter(Boolean))];
  if (touristIds.length > 0) {
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id").in("id", touristIds);
    const ids = (profiles ?? []).map((p) => p.id as string);
    if (ids.length > 0) {
      for (const id of ids) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id);
        const email = authUser.user?.email?.trim().toLowerCase();
        if (email) emails.add(email);
      }
    }
  }

  return [...emails];
}

async function collectRecipientPhones(guideId: string): Promise<string[]> {
  const phones = new Set<string>();
  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select("tourist_id")
    .eq("guide_id", guideId)
    .in("status", ["locked", "paid"])
    .limit(200);

  const touristIds = [...new Set((bookings ?? []).map((b) => b.tourist_id as string).filter(Boolean))];
  if (touristIds.length === 0) return [];

  const { data: profiles } = await supabaseAdmin.from("profiles").select("phone").in("id", touristIds);
  for (const row of profiles ?? []) {
    const phone = (row.phone as string | undefined)?.trim();
    if (phone && phone.length >= 9) phones.add(phone);
  }
  return [...phones];
}

async function sendSmsBatch(phones: string[], message: string): Promise<number> {
  const apiKey = process.env.AFRICAS_TALKING_API_KEY?.trim();
  const username = process.env.AFRICAS_TALKING_USERNAME?.trim();
  if (!apiKey || !username || phones.length === 0) return 0;

  const res = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      apiKey,
    },
    body: new URLSearchParams({
      username,
      to: phones.join(","),
      message,
    }),
  });
  if (!res.ok) {
    console.warn("[streams] Africa's Talking SMS failed", await res.text());
    return 0;
  }
  return phones.length;
}

export async function announceStreamToCommunity(stream: LiveStreamRecord): Promise<{
  emailsTargeted: number;
  emailsSent: number;
  smsTargeted: number;
  smsSent: number;
}> {
  const link = `${frontendBaseUrl()}${streamPublicPath(stream)}`;
  const when = stream.scheduledAt
    ? new Date(stream.scheduledAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" })
    : "soon";

  const subject = `${stream.guideName} is going live: ${stream.title}`;
  const text = `${stream.guideName} invited you to a Guidemate live stream.\n\n${stream.title}\nWhen: ${when}\nWatch: ${link}`;
  const html = emailLayout({
    heading: `${escapeHtml(stream.guideName)} is going live`,
    intro: escapeHtml(stream.title),
    bodyHtml: `<p style="margin:0;">When: <strong>${escapeHtml(when)}</strong></p>`,
    ctaLabel: "Watch the stream",
    ctaUrl: link,
    footerNote: "You received this because you joined Guidemate or booked with this guide.",
  });

  const emails = await collectRecipientEmails(stream.guideId);
  const phones = await collectRecipientPhones(stream.guideId);

  const emailsSent = await sendTransactionalEmailBatch({ to: emails, subject, html, text, from: "notifications" });
  const smsMessage = `${stream.guideName} live: ${stream.title}. ${when}. ${link}`;
  const smsSent = await sendSmsBatch(phones, smsMessage.slice(0, 480));

  console.info(
    `[streams] announced ${stream.id}: emails ${emailsSent}/${emails.length}, sms ${smsSent}/${phones.length}`
  );

  return {
    emailsTargeted: emails.length,
    emailsSent,
    smsTargeted: phones.length,
    smsSent,
  };
}

/** Email followers when a stream goes live (instant go-live). */
export async function notifyFollowersStreamIsLive(stream: LiveStreamRecord): Promise<number> {
  const emails = await listFollowerEmails(stream.guideId);
  if (emails.length === 0) return 0;

  const link = `${frontendBaseUrl()}${streamPublicPath(stream)}`;
  const subject = `${stream.guideName} is live now · ${stream.title}`;
  const text = `${stream.guideName} just went live on Guidemate.\n\n${stream.title}\nWatch: ${link}`;
  const html = emailLayout({
    heading: `${escapeHtml(stream.guideName)} is live now`,
    intro: escapeHtml(stream.title),
    bodyHtml: `<p style="margin:0;">The stream just started. Jump in before you miss it.</p>`,
    ctaLabel: "Join the stream",
    ctaUrl: link,
    footerNote: "You received this because you follow this guide on Guidemate.",
  });

  const sent = await sendTransactionalEmailBatch({ to: emails, subject, html, text, from: "notifications" });
  console.info(`[streams] live alert ${stream.id}: emails ${sent}/${emails.length}`);
  return sent;
}
