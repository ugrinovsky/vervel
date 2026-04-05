import { createApi } from './http/baseApi'

// Video-call requests must never trigger the global 401 redirect: cleanup (end/decline),
// LiveKit disconnect races, and polling can hit 401 without a real logout. Start/join
// handle 401 explicitly in useVideoCall.
const callsHttp = createApi({ redirectOn401: false })

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
    callsHttp.post<CallSession>('/trainer/calls', { athleteId }),

  /** Trainer: start a call to a group */
  callGroup: (groupId: number) =>
    callsHttp.post<CallSession>('/trainer/calls', { groupId }),

  /** Trainer: end a call */
  endCall: (callId: number) =>
    callsHttp.post<{ message: string }>(`/trainer/calls/${callId}/end`),

  /** Trainer: call history */
  trainerHistory: () =>
    callsHttp.get<VideoCall[]>('/trainer/calls'),

  /** Anyone: join an existing call by roomName */
  join: (roomName: string) =>
    callsHttp.post<CallSession>(`/calls/${encodeURIComponent(roomName)}/join`),

  /** Athlete: decline an incoming call */
  declineCall: (roomName: string) =>
    callsHttp.post<{ message: string }>(`/calls/${encodeURIComponent(roomName)}/decline`),

  /** Athlete: get active incoming call */
  getActiveCall: () =>
    callsHttp.get<VideoCall | null>('/athlete/calls/active'),
}
