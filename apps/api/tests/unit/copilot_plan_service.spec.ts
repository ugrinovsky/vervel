import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import ScheduledWorkout from '#models/scheduled_workout'
import { YandexAiService } from '#services/YandexAiService'
import { CopilotPlanService } from '#services/CopilotPlanService'
import { clock } from '#utils/date'

function thenable<T>(value: T) {
  const b: any = {
    where: () => b,
    whereBetween: () => b,
    orderBy: () => b,
  }
  b.then = (resolve: any, reject: any) => Promise.resolve(value).then(resolve, reject)
  return b
}

test.group('CopilotPlanService.build()', () => {
  test('возвращает пустые даты если freeSessions=0 (все уже запланировано)', async ({ assert }) => {
    const originalQuery = ScheduledWorkout.query
    ;(ScheduledWorkout as any).query = () =>
      thenable([
        // simulate 3 existing workouts offsets -> freeSessions becomes 0 for default 3/week
        { scheduledDate: { toJSDate: () => new Date() } },
        { scheduledDate: { toJSDate: () => new Date() } },
        { scheduledDate: { toJSDate: () => new Date() } },
      ])

    try {
      const res = await CopilotPlanService.build({
        trainerId: 1,
        athleteId: 2,
        weekStart: '2026-05-04',
        insights: {
          athleteId: 2,
          phase: 'maintenance',
          phaseEmoji: '',
          phaseAdvice: '',
          tsb: 0,
          atl: 0,
          ctl: 0,
          acwrZone: 'insufficient_data',
          overloadedZones: [],
          daysSinceLastWorkout: 1,
          daysSinceLastPlan: 0,
          recentWorkoutsCount: 10,
          coldStart: false,
        },
      })

      assert.deepEqual(res.suggestedDates, [])
      assert.include(res.chatMessage, 'уже запланированы')
    } finally {
      ;(ScheduledWorkout as any).query = originalQuery
    }
  })

  test('если AI падает — использует fallback сообщение', async ({ assert }) => {
    const originalQuery = ScheduledWorkout.query
    const originalAi = YandexAiService.generateCopilotMessage
    const originalNow = clock.now
    ;(ScheduledWorkout as any).query = () => thenable([])
    ;(YandexAiService as any).generateCopilotMessage = async () => {
      throw new Error('boom')
    }
    clock.now = () => DateTime.fromISO('2026-05-01')

    try {
      const res = await CopilotPlanService.build({
        trainerId: 1,
        athleteId: 2,
        weekStart: '2026-05-04',
        insights: {
          athleteId: 2,
          phase: 'maintenance',
          phaseEmoji: '',
          phaseAdvice: '',
          tsb: 0,
          atl: 0,
          ctl: 0,
          acwrZone: 'insufficient_data',
          overloadedZones: [],
          daysSinceLastWorkout: 1,
          daysSinceLastPlan: 0,
          recentWorkoutsCount: 10,
          coldStart: false,
        },
      })

      assert.isTrue(res.suggestedDates.length > 0)
      assert.include(res.chatMessage, 'Запланировал тренировки')
    } finally {
      ;(ScheduledWorkout as any).query = originalQuery
      ;(YandexAiService as any).generateCopilotMessage = originalAi
      clock.now = originalNow
    }
  })
})

