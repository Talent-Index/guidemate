import { createConfig, http } from "wagmi";
import { avalancheFuji } from "wagmi/chains";
import { injected } from "wagmi/connectors/injected";

const FUJI_RPC_URL = process.env.NEXT_PUBLIC_FUJI_RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc";

/// Injected covers both Core Wallet and MetaMask (any EIP-1193 browser
/// extension) with zero extra signup - no WalletConnect project id needed.
export const wagmiConfig = createConfig({
  chains: [avalancheFuji],
  connectors: [injected()],
  transports: {
    [avalancheFuji.id]: http(FUJI_RPC_URL),
  },
});
