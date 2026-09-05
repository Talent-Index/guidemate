import { Router } from "express";
import { formatUnits } from "ethers";
import { getBooking, listBookings, updateBooking, type RefundInfo } from "../bookings.js";
import { completionPin, signBookingToken } from "../qr.js";
import { getUserIdFromAuthHeader } from "../supabase.js";
import { bookingIdToBytes32, escrowForLockTx, requireChain } from "../chain.js";

export const bookingsRouter = Router();

// Trust-based grace period before a guide can call a booking a no-show - gives
// a late tourist some slack, and avoids a guide reflexively refunding someone
// who is simply a few minutes behind. There's no tourist counter-dispute in
// this pass; that's a known limitation of this trust-based flow.
const NO_SHOW_GRACE_PERIOD_MS = 30 * 60 * 1000;

/// Returns bookings for the authenticated user, whether they're the tourist
/// or the guide on the booking (a demo account could plausibly be both).
/// No token = no bookings, since there's no account to scope the list to.
bookingsRouter.get("/", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) {
    return res.json({ bookings: [] });
  }

  const [asTourist, asGuide] = await Promise.all([
    listBookings({ touristId: userId }),
    listBookings({ guideId: userId }),
  ]);
  const merged = new Map(asTourist.concat(asGuide).map((b) => [b.bookingId, b]));
  res.json({ bookings: Array.from(merged.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
});

bookingsRouter.get("/:id", async (req, res) => {
  const booking = await getBooking(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: "booking not found" });
  }
  res.json({ booking });
});

/// End-trip codes live only on the tourist side (QR + 6-digit PIN). The guide
/// never receives them here - they type the PIN the tourist reads out.
bookingsRouter.get("/:id/completion-code", async (req, res) => {
  const booking = await getBooking(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: "booking not found" });
  }

  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  const isTourist = Boolean(userId && booking.touristId === userId);
  const isConciergeBooking = booking.touristId == null;
  if (!isTourist && !isConciergeBooking) {
    return res.status(403).json({ error: "end-trip codes are only shown to the tourist" });
  }

  res.json({
    qrToken: signBookingToken(booking.bookingId),
    pin: completionPin(booking.bookingId),
  });
});

/// Kept so older clients still resolve a QR token. Prefer /completion-code.
bookingsRouter.get("/:id/qr-token", async (req, res) => {
  const booking = await getBooking(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: "booking not found" });
  }
  res.json({ qrToken: signBookingToken(booking.bookingId) });
});

/// Guide-only: settles a booking as a tourist no-show instead of a completed
/// tour. Refunds 80% back through escrow (minus a 20% inconvenience fee kept
/// by Guidemate) rather than paying out the guide.
bookingsRouter.post("/:id/no-show", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: "sign in required" });
  }

  const booking = await getBooking(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: "booking not found" });
  }
  if (booking.guideId !== userId) {
    return res.status(403).json({ error: "only the assigned guide can report a no-show" });
  }
  if (booking.status !== "locked") {
    return res.status(409).json({ error: `booking already ${booking.status}`, booking });
  }

  const elapsedMs = Date.now() - new Date(booking.createdAt).getTime();
  if (elapsedMs < NO_SHOW_GRACE_PERIOD_MS) {
    const minutesLeft = Math.ceil((NO_SHOW_GRACE_PERIOD_MS - elapsedMs) / 60_000);
    return res.status(409).json({
      error: `too early to report a no-show - wait ${minutesLeft} more minute(s) after the booking's start`,
    });
  }

  try {
    const { usdc } = requireChain();
    const escrow = await escrowForLockTx(booking.lockTxHash);
    const bytes32Id = bookingIdToBytes32(booking.bookingId);
    const decimals = await usdc.decimals();

    const tx = await escrow.refundNoShow(bytes32Id);
    const receipt = await tx.wait();

    let refund: RefundInfo = { feeAmount: 0, refundAmount: 0 };
    for (const log of receipt?.logs ?? []) {
      try {
        const parsedLog = escrow.interface.parseLog(log);
        if (parsedLog?.name === "BookingRefunded") {
          refund = {
            feeAmount: Number(formatUnits(parsedLog.args.feeAmount, decimals)),
            refundAmount: Number(formatUnits(parsedLog.args.refundAmount, decimals)),
          };
        }
      } catch {
        // not our event, ignore
      }
    }

    const updated = await updateBooking(booking.bookingId, {
      status: "refunded",
      refundTxHash: receipt?.hash ?? tx.hash,
      refund,
    });

    res.json({ booking: updated });
  } catch (err) {
    console.error("[bookings] no-show refund failed", err);
    res.status(500).json({ error: (err as Error).message ?? "no-show refund failed" });
  }
});
