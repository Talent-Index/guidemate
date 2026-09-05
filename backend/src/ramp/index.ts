import { SimulateRampProvider } from "./simulate.js";
import { KotaniRampProvider } from "./kotani.js";
import type { RampProvider } from "./types.js";

let provider: RampProvider | null = null;

export function getRampProvider(): RampProvider {
  if (!provider) {
    const name = process.env.RAMP_PROVIDER ?? "simulate";
    if (name === "kotani") {
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
  return (process.env.RAMP_PROVIDER ?? "simulate") === "simulate";
}

export * from "./types.js";
