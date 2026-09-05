import { Contract, JsonRpcProvider, Wallet, id as keccakId } from "ethers";
import escrowAbi from "./abi/GuidemateEscrow.json" with { type: "json" };
import mockUsdcAbi from "./abi/MockUSDC.json" with { type: "json" };

const {
  FUJI_RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc",
  BACKEND_PRIVATE_KEY,
  ESCROW_ADDRESS,
  MOCK_USDC_ADDRESS,
} = process.env;

if (!BACKEND_PRIVATE_KEY || !ESCROW_ADDRESS || !MOCK_USDC_ADDRESS) {
  console.warn(
    "[chain] Missing BACKEND_PRIVATE_KEY / ESCROW_ADDRESS / MOCK_USDC_ADDRESS in backend/.env - " +
      "on-chain calls will fail until contracts are deployed (see contracts/README or run the Phase 2 deploy script)."
  );
}

// cacheTimeout: -1 disables ethers' internal ~250ms read-call cache. Without this,
// two nonce lookups (e.g. mint then createBooking) issued back-to-back in the same
// request can return the same stale "pending" nonce and cause NONCE_EXPIRED errors.
export const provider = new JsonRpcProvider(FUJI_RPC_URL, undefined, { cacheTimeout: -1 });

export const signer = BACKEND_PRIVATE_KEY ? new Wallet(BACKEND_PRIVATE_KEY, provider) : undefined;

export const escrow =
  signer && ESCROW_ADDRESS ? new Contract(ESCROW_ADDRESS, escrowAbi, signer) : undefined;

export const usdc =
  signer && MOCK_USDC_ADDRESS ? new Contract(MOCK_USDC_ADDRESS, mockUsdcAbi, signer) : undefined;

export function requireChain() {
  if (!signer || !escrow || !usdc) {
    throw new Error(
      "Chain not configured. Set BACKEND_PRIVATE_KEY, ESCROW_ADDRESS and MOCK_USDC_ADDRESS in backend/.env " +
        "after deploying contracts (see contracts/script/Deploy.s.sol)."
    );
  }
  return { signer, escrow, usdc, provider };
}

/** Use the escrow contract from the booking's lock tx (handles contract redeploys). */
export async function escrowForLockTx(lockTxHash: string | null | undefined) {
  const { signer, escrow, provider } = requireChain();
  if (!lockTxHash) return escrow;

  const receipt = await provider.getTransactionReceipt(lockTxHash);
  if (!receipt?.to) return escrow;

  const lockedOn = receipt.to.toLowerCase();
  const configured = String(escrow.target).toLowerCase();
  if (lockedOn === configured) return escrow;

  return new Contract(receipt.to, escrowAbi, signer);
}

/// Deterministic bytes32 booking id derived from a UUID-ish string, so the
/// frontend can generate a booking id client-side and the chain, DB and QR
/// token all agree on the same identifier.
export function bookingIdToBytes32(bookingId: string): string {
  return keccakId(bookingId);
}
