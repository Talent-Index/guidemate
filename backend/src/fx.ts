const CACHE_MS = 15 * 60 * 1000;
const FALLBACK_KES = Number(process.env.USDC_TO_KES_RATE ?? 145);

export interface FxSnapshot {
  base: "USDC";
  rates: Record<string, number>;
  asOf: string;
  source: string;
}

let cache: { snapshot: FxSnapshot; expiresAt: number } | null = null;

function fallbackSnapshot(): FxSnapshot {
  return {
    base: "USDC",
    rates: { USDC: 1, USD: 1, KES: FALLBACK_KES },
    asOf: new Date().toISOString(),
    source: "fallback",
  };
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`FX request failed: ${res.status}`);
  return res.json();
}

async function fetchUsdcPerUsd(): Promise<number> {
  try {
    const data = (await fetchJson(
      "https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd",
      5000
    )) as { "usd-coin"?: { usd?: number } };
    const price = data["usd-coin"]?.usd;
    if (typeof price === "number" && price > 0) return price;
  } catch {
    // USDC is treated as 1 USD if the spot price is unavailable.
  }
  return 1;
}

async function fetchUsdRates(): Promise<{ rates: Record<string, number>; asOf: string }> {
  const data = (await fetchJson("https://open.er-api.com/v6/latest/USD", 8000)) as {
    result?: string;
    rates?: Record<string, number>;
    time_last_update_utc?: string;
  };
  if (data.result !== "success" || !data.rates) {
    throw new Error("FX provider returned no rates");
  }
  return {
    rates: data.rates,
    asOf: data.time_last_update_utc ?? new Date().toISOString(),
  };
}

export async function getFxRates(): Promise<FxSnapshot> {
  if (cache && cache.expiresAt > Date.now()) return cache.snapshot;

  try {
    const [usdcUsd, usd] = await Promise.all([fetchUsdcPerUsd(), fetchUsdRates()]);
    const rates: Record<string, number> = { USDC: 1 };
    for (const [code, usdRate] of Object.entries(usd.rates)) {
      if (typeof usdRate === "number" && usdRate > 0) {
        rates[code.toUpperCase()] = usdRate * usdcUsd;
      }
    }
    const snapshot: FxSnapshot = {
      base: "USDC",
      rates,
      asOf: usd.asOf,
      source: "open.er-api.com+coingecko",
    };
    cache = { snapshot, expiresAt: Date.now() + CACHE_MS };
    return snapshot;
  } catch (err) {
    console.warn("[fx] live rates unavailable, using fallback", err);
    if (cache) return cache.snapshot;
    const snapshot = fallbackSnapshot();
    cache = { snapshot, expiresAt: Date.now() + 60_000 };
    return snapshot;
  }
}

export async function usdcToKes(amountUsdc: number): Promise<number> {
  const { rates } = await getFxRates();
  const rate = rates.KES ?? FALLBACK_KES;
  return Math.round(amountUsdc * rate * 100) / 100;
}
