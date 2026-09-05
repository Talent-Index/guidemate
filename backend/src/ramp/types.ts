export type PaymentPurpose = "booking" | "stream_ppv" | "stream_tip";

export interface OnRampRequest {
  intentId: string;
  phone: string;
  amountKes: number;
  amountUsdc: number;
  purpose: PaymentPurpose;
  referenceId: string;
}

export interface OffRampRequest {
  withdrawalId: string;
  phone: string;
  amountUsdc: number;
  kesAmount: number;
}

export interface RampQuote {
  kes: number;
  fee: number;
  rate: number;
}

export interface RampProvider {
  createOnRamp(req: OnRampRequest): Promise<{ checkoutRequestId: string }>;
  createOffRamp(req: OffRampRequest): Promise<{ reference: string }>;
  getQuote(usdc: number, direction: "on" | "off"): Promise<RampQuote>;
}
