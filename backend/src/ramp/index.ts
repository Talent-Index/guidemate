import { SimulateRampProvider } from "./simulate.js";
import type { RampProvider } from "./types.js";

let provider: RampProvider | null = null;

export function getRampProvider(): RampProvider {
  if (!provider) {
    const name = process.env.RAMP_PROVIDER ?? "simulate";
    if (name === "simulate") {
      provider = new SimulateRampProvider();
    } else {
      // Kotani/Yellow Card can be wired here when API keys are available.
      console.warn(`[ramp] Unknown RAMP_PROVIDER=${name}, falling back to simulate`);
      provider = new SimulateRampProvider();
    }
  }
  return provider;
}

export * from "./types.js";
