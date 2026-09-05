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
  addStreamComment,
  addStreamReaction,
  addStreamTip,
  countStreamReactions,
  createStream,
  getStreamById,
  grantStreamAccess,
  hasStreamAccess,
  listGuideScheduledStreams,
  listLiveStreams,
  listRecordedStreams,
  listStreamComments,
  listStreamTips,
  listUpcomingStreams,
  scheduleStream,
  updateStream,
} from "../streams.js";
import { recordWalletTransaction } from "../ledger.js";
import { getCompletedPaymentIntent } from "./payments.js";
import { getUserIdFromAuthHeader, supabaseAdmin } from "../supabase.js";

export const streamsRouter = Router();

const createSchema = z.object({
  title: z.string().min(1),
  experienceId: z.string().uuid().optional(),
  priceUsdc: z.number().min(0).optional().default(0),
});

const scheduleSchema = z.object({
  title: z.string().min(1),
  experienceId: z.string().uuid().optional(),
  priceUsdc: z.number().min(0).optional().default(0),
  scheduledAt: z.string().datetime(),
});

async function activateStreamRoom(stream: Awaited<ReturnType<typeof getStreamById>> & object, userId: string) {
  const { roomService } = requireLiveKit();
  await roomService.createRoom({ name: stream.roomName, emptyTimeout: 60 * 10 });

  let recordingStarted = false;
  let egressId: string | undefined;
  let recordingUrl: string | undefined;
  if (isRecordingConfigured()) {
    try {
      const recording = await startRecording(stream.roomName);
      if (recording) {
        egressId = recording.egressId;
        recordingUrl = recording.recordingUrl;
        recordingStarted = true;
      }
    } catch (err) {
      console.warn("[streams] failed to start recording egress", (err as Error).message);
    }
  }

  const updated = await updateStream(stream.id, {
    status: "live",
    startedAt: new Date().toISOString(),
    egressId,
    recordingUrl: recordingStarted ? recordingUrl : undefined,
  });
  if (!updated) throw new Error("failed to mark stream live");

  const token = await createLiveKitToken({
    roomName: stream.roomName,
    identity: userId,
    name: "Guide",
    canPublish: true,
    canSubscribe: true,
  });

  return { stream: updated, token };
}

/// Creates a LiveKit room and immediately marks the stream "live".
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
    const { title, experienceId, priceUsdc } = parsed.data;
    const roomName = `stream-${randomUUID()}`;

    const stream = await createStream({
      guideId: userId,
      experienceId: experienceId ?? null,
      roomName,
      title,
      priceUsdc,
    });

    const { stream: liveStream, token } = await activateStreamRoom(stream, userId);
    res.status(201).json({ stream: liveStream, token });
  } catch (err) {
    console.error("[streams] create failed", err);
    res.status(500).json({ error: (err as Error).message ?? "failed to start stream" });
  }
});

streamsRouter.post("/schedule", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: "sign in required" });
  }

  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const { title, experienceId, priceUsdc, scheduledAt } = parsed.data;
    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate.getTime() <= Date.now()) {
      return res.status(400).json({ error: "scheduledAt must be in the future" });
    }

    const stream = await scheduleStream({
      guideId: userId,
      experienceId: experienceId ?? null,
      roomName: `stream-${randomUUID()}`,
      title,
      priceUsdc,
      scheduledAt,
    });

    res.status(201).json({ stream });
  } catch (err) {
    console.error("[streams] schedule failed", err);
    res.status(500).json({ error: (err as Error).message ?? "failed to schedule stream" });
  }
});

streamsRouter.get("/upcoming", async (_req, res) => {
  const streams = await listUpcomingStreams();
  res.json({ streams });
});

