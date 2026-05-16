import { test } from '@japa/runner'
import User from '#models/user'
import TrainerAthlete from '#models/trainer_athlete'
import TrainerAthletePass from '#models/trainer_athlete_pass'
import TrainerAthletePassUsage from '#models/trainer_athlete_pass_usage'
import Workout from '#models/workout'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

// ─── helpers ──────────────────────────────────────────────────────────────────

async function makeTrainer(email = 'pass_trainer@test.ru') {
  const user = await User.firstOrCreate(
    { email },
    { password: 'password', role: 'trainer' }
  )
  if (user.role !== 'trainer') { user.role = 'trainer'; await user.save() }
  return user
}

async function makeAthlete(email = 'pass_athlete@test.ru') {
  const user = await User.firstOrCreate(
    { email },
    { password: 'password', role: 'athlete' }
  )
  if (user.role !== 'athlete') { user.role = 'athlete'; await user.save() }
  return user
}

async function linkAthleteToTrainer(trainerId: number, athleteId: number) {
  return TrainerAthlete.firstOrCreate(
    { trainerId, athleteId },
    { status: 'active', crmStatus: 'active' }
  )
}

async function createPass(trainerAthleteId: number, overrides: Partial<{
  sessionsTotal: number
  priceAmount: number
  validUntil: DateTime | null
  status: 'active' | 'depleted' | 'expired' | 'cancelled'
}> = {}) {
  return TrainerAthletePass.create({
    trainerAthleteId,
    title: 'Тестовый абонемент',
    priceAmount: overrides.priceAmount ?? 5000,
    sessionsTotal: overrides.sessionsTotal ?? 8,
    validFrom: DateTime.now().startOf('day'),
    validUntil: overrides.validUntil ?? null,
    status: overrides.status ?? 'active',
    notes: null,
  })
}

async function createWorkout(userId: number, scheduledWorkoutId: number | null = null) {
  return Workout.create({
    userId,
    date: DateTime.now(),
    workoutType: 'crossfit',
    exercises: [],
    zonesLoad: {},
    zonesLoadAbs: {},
    totalIntensity: 0,
    totalVolume: 0,
    notes: '',
    scheduledWorkoutId,
    isDetached: false,
  })
}

async function cleanPasses() {
  await db.from('trainer_athlete_pass_usages').delete()
  await db.from('trainer_athlete_passes').delete()
}

// ─── Тесты ────────────────────────────────────────────────────────────────────

test.group('Passes: авторизация', () => {
  test('GET /trainer/athletes/:id/passes → 401 без авторизации', async ({ client }) => {
    const res = await client.get('/trainer/athletes/1/passes')
    res.assertStatus(401)
  })

  test('POST /trainer/athletes/:id/passes → 401 без авторизации', async ({ client }) => {
    const res = await client.post('/trainer/athletes/1/passes').json({})
    res.assertStatus(401)
  })

  test('POST /trainer/passes/1/usages → 401 без авторизации', async ({ client }) => {
    const res = await client.post('/trainer/passes/1/usages').json({})
    res.assertStatus(401)
  })
})

test.group('Passes: создание', (group) => {
  group.each.setup(cleanPasses)

  test('POST создаёт абонемент и возвращает корректные поля', async ({ client, assert }) => {
    const trainer = await makeTrainer()
    const athlete = await makeAthlete()
    await linkAthleteToTrainer(trainer.id, athlete.id)

    const res = await client
      .post(`/trainer/athletes/${athlete.id}/passes`)
      .loginAs(trainer)
      .json({ priceAmount: 5000, sessionsTotal: 8 })

    res.assertStatus(201)
    assert.equal(res.body().data.sessionsTotal, 8)
    assert.equal(res.body().data.sessionsUsed, 0)
    assert.equal(res.body().data.sessionsLeft, 8)
    assert.equal(res.body().data.status, 'active')
    assert.approximately(Number(res.body().data.priceAmount), 5000, 0.01)
  })

  test('POST → 400 если priceAmount отсутствует', async ({ client }) => {
    const trainer = await makeTrainer()
    const athlete = await makeAthlete()
    await linkAthleteToTrainer(trainer.id, athlete.id)

    const res = await client
      .post(`/trainer/athletes/${athlete.id}/passes`)
      .loginAs(trainer)
      .json({ sessionsTotal: 8 })

    res.assertStatus(400)
  })

  test('POST → 400 если sessionsTotal < 1', async ({ client }) => {
    const trainer = await makeTrainer()
    const athlete = await makeAthlete()
    await linkAthleteToTrainer(trainer.id, athlete.id)

    const res = await client
      .post(`/trainer/athletes/${athlete.id}/passes`)
      .loginAs(trainer)
      .json({ priceAmount: 1000, sessionsTotal: 0 })

    res.assertStatus(400)
  })

  test('POST → 404 если атлет не привязан к тренеру', async ({ client }) => {
    const trainer = await makeTrainer()
    const stranger = await makeAthlete('stranger_pass@test.ru')

    const res = await client
      .post(`/trainer/athletes/${stranger.id}/passes`)
      .loginAs(trainer)
      .json({ priceAmount: 1000, sessionsTotal: 4 })

    res.assertStatus(404)
  })

  test('GET возвращает список абонементов', async ({ client, assert }) => {
    const trainer = await makeTrainer()
    const athlete = await makeAthlete()
    const ta = await linkAthleteToTrainer(trainer.id, athlete.id)
    await createPass(ta.id)

    const res = await client
      .get(`/trainer/athletes/${athlete.id}/passes`)
      .loginAs(trainer)

    res.assertStatus(200)
    assert.isArray(res.body().data)
    assert.equal(res.body().data.length, 1)
  })
})

