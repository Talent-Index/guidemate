export type PayoutDestination = "mpesa" | "wallet";
export type ExperiencePayoutChoice = PayoutDestination | "inherit";

export function parsePayoutDestination(value: unknown): PayoutDestination | null {
  return value === "mpesa" || value === "wallet" ? value : null;
}
