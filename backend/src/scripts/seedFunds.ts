import "dotenv/config";
import { formatUnits, parseUnits } from "ethers";
import { requireChain } from "../chain.js";

/// Run with `npm run seed --workspace backend` any time before/during the demo
/// to top up the backend signer's MockUSDC balance and re-confirm the escrow
/// approval, so bookings never fail on stage from insufficient funds/allowance.
async function main() {
  const { signer, escrow, usdc } = requireChain();
  const address = await signer.getAddress();
  const decimals = await usdc.decimals();

  const topUp = parseUnits("100000", decimals);
  console.log(`Minting ${formatUnits(topUp, decimals)} mUSDC to backend signer ${address}...`);
  const mintTx = await usdc.mint(address, topUp);
  await mintTx.wait();

  console.log("Re-approving escrow contract for max allowance...");
  const approveTx = await usdc.approve(await escrow.getAddress(), (2n ** 256n - 1n));
  await approveTx.wait();

  const balance = await usdc.balanceOf(address);
  console.log(`Backend signer balance: ${formatUnits(balance, decimals)} mUSDC`);
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
