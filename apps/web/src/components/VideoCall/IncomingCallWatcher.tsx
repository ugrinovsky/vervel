import { useEffect, useState, useCallback, useRef } from 'react'
import { callsApi, type VideoCall } from '../../api/calls'
import { useVideoCall } from '../../hooks/useVideoCall'
import IncomingCall from './IncomingCall'
import VideoCallRoom, { DisconnectReason } from './VideoCallRoom'
import toast from 'react-hot-toast'

const POLL_INTERVAL = 8000
const TOAST_ID = 'incoming-call'

/**
 * Mount this once inside the athlete's layout.
 * Polls for active incoming calls and shows the IncomingCall banner via toast.custom().
 */
export default function IncomingCallWatcher() {
  const [activeCall, setActiveCall] = useState<VideoCall | null>(null)
  const acceptedCallRef = useRef<VideoCall | null>(null)
  const { session, joinCall, leaveCall } = useVideoCall()

  const dismissedKey = (call: { id: number; updatedAt: string }) =>
    `${call.id}:${call.updatedAt}`

  const isDismissed = (call: { id: number; updatedAt: string }): boolean => {
    try {
      const stored = sessionStorage.getItem('dismissedCalls')
      const keys: string[] = stored ? JSON.parse(stored) : []
      return keys.includes(dismissedKey(call))
    } catch {
      return false
    }
  }

  const addDismissed = (call: { id: number; updatedAt: string }) => {
    try {
      const stored = sessionStorage.getItem('dismissedCalls')
      const keys: string[] = stored ? JSON.parse(stored) : []
      if (!keys.includes(dismissedKey(call))) keys.push(dismissedKey(call))
      sessionStorage.setItem('dismissedCalls', JSON.stringify(keys))
    } catch {}
  }

  const showIncomingToast = useCallback((call: VideoCall) => {
    toast.custom(
      () => (
        <IncomingCall
          call={call}
          onAccept={() => {
            toast.dismiss(TOAST_ID)
            acceptedCallRef.current = call
            setActiveCall(call)
            joinCall(call.roomName)
          }}
          onDecline={() => {
            toast.dismiss(TOAST_ID)
            addDismissed(call)
            callsApi.declineCall(call.roomName).catch(() => {})
          }}
        />
      ),
      { id: TOAST_ID, duration: Infinity }
    )
  }, [joinCall])

  const poll = useCallback(async () => {
    try {
      const res = await callsApi.getActiveCall()
      const call = res.data ?? null
      if (!call || isDismissed(call)) {
        toast.dismiss(TOAST_ID)
        setActiveCall(null)
        return
      }
      setActiveCall((prev) => {
        if (prev?.id === call.id && prev?.updatedAt === call.updatedAt) return prev
        showIncomingToast(call)
        return call
      })
    } catch {
      // ignore network errors silently
    }
  }, [showIncomingToast])

  useEffect(() => {
    if (session) return
    poll()
    const id = setInterval(poll, POLL_INTERVAL)
    return () => {
      clearInterval(id)
      toast.dismiss(TOAST_ID)
    }
  }, [poll, session])

  const handleDisconnected = (reason?: DisconnectReason) => {
    const call = acceptedCallRef.current
    if (call) {
      addDismissed(call)
      if (reason === DisconnectReason.ROOM_DELETED) {
        toast('Тренер завершил звонок', { icon: '📵' })
      } else if (!call.groupId) {
        callsApi.declineCall(call.roomName).catch(() => {})
      }
    }
    acceptedCallRef.current = null
    setActiveCall(null)
    leaveCall()
  }

  return session ? (
    <VideoCallRoom
      session={session}
      onDisconnected={handleDisconnected}
    />
  ) : null
}
