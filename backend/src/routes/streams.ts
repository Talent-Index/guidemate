import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import {
  createLiveKitToken,
  isRecordingConfigured,
  requireLiveKit,
  startRecording,
  stopRecording,
} from "../livekit.js";
import {
  addStreamTip,
  createStream,
  getStreamById,
  listLiveStreams,
  listRecordedStreams,
  listStreamTips,
  updateStream,
} from "../streams.js";
import { getUserIdFromAuthHeader } from "../supabase.js";

export const streamsRouter = Router();

const createSchema = z.object({
  title: z.string().min(1),
  experienceId: z.string().uuid().optional(),
  priceUsdc: z.number().min(0).optional().default(0),
});

/// Creates a LiveKit room and immediately marks the stream "live" - there's no
/// separate "go live" step once scheduled, matching a guide starting a
/// broadcast straight from their phone. Returns a publish token for the guide.
streamsRouter.post("/", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: "sign in required" });
  }

  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const { roomService } = requireLiveKit();
    const { title, experienceId, priceUsdc } = parsed.data;
    const roomName = `stream-${randomUUID()}`;

    await roomService.createRoom({ name: roomName, emptyTimeout: 60 * 10 });

    const stream = await createStream({
      guideId: userId,
      experienceId: experienceId ?? null,
      roomName,
      title,
      priceUsdc,
    });

    let recordingStarted = false;
    if (isRecordingConfigured()) {
      try {
        const recording = await startRecording(roomName);
        if (recording) {
          await updateStream(stream.id, { egressId: recording.egressId, recordingUrl: recording.recordingUrl });
          recordingStarted = true;
        }
      } catch (err) {
        // Recording is a nice-to-have - never block a guide from going live over it.
        console.warn("[streams] failed to start recording egress", (err as Error).message);
      }
    }

    const token = await createLiveKitToken({
      roomName,
      identity: userId,
      name: "Guide",
      canPublish: true,
      canSubscribe: true,
    });

    res.status(201).json({
      stream: { ...stream, recordingUrl: recordingStarted ? stream.recordingUrl : null },
      token,
    });
  } catch (err) {
    console.error("[streams] create failed", err);
    res.status(500).json({ error: (err as Error).message ?? "failed to start stream" });
  }
});

streamsRouter.get("/live", async (_req, res) => {
  const streams = await listLiveStreams();
  res.json({ streams });
});

streamsRouter.get("/recorded", async (_req, res) => {
  const streams = await listRecordedStreams();
  res.json({ streams });
});

streamsRouter.get("/:id", async (req, res) => {
  const stream = await getStreamById(req.params.id);
  if (!stream) return res.status(404).json({ error: "stream not found" });
  res.json({ stream });
});

streamsRouter.get("/:id/tips", async (req, res) => {
  const tips = await listStreamTips(req.params.id);
  res.json({ tips });
});

const joinTokenSchema = z.object({
  // Recorded proof of a pay-per-view payment (direct wallet-to-wallet USDC
  // transfer to the guide) - trust-based, same as tips: we log it, we don't
  // re-verify the transfer on-chain in this pass.
  txHash: z.string().optional(),
});

streamsRouter.post("/:id/join-token", async (req, res) => {
  const stream = await getStreamById(req.params.id);
  if (!stream) return res.status(404).json({ error: "stream not found" });
  if (stream.status !== "live") {
    return res.status(409).json({ error: `stream is ${stream.status}, not live` });
  }

  const parsed = joinTokenSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  const isGuide = Boolean(userId && userId === stream.guideId);

  if (!isGuide && stream.priceUsdc > 0 && !parsed.data.txHash) {
    return res.status(402).json({ error: "this is a pay-per-view stream - pay the guide first, then retry with txHash" });
  }

  try {

    // The broadcasting guide can always re-join with publish rights (e.g. after
    // a refresh) without paying their own stream.
    if (!isGuide && stream.priceUsdc > 0 && parsed.data.txHash) {
      await addStreamTip({
        streamId: stream.id,
        tipperId: userId ?? null,
        tipperWallet: null,
        amountUsdc: stream.priceUsdc,
        txHash: parsed.data.txHash,
      });
    }

    const identity = userId ?? `viewer-${randomUUID()}`;
    const token = await createLiveKitToken({
      roomName: stream.roomName,
      identity,
      name: isGuide ? "Guide" : "Viewer",
      canPublish: isGuide,
      canSubscribe: true,
    });

    res.json({ token, stream, role: isGuide ? "publisher" : "viewer" });
  } catch (err) {
    console.error("[streams] join-token failed", err);
    res.status(500).json({ error: (err as Error).message ?? "failed to mint join token" });
  }
});

streamsRouter.post("/:id/end", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  const stream = await getStreamById(req.params.id);
  if (!stream) return res.status(404).json({ error: "stream not found" });
  if (stream.guideId !== userId) {
    return res.status(403).json({ error: "only the broadcasting guide can end this stream" });
  }
  if (stream.status === "ended") {
    return res.json({ stream });
  }

  try {
    const { roomService } = requireLiveKit();

    if (stream.egressId) {
      try {
        await stopRecording(stream.egressId);
      } catch (err) {
        console.warn("[streams] failed to stop recording egress", (err as Error).message);
      }
    }

    await roomService.deleteRoom(stream.roomName).catch(() => {
      // Room may have already emptied out and been cleaned up - not an error.
    });

    const updated = await updateStream(stream.id, { status: "ended", endedAt: new Date().toISOString() });
    res.json({ stream: updated });
  } catch (err) {
    console.error("[streams] end failed", err);
    res.status(500).json({ error: (err as Error).message ?? "failed to end stream" });
  }
});

const tipSchema = z.object({
  amountUsdc: z.number().positive(),
  txHash: z.string().min(1),
  tipperWallet: z.string().optional(),
});

/// Records a tip receipt for the on-screen feed - the actual USDC transfer
/// happens client-side, wallet-to-wallet, straight to the guide (see
/// frontend's use of wagmi's useWriteContract against MockUSDC). This is
/// trust-based logging, not on-chain re-verification.
streamsRouter.post("/:id/tip", async (req, res) => {
  const stream = await getStreamById(req.params.id);
  if (!stream) return res.status(404).json({ error: "stream not found" });

  const parsed = tipSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const userId = await getUserIdFromAuthHeader(req.headers.authorization);
    const tip = await addStreamTip({
      streamId: stream.id,
      tipperId: userId ?? null,
      tipperWallet: parsed.data.tipperWallet ?? null,
      amountUsdc: parsed.data.amountUsdc,
      txHash: parsed.data.txHash,
    });
    res.status(201).json({ tip });
  } catch (err) {
    console.error("[streams] tip failed", err);
    res.status(500).json({ error: (err as Error).message ?? "failed to record tip" });
  }
});
