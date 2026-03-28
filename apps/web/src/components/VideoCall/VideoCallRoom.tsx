import {
  LiveKitRoom,
  useLocalParticipant,
  useRemoteParticipants,
  VideoTrack,
  AudioTrack,
  useTracks,
} from '@livekit/components-react'
import type { TrackReference } from '@livekit/components-react'
import { useCallControls } from '../../hooks/useCallControls'
import { Track, DisconnectReason } from 'livekit-client'
import type { CallSession } from '../../api/calls'
import { VideoCameraSlashIcon } from '@heroicons/react/24/solid'
import CallControls from './CallControls'

export { DisconnectReason }

interface VideoCallRoomProps {
  session: CallSession
  onDisconnected: (reason?: DisconnectReason) => void
}

function ParticipantTile({ identity, cameraTracks }: { identity: string; cameraTracks: TrackReference[] }) {
  const track = cameraTracks.find((t) => t.participant.identity === identity)
  return (
    <div className="relative rounded-xl overflow-hidden bg-white/5 aspect-video">
      {track ? (
        <VideoTrack trackRef={track} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <VideoCameraSlashIcon className="w-8 h-8 text-white/20" />
        </div>
      )}
    </div>
  )
}

function CallUI() {
  const controls = useCallControls()
  const { localParticipant } = useLocalParticipant()
  const remoteParticipants = useRemoteParticipants()

  const cameraTracks = useTracks([Track.Source.Camera]).filter(
    (t): t is TrackReference => 'publication' in t
  )
  const screenTracks = useTracks([Track.Source.ScreenShare]).filter(
    (t): t is TrackReference => 'publication' in t
  )
  const micTracks = useTracks([Track.Source.Microphone]).filter(
    (t): t is TrackReference => 'publication' in t
  )

  const remoteMicTracks = micTracks.filter(
    (t) => t.participant.identity !== localParticipant.identity
  )

  // Screenshare takes priority as the main view
  const activeScreen = screenTracks.find(
    (t) => t.participant.identity !== localParticipant.identity
  )

  const localCamera = cameraTracks.find(
    (t) => t.participant.identity === localParticipant.identity
  )

  const isGroup = remoteParticipants.length > 1

  return (
    <div className="fixed inset-0 z-200 flex flex-col bg-black">
      {/* Remote audio */}
      {remoteMicTracks.map((t) => (
        <AudioTrack key={t.publication.trackSid} trackRef={t} />
      ))}

      {/* Video area */}
      <div className="flex-1 relative overflow-hidden">
        {remoteParticipants.length === 0 ? (
          /* Waiting screen */
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                <VideoCameraSlashIcon className="w-10 h-10 text-white/40" />
              </div>
              <p className="text-white/50 text-sm">Ожидание участников…</p>
            </div>
          </div>
        ) : activeScreen ? (
          /* Screenshare layout */
          <>
            <VideoTrack trackRef={activeScreen} className="w-full h-full object-contain" />
            {localCamera && (
              <div className="absolute bottom-4 right-4 w-28 h-40 rounded-xl overflow-hidden border border-white/20 shadow-lg">
                <VideoTrack trackRef={localCamera} className="w-full h-full object-cover" />
              </div>
            )}
          </>
        ) : isGroup ? (
          /* Group grid */
          <div className={`w-full h-full p-3 grid gap-2 content-center ${
            remoteParticipants.length <= 3
              ? 'grid-cols-2'
              : 'grid-cols-3'
          }`}>
            {remoteParticipants.map((p) => (
              <ParticipantTile key={p.identity} identity={p.identity} cameraTracks={cameraTracks} />
            ))}
            {/* Local tile */}
            <div className="relative rounded-xl overflow-hidden bg-white/5 aspect-video">
              {localCamera ? (
                <VideoTrack trackRef={localCamera} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <VideoCameraSlashIcon className="w-8 h-8 text-white/20" />
                </div>
              )}
              <span className="absolute bottom-1.5 left-2 text-[10px] text-white/60">Вы</span>
            </div>
          </div>
        ) : (
          /* 1-on-1 layout */
          <>
            <ParticipantTile
              identity={remoteParticipants[0].identity}
              cameraTracks={cameraTracks}
            />
            {localCamera && (
              <div className="absolute bottom-4 right-4 w-28 h-40 rounded-xl overflow-hidden border border-white/20 shadow-lg">
                <VideoTrack trackRef={localCamera} className="w-full h-full object-cover" />
              </div>
            )}
          </>
        )}

        {remoteParticipants.length > 0 && (
          <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs">
            {remoteParticipants.length + 1} участника
          </div>
        )}
      </div>

      <CallControls
        isMicEnabled={controls.isMicEnabled}
        isCameraEnabled={controls.isCameraEnabled}
        onToggleMic={controls.toggleMic}
        onToggleCamera={controls.toggleCamera}
        onLeave={controls.leave}
      />
    </div>
  )
}

export default function VideoCallRoom({ session, onDisconnected }: VideoCallRoomProps) {
  return (
    <LiveKitRoom
      serverUrl={session.url}
      token={session.token}
      connect
      audio
      video
      onDisconnected={onDisconnected}
    >
      <CallUI />
    </LiveKitRoom>
  )
}
