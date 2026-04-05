import { useState, useCallback } from 'react'
import { callsApi, type CallSession } from '../api/calls'
import { withUnauthorizedRedirect } from '../api/http/baseApi'

interface UseVideoCallReturn {
  session: CallSession | null
  isConnecting: boolean
  startCallToAthlete: (athleteId: number) => Promise<void>
  startCallToGroup: (groupId: number) => Promise<void>
  joinCall: (roomName: string) => Promise<void>
  endCall: () => Promise<void>
  leaveCall: () => void
}

export function useVideoCall(): UseVideoCallReturn {
  const [session, setSession] = useState<CallSession | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const startCallToAthlete = useCallback(async (athleteId: number) => {
    setIsConnecting(true)
    try {
      const res = await withUnauthorizedRedirect(() => callsApi.callAthlete(athleteId))
      if (res) setSession(res.data)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const startCallToGroup = useCallback(async (groupId: number) => {
    setIsConnecting(true)
    try {
      const res = await withUnauthorizedRedirect(() => callsApi.callGroup(groupId))
      if (res) setSession(res.data)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const joinCall = useCallback(async (roomName: string) => {
    setIsConnecting(true)
    try {
      const res = await withUnauthorizedRedirect(() => callsApi.join(roomName))
      if (res) setSession(res.data)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const endCall = useCallback(async () => {
    if (!session) return
    await callsApi.endCall(session.callId)
    setSession(null)
  }, [session])

  const leaveCall = useCallback(() => {
    setSession(null)
  }, [])

  return { session, isConnecting, startCallToAthlete, startCallToGroup, joinCall, endCall, leaveCall }
}
