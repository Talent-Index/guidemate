import { recordWalletTransaction } from "./ledger.js";

/** Same split as experience bookings: guide 85%, Guidemate 15%. */
export const GUIDE_STREAM_SHARE = 0.85;
export const PLATFORM_STREAM_SHARE = 0.15;

export function splitStreamRevenue(grossUsdc: number): {
  grossUsdc: number;
  guideAmount: number;
  platformAmount: number;
} {
  const guideAmount = Math.round(grossUsdc * GUIDE_STREAM_SHARE * 100) / 100;
  const platformAmount = Math.round((grossUsdc - guideAmount) * 100) / 100;
  return { grossUsdc, guideAmount, platformAmount };
}

export function isPlatformTicketTip(txHash: string): boolean {
  return txHash.startsWith("mpesa-") || txHash.startsWith("checkout-");
}

export function guideShareFromStreamTip(amountUsdc: number, txHash: string): number {
  if (isPlatformTicketTip(txHash)) {
    return splitStreamRevenue(amountUsdc).guideAmount;
  }
  return splitStreamRevenue(amountUsdc).guideAmount;
}

async function creditPlatformShare(opts: {
  platformAmount: number;
  streamId: string;
  type: "stream_ppv" | "stream_tip";
  mpesaRef?: string;
  txHash?: string;
  metadata: Record<string, unknown>;
}) {
  const platformProfileId = process.env.PLATFORM_PROFILE_ID?.trim();
  if (!platformProfileId || opts.platformAmount <= 0) return;
  await recordWalletTransaction({
    profileId: platformProfileId,
    type: opts.type,
    amountUsdc: opts.platformAmount,
    referenceType: "stream",
    referenceId: opts.streamId,
    mpesaRef: opts.mpesaRef,
    txHash: opts.txHash,
    metadata: { role: "platform", ...opts.metadata },
  });
}

export async function recordStreamTipSettlement(input: {
  guideId: string;
  streamId: string;
  grossUsdc: number;
  txHash: string;
}): Promise<void> {
  const { grossUsdc, guideAmount, platformAmount } = splitStreamRevenue(input.grossUsdc);
  await recordWalletTransaction({
    profileId: input.guideId,
    type: "stream_tip",
    amountUsdc: guideAmount,
    referenceType: "stream",
    referenceId: input.streamId,
    txHash: input.txHash,
    metadata: { grossUsdc, guideAmount, platformAmount, platformShare: PLATFORM_STREAM_SHARE },
  });
  await creditPlatformShare({
    platformAmount,
    streamId: input.streamId,
    type: "stream_tip",
    txHash: input.txHash,
    metadata: { grossUsdc, guideAmount, platformAmount, platformShare: PLATFORM_STREAM_SHARE },
  });
}

export async function recordStreamPpvSettlement(input: {
  guideId: string;
  streamId: string;
  grossUsdc: number;
  mpesaRef?: string;
  txHash?: string;
}): Promise<void> {
  const { grossUsdc, guideAmount, platformAmount } = splitStreamRevenue(input.grossUsdc);

  await recordWalletTransaction({
    profileId: input.guideId,
    type: "stream_ppv",
    amountUsdc: guideAmount,
    referenceType: "stream",
    referenceId: input.streamId,
    mpesaRef: input.mpesaRef,
    txHash: input.txHash,
    metadata: {
      grossUsdc,
      guideAmount,
      platformAmount,
      platformShare: PLATFORM_STREAM_SHARE,
    },
  });

  await creditPlatformShare({
    platformAmount,
    streamId: input.streamId,
    type: "stream_ppv",
    mpesaRef: input.mpesaRef,
    txHash: input.txHash,
    metadata: { grossUsdc, guideAmount, platformAmount, platformShare: PLATFORM_STREAM_SHARE },
  });
}
