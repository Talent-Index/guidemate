const FUJI_CHAIN_ID = 43_113;
const FUJI_CHAIN_ID_HEX = "0xa869";
const FUJI_RPC = process.env.NEXT_PUBLIC_FUJI_RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc";

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function walletProvider(): Eip1193 | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as Window & { ethereum?: Eip1193; avalanche?: Eip1193 };
  return w.avalanche ?? w.ethereum;
}

function errorCode(err: unknown): number | undefined {
  if (typeof err === "object" && err && "code" in err) {
    return Number((err as { code: number }).code);
  }
  return undefined;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

export function friendlyWalletError(err: unknown): string {
  const msg = errorMessage(err);
  const code = errorCode(err);
  if (code === 4001 || /rejected|denied|cancelled/i.test(msg)) {
    return "Cancelled in Core. Approve the Fuji network (chain 43113), then the faucet transaction.";
  }
  if (/unsupported network/i.test(msg)) {
    return "Core is not on Avalanche Fuji. In Core, open Networks and switch to Fuji C-Chain (testnet, chain ID 43113), then try again.";
  }
  return msg.split("\n")[0]?.slice(0, 180) || "Wallet request failed.";
}

/// Switch Core/MetaMask onto Fuji, adding the chain if Core has never seen it.
export async function ensureFujiNetwork(): Promise<void> {
  const provider = walletProvider();
  if (!provider) {
    throw new Error("No wallet found. Unlock Core (or MetaMask) and refresh.");
  }

  const current = String(await provider.request({ method: "eth_chainId" })).toLowerCase();
  if (current === FUJI_CHAIN_ID_HEX) return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: FUJI_CHAIN_ID_HEX }],
    });
    return;
  } catch (err) {
    const code = errorCode(err);
    const msg = errorMessage(err);
    if (code === 4001 || /rejected|denied/i.test(msg)) throw err;
    const needsAdd =
      code === 4902 || /unsupported network|unrecognized chain|not added|4902/i.test(msg);
    if (!needsAdd) throw err;
  }

  await provider.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: FUJI_CHAIN_ID_HEX,
        chainName: "Avalanche Fuji C-Chain",
        nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
        rpcUrls: [FUJI_RPC],
        blockExplorerUrls: ["https://testnet.snowtrace.io"],
      },
    ],
  });
}

export { FUJI_CHAIN_ID };
