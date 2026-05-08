import { test } from '@japa/runner'
import TrainerAthlete from '#models/trainer_athlete'
import User from '#models/user'
import ScheduledWorkout from '#models/scheduled_workout'
import Workout from '#models/workout'
import { PeriodizationService } from '#services/PeriodizationService'
import { CopilotPriorityService } from '#services/CopilotPriorityService'

function thenable<T>(value: T) {
  const b: any = {
    where: () => b,
    whereNotNull: () => b,
    whereIn: () => b,
    whereBetween: () => b,
    select: () => b,
    orderBy: () => b,
  }
  b.then = (resolve: any, reject: any) => Promise.resolve(value).then(resolve, reject)
  return b
}

test.group('CopilotPriorityService.list()', () => {
  test('возвращает пусто при отсутствии активных атлетов', async ({ assert }) => {
    const originalQuery = TrainerAthlete.query
    ;(TrainerAthlete as any).query = () => thenable([])

    try {
      const res = await CopilotPriorityService.list(1)
      assert.deepEqual(res, { needsAttention: [], total: 0 })
    } finally {
      ;(TrainerAthlete as any).query = originalQuery
    }
  })

  test('считает total и возвращает needsAttention только без плана', async ({ assert }) => {
    const originalTA = TrainerAthlete.query
    const originalUser = User.query
    const originalSW = ScheduledWorkout.query
    const originalW = Workout.query
    const originalPeriod = PeriodizationService.calculate

    ;(TrainerAthlete as any).query = () =>
      thenable([
        { athleteId: 10, nickname: null },
        { athleteId: 11, nickname: null },
      ])

    ;(User as any).query = () =>
      thenable([
        { id: 10, fullName: 'A', clientPreferences: {} },
        { id: 11, fullName: 'B', clientPreferences: {} },
      ])

    // athlete 11 has a plan this week
    ;(ScheduledWorkout as any).query = () =>
      thenable([
        { assignedTo: [{ type: 'athlete', id: 11, name: 'B' }] },
        { assignedTo: [] },
      ])

    // last workout dates: athlete 10 давно, athlete 11 недавно
    ;(Workout as any).query = () =>
      thenable([
        { userId: 10, date: { toJSDate: () => new Date(Date.now() - 10 * 86400_000) } },
        { userId: 11, date: { toJSDate: () => new Date(Date.now() - 1 * 86400_000) } },
      ])

    ;(PeriodizationService as any).calculate = async (id: number) => ({
      current: { tsb: id === 10 ? -18 : 0 },
      phase: { name: 'Накопление' },
    })

    try {
      const res = await CopilotPriorityService.list(1)
      assert.equal(res.total, 2)
      assert.lengthOf(res.needsAttention, 1)
      assert.equal(res.needsAttention[0].athleteId, 10)
      assert.equal(res.needsAttention[0].urgency, 'high')
    } finally {
      ;(TrainerAthlete as any).query = originalTA
      ;(User as any).query = originalUser
      ;(ScheduledWorkout as any).query = originalSW
      ;(Workout as any).query = originalW
      ;(PeriodizationService as any).calculate = originalPeriod
    }
  })
})

