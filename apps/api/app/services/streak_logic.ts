import { DateTime } from 'luxon'

export type StreakMode = 'simple' | 'intensive'

export type WeeklyStreakStatus =
  | 'same_week'
  | 'week_completed'
  | 'week_continued'
  | 'week_broken'
  | 'started'

export interface WeeklyStreakUpdateComputation {
  status: WeeklyStreakStatus
  newCurrentStreak: number
  newLongestStreak: number
  newCurrentWeekWorkouts: number
  newCurrentWeekStart: DateTime
  newCurrentWeekCompleted: boolean
  newRecord: boolean
}

export const REQUIRED_WORKOUTS: Record<StreakMode, number> = {
  simple: 3,
  intensive: 5,
}

export interface WeeklyStreakParams {
  currentWeekStart: DateTime | null
  currentWeekWorkouts: number
  currentWeekCompleted: boolean
  workoutDate: DateTime
  currentStreak: number
  longestStreak: number
  mode: StreakMode
}

/**
 * Pure function — computes weekly streak state. No DB access, fully testable.
 *
 * A "completed week" = user logged >= required workouts in that ISO week (Mon–Sun).
 * Streak counts consecutive completed weeks.
 * current_week_completed prevents double-counting when mode changes mid-week.
 */
export function computeWeeklyStreakUpdate(p: WeeklyStreakParams): WeeklyStreakUpdateComputation {
  const required = REQUIRED_WORKOUTS[p.mode]
  const newWeekStart = p.workoutDate.startOf('week')

  // First ever workout
  if (p.currentWeekStart === null) {
    const weekWorkouts = 1
    const justCompleted = weekWorkouts >= required
    return {
      status: justCompleted ? 'week_completed' : 'started',
      newCurrentStreak: justCompleted ? 1 : 0,
      newLongestStreak: justCompleted ? Math.max(p.longestStreak, 1) : p.longestStreak,
      newCurrentWeekWorkouts: 1,
      newCurrentWeekStart: newWeekStart,
      newCurrentWeekCompleted: justCompleted,
      newRecord: justCompleted && p.longestStreak < 1,
    }
  }

  const prevWeekStart = DateTime.fromJSDate(p.currentWeekStart.toJSDate()).startOf('day')
  const isSameWeek = prevWeekStart.hasSame(newWeekStart.startOf('day'), 'day')

  if (isSameWeek) {
    const newWeekWorkouts = p.currentWeekWorkouts + 1
    // Only trigger completion once per week (current_week_completed guards double-count on mode switch)
    if (!p.currentWeekCompleted && newWeekWorkouts >= required) {
      const newStreak = p.currentStreak + 1
      const newLongest = Math.max(p.longestStreak, newStreak)
      return {
        status: 'week_completed',
        newCurrentStreak: newStreak,
        newLongestStreak: newLongest,
        newCurrentWeekWorkouts: newWeekWorkouts,
        newCurrentWeekStart: newWeekStart,
        newCurrentWeekCompleted: true,
        newRecord: newStreak > p.longestStreak,
      }
    }
    return {
      status: 'same_week',
      newCurrentStreak: p.currentStreak,
      newLongestStreak: p.longestStreak,
      newCurrentWeekWorkouts: newWeekWorkouts,
      newCurrentWeekStart: newWeekStart,
      newCurrentWeekCompleted: p.currentWeekCompleted,
      newRecord: false,
    }
  }

  // New week
  const weeksDiff = Math.round(newWeekStart.startOf('day').diff(prevWeekStart, 'weeks').weeks)

  if (weeksDiff === 1 && p.currentWeekCompleted) {
    // Previous week was completed — carry streak forward, start new week counter
    return {
      status: 'week_continued',
      newCurrentStreak: p.currentStreak,
      newLongestStreak: p.longestStreak,
      newCurrentWeekWorkouts: 1,
      newCurrentWeekStart: newWeekStart,
      newCurrentWeekCompleted: false,
      newRecord: false,
    }
  }

  // Broken: previous week not completed OR skipped weeks
  return {
    status: 'week_broken',
    newCurrentStreak: 0,
    newLongestStreak: p.longestStreak,
    newCurrentWeekWorkouts: 1,
    newCurrentWeekStart: newWeekStart,
    newCurrentWeekCompleted: false,
    newRecord: false,
  }
}
