import { Contract, JsonRpcProvider, Wallet, parseUnits } from "ethers";

const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

let baseProvider: JsonRpcProvider | null = null;
let treasuryWallet: Wallet | null = null;

function baseRpcUrl(): string {
  return process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
}

export function getTreasuryAddress(): string {
  const fromEnv = process.env.MINISEND_ONRAMP_RECEIVE_ADDRESS;
  if (fromEnv) return fromEnv;
  return requireTreasuryWallet().address;
}

export function requireTreasuryWallet(): Wallet {
  if (!treasuryWallet) {
    const key = process.env.MINISEND_TREASURY_PRIVATE_KEY;
    if (!key) {
      throw new Error("MINISEND_TREASURY_PRIVATE_KEY is not set in backend/.env");
    }
    if (!baseProvider) {
      baseProvider = new JsonRpcProvider(baseRpcUrl(), undefined, { cacheTimeout: -1 });
    }
    treasuryWallet = new Wallet(key, baseProvider);
  }
  return treasuryWallet;
}

export async function getTreasuryUsdcBalance(): Promise<number> {
  const wallet = requireTreasuryWallet();
  const token = new Contract(BASE_USDC_ADDRESS, ERC20_ABI, wallet);
  const decimals = await token.decimals();
  const balance = await token.balanceOf(wallet.address);
  return Number(balance) / 10 ** Number(decimals);
}

/** Send USDC on Base mainnet from the Guidemate treasury wallet. */
export async function sendUsdcOnBase(to: string, amountUsdc: number): Promise<string> {
  const wallet = requireTreasuryWallet();
  const token = new Contract(BASE_USDC_ADDRESS, ERC20_ABI, wallet);
  const decimals = await token.decimals();
  const amountUnits = parseUnits(amountUsdc.toString(), decimals);
  const tx = await token.transfer(to, amountUnits);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}
