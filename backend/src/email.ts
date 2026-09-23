export function frontendBaseUrl(): string {
  return (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function resendFrom(kind: "notifications" | "guide"): string {
  if (kind === "guide") {
    const guideFrom = process.env.RESEND_GUIDE_FROM?.trim();
    if (guideFrom) return guideFrom;
  }
  return process.env.RESEND_FROM?.trim() ?? "Guidemate <onboarding@resend.dev>";
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Wraps content in a colorful, email-client-safe Guidemate template.
 * Uses inline styles + table layout so Gmail, Outlook and Apple Mail render it.
 */
export function emailLayout(opts: {
  heading: string;
  intro?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}): string {
  const base = frontendBaseUrl();
  const button =
    opts.ctaLabel && opts.ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
           <tr><td style="border-radius:10px;background:#0071C2;">
             <a href="${opts.ctaUrl}" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(opts.ctaLabel)}</a>
           </td></tr>
         </table>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,59,149,0.10);">
        <tr>
          <td style="background:linear-gradient(135deg,#003B95 0%,#0071C2 100%);padding:28px 32px;">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:0.5px;">guide<span style="color:#FFB700;">mate</span></span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#1c2b3a;">
            <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#003B95;">${escapeHtml(opts.heading)}</h1>
            ${opts.intro ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#5B6B82;">${escapeHtml(opts.intro)}</p>` : ""}
            <div style="font-size:15px;line-height:1.6;color:#1c2b3a;">${opts.bodyHtml}</div>
            ${button}
            ${opts.footerNote ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#8894a6;">${escapeHtml(opts.footerNote)}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="background:#f4f6f9;padding:20px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8894a6;">
            <p style="margin:0 0 6px;">Guidemate · Live travel, real guides.</p>
            <p style="margin:0;">Questions? <a href="mailto:support@yourguidemate.top" style="color:#0071C2;text-decoration:none;">support@yourguidemate.top</a> · <a href="${base}" style="color:#0071C2;text-decoration:none;">yourguidemate.top</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendTransactionalEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: "notifications" | "guide";
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  const from = resendFrom(opts.from ?? "notifications");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });
  if (!res.ok) {
    console.warn("[email] Resend failed for", opts.to, await res.text());
    return false;
  }
  return true;
}

export async function sendTransactionalEmailBatch(opts: {
  to: string[];
  subject: string;
  html: string;
  text: string;
  from?: "notifications" | "guide";
}): Promise<number> {
  let sent = 0;
  for (const to of opts.to) {
    const ok = await sendTransactionalEmail({ ...opts, to });
    if (ok) sent += 1;
  }
  return sent;
}

/** Branded approval notice from support@ (Supabase still sends the sign-in link). */
export async function sendGuideApplicationApprovedEmail(
  email: string,
  fullName: string,
  existingAccount: boolean
): Promise<boolean> {
  const base = frontendBaseUrl();
  const signInHint = existingAccount
    ? "We sent a magic link to this address. Open it to sign in."
    : "We sent an invite to set your password. Open it to activate your guide account.";
  const subject = "You're approved to guide on Guidemate";
  const firstName = fullName.split(" ")[0] || fullName;

  const text = [
    `Hi ${firstName},`,
    "",
    "Great news: your Guidemate guide application was approved.",
    "",
    signInHint,
    "If you don't see it within a few minutes, check spam or ask an admin to resend your login email.",
    "",
    `After signing in, finish your profile and go live: ${base}/dashboard`,
    "",
    "Questions? Email support@yourguidemate.top.",
    "",
    "The Guidemate team",
  ].join("\n");

  const html = emailLayout({
    heading: `You're approved, ${escapeHtml(firstName)}!`,
    intro: "Your Guidemate guide application was approved.",
    bodyHtml: `
      <p style="margin:0 0 12px;">${escapeHtml(signInHint)}</p>
      <p style="margin:0;">If you don't see it within a few minutes, check spam or ask an admin to resend your login email.</p>`,
    ctaLabel: "Open your guide dashboard",
    ctaUrl: `${base}/dashboard`,
    footerNote: "You received this because your guide application was approved.",
  });

  return sendTransactionalEmail({ to: email.trim(), subject, html, text, from: "guide" });
}

/** Friendly welcome email sent once, the first time an account signs in. */
export async function sendWelcomeEmail(
  email: string,
  fullName: string | null,
  role: "guide" | "tourist" | string
): Promise<boolean> {
  const base = frontendBaseUrl();
  const firstName = (fullName ?? "").split(" ")[0] || "there";
  const isGuide = role === "guide";
  const subject = "Welcome to Guidemate";

  const bulletsHtml = isGuide
    ? `<ul style="margin:0 0 8px;padding-left:20px;color:#1c2b3a;">
         <li style="margin-bottom:6px;">Go live from your phone and earn tips and ticket sales.</li>
         <li style="margin-bottom:6px;">List experiences with instant M-Pesa payouts.</li>
         <li style="margin-bottom:6px;">Grow followers who get alerts when you go live.</li>
       </ul>`
    : `<ul style="margin:0 0 8px;padding-left:20px;color:#1c2b3a;">
         <li style="margin-bottom:6px;">Watch guides go live from real destinations.</li>
         <li style="margin-bottom:6px;">Book vetted local guides with secure escrow.</li>
         <li style="margin-bottom:6px;">Follow guides and get notified when they stream.</li>
       </ul>`;

  const ctaUrl = isGuide ? `${base}/dashboard` : `${base}/live`;
  const ctaLabel = isGuide ? "Open your dashboard" : "Watch what's live";

  const text = [
    `Hi ${firstName},`,
    "",
    "Welcome to Guidemate, live travel with real local guides.",
    "",
    isGuide
      ? "Go live from your phone, list experiences, and get paid fast."
      : "Watch guides go live, book vetted locals, and follow your favourites.",
    "",
    `Get started: ${ctaUrl}`,
    "",
    "Questions? Email support@yourguidemate.top.",
    "",
    "The Guidemate team",
  ].join("\n");

  const html = emailLayout({
    heading: `Welcome to Guidemate, ${escapeHtml(firstName)}!`,
    intro: "Live travel, with real local guides.",
    bodyHtml: `
      <p style="margin:0 0 12px;">Here's what you can do next:</p>
      ${bulletsHtml}`,
    ctaLabel,
    ctaUrl,
    footerNote: "You received this because you created a Guidemate account.",
  });

  return sendTransactionalEmail({ to: email.trim(), subject, html, text, from: "notifications" });
}
