/**
 * XP и система уровней — чистые функции, без зависимостей от БД.
 *
 * Уровни: 1–100
 * Формула: XP для уровня N = 100 * N^1.6  (квадратичная прогрессия)
 * Итого до 100 уровня ≈ 100 * sum(1^1.6..100^1.6) ≈ ~220 000 XP
 */

export interface LevelInfo {
  level: number
  levelName: string
  xp: number
  xpForCurrentLevel: number
  xpForNextLevel: number
  progressPct: number
}

function getLevelName(level: number): string {
  if (level >= 76) return 'Легенда'
  if (level >= 51) return 'Элита'
  if (level >= 31) return 'Профи'
  if (level >= 16) return 'Атлет'
  if (level >= 6) return 'Любитель'
  return 'Новичок'
}

/**
 * XP необходимый для достижения конкретного уровня (порог входа в этот уровень).
 * Уровень 1 начинается с 0 XP.
 */
export function xpThresholdForLevel(level: number): number {
  if (level <= 1) return 0
  // Сумма XP до уровня level: sum_{i=1}^{level-1} floor(100 * i^1.6)
  let total = 0
  for (let i = 1; i < level; i++) {
    total += Math.floor(100 * Math.pow(i, 1.6))
  }
  return total
}

/**
 * XP нужный для перехода с уровня level на level+1
 */
export function xpForLevelUp(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.6))
}

/**
 * Вычислить уровень и прогресс по накопленным XP.
 */
export function computeLevel(xp: number): LevelInfo {
  let level = 1
  while (level < 100 && xp >= xpThresholdForLevel(level + 1)) {
    level++
  }

  const xpForCurrent = xpThresholdForLevel(level)
  const xpForNext = level < 100 ? xpThresholdForLevel(level + 1) : xpForCurrent + xpForLevelUp(level)
  const xpInLevel = xp - xpForCurrent
  const xpNeededInLevel = xpForNext - xpForCurrent
  const progressPct = xpNeededInLevel > 0 ? Math.min(100, Math.round((xpInLevel / xpNeededInLevel) * 100)) : 100

  return {
    level,
    levelName: getLevelName(level),
    xp,
    xpForCurrentLevel: xpForCurrent,
    xpForNextLevel: xpForNext,
    progressPct,
  }
}

/** XP за события */
export const XP_REWARDS = {
  WORKOUT_COMPLETED: 10,
  WEEK_COMPLETED: 25,
  STREAK_RECORD: 50,
  ACHIEVEMENT_SMALL: 30,   // streak/social ачивки
  ACHIEVEMENT_MEDIUM: 75,  // workout/usage ачивки
  ACHIEVEMENT_LARGE: 150,  // progress ачивки
  PERSONAL_RECORD: 75,
} as const

export type XpRewardKey = keyof typeof XP_REWARDS
