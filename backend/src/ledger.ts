import { supabaseAdmin } from "./supabase.js";

export type WalletTxType =
  | "escrow_lock"
  | "booking_release"
  | "stream_ppv"
  | "stream_tip"
  | "mpesa_onramp"
  | "mpesa_withdraw"
  | "transfer_in"
  | "transfer_out";

export type WalletTxStatus = "pending" | "processing" | "completed" | "failed";

export interface WalletTransaction {
  id: string;
  profileId: string;
  type: WalletTxType;
  amountUsdc: number;
  amountKes: number | null;
  referenceType: string | null;
  referenceId: string | null;
  txHash: string | null;
  mpesaRef: string | null;
  status: WalletTxStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
}

function mapRow(row: Record<string, unknown>): WalletTransaction {
  return {
    id: row.id as string,
    profileId: row.profile_id as string,
    type: row.type as WalletTxType,
    amountUsdc: Number(row.amount_usdc ?? 0),
    amountKes: row.amount_kes != null ? Number(row.amount_kes) : null,
    referenceType: (row.reference_type as string) ?? null,
    referenceId: (row.reference_id as string) ?? null,
    txHash: (row.tx_hash as string) ?? null,
    mpesaRef: (row.mpesa_ref as string) ?? null,
    status: row.status as WalletTxStatus,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  };
}

export async function recordWalletTransaction(input: {
  profileId: string;
  type: WalletTxType;
  amountUsdc: number;
  amountKes?: number;
  referenceType?: string;
  referenceId?: string;
  txHash?: string;
  mpesaRef?: string;
  status?: WalletTxStatus;
  metadata?: Record<string, unknown>;
}): Promise<WalletTransaction> {
  const { data, error } = await supabaseAdmin
    .from("wallet_transactions")
    .insert({
      profile_id: input.profileId,
      type: input.type,
      amount_usdc: input.amountUsdc,
      amount_kes: input.amountKes ?? null,
      reference_type: input.referenceType ?? null,
      reference_id: input.referenceId ?? null,
      tx_hash: input.txHash ?? null,
      mpesa_ref: input.mpesaRef ?? null,
      status: input.status ?? "completed",
      metadata: input.metadata ?? {},
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function listWalletTransactions(
  profileId: string,
  limit = 50,
  offset = 0
): Promise<WalletTransaction[]> {
  const { data, error } = await supabaseAdmin
    .from("wallet_transactions")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function listAllTransactions(opts: {
  limit?: number;
  offset?: number;
  type?: string;
  status?: string;
  from?: string;
  to?: string;
}): Promise<WalletTransaction[]> {
  let query = supabaseAdmin.from("wallet_transactions").select("*").order("created_at", { ascending: false });
  if (opts.type) query = query.eq("type", opts.type);
  if (opts.status) query = query.eq("status", opts.status);
  if (opts.from) query = query.gte("created_at", opts.from);
  if (opts.to) query = query.lte("created_at", opts.to);
  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;
  query = query.range(offset, offset + limit - 1);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}
