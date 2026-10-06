import type { Contract } from "ethers";
import { isSimulatedRamp } from "./ramp/index.js";
import { requireChain } from "./chain.js";

/** Demo bookings on Fuji may mint MockUSDC. Paid paths must use funded platform USDC (no mint). */
export function shouldMintMockUsdcForBooking(paymentMethod: string): boolean {
  if (paymentMethod !== "demo") return false;
  if (process.env.ALLOW_MOCK_MINT === "true") return true;
  if (process.env.NODE_ENV === "production") return false;
  return true;
}

export async function ensureSignerCanLockEscrow(
  amountUnits: bigint,
  escrow: Contract
): Promise<void> {
  const { signer, usdc } = requireChain();
  const owner = await signer.getAddress();
  const escrowAddress = await escrow.getAddress();

  const balance = await usdc.balanceOf(owner);
  if (balance < amountUnits) {
    const msg = isSimulatedRamp()
      ? "Escrow funding wallet is low on test USDC. Mint is disabled for this payment method — fund the backend signer or use demo booking."
      : "Escrow funding is temporarily unavailable. Tourist payment was recorded; platform USDC on Fuji is being topped up. Try again shortly or contact support.";
    throw new Error(msg);
  }

  const allowance = await usdc.allowance(owner, escrowAddress);
  if (allowance < amountUnits) {
    const approveTx = await usdc.approve(escrowAddress, amountUnits);
    await approveTx.wait();
  }
}

export async function fundEscrowLock(
  paymentMethod: string,
  amountUnits: bigint,
  escrow: Contract
): Promise<void> {
  const { signer, usdc } = requireChain();
  if (shouldMintMockUsdcForBooking(paymentMethod)) {
    const mintTx = await usdc.mint(await signer.getAddress(), amountUnits);
    await mintTx.wait();
    return;
  }
  await ensureSignerCanLockEscrow(amountUnits, escrow);
}
