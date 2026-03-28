import { VideoCameraIcon } from '@heroicons/react/24/outline'
import AccentButton from '../ui/AccentButton'
import { useVideoCall } from '../../hooks/useVideoCall'
import VideoCallRoom, { DisconnectReason } from './VideoCallRoom'
import toast from 'react-hot-toast'

interface CallButtonProps {
  athleteId?: number
  groupId?: number
}

export default function CallButton({ athleteId, groupId }: CallButtonProps) {
  const { session, isConnecting, startCallToAthlete, startCallToGroup, endCall, leaveCall } =
    useVideoCall()

  const handleStart = async () => {
    if (athleteId) await startCallToAthlete(athleteId)
    else if (groupId) await startCallToGroup(groupId)
  }

  return (
    <>
      <AccentButton
        size="md"
        onClick={handleStart}
        loading={isConnecting}
        loadingText="Подключение…"
        className="font-medium"
      >
        <VideoCameraIcon className="w-4 h-4" />
        Звонок
      </AccentButton>

      {session && (
        <VideoCallRoom
          session={session}
          onDisconnected={(reason) => {
            if (reason === DisconnectReason.ROOM_DELETED) {
              // Athlete ended the call — room already deleted on server
              toast('Атлет завершил звонок', { icon: '📵' })
              leaveCall()
            } else {
              // Trainer pressed leave — clean up on server
              endCall().catch(() => {})
              leaveCall()
            }
          }}
        />
      )}
    </>
  )
}
