/** Guide 85% / Guidemate 15% — matches backend streamRevenue.ts */
export const GUIDE_STREAM_SHARE = 0.85;

export function splitStreamRevenue(grossUsdc: number) {
  const guideAmount = Math.round(grossUsdc * GUIDE_STREAM_SHARE * 100) / 100;
  const platformAmount = Math.round((grossUsdc - guideAmount) * 100) / 100;
  return { grossUsdc, guideAmount, platformAmount };
}

/** Official USDC on Base mainnet */
export const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

export const BASE_EXPLORER_TX = "https://basescan.org/tx";
