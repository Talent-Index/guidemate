import { formatUnits } from "ethers";
import { escrowForLockTx, requireChain } from "./chain.js";
import { supabaseAdmin } from "./supabase.js";

export type EscrowAlertLevel = "info" | "warn" | "critical";

export interface EscrowAlert {
  level: EscrowAlertLevel;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

const LARGE_RELEASE_USDC = Number(process.env.ESCROW_LARGE_RELEASE_USDC ?? "500");

export function logEscrowAlert(alert: EscrowAlert): void {
  const payload = { scope: "escrow_monitor", ...alert, at: new Date().toISOString() };
  if (alert.level === "critical") console.error(JSON.stringify(payload));
  else if (alert.level === "warn") console.warn(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));
}

export async function alertOnBookingReleased(opts: {
  bookingId: string;
  guideAmountUsdc: number;
  protocolAmountUsdc: number;
  releaseTxHash: string;
}): Promise<void> {
  const total = opts.guideAmountUsdc + opts.protocolAmountUsdc;
  if (total >= LARGE_RELEASE_USDC) {
    logEscrowAlert({
      level: "warn",
      code: "LARGE_RELEASE",
      message: `Escrow release ≥ ${LARGE_RELEASE_USDC} USDC`,
      details: opts,
    });
  }
}

export async function alertOnPayoutFailure(bookingId: string, err: unknown): Promise<void> {
  logEscrowAlert({
    level: "critical",
    code: "PAYOUT_FAILED",
    message: "Auto M-Pesa payout failed after escrow release",
    details: { bookingId, error: err instanceof Error ? err.message : String(err) },
  });
}

export async function getEscrowHealthSnapshot(): Promise<{
  alerts: EscrowAlert[];
  configuredEscrow: string;
  mockUsdc: string;
  onChainEscrowBalanceUsdc: number;
  lockedBookingsCount: number;
  lockedBookingsTotalUsdc: number;
  balanceDriftUsdc: number;
  protocolTreasury: string | null;
}> {
  const alerts: EscrowAlert[] = [];
  const { escrow, usdc } = requireChain();
  const escrowAddress = await escrow.getAddress();
  const usdcAddress = await usdc.getAddress();
  const decimals = await usdc.decimals();

  const onChainRaw = await usdc.balanceOf(escrowAddress);
  const onChainEscrowBalanceUsdc = Number(formatUnits(onChainRaw, decimals));

  const { data: lockedRows, error } = await supabaseAdmin
    .from("bookings")
    .select("amount_usdc")
    .eq("status", "locked");
  if (error) throw new Error(error.message);

  const lockedBookingsCount = lockedRows?.length ?? 0;
  const lockedBookingsTotalUsdc = (lockedRows ?? []).reduce((s, r) => s + Number(r.amount_usdc ?? 0), 0);
  const balanceDriftUsdc = onChainEscrowBalanceUsdc - lockedBookingsTotalUsdc;

  if (Math.abs(balanceDriftUsdc) > 0.05) {
    alerts.push({
      level: "warn",
      code: "BALANCE_DRIFT",
      message: "On-chain escrow USDC balance does not match sum of locked bookings in DB",
      details: { onChainEscrowBalanceUsdc, lockedBookingsTotalUsdc, balanceDriftUsdc },
    });
  }

  let protocolTreasury: string | null = null;
  try {
    protocolTreasury = await escrow.protocolTreasury();
  } catch {
    // legacy ABI may still expose protocolTreasury
  }

  const expectedTreasury = process.env.PROTOCOL_TREASURY_ADDRESS?.toLowerCase();
  if (expectedTreasury && protocolTreasury && protocolTreasury.toLowerCase() !== expectedTreasury) {
    alerts.push({
      level: "critical",
      code: "TREASURY_MISMATCH",
      message: "Escrow protocolTreasury differs from PROTOCOL_TREASURY_ADDRESS env",
      details: { onChain: protocolTreasury, expected: expectedTreasury },
    });
  }

  return {
    alerts,
    configuredEscrow: escrowAddress,
    mockUsdc: usdcAddress,
    onChainEscrowBalanceUsdc,
    lockedBookingsCount,
    lockedBookingsTotalUsdc,
    balanceDriftUsdc,
    protocolTreasury,
  };
}

/** Compare lock tx target to current config (post-redeploy). */
export async function alertIfLegacyEscrowLock(lockTxHash: string, bookingId: string): Promise<void> {
  const { escrow, provider } = requireChain();
  const receipt = await provider.getTransactionReceipt(lockTxHash);
  if (!receipt?.to) return;
  const lockedOn = receipt.to.toLowerCase();
  const current = String(escrow.target).toLowerCase();
  if (lockedOn !== current) {
    logEscrowAlert({
      level: "info",
      code: "LEGACY_ESCROW_BOOKING",
      message: "Booking locked on a previous escrow deployment",
      details: { bookingId, lockTxHash, escrowAddress: lockedOn },
    });
  }
}
