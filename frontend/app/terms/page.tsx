import Link from "next/link";

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl py-6 text-[var(--gm-ink)]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-accent">Legal</p>
      <h1 className="mt-2 text-2xl font-bold">Terms and conditions</h1>
      <p className="mt-3 text-sm leading-relaxed text-brand-muted">
        These terms apply when you use Guidemate — browsing experiences, creating an account, booking
        a tour, going live, or applying as a guide. Using the product means you agree to them.
      </p>

      <h2 className="mt-10 text-lg font-bold">The platform</h2>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">
        Guidemate connects travelers with independent local guides. We list experiences, hold payment
        in on-chain escrow until a trip is confirmed complete, and pay the guide after the tourist
        ends the trip with a PIN or QR. Guides on Guidemate are not employees of Guidemate.
      </p>

      <h2 className="mt-8 text-lg font-bold">Accounts</h2>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">
        You must give accurate details (name, email, and phone where asked). One account, one role —
        tourist or guide. You are responsible for activity on your account. We may suspend an account
        that is used to defraud another user or to bypass escrow completion.
      </p>

      <h2 className="mt-8 text-lg font-bold">Booking and payment</h2>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">
        The price you see on a listing is the amount you pay. Funds lock in GuidemateEscrow on
        Avalanche when you book. They stay there until you tap End trip and the guide enters your PIN
        or scans your QR. Guidemate does not release payment without that confirmation.
      </p>

      <h2 className="mt-8 text-lg font-bold">Cancellations</h2>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">
        If you cancel after paying, Guidemate charges an inconvenience fee of{" "}
        <span className="font-semibold text-[var(--gm-ink)]">20%</span> of the booking. 80% may be
        returned to you. Not showing up after the grace period is treated the same way.
      </p>

      <h2 className="mt-8 text-lg font-bold">Guides</h2>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">
        If you host experiences, the{" "}
        <Link href="/guide/terms" className="font-semibold text-brand-accent underline">
          guide terms
        </Link>{" "}
        also apply: Guidemate takes 15% of your listed rate, you keep 85% on a completed trip, and
        tourist cancellations carry the 20% inconvenience fee above.
      </p>

      <h2 className="mt-8 text-lg font-bold">Live streams</h2>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">
        Live sessions may be free or pay-per-view. Recordings can remain on Guidemate after the
        stream ends. Do not stream content you do not have the right to share.
      </p>

      <h2 className="mt-8 text-lg font-bold">Liability</h2>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">
        Experiences happen in the real world with independent guides. Guidemate is the booking and
        settlement layer. We do not insure tours, and we are not liable for injury, loss, or
        dissatisfaction arising from a guide&apos;s conduct or from travel itself, except where the
        law says otherwise.
      </p>

      <p className="mt-10 text-sm text-brand-muted">
        How we handle personal data is in the{" "}
        <Link href="/privacy" className="font-semibold text-brand-accent underline">
          Privacy Policy
        </Link>
        .
      </p>
    </article>
  );
}
