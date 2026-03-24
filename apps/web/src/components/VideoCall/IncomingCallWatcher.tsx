import { useEffect, useState, useCallback, useRef } from 'react'
import { callsApi, type VideoCall } from '../../api/calls'
import { useVideoCall } from '../../hooks/useVideoCall'
import IncomingCall from './IncomingCall'
import VideoCallRoom from './VideoCallRoom'

const POLL_INTERVAL = 8000

/**
 * Mount this once inside the athlete's layout.
 * Polls for active incoming calls and shows the IncomingCall banner.
 */
export default function IncomingCallWatcher() {
  const [incomingCall, setIncomingCall] = useState<VideoCall | null>(null)
  const { session, joinCall, leaveCall } = useVideoCall()

  // Rooms the user has dismissed (declined or left) — won't show again
  const dismissedRooms = useRef<Set<string>>(new Set())

  const poll = useCallback(async () => {
    try {
      const res = await callsApi.getActiveCall()
      const call = res.data ?? null
      if (call && dismissedRooms.current.has(call.roomName)) return
      setIncomingCall(call)
    } catch {
      // ignore network errors silently
    }
  }, [])

  useEffect(() => {
    if (session) return
    poll()
    const id = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [poll, session])

  const handleAccept = async () => {
    if (!incomingCall) return
    setIncomingCall(null)
    await joinCall(incomingCall.roomName)
  }

  const handleDecline = () => {
    if (incomingCall) dismissedRooms.current.add(incomingCall.roomName)
    setIncomingCall(null)
  }

  const handleDisconnected = () => {
    if (session) dismissedRooms.current.add(session.roomName)
    leaveCall()
  }

  return (
    <>
      {incomingCall && !session && (
        <IncomingCall
          call={incomingCall}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}
      {session && (
        <VideoCallRoom
          session={session}
          onDisconnected={handleDisconnected}
        />
      )}
    </>
  )
}
