export type CallStatus = 'pending' | 'active' | 'ended'

export interface ExistingCall {
  status: CallStatus
}

export interface CallAction {
  /** Should a LiveKit room be (re)created */
  shouldCreateRoom: boolean
  /** Should the DB record be reset to pending (and saved) */
  shouldResetCall: boolean
  /** Should a push notification be sent to the athlete(s) */
  shouldNotify: boolean
}

/**
 * Pure function — decides what to do when a trainer initiates a call.
 *
 * @param existingCall  The current VideoCall DB record, or null if none exists.
 * @param roomAlive     Whether the LiveKit room currently exists.
 *                      Only meaningful when existingCall is non-null and status !== 'ended'.
 */
export function computeCallAction(
  existingCall: ExistingCall | null,
  roomAlive: boolean
): CallAction {
  // No record at all — fresh call
  if (!existingCall) {
    return { shouldCreateRoom: true, shouldResetCall: false, shouldNotify: true }
  }

  // Previous call was explicitly ended — start over
  if (existingCall.status === 'ended') {
    return { shouldCreateRoom: true, shouldResetCall: true, shouldNotify: true }
  }

  // Call is pending/active in DB but LiveKit room is gone (e.g. auto-deleted after 5 min empty)
  // — recreate and re-notify so the athlete hears about it
  if (!roomAlive) {
    return { shouldCreateRoom: true, shouldResetCall: true, shouldNotify: true }
  }

  // Room is alive and call is in progress — nothing to do
  return { shouldCreateRoom: false, shouldResetCall: false, shouldNotify: false }
}
