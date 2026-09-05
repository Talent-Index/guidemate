import { createHmac, timingSafeEqual } from "node:crypto";
import { requireChain } from "../chain.js";
import type { OffRampRequest, OnRampRequest, RampProvider, RampQuote } from "./types.js";
import { usdcToKes } from "../fx.js";

interface KotaniEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface RateData {
  id: string;
  fiatAmount: number;
  cryptoAmount: number;
  transactionAmount: number;
  fee: number;
}

function baseUrl(): string {
  return (process.env.KOTANI_BASE_URL ?? "https://sandbox-api.kotanipay.io").replace(/\/$/, "");
}

function apiKey(): string {
  const key = process.env.KOTANI_API_KEY;
  if (!key) throw new Error("KOTANI_API_KEY is not set in backend/.env");
  return key;
}

function callbackUrl(path: string): string {
  const root = (process.env.KOTANI_CALLBACK_BASE_URL ?? process.env.PUBLIC_API_URL ?? "http://localhost:4000").replace(
    /\/$/,
    ""
  );
  return `${root}${path}`;
}

export function normalizeKenyaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7")) return `254${digits}`;
  return digits;
}

async function kotaniRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json().catch(() => ({}))) as KotaniEnvelope<T> & { message?: string };
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? `Kotani API error ${res.status} on ${path}`);
  }
  return json.data;
}

function chain(): string {
  return process.env.KOTANI_CHAIN ?? "AVALANCHE";
}

function token(): string {
  return process.env.KOTANI_TOKEN ?? "USDC";
}

function providerNetwork(): string {
  return process.env.KOTANI_PROVIDER_NETWORK ?? "MPESA";
}

function onrampReceiverAddress(): string {
  const fromEnv = process.env.KOTANI_ONRAMP_RECEIVER_ADDRESS;
  if (fromEnv) return fromEnv;
  const { signer } = requireChain();
  return signer.address;
}

export class KotaniRampProvider implements RampProvider {
  readonly name = "kotani";

  async getQuote(usdc: number, direction: "on" | "off"): Promise<RampQuote> {
    try {
      if (direction === "on") {
        const kes = await usdcToKes(usdc);
        const data = await kotaniRequest<RateData>("POST", "/api/v3/rate/onramp", {
          from: "KES",
          to: token(),
          fiatAmount: Math.ceil(kes),
          source: "crypto",
        });
        return {
          kes: data.fiatAmount,
          fee: data.fee,
          rate: data.fiatAmount / usdc,
          rateId: data.id,
        };
      }

      const data = await kotaniRequest<RateData>("POST", "/api/v3/rate/offramp", {
        from: token(),
        to: "KES",
        cryptoAmount: usdc,
        source: "crypto",
      });
      return {
        kes: data.transactionAmount,
        fee: data.fee,
        rate: data.transactionAmount / usdc,
        rateId: data.id,
      };
    } catch (err) {
      console.warn("[kotani] rate API failed, using FX fallback", err);
      const kes = await usdcToKes(usdc);
      const fee = Math.round(kes * 0.015 * 100) / 100;
      return { kes, fee, rate: kes / usdc };
    }
  }

  async createOnRamp(req: OnRampRequest): Promise<{ checkoutRequestId: string; referenceId: string; async: boolean }> {
    const quote = await this.getQuote(req.amountUsdc, "on");
    const fiatAmount = Math.ceil(quote.kes + quote.fee);
    const phone = normalizeKenyaPhone(req.phone);

    const data = await kotaniRequest<{
      id: string;
      referenceId: string;
      referenceNumber: number;
      message: string;
    }>("POST", "/api/v3/onramp", {
      mobileMoney: {
        phoneNumber: phone,
        accountName: req.accountName ?? "Guidemate User",
        providerNetwork: providerNetwork(),
      },
      fiatAmount,
      currency: "KES",
      chain: chain(),
      token: token(),
      receiverAddress: onrampReceiverAddress(),
      referenceId: req.intentId,
      callbackUrl: callbackUrl("/api/payments/mpesa/webhook"),
      rateId: quote.rateId,
      fiatWalletId: process.env.KOTANI_FIAT_WALLET_ID || undefined,
    });

    return {
      checkoutRequestId: String(data.referenceNumber ?? data.id),
      referenceId: data.referenceId ?? req.intentId,
      async: true,
    };
  }

  async createOffRamp(req: OffRampRequest): Promise<{
    reference: string;
    escrowAddress?: string;
    async: boolean;
  }> {
    if (!req.senderAddress) {
      throw new Error("guide wallet address required for Kotani off-ramp");
    }

    const quote = await this.getQuote(req.amountUsdc, "off");
    const phone = normalizeKenyaPhone(req.phone);

    const data = await kotaniRequest<{
      referenceId: string;
      escrowAddress: string;
      status: string;
    }>("POST", "/api/v3/offramp", {
      mobileMoneyReceiver: {
        phoneNumber: phone,
        accountName: req.accountName ?? "Guide",
        networkProvider: providerNetwork(),
      },
      cryptoAmount: req.amountUsdc,
      currency: "KES",
      chain: chain(),
      token: token(),
      referenceId: req.withdrawalId,
      senderAddress: req.senderAddress,
      callbackUrl: callbackUrl("/api/payments/mpesa/webhook"),
      rateId: quote.rateId,
      refund_config: {
        address: req.senderAddress,
      },
    });

    return {
      reference: data.referenceId,
      escrowAddress: data.escrowAddress,
      async: true,
    };
  }
}

export function verifyKotaniWebhookSignature(rawBody: string, headerSignature: string | undefined): boolean {
  const secret = process.env.KOTANI_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!headerSignature) return false;

  const computed = "sha256=" + createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(headerSignature.trim()));
  } catch {
    return false;
  }
}

export function extractReferenceId(data: Record<string, unknown>): string | undefined {
  const ref = data.referenceId ?? data.reference_id;
  return typeof ref === "string" ? ref : undefined;
}

export function isKotaniSuccessStatus(status: unknown): boolean {
  return typeof status === "string" && status.toUpperCase() === "SUCCESSFUL";
}
