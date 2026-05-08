import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import TrainerAthlete from '#models/trainer_athlete'
import { bootAndMigrate } from '#tests/bootstrap'
import { CopilotInsightsService, type CopilotInsights } from '#services/CopilotInsightsService'
import { CopilotPriorityService } from '#services/CopilotPriorityService'
import { AiBalanceService } from '#services/AiBalanceService'

async function athleteUser() {
  const user = await User.firstOrCreate(
    { email: 'test_athlete_copilot@test.ru' },
    { password: 'password', role: 'athlete' }
  )
  if (user.role !== 'athlete') {
    user.role = 'athlete'
    await user.save()
  }
  return user
}

async function trainerUser() {
  const user = await User.firstOrCreate(
    { email: 'test_trainer_copilot@test.ru' },
    { password: 'password', role: 'trainer' }
  )
  if (user.role !== 'trainer') {
    user.role = 'trainer'
    await user.save()
  }
  return user
}

test.group('Copilot routes: protection', () => {
  const routes = [
    { method: 'get', url: '/trainer/copilot/priority-list' },
    { method: 'post', url: '/trainer/copilot/draft' },
    { method: 'get', url: '/athlete/copilot/week' },
    { method: 'post', url: '/athlete/copilot/start' },
    { method: 'post', url: '/athlete/copilot/send-to-coach' },
  ] as const

  for (const { method, url } of routes) {
    test(`${method.toUpperCase()} ${url} → 401 для анонима`, async ({ client }) => {
      const res = await client[method](url)
      res.assertStatus(401)
    })
  }
})

test.group('Copilot routes: basic behavior', (group) => {
  group.setup(async () => {
    await bootAndMigrate()
    // keep tests isolated from rate limits and side-effects
    await db.from('rate_limits').delete()
  })

  test('GET /trainer/copilot/priority-list → 200 для тренера (service stub)', async ({
    client,
    assert,
  }) => {
    const trainer = await trainerUser()

    const original = CopilotPriorityService.list
    CopilotPriorityService.list = (async () => ({ needsAttention: [], total: 0 })) as any

    try {
      const res = await client.get('/trainer/copilot/priority-list').loginAs(trainer)
      assert.equal(res.status(), 200, JSON.stringify(res.body()))
      res.assertBodyContains({ success: true })
    } finally {
      CopilotPriorityService.list = original
    }
  })

  test('POST /trainer/copilot/draft → 400 без athleteId', async ({ client }) => {
    const trainer = await trainerUser()
    const res = await client.post('/trainer/copilot/draft').loginAs(trainer).json({})
    res.assertStatus(400)
  })

  test('POST /trainer/copilot/draft → 402 если недостаточно средств (balance stub)', async ({
    client,
    assert,
  }) => {
    const trainer = await trainerUser()
    const athlete = await athleteUser()

    await TrainerAthlete.firstOrCreate(
      { trainerId: trainer.id, athleteId: athlete.id },
      { status: 'active' as any }
    )

    const originalGetBalance = AiBalanceService.getBalance
    AiBalanceService.getBalance = (async () => 0) as any

    try {
      const res = await client
        .post('/trainer/copilot/draft')
        .loginAs(trainer)
        .json({ athleteId: athlete.id })

      assert.equal(res.status(), 402, JSON.stringify(res.body()))
      const body = res.body() as any
      assert.equal(body.balance, 0)
      assert.equal(body.required, 8)
      assert.isTrue(String(body.message ?? '').includes('Недостаточно средств'))
    } finally {
      AiBalanceService.getBalance = originalGetBalance
    }
  })

  test('GET /athlete/copilot/week → 200 coldStart=true без тяжёлых зависимостей', async ({
    client,
    assert,
  }) => {
    const athlete = await athleteUser()

    const original = CopilotInsightsService.collect
    CopilotInsightsService.collect = (async (athleteId: number) => {
      const mocked: CopilotInsights = {
        athleteId,
        phase: 'maintenance',
        phaseEmoji: '➡️',
        phaseAdvice: 'mock',
        tsb: 0,
        atl: 0,
        ctl: 0,
        acwrZone: 'insufficient_data',
        overloadedZones: [],
        daysSinceLastWorkout: 999,
        daysSinceLastPlan: 0,
        recentWorkoutsCount: 0,
        coldStart: true,
      }
      return mocked
    }) as any

    try {
      const res = await client.get('/athlete/copilot/week').loginAs(athlete)
      assert.equal(res.status(), 200, JSON.stringify(res.body()))
      const body = res.body() as any
      assert.equal(body.success, true)
      assert.equal(body.data.meta.coldStart, true)
    } finally {
      CopilotInsightsService.collect = original
    }
  })
})

