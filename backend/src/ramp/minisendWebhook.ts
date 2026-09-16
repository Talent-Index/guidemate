import { recordWalletTransaction } from "../ledger.js";
import { updateBooking, type PayoutInfo } from "../bookings.js";
import { supabaseAdmin } from "../supabase.js";
import { verifyMinisendWebhookSignature } from "./minisend.js";

export async function handleMinisendWebhook(
  rawBody: string,
  signature: string | undefined
): Promise<{ handled: boolean }> {
  if (!verifyMinisendWebhookSignature(rawBody, signature)) {
    throw new Error("invalid Minisend webhook signature");
  }

  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const event = typeof payload.event === "string" ? payload.event : "";

  if (event === "onramp.completed" || event === "onramp.released") {
    return handleOnrampCompleted(payload);
  }
  if (event === "onramp.failed" || event === "onramp.expired") {
    return handleOnrampFailed(payload);
  }
  if (event === "offramp.completed") {
    return handleOfframpCompleted(payload);
  }
  if (event === "offramp.failed" || event === "offramp.expired") {
    return handleOfframpFailed(payload);
  }

  if (event === "checkout.completed") {
    return handleCheckoutCompleted(payload);
  }
  if (event === "checkout.failed" || event === "checkout.expired") {
    return handleOnrampFailed(payload);
  }

  return { handled: false };
}

async function handleOnrampCompleted(payload: Record<string, unknown>): Promise<{ handled: boolean }> {
  const referenceId =
    (typeof payload.external_id === "string" && payload.external_id) ||
    (typeof payload.external_reference === "string" && payload.external_reference) ||
    (typeof payload.reference === "string" && payload.reference);
  if (!referenceId) return { handled: false };

  const { data: intent } = await supabaseAdmin
    .from("payment_intents")
    .select("*")
    .eq("id", referenceId)
    .maybeSingle();

  if (!intent || intent.status === "completed" || intent.status === "failed") {
    return { handled: Boolean(intent) };
  }

  const mpesaRef =
    (typeof payload.receipt_number === "string" && payload.receipt_number) ||
    (typeof payload.order_id === "string" && payload.order_id) ||
    referenceId;

  const amountLocal =
    typeof payload.amount_local === "number"
      ? payload.amount_local
      : typeof payload.amount_kes === "number"
        ? payload.amount_kes
        : null;

  await supabaseAdmin
    .from("payment_intents")
    .update({
      status: "completed",
      mpesa_receipt: mpesaRef,
      completed_at: new Date().toISOString(),
      ...(amountLocal != null ? { amount_kes: amountLocal } : {}),
    })
    .eq("id", referenceId);

  await recordWalletTransaction({
    profileId: intent.payer_id,
    type: "mpesa_onramp",
    amountUsdc: Number(intent.amount_usdc),
    amountKes: amountLocal ?? Number(intent.amount_kes),
    referenceType: intent.purpose,
    referenceId: intent.reference_id,
    mpesaRef,
    status: "completed",
  });

  return { handled: true };
}

async function handleCheckoutCompleted(payload: Record<string, unknown>): Promise<{ handled: boolean }> {
  const referenceId =
    (typeof payload.external_id === "string" && payload.external_id) ||
    (typeof payload.external_reference === "string" && payload.external_reference) ||
    (typeof payload.reference === "string" && payload.reference);
  if (!referenceId) return { handled: false };

  const { data: intent } = await supabaseAdmin
    .from("payment_intents")
    .select("*")
    .eq("id", referenceId)
    .maybeSingle();

  if (!intent || intent.status === "completed" || intent.status === "failed") {
    return { handled: Boolean(intent) };
  }

  const receipt =
    (typeof payload.settlement_receipt === "string" && payload.settlement_receipt) ||
    (typeof payload.session_id === "string" && payload.session_id) ||
    (typeof payload.order_id === "string" && payload.order_id) ||
    referenceId;

  await supabaseAdmin
    .from("payment_intents")
    .update({
      status: "completed",
      mpesa_receipt: receipt,
      completed_at: new Date().toISOString(),
    })
    .eq("id", referenceId);

  await recordWalletTransaction({
    profileId: intent.payer_id,
    type: "mpesa_onramp",
    amountUsdc: Number(intent.amount_usdc),
    amountKes: Number(intent.amount_kes),
    referenceType: intent.purpose,
    referenceId: intent.reference_id,
    mpesaRef: receipt,
    status: "completed",
  });

  return { handled: true };
}

