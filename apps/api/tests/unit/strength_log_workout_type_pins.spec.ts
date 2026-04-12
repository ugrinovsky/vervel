import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Workout from '#models/workout'
import UserPinnedExercise from '#models/user_pinned_exercise'
import { ProgressionService } from '#services/ProgressionService'

let userCounter = 0

async function createTestUser(): Promise<User> {
  userCounter++
  return User.create({
    email: `test-strength-log-wt-${userCounter}-${Date.now()}@example.com`,
    password: null,
    fullName: `Test ${userCounter}`,
    role: 'athlete',
    balance: 100,
    aiNotesFree: false,
    xp: 0,
  })
}

async function cleanupUser(userId: number) {
  await db.from('user_pinned_exercises').where('user_id', userId).delete()
  await db.from('workouts').where('user_id', userId).delete()
  await db.from('user_exercise_standard_aliases').where('user_id', userId).delete()
  await db.from('user_exercise_standards').where('user_id', userId).delete()
  await db.from('users').where('id', userId).delete()
}

async function createStrengthWorkout(params: {
  userId: number
  dateIso: string
  workoutType: 'bodybuilding' | 'crossfit' | 'cardio'
  exerciseId: string
  weight: number
  reps?: number
}) {
  const { userId, dateIso, workoutType, exerciseId, weight, reps = 5 } = params
  await Workout.create({
    userId,
    date: DateTime.fromISO(dateIso),
    workoutType,
    exercises: [
      {
        exerciseId,
        type: 'strength',
        sets: [{ id: 's1', reps, weight }],
      },
    ],
    zonesLoad: {},
    totalIntensity: 0,
    totalVolume: 0,
    notes: undefined,
    rpe: null,
    scheduledWorkoutId: null,
  })
}

test.group('ProgressionService: strength log split by workoutType and pins', (group) => {
  let user: User

  group.each.setup(async () => {
    user = await createTestUser()
  })

  group.each.teardown(async () => {
    await cleanupUser(user.id)
  })

  test('getStrengthLog: один exerciseId → разные карточки по workoutType', async ({ assert }) => {
    await createStrengthWorkout({
      userId: user.id,
      dateIso: '2026-01-01T10:00:00.000Z',
      workoutType: 'bodybuilding',
      exerciseId: 'Pull-Up',
      weight: 20,
    })
    await createStrengthWorkout({
      userId: user.id,
      dateIso: '2026-01-02T10:00:00.000Z',
      workoutType: 'crossfit',
      exerciseId: 'Pull-Up',
      weight: 20,
    })

    const log = await ProgressionService.getStrengthLog(user.id)
    const ids = log.entries.map((e) => e.exerciseId)
    assert.include(ids, 'Pull-Up|wt:bodybuilding')
    assert.include(ids, 'Pull-Up|wt:crossfit')

    const bb = log.entries.find((e) => e.exerciseId === 'Pull-Up|wt:bodybuilding')
    const cf = log.entries.find((e) => e.exerciseId === 'Pull-Up|wt:crossfit')
    assert.equal(bb?.workoutType, 'bodybuilding')
    assert.equal(cf?.workoutType, 'crossfit')
  })

  test('pins: закрепление для типа не влияет на другие типы', async ({ assert }) => {
    await createStrengthWorkout({
      userId: user.id,
      dateIso: '2026-01-01T10:00:00.000Z',
      workoutType: 'bodybuilding',
      exerciseId: 'Pull-Up',
      weight: 20,
    })
    await createStrengthWorkout({
      userId: user.id,
      dateIso: '2026-01-02T10:00:00.000Z',
      workoutType: 'crossfit',
      exerciseId: 'Pull-Up',
      weight: 20,
    })

    await ProgressionService.replaceStrengthLogPins(user.id, ['Pull-Up|wt:bodybuilding'])
    const log = await ProgressionService.getStrengthLog(user.id)

    assert.deepEqual(log.pinnedExerciseIds, ['Pull-Up|wt:bodybuilding'])
    assert.deepEqual(
      log.entries.map((e) => e.exerciseId),
      ['Pull-Up|wt:bodybuilding']
    )
    assert.equal(log.entries[0]?.workoutType, 'bodybuilding')
  })

  test('backward compat: старый пин без |wt: трактуется как bodybuilding', async ({ assert }) => {
    await createStrengthWorkout({
      userId: user.id,
      dateIso: '2026-01-01T10:00:00.000Z',
      workoutType: 'bodybuilding',
      exerciseId: 'Pull-Up',
      weight: 20,
    })
    await createStrengthWorkout({
      userId: user.id,
      dateIso: '2026-01-02T10:00:00.000Z',
      workoutType: 'crossfit',
      exerciseId: 'Pull-Up',
      weight: 20,
    })

    // Имитируем старое значение в таблице (без суффикса)
    await UserPinnedExercise.create({ userId: user.id, exerciseId: 'Pull-Up' })

    const log = await ProgressionService.getStrengthLog(user.id)
    assert.deepEqual(log.pinnedExerciseIds, ['Pull-Up|wt:bodybuilding'])
    assert.deepEqual(
      log.entries.map((e) => e.exerciseId),
      ['Pull-Up|wt:bodybuilding']
    )
  })

  test('pins: закрепление Romanian_Deadlift|wt: включает custom:румынская тяга при эталоне с каталогом', async ({
    assert,
  }) => {
    await ProgressionService.createExerciseStandard(user.id, 'Румынская тяга', 'Romanian_Deadlift')
    await createStrengthWorkout({
      userId: user.id,
      dateIso: '2026-01-01T10:00:00.000Z',
      workoutType: 'bodybuilding',
      exerciseId: 'Romanian_Deadlift',
      weight: 50,
    })
    await Workout.create({
      userId: user.id,
      date: DateTime.fromISO('2026-01-03T10:00:00.000Z'),
      workoutType: 'bodybuilding',
      exercises: [
        {
          exerciseId: 'custom:румынская тяга',
          type: 'strength',
          name: 'Румынская тяга',
          sets: [{ id: 's1', reps: 5, weight: 55 }],
        },
      ],
      zonesLoad: {},
      totalIntensity: 0,
      totalVolume: 0,
      notes: undefined,
      rpe: null,
      scheduledWorkoutId: null,
    })
    await ProgressionService.replaceStrengthLogPins(user.id, ['Romanian_Deadlift|wt:bodybuilding'])
    const log = await ProgressionService.getStrengthLog(user.id)
    assert.equal(log.entries.length, 1)
    assert.equal(log.entries[0]?.sessions.length, 2)
  })
})
