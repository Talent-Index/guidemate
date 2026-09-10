import { createHmac, timingSafeEqual } from "node:crypto";
import { getTreasuryAddress } from "../treasuryBase.js";
import { usdcToKes } from "../fx.js";
import type { OffRampRequest, OnRampRequest, RampProvider, RampQuote, RampQuoteOptions } from "./types.js";
import { toLocalKenyaPhone } from "./phone.js";

const DEFAULT_API_BASE = "https://merchant.minisend.xyz";

interface MinisendOnrampQuote {
  amount_kes: number;
  fee_kes: number;
  amount_usdc: number;
  rate: number;
}

interface MinisendOfframpQuote {
  amount_usdc: number;
  amount_local: number;
  fee: number;
  recipient_amount: number;
  rate: number;
}

interface MinisendOnrampOrder {
  order_id: string;
  status: string;
  amount_usdc: number;
  amount_local: number;
}

interface MinisendOfframpOrder {
  order_id: string;
  status: string;
  amount_usdc: number;
  total_deposit_usdc: number;
  deposit_address: string;
  recipient_amount: number;
}

function apiBase(): string {
  return (process.env.MINISEND_API_BASE ?? DEFAULT_API_BASE).replace(/\/$/, "");
}

function apiKey(): string {
  const key = process.env.MINISEND_API_KEY;
  if (!key) throw new Error("MINISEND_API_KEY is not set in backend/.env");
  return key;
}

function onrampReceiveAddress(): string {
  const fromEnv = process.env.MINISEND_ONRAMP_RECEIVE_ADDRESS;
  if (!fromEnv) {
    throw new Error("MINISEND_ONRAMP_RECEIVE_ADDRESS is not set in backend/.env");
  }
  return fromEnv;
}

async function minisendRequest<T>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey()}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json().catch(() => ({}))) as T & { message?: string; error?: string };
  if (!res.ok) {
    const msg = json.message ?? json.error ?? `Minisend API error ${res.status} on ${path}`;
    throw new Error(msg);
  }
  return json;
}

function kesRecipient(phone: string, accountName?: string) {
  return {
    method: "MOBILE",
    account_name: accountName ?? "Guide",
    phone: toLocalKenyaPhone(phone),
    mobile_network: "Safaricom",
  };
}

export class MinisendRampProvider implements RampProvider {
  readonly name = "minisend";

  async getQuote(usdc: number, direction: "on" | "off", opts?: RampQuoteOptions): Promise<RampQuote> {
    try {
      if (direction === "on") {
        const data = await minisendRequest<MinisendOnrampQuote>("POST", "/api/onramp/quote", {
          currency: "KES",
          amount_usdc: usdc,
        });
        return {
          kes: data.amount_kes,
          fee: data.fee_kes,
          rate: data.rate,
        };
      }

      if (!opts?.phone) {
        const kes = await usdcToKes(usdc);
        const fee = Math.round(kes * 0.01 * 100) / 100;
        return { kes: kes - fee, fee, rate: kes / usdc };
      }

      const data = await minisendRequest<MinisendOfframpQuote>("POST", "/api/offramp/quote", {
        amount: usdc,
        currency: "KES",
        recipient: kesRecipient(opts.phone, opts.accountName),
      });
      return {
        kes: data.recipient_amount,
        fee: data.fee,
        rate: data.rate,
      };
    } catch (err) {
      console.warn("[minisend] quote API failed, using FX fallback", err);
      const kes = await usdcToKes(usdc);
      const fee = Math.round(kes * 0.01 * 100) / 100;
      return { kes: kes - fee, fee, rate: kes / usdc };
    }
  }

  async createOnRamp(req: OnRampRequest): Promise<{ checkoutRequestId: string; referenceId: string; async: boolean }> {
    const data = await minisendRequest<MinisendOnrampOrder>(
      "POST",
      "/api/onramp/orders",
      {
        currency: "KES",
        amount_usdc: req.amountUsdc,
        phone: toLocalKenyaPhone(req.phone),
        address: onrampReceiveAddress(),
        reference: req.intentId,
      },
      `onramp-${req.intentId}`
    );

    return {
      checkoutRequestId: data.order_id,
      referenceId: req.intentId,
      async: true,
    };
  }

  async createOffRamp(req: OffRampRequest): Promise<{
    reference: string;
    escrowAddress?: string;
    async: boolean;
    orderId?: string;
    depositAmountUsdc?: number;
  }> {
    const externalRef = req.bookingId ? `booking-${req.bookingId}` : req.withdrawalId;

    const data = await minisendRequest<MinisendOfframpOrder>(
      "POST",
      "/api/offramp/orders",
      {
        amount: req.amountUsdc,
        currency: "KES",
        refund_address: getTreasuryAddress(),
        reference: externalRef,
        recipient: kesRecipient(req.phone, req.accountName),
      },
      `offramp-${externalRef}`
    );

    return {
      reference: data.order_id,
      escrowAddress: data.deposit_address,
      async: true,
      orderId: data.order_id,
      depositAmountUsdc: data.total_deposit_usdc ?? data.amount_usdc,
    };
  }

  async submitOfframpDeposit(orderId: string, transactionHash: string): Promise<void> {
    await minisendRequest("POST", `/api/offramp/orders/${orderId}/deposit`, {
      transaction_hash: transactionHash,
    });
  }

  async getOnrampOrder(orderId: string): Promise<{ status: string; receipt_number?: string }> {
    return minisendRequest("GET", `/api/onramp/orders/${orderId}`);
  }

  async getOfframpOrder(orderId: string): Promise<{ status: string; settlement_receipt?: string }> {
    return minisendRequest("GET", `/api/offramp/orders/${orderId}`);
  }
}

export function verifyMinisendWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  const secret = process.env.MINISEND_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  try {
    const a = Buffer.from(signature.trim(), "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
