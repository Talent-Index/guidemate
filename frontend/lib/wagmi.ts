import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors/injected";
import { defineChain } from "viem";

const FUJI_RPC_URL = process.env.NEXT_PUBLIC_FUJI_RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc";
const BASE_RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://mainnet.base.org";

/// Named the way Core Wallet lists it, so add/switch network is not "unsupported".
export const avalancheFuji = defineChain({
  id: 43_113,
  name: "Avalanche Fuji C-Chain",
  nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
  rpcUrls: {
    default: { http: [FUJI_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "SnowTrace", url: "https://testnet.snowtrace.io" },
  },
  testnet: true,
});

export const base = defineChain({
  id: 8453,
  name: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [BASE_RPC_URL] } },
  blockExplorers: { default: { name: "Basescan", url: "https://basescan.org" } },
});

export const wagmiConfig = createConfig({
  chains: [base, avalancheFuji],
  connectors: [
    injected({
      target() {
        if (typeof window === "undefined") return undefined;
        const w = window as Window & { ethereum?: unknown; avalanche?: unknown };
        return {
          id: "core",
          name: "Core Wallet",
          provider: (w.avalanche ?? w.ethereum) as never,
        };
      },
    }),
  ],
  transports: {
    [base.id]: http(BASE_RPC_URL),
    [avalancheFuji.id]: http(FUJI_RPC_URL),
  },
});
