export type PaymentPurpose = "booking" | "stream_ppv" | "stream_tip";

export interface OnRampRequest {
  intentId: string;
  phone: string;
  amountKes: number;
  amountUsdc: number;
  purpose: PaymentPurpose;
  referenceId: string;
  accountName?: string;
}

export interface OffRampRequest {
  withdrawalId: string;
  phone: string;
  amountUsdc: number;
  kesAmount: number;
  accountName?: string;
  senderAddress?: string;
}

export interface RampQuote {
  kes: number;
  fee: number;
  rate: number;
  rateId?: string;
}

export interface OnRampResult {
  checkoutRequestId: string;
  referenceId: string;
  /** When true, wait for Kotani webhook / poll before completing payment */
  async: boolean;
}

export interface OffRampResult {
  reference: string;
  escrowAddress?: string;
  async: boolean;
}

export interface RampProvider {
  createOnRamp(req: OnRampRequest): Promise<OnRampResult>;
  createOffRamp(req: OffRampRequest): Promise<OffRampResult>;
  getQuote(usdc: number, direction: "on" | "off"): Promise<RampQuote>;
}
