import { DateTime } from 'luxon'

export type StreakStatus = 'same_day' | 'continued' | 'broken' | 'started'

export interface StreakUpdateComputation {
  status: StreakStatus
  newCurrentStreak: number
  newLongestStreak: number
  newRecord: boolean
}

/**
 * Pure function — computes the new streak state given dates and current counters.
 * No DB access, fully testable.
 */
export function computeStreakUpdate(
  lastDate: DateTime | null,
  currentDate: DateTime,
  currentStreak: number,
  longestStreak: number
): StreakUpdateComputation {
  if (!lastDate) {
    return { status: 'started', newCurrentStreak: 1, newLongestStreak: Math.max(longestStreak, 1), newRecord: longestStreak < 1 }
  }

  const last = lastDate.startOf('day')
  const current = currentDate.startOf('day')

  if (last.hasSame(current, 'day')) {
    return { status: 'same_day', newCurrentStreak: currentStreak, newLongestStreak: longestStreak, newRecord: false }
  }

  const daysDiff = Math.floor(current.diff(last, 'days').days)

  if (daysDiff === 1) {
    const newCurrent = currentStreak + 1
    const newLongest = Math.max(longestStreak, newCurrent)
    return { status: 'continued', newCurrentStreak: newCurrent, newLongestStreak: newLongest, newRecord: newCurrent > longestStreak }
  }

  // broken
  return { status: 'broken', newCurrentStreak: 1, newLongestStreak: longestStreak, newRecord: false }
}
