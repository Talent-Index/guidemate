import { recordWalletTransaction } from "../ledger.js";
import { supabaseAdmin } from "../supabase.js";
import { signUsdcTransfer } from "../wallet.js";
import { extractReferenceId, isKotaniSuccessStatus, verifyKotaniWebhookSignature } from "./kotani.js";

export async function handleKotaniWebhook(
  rawBody: string,
  headerSignature: string | undefined
): Promise<{ handled: boolean }> {
  if (process.env.KOTANI_WEBHOOK_SECRET) {
    const valid = verifyKotaniWebhookSignature(rawBody, headerSignature);
    if (!valid) throw new Error("invalid Kotani webhook signature");
  }

  const body = JSON.parse(rawBody) as Record<string, unknown>;
  const event = typeof body.event === "string" ? body.event : undefined;
  const data = (body.data ?? body) as Record<string, unknown>;

  if (event === "transaction.onramp.status.updated" || (!event && data.referenceId && data.onchainStatus)) {
    return handleOnrampUpdate(data);
  }

  if (event === "transaction.offramp.status.updated") {
    return handleOfframpUpdate(data);
  }

  // Direct callback without event wrapper (deposit/onramp mixed)
  if (!event && extractReferenceId(data)) {
    if (data.onchainStatus !== undefined || data.depositStatus !== undefined) {
      return handleOnrampUpdate(data);
    }
  }

  return { handled: false };
}

async function handleOnrampUpdate(data: Record<string, unknown>): Promise<{ handled: boolean }> {
  const referenceId = extractReferenceId(data);
  if (!referenceId) return { handled: false };

  const status = data.status ?? data.onchainStatus ?? data.depositStatus;
  const { data: intent } = await supabaseAdmin
    .from("payment_intents")
    .select("*")
    .eq("id", referenceId)
    .maybeSingle();

  if (!intent || intent.status === "completed" || intent.status === "failed") {
    return { handled: Boolean(intent) };
  }

  if (isKotaniSuccessStatus(status)) {
    const mpesaRef =
      (typeof data.telco_id === "string" && data.telco_id) ||
      (typeof data.telcoId === "string" && data.telcoId) ||
      referenceId;

    await supabaseAdmin
      .from("payment_intents")
      .update({
        status: "completed",
        mpesa_receipt: mpesaRef,
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
      mpesaRef,
      status: "completed",
    });
    return { handled: true };
  }

  if (typeof status === "string" && ["FAILED", "CANCELLED"].includes(status.toUpperCase())) {
    await supabaseAdmin.from("payment_intents").update({ status: "failed" }).eq("id", referenceId);
    return { handled: true };
  }

  return { handled: true };
}

async function handleOfframpUpdate(data: Record<string, unknown>): Promise<{ handled: boolean }> {
  const referenceId = extractReferenceId(data);
  if (!referenceId) return { handled: false };

  const status = data.status;
  const { data: withdrawal } = await supabaseAdmin
    .from("withdrawal_requests")
    .select("*")
    .eq("id", referenceId)
    .maybeSingle();

  if (!withdrawal || withdrawal.status === "completed" || withdrawal.status === "failed") {
    return { handled: Boolean(withdrawal) };
  }

  if (isKotaniSuccessStatus(status)) {
    await supabaseAdmin
      .from("withdrawal_requests")
      .update({
        status: "completed",
        ramp_ref: referenceId,
        tx_hash: typeof data.transactionHash === "string" ? data.transactionHash : withdrawal.tx_hash,
        completed_at: new Date().toISOString(),
      })
      .eq("id", referenceId);

    await recordWalletTransaction({
      profileId: withdrawal.profile_id,
      type: "mpesa_withdraw",
      amountUsdc: -Number(withdrawal.amount_usdc),
      amountKes: Number(withdrawal.kes_amount),
      referenceType: "withdrawal",
      referenceId: referenceId,
      mpesaRef: referenceId,
      status: "completed",
    });
    return { handled: true };
  }

  if (typeof status === "string" && ["FAILED", "CANCELLED"].includes(status.toUpperCase())) {
    await supabaseAdmin.from("withdrawal_requests").update({ status: "failed" }).eq("id", referenceId);
    return { handled: true };
  }

  return { handled: true };
}

export async function sendOfframpCrypto(withdrawalId: string, profileId: string, escrowAddress: string, amountUsdc: number): Promise<string> {
  const txHash = await signUsdcTransfer(profileId, escrowAddress, amountUsdc);
  await supabaseAdmin.from("withdrawal_requests").update({ tx_hash: txHash }).eq("id", withdrawalId);
  return txHash;
}
