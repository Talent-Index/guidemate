import Link from "next/link";

export default function GuideTermsPage() {
  return (
    <article className="mx-auto max-w-2xl py-6 text-[var(--gm-ink)]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-accent">Guides</p>
      <h1 className="mt-2 text-2xl font-bold">Guide terms and conditions</h1>
      <p className="mt-3 text-sm leading-relaxed text-brand-muted">
        These terms apply when you list or host experiences on Guidemate. By applying or signing up
        as a guide, you agree to them.
      </p>

      <h2 className="mt-10 text-lg font-bold">Platform fee</h2>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">
        Guidemate takes <span className="font-semibold text-[var(--gm-ink)]">15%</span> of the rate
        you list. You receive <span className="font-semibold text-[var(--gm-ink)]">85%</span> when
        the tourist completes the trip (End trip PIN or QR). The listed price is what the tourist
        pays — they do not see this split.
      </p>

      <h2 className="mt-8 text-lg font-bold">Cancellations and time</h2>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">
        If a tourist cancels after paying, Guidemate charges an inconvenience fee of{" "}
        <span className="font-semibold text-[var(--gm-ink)]">50%</span> of the booking. That fee
        exists so your time is respected: half the value stays with the platform (and can be used
        to compensate a guide who held the slot), and half may be returned to the tourist.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">
        If you mark a tourist as a no-show after the grace period, the same principle applies:
        cancelling or not showing up is not free.
      </p>

      <h2 className="mt-8 text-lg font-bold">Completed trips</h2>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">
        Payment stays in escrow until the tourist ends the trip and you enter their PIN or scan
        their QR. After that, your 85% is released to your payout wallet.
      </p>

      <p className="mt-10 text-sm text-brand-muted">
        <Link href="/guide/dashboard" className="font-semibold text-brand-accent">
          Back to dashboard
        </Link>
      </p>
    </article>
  );
}