streamsRouter.get("/mine/scheduled", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });
  const streams = await listGuideScheduledStreams(userId);
  res.json({ streams });
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
  txHash: z.string().optional(),
  paymentIntentId: z.string().uuid().optional(),
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

  if (!isGuide && stream.priceUsdc > 0) {
    const hasAccess = userId ? await hasStreamAccess(stream.id, userId) : false;
    if (!hasAccess && !parsed.data.txHash && !parsed.data.paymentIntentId) {
      return res.status(402).json({
        error: "this is a pay-per-view stream - pay first, then retry with txHash or paymentIntentId",
      });
    }
  }

  try {
    if (!isGuide && stream.priceUsdc > 0 && parsed.data.paymentIntentId && userId) {
      const intent = await getCompletedPaymentIntent(parsed.data.paymentIntentId, userId);
      if (!intent || intent.reference_id !== stream.id) {
        return res.status(402).json({ error: "M-Pesa payment not completed for this stream" });
      }
      await grantStreamAccess({
        streamId: stream.id,
        profileId: userId,
        paymentMethod: "mpesa",
        paymentRef: parsed.data.paymentIntentId,
      });
      await addStreamTip({
        streamId: stream.id,
        tipperId: userId,
        tipperWallet: null,
        amountUsdc: stream.priceUsdc,
        txHash: `mpesa-${parsed.data.paymentIntentId}`,
      });
      await recordWalletTransaction({
        profileId: stream.guideId,
        type: "stream_ppv",
        amountUsdc: stream.priceUsdc,
        referenceType: "stream",
        referenceId: stream.id,
        mpesaRef: parsed.data.paymentIntentId,
      });
    }

    if (!isGuide && stream.priceUsdc > 0 && parsed.data.txHash) {
      await addStreamTip({
        streamId: stream.id,
        tipperId: userId ?? null,
        tipperWallet: null,
        amountUsdc: stream.priceUsdc,
        txHash: parsed.data.txHash,
      });
      if (userId) {
        await grantStreamAccess({
          streamId: stream.id,
          profileId: userId,
          paymentMethod: "external",
          paymentRef: parsed.data.txHash,
        });
      }
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

streamsRouter.post("/:id/start", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  const stream = await getStreamById(req.params.id);
  if (!stream) return res.status(404).json({ error: "stream not found" });
  if (stream.guideId !== userId) {
    return res.status(403).json({ error: "only the broadcasting guide can start this stream" });
  }
  if (stream.status === "live") {
    return res.status(409).json({ error: "stream is already live" });
  }
  if (stream.status === "ended") {
    return res.status(409).json({ error: "stream has ended" });
  }

  try {
    const { stream: liveStream, token } = await activateStreamRoom(stream, userId);
    res.json({ stream: liveStream, token });
  } catch (err) {
    console.error("[streams] start failed", err);
    res.status(500).json({ error: (err as Error).message ?? "failed to start stream" });
  }
});

streamsRouter.post("/:id/notify", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });

  const stream = await getStreamById(req.params.id);
  if (!stream) return res.status(404).json({ error: "stream not found" });
  if (stream.guideId !== userId) {
    return res.status(403).json({ error: "only the broadcasting guide can notify the community" });
  }
  if (stream.status !== "scheduled") {
    return res.status(409).json({ error: "only scheduled streams can be announced" });
  }

  const inOneHour = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const scheduledAt =
    stream.scheduledAt && new Date(stream.scheduledAt).getTime() > Date.now()
      ? stream.scheduledAt
      : inOneHour;

  const updated = await updateStream(stream.id, {
    communityNotifiedAt: new Date().toISOString(),
    scheduledAt,
  });
  if (!updated) return res.status(500).json({ error: "failed to notify community" });

  console.info(
    `[streams] community notified for stream ${stream.id} (${stream.title}) - starts ~${scheduledAt}`
  );
  res.json({ stream: updated });
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

streamsRouter.get("/:id/comments", async (req, res) => {
  const comments = await listStreamComments(req.params.id);
  res.json({ comments: comments.reverse() });
});

const commentSchema = z.object({ body: z.string().min(1).max(500) });

streamsRouter.post("/:id/comments", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const stream = await getStreamById(req.params.id);
  if (!stream) return res.status(404).json({ error: "stream not found" });

  let displayName = "Viewer";
  if (userId) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    displayName = (profile?.full_name as string) ?? "Viewer";
  }

  try {
    const comment = await addStreamComment({
      streamId: stream.id,
      profileId: userId ?? null,
      displayName,
      body: parsed.data.body,
    });
    res.status(201).json({ comment });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

streamsRouter.post("/:id/reactions", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  const type = req.body?.type === "like" ? "like" : "flower";
  const stream = await getStreamById(req.params.id);
  if (!stream) return res.status(404).json({ error: "stream not found" });

  try {
    const reaction = await addStreamReaction({ streamId: stream.id, profileId: userId ?? null, type });
    const total = await countStreamReactions(stream.id);
    res.status(201).json({ reaction, total });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

streamsRouter.get("/:id/stats", async (req, res) => {
  const stream = await getStreamById(req.params.id);
  if (!stream) return res.status(404).json({ error: "stream not found" });

  let viewerCount = 0;
  try {
    const { roomService } = requireLiveKit();
    const participants = await roomService.listParticipants(stream.roomName);
    viewerCount = participants.length;
  } catch {
    // LiveKit may be unavailable
  }

  const [reactionCount, tips] = await Promise.all([
    countStreamReactions(stream.id),
    listStreamTips(stream.id),
  ]);

  res.json({
    viewerCount,
    reactionCount,
    tipCount: tips.length,
    tipTotalUsdc: tips.reduce((s, t) => s + t.amountUsdc, 0),
  });
});