test.group('Passes: редактирование', (group) => {
  group.each.setup(cleanPasses)

  test('PATCH обновляет title и notes', async ({ client, assert }) => {
    const trainer = await makeTrainer()
    const athlete = await makeAthlete()
    const ta = await linkAthleteToTrainer(trainer.id, athlete.id)
    const pass = await createPass(ta.id)

    const res = await client
      .patch(`/trainer/passes/${pass.id}`)
      .loginAs(trainer)
      .json({ title: 'Новое название', notes: 'Оплатил картой' })

    res.assertStatus(200)
    assert.equal(res.body().data.title, 'Новое название')
    assert.equal(res.body().data.notes, 'Оплатил картой')
  })

  test('PATCH → 422 при попытке изменить sessionsTotal после списания', async ({ client }) => {
    const trainer = await makeTrainer()
    const athlete = await makeAthlete()
    const ta = await linkAthleteToTrainer(trainer.id, athlete.id)
    const pass = await createPass(ta.id)
    const workout = await createWorkout(athlete.id)

    await TrainerAthletePassUsage.create({
      passId: pass.id,
      workoutId: workout.id,
      scheduledWorkoutId: null,
      consumedAt: DateTime.now(),
    })

    const res = await client
      .patch(`/trainer/passes/${pass.id}`)
      .loginAs(trainer)
      .json({ sessionsTotal: 10 })

    res.assertStatus(422)
  })

  test('PATCH отменяет абонемент', async ({ client, assert }) => {
    const trainer = await makeTrainer()
    const athlete = await makeAthlete()
    const ta = await linkAthleteToTrainer(trainer.id, athlete.id)
    const pass = await createPass(ta.id)

    const res = await client
      .patch(`/trainer/passes/${pass.id}`)
      .loginAs(trainer)
      .json({ status: 'cancelled' })

    res.assertStatus(200)
    assert.equal(res.body().data.status, 'cancelled')
  })
})

test.group('Passes: списание занятий', (group) => {
  group.each.setup(cleanPasses)

  test('POST /usages списывает занятие и уменьшает остаток', async ({ client, assert }) => {
    const trainer = await makeTrainer()
    const athlete = await makeAthlete()
    const ta = await linkAthleteToTrainer(trainer.id, athlete.id)
    const pass = await createPass(ta.id, { sessionsTotal: 4 })
    const workout = await createWorkout(athlete.id)

    const res = await client
      .post(`/trainer/passes/${pass.id}/usages`)
      .loginAs(trainer)
      .json({ workoutId: workout.id })

    res.assertStatus(200)
    assert.equal(res.body().data.sessionsUsed, 1)
    assert.equal(res.body().data.sessionsLeft, 3)
    assert.equal(res.body().data.status, 'active')
  })

  test('Последнее занятие переводит пасс в depleted', async ({ client, assert }) => {
    const trainer = await makeTrainer()
    const athlete = await makeAthlete()
    const ta = await linkAthleteToTrainer(trainer.id, athlete.id)
    const pass = await createPass(ta.id, { sessionsTotal: 1 })
    const workout = await createWorkout(athlete.id)

    const res = await client
      .post(`/trainer/passes/${pass.id}/usages`)
      .loginAs(trainer)
      .json({ workoutId: workout.id })

    res.assertStatus(200)
    assert.equal(res.body().data.status, 'depleted')
    assert.equal(res.body().data.sessionsLeft, 0)
  })

  test('Двойное списание одной тренировки → 500 (уникальный constraint)', async ({ client, assert }) => {
    const trainer = await makeTrainer()
    const athlete = await makeAthlete()
    const ta = await linkAthleteToTrainer(trainer.id, athlete.id)
    const pass = await createPass(ta.id, { sessionsTotal: 8 })
    const workout = await createWorkout(athlete.id)

    await client
      .post(`/trainer/passes/${pass.id}/usages`)
      .loginAs(trainer)
      .json({ workoutId: workout.id })

    const res = await client
      .post(`/trainer/passes/${pass.id}/usages`)
      .loginAs(trainer)
      .json({ workoutId: workout.id })

    // Уникальный constraint бросает ошибку
    assert.notEqual(res.status(), 200)
  })

  test('Нельзя списать на depleted пасс', async ({ client }) => {
    const trainer = await makeTrainer()
    const athlete = await makeAthlete()
    const ta = await linkAthleteToTrainer(trainer.id, athlete.id)
    const pass = await createPass(ta.id, { sessionsTotal: 1 })
    const w1 = await createWorkout(athlete.id)
    const w2 = await createWorkout(athlete.id)

    await client
      .post(`/trainer/passes/${pass.id}/usages`)
      .loginAs(trainer)
      .json({ workoutId: w1.id })

    const res = await client
      .post(`/trainer/passes/${pass.id}/usages`)
      .loginAs(trainer)
      .json({ workoutId: w2.id })

    res.assertStatus(422)
  })

  test('Нельзя списать чужую тренировку', async ({ client }) => {
    const trainer = await makeTrainer()
    const athlete = await makeAthlete()
    const ta = await linkAthleteToTrainer(trainer.id, athlete.id)
    const pass = await createPass(ta.id)

    const anotherAthlete = await makeAthlete('another_pass_athlete@test.ru')
    const foreignWorkout = await createWorkout(anotherAthlete.id)

    const res = await client
      .post(`/trainer/passes/${pass.id}/usages`)
      .loginAs(trainer)
      .json({ workoutId: foreignWorkout.id })

    res.assertStatus(403)
  })

  test('Нельзя списать тренировку другого тренера', async ({ client }) => {
    const trainer = await makeTrainer()
    const trainerB = await makeTrainer('pass_trainer_b@test.ru')
    const athlete = await makeAthlete()
    await linkAthleteToTrainer(trainer.id, athlete.id)
    const taB = await linkAthleteToTrainer(trainerB.id, athlete.id)
    const passB = await createPass(taB.id)
    const workout = await createWorkout(athlete.id)

    // trainer A пытается списать с пасса trainer B
    const res = await client
      .post(`/trainer/passes/${passB.id}/usages`)
      .loginAs(trainer)
      .json({ workoutId: workout.id })

    res.assertStatus(404)
  })
})

