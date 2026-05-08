import { test } from '@japa/runner'
import ScheduledWorkout from '#models/scheduled_workout'
import { ExerciseCatalog } from '#services/ExerciseCatalog'
import { AthleteCopilotPlanService } from '#services/AthleteCopilotPlanService'

function thenable<T>(value: T) {
  const b: any = {
    where: () => b,
    whereBetween: () => b,
    orderBy: () => b,
  }
  b.then = (resolve: any, reject: any) => Promise.resolve(value).then(resolve, reject)
  return b
}

test.group('AthleteCopilotPlanService.build()', () => {
  test('trainer items имеют приоритет и rest_day фильтруется', async ({ assert }) => {
    const originalSW = ScheduledWorkout.query
    const originalCatalog = ExerciseCatalog.all

    ;(ScheduledWorkout as any).query = () =>
      thenable([
        {
          id: 1,
          workoutData: { type: 'rest_day', exercises: [] },
          scheduledDate: { toJSDate: () => new Date('2026-05-04T10:00:00Z') },
        },
        {
          id: 2,
          workoutData: { type: 'bodybuilding', exercises: [{ name: 'Push-up' }] },
          scheduledDate: { toJSDate: () => new Date('2026-05-06T10:00:00Z') },
        },
      ])

    ;(ExerciseCatalog as any).all = () => [
      { title: 'Run', zones: ['legs'], category: 'cardio' },
      { title: 'Bench', zones: ['chests'], category: 'strength' },
      { title: 'Row', zones: ['back'], category: 'strength' },
    ]

    try {
      const res = await AthleteCopilotPlanService.build({
        athleteId: 10,
        trainerId: 99,
        weekStart: '2026-05-04',
        workoutFrequency: 3,
        insights: {
          athleteId: 10,
          phase: 'maintenance',
          phaseEmoji: '➡️',
          phaseAdvice: 'ok',
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

      // Should contain at least one trainer-sourced day
      assert.isTrue(res.weekItems.some((i) => i.source === 'trainer'))
      // rest_day should not appear as a training item
      assert.isFalse(
        res.weekItems.some((i) => i.source === 'trainer' && i.title === 'Отдых'),
        'rest_day не должен попадать в trainerItems'
      )
    } finally {
      ;(ScheduledWorkout as any).query = originalSW
      ;(ExerciseCatalog as any).all = originalCatalog
    }
  })

  test('pickExercises исключает перегруженные зоны', async ({ assert }) => {
    const originalCatalog = ExerciseCatalog.all
    ;(ExerciseCatalog as any).all = () => [
      { title: 'Bench', zones: ['chests'], category: 'strength' },
      { title: 'Row', zones: ['back'], category: 'strength' },
      { title: 'Curl', zones: ['biceps'], category: 'strength' },
    ]

    try {
      const plan = await AthleteCopilotPlanService.build({
        athleteId: 10,
        trainerId: null,
        weekStart: '2026-05-04',
        workoutFrequency: 3,
        insights: {
          athleteId: 10,
          phase: 'maintenance',
          phaseEmoji: '➡️',
          phaseAdvice: 'ok',
          tsb: 0,
          atl: 0,
          ctl: 0,
          acwrZone: 'insufficient_data',
          overloadedZones: ['chests'],
          daysSinceLastWorkout: 1,
          daysSinceLastPlan: 0,
          recentWorkoutsCount: 10,
          coldStart: false,
        },
      })

      const allExercises = plan.weekItems.flatMap((i) => i.draftWorkoutData?.exercises ?? [])
      assert.isFalse(allExercises.some((e) => e.zones?.includes('chests')))
    } finally {
      ;(ExerciseCatalog as any).all = originalCatalog
    }
  })
})

