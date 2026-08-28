import type { PayoutInfo } from "./bookings.js";

const RATE = Number(process.env.USDC_TO_KES_RATE ?? 145);

function randomRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `MPESA-${out}`;
}

/// Simulates converting the guide's on-chain USDC share into a KES M-Pesa
/// payout. No real Daraja/HoneyCoin call is made for the hackathon demo -
/// this models the same interface a real integration would expose so it can
/// be swapped in later without touching the rest of the flow.
export async function simulateMpesaPayout(guideUsdcAmount: number, guidePhone: string): Promise<PayoutInfo> {
  // Simulate network latency of a real offramp call.
  await new Promise((resolve) => setTimeout(resolve, 800));

  const kesAmount = Math.round(guideUsdcAmount * RATE * 100) / 100;

  return {
    reference: randomRef(),
    phone: guidePhone,
    kesAmount,
    usdcAmount: guideUsdcAmount,
    completedAt: new Date().toISOString(),
  };
}
