import type { OffRampRequest, OnRampRequest, RampProvider, RampQuote } from "./types.js";
import { usdcToKes } from "../fx.js";

function randomRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `MPESA-${out}`;
}

export class SimulateRampProvider implements RampProvider {
  async createOnRamp(req: OnRampRequest): Promise<{ checkoutRequestId: string }> {
    await new Promise((r) => setTimeout(r, 600));
    return { checkoutRequestId: `STK-${req.intentId.slice(0, 8).toUpperCase()}` };
  }

  async createOffRamp(req: OffRampRequest): Promise<{ reference: string }> {
    await new Promise((r) => setTimeout(r, 800));
    return { reference: randomRef() };
  }

  async getQuote(usdc: number, _direction: "on" | "off"): Promise<RampQuote> {
    const kes = await usdcToKes(usdc);
    const fee = Math.round(kes * 0.015 * 100) / 100;
    return { kes, fee, rate: kes / usdc };
  }
}
