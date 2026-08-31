import "dotenv/config";
import { PROTOCOL_TREASURY_ADDRESS } from "../treasury.js";
import { requireChain } from "../chain.js";

async function main() {
  const { escrow } = requireChain();
  const current = await escrow.protocolTreasury();
  console.log("Escrow:           ", await escrow.getAddress());
  console.log("Current treasury: ", current);
  console.log("Target treasury:  ", PROTOCOL_TREASURY_ADDRESS);

  if (current.toLowerCase() === PROTOCOL_TREASURY_ADDRESS.toLowerCase()) {
    console.log("Already set. Nothing to send.");
    return;
  }

  const tx = await escrow.setProtocolTreasury(PROTOCOL_TREASURY_ADDRESS);
  console.log("Tx:", tx.hash);
  await tx.wait();
  console.log("New treasury:     ", await escrow.protocolTreasury());
}

main().catch((err) => {
  console.error("setTreasury failed:", err);
  process.exit(1);
});
