"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getFxRates, type FxSnapshot } from "@/lib/api";

const STORAGE_KEY = "guidemate-display-currency";

export const FEATURED_CURRENCIES = [
  "KES",
  "USD",
  "EUR",
  "GBP",
  "UGX",
  "TZS",
  "NGN",
  "ZAR",
  "AED",
  "INR",
  "JPY",
  "CAD",
  "AUD",
] as const;

interface CurrencyContextValue {
  currency: string;
  setCurrency: (code: string) => void;
  rates: Record<string, number>;
  asOf: string | null;
  convert: (amountUsdc: number, code?: string) => number | null;
  formatFiat: (amountUsdc: number, code?: string) => string | null;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function guessCurrency(): string {
  const locale = typeof navigator !== "undefined" ? navigator.language : "en-KE";
  const region = locale.split("-")[1]?.toUpperCase();
  const byRegion: Record<string, string> = {
    KE: "KES",
    UG: "UGX",
    TZ: "TZS",
    NG: "NGN",
    ZA: "ZAR",
    GB: "GBP",
    US: "USD",
    AE: "AED",
    IN: "INR",
    JP: "JPY",
    CA: "CAD",
    AU: "AUD",
  };
  if (region && byRegion[region]) return byRegion[region];
  if (region && region.length === 2) {
    const euro = ["DE", "FR", "IT", "ES", "NL", "IE", "PT", "AT", "BE", "FI", "GR"];
    if (euro.includes(region)) return "EUR";
  }
  return "KES";
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(amount);
  } catch {
    return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState("KES");
  const [snapshot, setSnapshot] = useState<FxSnapshot | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setCurrencyState(stored && stored.length === 3 ? stored.toUpperCase() : guessCurrency());
  }, []);

  useEffect(() => {
    let cancelled = false;
    getFxRates()
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch(() => {
        if (!cancelled) {
          setSnapshot({
            base: "USDC",
            rates: { USDC: 1, USD: 1 },
            asOf: new Date().toISOString(),
            source: "unavailable",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setCurrency(code: string) {
    const next = code.toUpperCase();
    setCurrencyState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  const value = useMemo<CurrencyContextValue>(() => {
    const rates = snapshot?.rates ?? { USDC: 1 };
    const convert = (amountUsdc: number, code = currency) => {
      if (code === "USDC") return amountUsdc;
      const rate = rates[code];
      if (!rate) return null;
      return amountUsdc * rate;
    };
    return {
      currency,
      setCurrency,
      rates,
      asOf: snapshot?.asOf ?? null,
      convert,
      formatFiat: (amountUsdc, code = currency) => {
        if (code === "USDC") return `${amountUsdc} USDC`;
        const converted = convert(amountUsdc, code);
        if (converted == null) return null;
        return formatMoney(converted, code);
      },
    };
  }, [currency, snapshot]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

export function Price({
  amountUsdc,
  className = "",
  size = "md",
  align = "end",
}: {
  amountUsdc: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  align?: "start" | "end";
}) {
  const { currency, formatFiat } = useCurrency();
  const fiat = currency === "USDC" ? null : formatFiat(amountUsdc);
  const usdcClass =
    size === "lg"
      ? "text-xl font-bold text-brand-blueDark"
      : size === "sm"
        ? "text-sm font-semibold text-brand-blueDark"
        : "text-lg font-bold text-brand-blueDark";

  return (
    <span className={`inline-flex flex-col ${align === "end" ? "items-end" : "items-start"} ${className}`}>
      <span className={`whitespace-nowrap ${usdcClass}`}>{amountUsdc} USDC</span>
      {fiat && <span className="whitespace-nowrap text-xs text-brand-muted">≈ {fiat}</span>}
    </span>
  );
}

export function CurrencySelect({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const { currency, setCurrency, rates } = useCurrency();
  const featured = FEATURED_CURRENCIES.filter((code) => rates[code] != null || code === "USD");
  const rest = Object.keys(rates)
    .filter((code) => code !== "USDC" && !featured.includes(code as (typeof FEATURED_CURRENCIES)[number]))
    .sort();

  const className =
    variant === "dark"
      ? "border border-white/20 bg-black/25 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white"
      : "border border-brand-border bg-white px-2 py-1.5 text-xs font-semibold text-brand-blueDark";

  return (
    <label className="inline-flex items-center gap-2">
      <span className={variant === "dark" ? "sr-only" : "text-xs text-brand-muted"}>Currency</span>
      <select
        aria-label="Display currency"
        className={className}
        value={rates[currency] != null || currency === "USDC" ? currency : "USD"}
        onChange={(e) => setCurrency(e.target.value)}
      >
        <option value="USDC">USDC</option>
        <optgroup label="Common">
          {featured.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </optgroup>
        {rest.length > 0 && (
          <optgroup label="All">
            {rest.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </label>
  );
}
