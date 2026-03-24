import { useEffect, useState, useCallback } from 'react'
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

  const getDismissed = (): Set<string> => {
    try {
      const stored = sessionStorage.getItem('dismissedCalls')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  }

  const addDismissed = (roomName: string) => {
    try {
      const set = getDismissed()
      set.add(roomName)
      sessionStorage.setItem('dismissedCalls', JSON.stringify([...set]))
    } catch {}
  }

  const poll = useCallback(async () => {
    try {
      const res = await callsApi.getActiveCall()
      const call = res.data ?? null
      if (call && getDismissed().has(call.roomName)) return
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
    if (incomingCall) addDismissed(incomingCall.roomName)
    setIncomingCall(null)
  }

  const handleDisconnected = () => {
    if (session) addDismissed(session.roomName)
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
