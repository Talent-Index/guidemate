import { supabaseAdmin } from "./supabase.js";

export type StreamStatus = "scheduled" | "live" | "ended";

export interface StreamTip {
  id: string;
  tipperId: string | null;
  tipperWallet: string | null;
  amountUsdc: number;
  txHash: string;
  createdAt: string;
}

export interface LiveStreamRecord {
  id: string;
  guideId: string;
  guideName: string;
  guideWallet: string | null;
  experienceId: string | null;
  experienceTitle: string | null;
  roomName: string;
  title: string;
  status: StreamStatus;
  priceUsdc: number;
  startedAt: string | null;
  endedAt: string | null;
  recordingUrl: string | null;
  egressId: string | null;
  createdAt: string;
}

const SELECT = `
  id, guide_id, experience_id, room_name, title, status, price_usdc,
  started_at, ended_at, recording_url, egress_id, created_at,
  guide:guide_id ( full_name, wallet_address ),
  experience:experience_id ( title )
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStreamRecord(row: any): LiveStreamRecord {
  return {
    id: row.id,
    guideId: row.guide_id,
    guideName: row.guide?.full_name ?? "Guide",
    guideWallet: row.guide?.wallet_address ?? null,
    experienceId: row.experience_id,
    experienceTitle: row.experience?.title ?? null,
    roomName: row.room_name,
    title: row.title,
    status: row.status,
    priceUsdc: Number(row.price_usdc),
    startedAt: row.started_at,
    endedAt: row.ended_at,
    recordingUrl: row.recording_url ?? null,
    egressId: row.egress_id ?? null,
    createdAt: row.created_at,
  };
}

export interface CreateStreamInput {
  guideId: string;
  experienceId: string | null;
  roomName: string;
  title: string;
  priceUsdc: number;
}

export async function createStream(input: CreateStreamInput): Promise<LiveStreamRecord> {
  const { data, error } = await supabaseAdmin
    .from("live_streams")
    .insert({
      guide_id: input.guideId,
      experience_id: input.experienceId,
      room_name: input.roomName,
      title: input.title,
      price_usdc: input.priceUsdc,
      status: "live",
      started_at: new Date().toISOString(),
    })
    .select(SELECT)
    .single();

  if (error || !data) throw new Error(error?.message ?? "failed to create stream");
  return toStreamRecord(data);
}

export async function getStreamById(id: string): Promise<LiveStreamRecord | undefined> {
  const { data, error } = await supabaseAdmin.from("live_streams").select(SELECT).eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  return toStreamRecord(data);
}

export async function listLiveStreams(): Promise<LiveStreamRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("live_streams")
    .select(SELECT)
    .eq("status", "live")
    .order("started_at", { ascending: false });
  if (error || !data) return [];
  return data.map(toStreamRecord);
}

/// Recently ended streams that have a recording URL, for the on-demand
/// replay strip on /live. Unrecorded ended streams stay out of this list.
export async function listRecordedStreams(): Promise<LiveStreamRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("live_streams")
    .select(SELECT)
    .eq("status", "ended")
    .not("recording_url", "is", null)
    .order("ended_at", { ascending: false })
    .limit(12);
  if (error || !data) return [];
  return data.map(toStreamRecord);
}

export interface UpdateStreamPatch {
  status?: StreamStatus;
  endedAt?: string;
  recordingUrl?: string;
  egressId?: string;
}

export async function updateStream(id: string, patch: UpdateStreamPatch): Promise<LiveStreamRecord | undefined> {
  const update: Record<string, unknown> = {};
  if (patch.status) update.status = patch.status;
  if (patch.endedAt) update.ended_at = patch.endedAt;
  if (patch.recordingUrl) update.recording_url = patch.recordingUrl;
  if (patch.egressId) update.egress_id = patch.egressId;

  const { data, error } = await supabaseAdmin.from("live_streams").update(update).eq("id", id).select(SELECT).single();
  if (error || !data) return undefined;
  return toStreamRecord(data);
}

export async function addStreamTip(input: {
  streamId: string;
  tipperId: string | null;
  tipperWallet: string | null;
  amountUsdc: number;
  txHash: string;
}): Promise<StreamTip> {
  const { data, error } = await supabaseAdmin
    .from("stream_tips")
    .insert({
      stream_id: input.streamId,
      tipper_id: input.tipperId,
      tipper_wallet: input.tipperWallet,
      amount_usdc: input.amountUsdc,
      tx_hash: input.txHash,
    })
    .select("id, tipper_id, tipper_wallet, amount_usdc, tx_hash, created_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "failed to record tip");
  return {
    id: data.id,
    tipperId: data.tipper_id,
    tipperWallet: data.tipper_wallet,
    amountUsdc: Number(data.amount_usdc),
    txHash: data.tx_hash,
    createdAt: data.created_at,
  };
}

export async function listStreamTips(streamId: string): Promise<StreamTip[]> {
  const { data, error } = await supabaseAdmin
    .from("stream_tips")
    .select("id, tipper_id, tipper_wallet, amount_usdc, tx_hash, created_at")
    .eq("stream_id", streamId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    tipperId: row.tipper_id,
    tipperWallet: row.tipper_wallet,
    amountUsdc: Number(row.amount_usdc),
    txHash: row.tx_hash,
    createdAt: row.created_at,
  }));
}