async function handleOnrampFailed(payload: Record<string, unknown>): Promise<{ handled: boolean }> {
  const referenceId =
    (typeof payload.external_id === "string" && payload.external_id) ||
    (typeof payload.external_reference === "string" && payload.external_reference) ||
    (typeof payload.reference === "string" && payload.reference);
  if (!referenceId) return { handled: false };

  await supabaseAdmin.from("payment_intents").update({ status: "failed" }).eq("id", referenceId);
  return { handled: true };
}

async function handleOfframpCompleted(payload: Record<string, unknown>): Promise<{ handled: boolean }> {
  const externalRef =
    (typeof payload.external_reference === "string" && payload.external_reference) ||
    (typeof payload.reference === "string" && payload.reference);
  if (!externalRef) return { handled: false };

  const mpesaRef =
    (typeof payload.settlement_receipt === "string" && payload.settlement_receipt) ||
    (typeof payload.order_id === "string" && payload.order_id) ||
    externalRef;

  if (externalRef.startsWith("booking-")) {
    const bookingId = externalRef.slice("booking-".length);
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, guide_id, guide_split, payout")
      .eq("id", bookingId)
      .maybeSingle();

    if (booking && !booking.payout) {
      const { data: guide } = await supabaseAdmin
        .from("profiles")
        .select("phone")
        .eq("id", booking.guide_id)
        .maybeSingle();

      const payout: PayoutInfo = {
        reference: mpesaRef,
        phone: (guide?.phone as string) ?? "",
        kesAmount: Number(payload.recipient_amount ?? payload.amount_local ?? 0),
        usdcAmount: Number(booking.guide_split ?? payload.amount_usdc ?? 0),
        completedAt: new Date().toISOString(),
      };
      await updateBooking(bookingId, { payout });

      await recordWalletTransaction({
        profileId: booking.guide_id as string,
        type: "mpesa_withdraw",
        amountUsdc: -payout.usdcAmount,
        amountKes: payout.kesAmount,
        referenceType: "booking",
        referenceId: bookingId,
        mpesaRef,
        status: "completed",
      });
    }
    return { handled: true };
  }

  const { data: withdrawal } = await supabaseAdmin
    .from("withdrawal_requests")
    .select("*")
    .eq("id", externalRef)
    .maybeSingle();

  if (!withdrawal || withdrawal.status === "completed" || withdrawal.status === "failed") {
    return { handled: Boolean(withdrawal) };
  }

  await supabaseAdmin
    .from("withdrawal_requests")
    .update({
      status: "completed",
      ramp_ref: typeof payload.order_id === "string" ? payload.order_id : externalRef,
      completed_at: new Date().toISOString(),
    })
    .eq("id", externalRef);

  await recordWalletTransaction({
    profileId: withdrawal.profile_id,
    type: "mpesa_withdraw",
    amountUsdc: -Number(withdrawal.amount_usdc),
    amountKes: Number(withdrawal.kes_amount),
    referenceType: "withdrawal",
    referenceId: externalRef,
    mpesaRef,
    status: "completed",
  });

  return { handled: true };
}

async function handleOfframpFailed(payload: Record<string, unknown>): Promise<{ handled: boolean }> {
  const externalRef =
    (typeof payload.external_reference === "string" && payload.external_reference) ||
    (typeof payload.reference === "string" && payload.reference);
  if (!externalRef || externalRef.startsWith("booking-")) {
    return { handled: Boolean(externalRef) };
  }

  await supabaseAdmin.from("withdrawal_requests").update({ status: "failed" }).eq("id", externalRef);
  return { handled: true };
}
