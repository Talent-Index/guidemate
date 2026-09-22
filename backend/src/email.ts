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
    ? "We sent a magic link to this address — open it to sign in."
    : "We sent an invite to set your password — open it to activate your guide account.";
  const subject = "You're approved to guide on Guidemate";
  const text = [
    `Hi ${fullName},`,
    "",
    "Great news — your Guidemate guide application was approved.",
    "",
    signInHint,
    "If you don't see it within a few minutes, check spam or ask an admin to resend your login email.",
    "",
    `After signing in, finish your profile and go live: ${base}/dashboard`,
    "",
    "Questions? Reply to this thread or email support@yourguidemate.top.",
    "",
    "— The Guidemate team",
  ].join("\n");

  const html = `
<p>Hi ${escapeHtml(fullName)},</p>
<p><strong>Your Guidemate guide application was approved.</strong></p>
<p>${escapeHtml(signInHint)}</p>
<p>If you don't see it within a few minutes, check spam or ask an admin to resend your login email.</p>
<p><a href="${base}/dashboard">Open your guide dashboard</a> after you sign in.</p>
<p>Questions? Contact <a href="mailto:support@yourguidemate.top">support@yourguidemate.top</a>.</p>
<p>— The Guidemate team</p>`;

  return sendTransactionalEmail({
    to: email.trim(),
    subject,
    html,
    text,
    from: "guide",
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
