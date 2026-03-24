import { useLocalParticipant, useRoomContext } from '@livekit/components-react'

/**
 * Base hook for call controls — mic/camera toggles and leave.
 * Works inside any LiveKitRoom context.
 */
export function useCallControls(onLeave?: () => void) {
  const room = useRoomContext()
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant()

  const toggleMic = () => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
  const toggleCamera = () => localParticipant.setCameraEnabled(!isCameraEnabled)

  const leave = () => {
    room.disconnect()
    onLeave?.()
  }

  return { isMicEnabled: isMicrophoneEnabled, isCameraEnabled, toggleMic, toggleCamera, leave }
}
