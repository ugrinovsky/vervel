import { privateApi } from './http/privateApi'
import { createApi } from './http/baseApi'

// Background polling must NOT redirect on 401 — a silent 401 during polling
// would kick the user to /login in the middle of an active session.
const silentApi = createApi({ redirectOn401: false })

export interface CallSession {
  callId: number
  roomName: string
  token: string
  url: string
}

export interface VideoCall {
  id: number
  roomName: string
  trainerId: number
  athleteId: number | null
  groupId: number | null
  status: 'pending' | 'active' | 'ended'
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  updatedAt: string
  trainer?: { id: number; fullName: string | null; photoUrl: string | null }
  athlete?: { id: number; fullName: string | null; photoUrl: string | null }
  group?: { id: number; name: string }
}

export const callsApi = {
  /** Trainer: start a call to an athlete */
  callAthlete: (athleteId: number) =>
    privateApi.post<CallSession>('/trainer/calls', { athleteId }),

  /** Trainer: start a call to a group */
  callGroup: (groupId: number) =>
    privateApi.post<CallSession>('/trainer/calls', { groupId }),

  /** Trainer: end a call */
  endCall: (callId: number) =>
    privateApi.post<{ message: string }>(`/trainer/calls/${callId}/end`),

  /** Trainer: call history */
  trainerHistory: () =>
    privateApi.get<VideoCall[]>('/trainer/calls'),

  /** Anyone: join an existing call by roomName */
  join: (roomName: string) =>
    privateApi.post<CallSession>(`/calls/${roomName}/join`),

  /** Athlete: decline an incoming call */
  declineCall: (roomName: string) =>
    privateApi.post<{ message: string }>(`/calls/${roomName}/decline`),

  /** Athlete: get active incoming call */
  getActiveCall: () =>
    silentApi.get<VideoCall | null>('/athlete/calls/active'),
}
