import { SimulateRampProvider } from "./simulate.js";
import { KotaniRampProvider } from "./kotani.js";
import { MinisendRampProvider } from "./minisend.js";
import type { RampProvider } from "./types.js";

let provider: RampProvider | null = null;

export function getRampProviderName(): string {
  return process.env.RAMP_PROVIDER ?? "simulate";
}

export function getRampProvider(): RampProvider {
  if (!provider) {
    const name = getRampProviderName();
    if (name === "minisend") {
      provider = new MinisendRampProvider();
    } else if (name === "kotani") {
      provider = new KotaniRampProvider();
    } else if (name === "simulate") {
      provider = new SimulateRampProvider();
    } else {
      console.warn(`[ramp] Unknown RAMP_PROVIDER=${name}, falling back to simulate`);
      provider = new SimulateRampProvider();
    }
  }
  return provider;
}

export function isSimulatedRamp(): boolean {
  return getRampProviderName() === "simulate";
}

export function isMinisendRamp(): boolean {
  return getRampProviderName() === "minisend";
}

export function isKotaniRamp(): boolean {
  return getRampProviderName() === "kotani";
}

export * from "./types.js";
