"use client";

import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

function StreamStage({ isPublisher }: { isPublisher: boolean }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true }
  );

  const visibleTracks = isPublisher ? tracks : tracks.filter((track) => !track.participant.isLocal);

  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1">
        <GridLayout tracks={visibleTracks} className="gm-stream-grid h-full">
          <ParticipantTile />
        </GridLayout>
      </div>
      {isPublisher && (
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
      )}
    </div>
  );
}

type StreamRoomProps = {
  serverUrl: string;
  token: string;
  isPublisher: boolean;
  height?: string;
};

export function StreamRoom({ serverUrl, token, isPublisher, height = "min(70vh, 560px)" }: StreamRoomProps) {
  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      video={isPublisher}
      audio={isPublisher}
      style={{ height }}
    >
      <StreamStage isPublisher={isPublisher} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
