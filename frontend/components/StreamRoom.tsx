"use client";

import {
  ControlBar,
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
} from "@livekit/components-react";
import type { TrackReference, TrackReferenceOrPlaceholder } from "@livekit/components-core";
import { Track } from "livekit-client";

function isRenderableVideo(ref: TrackReferenceOrPlaceholder): ref is TrackReference {
  return Boolean(ref.publication?.track);
}

function selectPrimaryTrack(
  tracks: TrackReferenceOrPlaceholder[],
  isPublisher: boolean
): TrackReferenceOrPlaceholder | undefined {
  const screen = tracks.find((t) => t.source === Track.Source.ScreenShare && isRenderableVideo(t));
  if (screen) return screen;

  if (isPublisher) {
    const localCam = tracks.find((t) => t.participant.isLocal && t.source === Track.Source.Camera);
    if (localCam) return localCam;
  }

  const remoteCam = tracks.find(
    (t) => !t.participant.isLocal && t.source === Track.Source.Camera && isRenderableVideo(t)
  );
  if (remoteCam) return remoteCam;

  if (isPublisher) {
    return tracks.find((t) => t.participant.isLocal && t.source === Track.Source.Camera);
  }

  return undefined;
}

function StreamStage({ isPublisher }: { isPublisher: boolean }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: isPublisher },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true }
  );

  const primary = selectPrimaryTrack(tracks, isPublisher);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {primary && isRenderableVideo(primary) ? (
        <VideoTrack
          trackRef={primary}
          className="gm-stream-host-video !h-full !w-full !object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/70">
          <span className="text-4xl">📡</span>
          <p className="text-sm font-medium">{isPublisher ? "Starting camera…" : "Waiting for the host…"}</p>
        </div>
      )}

      {isPublisher && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/40 to-transparent pb-3 pt-16">
          <div className="pointer-events-auto px-3">
            <ControlBar
              variation="minimal"
              controls={{
                microphone: true,
                camera: true,
                screenShare: false,
                chat: false,
                leave: false,
                settings: false,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

type StreamRoomProps = {
  serverUrl: string;
  token: string;
  isPublisher: boolean;
  className?: string;
};

export function StreamRoom({ serverUrl, token, isPublisher, className = "" }: StreamRoomProps) {
  return (
    <div className={`gm-stream-shell relative h-full w-full ${className}`}>
      <LiveKitRoom
        key={token}
        serverUrl={serverUrl}
        token={token}
        connect
        video={isPublisher}
        audio={isPublisher}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <StreamStage isPublisher={isPublisher} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
