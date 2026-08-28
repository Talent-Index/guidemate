"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect, useReadContract, useWriteContract } from "wagmi";
import { avalancheFuji } from "wagmi/chains";
import { Button } from "@/components/ui/Button";
import mockUsdcAbi from "@/lib/abi/MockUSDC.json";

const MOCK_USDC_ADDRESS = process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS as `0x${string}` | undefined;
const FAUCET_AMOUNT = BigInt(1_000) * BigInt(10) ** BigInt(6); // 1,000 mUSDC (6 decimals)

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: connecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();

  const { data: avaxBalance } = useBalance({
    address,
    chainId: avalancheFuji.id,
    query: { enabled: Boolean(address) },
  });

  const {
    data: usdcBalance,
    refetch: refetchUsdc,
  } = useReadContract({
    address: MOCK_USDC_ADDRESS,
    abi: mockUsdcAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && MOCK_USDC_ADDRESS) },
  });

  const { writeContractAsync, isPending: faucetPending } = useWriteContract();
  const [faucetError, setFaucetError] = useState<string | null>(null);

  async function handleFaucet() {
    if (!MOCK_USDC_ADDRESS) return;
    setFaucetError(null);
    try {
      await writeContractAsync({
        address: MOCK_USDC_ADDRESS,
        abi: mockUsdcAbi,
        functionName: "faucet",
        args: [FAUCET_AMOUNT],
      });
      setTimeout(() => refetchUsdc(), 2000);
    } catch (err) {
      setFaucetError((err as Error).message);
    }
  }

  if (!isConnected) {
    const connector = connectors[0];
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          variant="secondary"
          disabled={connecting || !connector}
          onClick={() => connector && connect({ connector })}
        >
          {connecting ? "Connecting..." : "Connect Wallet"}
        </Button>
        {connectError && <p className="max-w-[200px] text-right text-xs text-red-600">{connectError.message}</p>}
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
      {MOCK_USDC_ADDRESS && (
        <button
          type="button"
          onClick={handleFaucet}
          disabled={faucetPending}
          className="text-xs font-semibold text-brand-accent hover:underline disabled:opacity-50"
        >
          {faucetPending ? "Requesting..." : "Get test mUSDC"}
        </button>
      )}
      {faucetError && <p className="max-w-[200px] text-right text-xs text-red-600">{faucetError}</p>}
    </div>
  );
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
