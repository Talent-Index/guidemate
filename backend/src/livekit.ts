import { AccessToken, EgressClient, EncodedFileOutput, EncodedFileType, RoomServiceClient, S3Upload } from "livekit-server-sdk";

const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } = process.env;

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
  console.warn(
    "[livekit] Missing LIVEKIT_API_KEY / LIVEKIT_API_SECRET / LIVEKIT_URL in backend/.env - " +
      "live streaming will be unavailable until you create a free LiveKit Cloud project " +
      "(https://cloud.livekit.io) and set these three."
  );
}

// The server SDK's REST clients (RoomServiceClient/EgressClient) want an
// http(s) URL, while LIVEKIT_URL is conventionally the wss:// URL clients use
// to connect - swap the scheme rather than asking for two separate env vars.
const httpUrl = LIVEKIT_URL?.replace(/^ws/, "http");

export const roomService =
  LIVEKIT_API_KEY && LIVEKIT_API_SECRET && httpUrl
    ? new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    : undefined;

export const egressClient =
  LIVEKIT_API_KEY && LIVEKIT_API_SECRET && httpUrl
    ? new EgressClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    : undefined;

export function requireLiveKit() {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL || !roomService || !egressClient) {
    throw new Error(
      "Live streaming is not configured. Create a free project at https://cloud.livekit.io and set " +
        "LIVEKIT_API_KEY, LIVEKIT_API_SECRET and LIVEKIT_URL in backend/.env (see contracts-free README notes)."
    );
  }
  return { roomService, egressClient, apiKey: LIVEKIT_API_KEY, apiSecret: LIVEKIT_API_SECRET };
}

const {
  SUPABASE_S3_ACCESS_KEY_ID,
  SUPABASE_S3_SECRET_ACCESS_KEY,
  SUPABASE_S3_ENDPOINT,
  SUPABASE_S3_REGION = "us-east-1",
  SUPABASE_S3_BUCKET = "stream-recordings",
  SUPABASE_URL,
} = process.env;

export function isRecordingConfigured(): boolean {
  return Boolean(SUPABASE_S3_ACCESS_KEY_ID && SUPABASE_S3_SECRET_ACCESS_KEY && SUPABASE_S3_ENDPOINT && SUPABASE_URL);
}

/// Starts a room-composite recording (guide's camera + shared layout) and
/// writes it straight to Supabase Storage over the S3-compatible protocol -
/// no separate video pipeline to run. Returns the public URL the recording
/// will be reachable at once Egress finishes uploading, or undefined if
/// recording isn't configured (streaming still works either way).
export async function startRecording(roomName: string): Promise<{ egressId: string; recordingUrl: string } | undefined> {
  if (!isRecordingConfigured()) return undefined;
  const { egressClient } = requireLiveKit();

  const filepath = `${roomName}.mp4`;
  const info = await egressClient.startRoomCompositeEgress(
    roomName,
    new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath,
      output: {
        case: "s3",
        value: new S3Upload({
          accessKey: SUPABASE_S3_ACCESS_KEY_ID,
          secret: SUPABASE_S3_SECRET_ACCESS_KEY,
          endpoint: SUPABASE_S3_ENDPOINT,
          region: SUPABASE_S3_REGION,
          bucket: SUPABASE_S3_BUCKET,
          forcePathStyle: true,
        }),
      },
    })
  );

  return {
    egressId: info.egressId,
    recordingUrl: `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_S3_BUCKET}/${filepath}`,
  };
}

export async function stopRecording(egressId: string): Promise<void> {
  const { egressClient } = requireLiveKit();
  await egressClient.stopEgress(egressId);
}

export interface TokenGrant {
  roomName: string;
  identity: string;
  name?: string;
  canPublish: boolean;
  canSubscribe: boolean;
}

/// Mints a short-lived LiveKit room token. Guides get canPublish for their own
/// broadcast; viewers get a subscribe-only token (paywalled streams are gated
/// server-side before this is ever minted - see routes/streams.ts).
export async function createLiveKitToken(grant: TokenGrant): Promise<string> {
  const { apiKey, apiSecret } = requireLiveKit();
  const token = new AccessToken(apiKey, apiSecret, {
    identity: grant.identity,
    name: grant.name,
    ttl: "10m",
  });
  token.addGrant({
    room: grant.roomName,
    roomJoin: true,
    canPublish: grant.canPublish,
    canSubscribe: grant.canSubscribe,
  });
  return token.toJwt();
}