test.group('Passes: отмена списания', (group) => {
  group.each.setup(cleanPasses)

  test('DELETE /pass-usages/:id удаляет списание', async ({ client, assert }) => {
    const trainer = await makeTrainer()
    const athlete = await makeAthlete()
    const ta = await linkAthleteToTrainer(trainer.id, athlete.id)
    const pass = await createPass(ta.id, { sessionsTotal: 2 })
    const workout = await createWorkout(athlete.id)

    await client
      .post(`/trainer/passes/${pass.id}/usages`)
      .loginAs(trainer)
      .json({ workoutId: workout.id })

    const usageId = (await TrainerAthletePassUsage.query().where('passId', pass.id).first())!.id

    const delRes = await client
      .delete(`/trainer/pass-usages/${usageId}`)
      .loginAs(trainer)

    delRes.assertStatus(200)

    const afterRes = await client
      .get(`/trainer/athletes/${athlete.id}/passes`)
      .loginAs(trainer)
    assert.equal(afterRes.body().data[0].sessionsUsed, 0)
  })

  test('Отмена последнего списания возвращает depleted пасс в active', async ({ client, assert }) => {
    const trainer = await makeTrainer()
    const athlete = await makeAthlete()
    const ta = await linkAthleteToTrainer(trainer.id, athlete.id)
    const pass = await createPass(ta.id, { sessionsTotal: 1 })
    const workout = await createWorkout(athlete.id)

    await client
      .post(`/trainer/passes/${pass.id}/usages`)
      .loginAs(trainer)
      .json({ workoutId: workout.id })

    const usage = await TrainerAthletePassUsage.query().where('passId', pass.id).firstOrFail()

    const res = await client
      .delete(`/trainer/pass-usages/${usage.id}`)
      .loginAs(trainer)

    res.assertStatus(200)

    const afterPass = await TrainerAthletePass.findOrFail(pass.id)
    assert.equal(afterPass.status, 'active')
  })

  test('DELETE → 404 для чужого usage', async ({ client }) => {
    const trainer = await makeTrainer()
    const trainerB = await makeTrainer('pass_trainer_b2@test.ru')
    const athlete = await makeAthlete()
    const ta = await linkAthleteToTrainer(trainerB.id, athlete.id)
    const pass = await createPass(ta.id)
    const workout = await createWorkout(athlete.id)

    await TrainerAthletePassUsage.create({
      passId: pass.id,
      workoutId: workout.id,
      scheduledWorkoutId: null,
      consumedAt: DateTime.now(),
    })

    const usage = await TrainerAthletePassUsage.query().where('passId', pass.id).firstOrFail()

    const res = await client
      .delete(`/trainer/pass-usages/${usage.id}`)
      .loginAs(trainer)

    res.assertStatus(404)
  })
})
