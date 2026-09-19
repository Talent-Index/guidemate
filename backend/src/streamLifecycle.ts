import { requireLiveKit, stopRecording } from "./livekit.js";
import { listLiveStreams, updateStream, type LiveStreamRecord } from "./streams.js";

const EMPTY_ROOM_GRACE_MS = 3 * 60 * 1000;

function streamAgeMs(stream: LiveStreamRecord): number {
  if (!stream.startedAt) return 0;
  return Date.now() - new Date(stream.startedAt).getTime();
}

export async function closeLiveStreamRecord(stream: LiveStreamRecord): Promise<LiveStreamRecord | undefined> {
  if (stream.status === "ended") return stream;

  try {
    const { roomService } = requireLiveKit();
    if (stream.egressId) {
      try {
        await stopRecording(stream.egressId);
      } catch (err) {
        console.warn("[streams] failed to stop recording egress", (err as Error).message);
      }
    }
    await roomService.deleteRoom(stream.roomName).catch(() => {});
  } catch {
    // LiveKit may be offline — still mark ended in the database.
  }

  return updateStream(stream.id, { status: "ended", endedAt: new Date().toISOString() });
}

async function isLiveKitRoomEmpty(roomName: string): Promise<boolean | "missing"> {
  try {
    const { roomService } = requireLiveKit();
    const participants = await roomService.listParticipants(roomName);
    return participants.length === 0;
  } catch {
    return "missing";
  }
}

export async function reconcileStreamIfStale(stream: LiveStreamRecord): Promise<LiveStreamRecord | undefined> {
  if (stream.status !== "live") return stream;
  const ageMs = streamAgeMs(stream);
  if (ageMs < EMPTY_ROOM_GRACE_MS) return stream;

  const empty = await isLiveKitRoomEmpty(stream.roomName);
  if (empty === true || empty === "missing") {
    console.info(`[streams] auto-ending stale live stream ${stream.id} (${stream.title})`);
    return closeLiveStreamRecord(stream);
  }
  return stream;
}

export async function reconcileStaleLiveStreams(): Promise<number> {
  let ended = 0;
  const live = await listLiveStreams();
  for (const stream of live) {
    const updated = await reconcileStreamIfStale(stream);
    if (updated?.status === "ended" && stream.status === "live") ended += 1;
  }
  return ended;
}
