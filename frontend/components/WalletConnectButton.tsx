"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect, useReadContract, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/Button";
import mockUsdcAbi from "@/lib/abi/MockUSDC.json";
import { avalancheFuji } from "@/lib/wagmi";
import { ensureFujiNetwork, friendlyWalletError } from "@/lib/fujiNetwork";

const MOCK_USDC_ADDRESS = process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS as `0x${string}` | undefined;
const FAUCET_AMOUNT = BigInt(1_000) * BigInt(10) ** BigInt(6); // 1,000 mUSDC (6 decimals)

export function WalletConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: connecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const onFuji = chainId === avalancheFuji.id;

  const { data: avaxBalance } = useBalance({
    address,
    chainId: avalancheFuji.id,
    query: { enabled: Boolean(address) },
  });

  const { data: usdcBalance, refetch: refetchUsdc } = useReadContract({
    address: MOCK_USDC_ADDRESS,
    abi: mockUsdcAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: avalancheFuji.id,
    query: { enabled: Boolean(address && MOCK_USDC_ADDRESS) },
  });

  const { writeContractAsync, isPending: faucetPending } = useWriteContract();
  const [faucetError, setFaucetError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  async function handleConnect() {
    const connector = connectors[0];
    if (!connector) return;
    await connect({ connector, chainId: avalancheFuji.id });
    try {
      await ensureFujiNetwork();
    } catch (err) {
      setFaucetError(friendlyWalletError(err));
    }
  }

  async function handleSwitchToFuji() {
    setFaucetError(null);
    setSwitching(true);
    try {
      await ensureFujiNetwork();
    } catch (err) {
      setFaucetError(friendlyWalletError(err));
    } finally {
      setSwitching(false);
    }
  }

  async function handleFaucet() {
    if (!MOCK_USDC_ADDRESS) return;
    setFaucetError(null);
    try {
      await ensureFujiNetwork();
      await writeContractAsync({
        address: MOCK_USDC_ADDRESS,
        abi: mockUsdcAbi,
        functionName: "faucet",
        args: [FAUCET_AMOUNT],
        chainId: avalancheFuji.id,
      });
      setTimeout(() => refetchUsdc(), 2000);
    } catch (err) {
      setFaucetError(friendlyWalletError(err));
    }
  }

  if (!isConnected) {
    const connector = connectors[0];
    return (
      <div className="flex flex-col items-end gap-1">
        <Button variant="secondary" disabled={connecting || !connector} onClick={() => void handleConnect()}>
          {connecting ? "Connecting..." : "Connect Wallet"}
        </Button>
        {connectError && (
          <p className="max-w-[240px] text-right text-xs text-red-600">{friendlyWalletError(connectError)}</p>
        )}
        {faucetError && <p className="max-w-[240px] text-right text-xs text-red-600">{faucetError}</p>}
      </div>
    );
  }

  const usdcFormatted = usdcBalance ? (Number(usdcBalance as bigint) / 1e6).toFixed(2) : "0.00";

  return (
    <div className="flex flex-col items-end gap-1 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-brand-muted">{shorten(address!)}</span>
        <button type="button" onClick={() => disconnect()} className="text-xs text-brand-accent underline">
          Disconnect
        </button>
      </div>
      <div className="flex gap-3 text-xs text-brand-muted">
        <span>
          {avaxBalance ? Number(formatUnits(avaxBalance.value, avaxBalance.decimals)).toFixed(3) : "0"} AVAX
        </span>
        <span>{usdcFormatted} mUSDC</span>
      </div>
      {!onFuji && (
        <button
          type="button"
          onClick={() => void handleSwitchToFuji()}
          disabled={switching}
          className="text-xs font-semibold text-brand-accent hover:underline disabled:opacity-50"
        >
          {switching ? "Switching..." : "Switch Core to Fuji testnet"}
        </button>
      )}
      {MOCK_USDC_ADDRESS && onFuji && (
        <button
          type="button"
          onClick={() => void handleFaucet()}
          disabled={faucetPending}
          className="text-xs font-semibold text-brand-accent hover:underline disabled:opacity-50"
        >
          {faucetPending ? "Requesting..." : "Get test mUSDC"}
        </button>
      )}
      {faucetError && <p className="max-w-[240px] text-right text-xs text-red-600">{faucetError}</p>}
    </div>
  );
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
