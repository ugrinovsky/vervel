import { test } from '@japa/runner'
import User from '#models/user'

// ─── helpers ──────────────────────────────────────────────────────────────────

async function athleteUser() {
  return User.firstOrCreate(
    { email: 'test_athlete@test.ru' },
    { password: 'password', role: 'athlete' }
  )
}

async function trainerUser() {
  return User.firstOrCreate(
    { email: 'test_trainer@test.ru' },
    { password: 'password', role: 'trainer' }
  )
}

// ─── Публичные роуты ──────────────────────────────────────────────────────────

test.group('Публичные роуты', () => {
  test('GET / возвращает hello world', async ({ client }) => {
    const response = await client.get('/')
    response.assertStatus(200)
    response.assertBody({ hello: 'world' })
  })

  test('GET /exercises доступен без авторизации', async ({ client }) => {
    const response = await client.get('/exercises')
    response.assertStatus(200)
  })

  test('POST /login возвращает 401 при неверных данных', async ({ client }) => {
    const response = await client.post('/login').json({ email: 'no@no.com', password: 'wrong' })
    response.assertStatus(401)
  })
})

// ─── Auth: регистрация ────────────────────────────────────────────────────────

test.group('Auth: регистрация', () => {
  test('POST /register создаёт нового пользователя', async ({ client }) => {
    const unique = Date.now()
    const response = await client.post('/register').json({
      fullName: 'Тест Регистрации',
      email: `reg_${unique}@test.ru`,
      password: 'password123',
      role: 'athlete',
    })
    response.assertStatus(201)
    response.assertBodyContains({ user: { role: 'athlete' } })
  })

  test('POST /register → 409 при дублировании email', async ({ client }) => {
    await athleteUser()
    const response = await client.post('/register').json({
      fullName: 'Дубль',
      email: 'test_athlete@test.ru',
      password: 'password123',
      role: 'athlete',
    })
    response.assertStatus(409)
  })

  test('POST /register с honeypot → тихо возвращает 201 (защита от ботов)', async ({ client }) => {
    const unique = Date.now()
    const response = await client.post('/register').json({
      fullName: 'Бот',
      email: `bot_${unique}@test.ru`,
      password: 'password123',
      role: 'athlete',
      website: 'http://spam.com',
    })
    // Honeypot: запрос молча принимается, но пользователь не создаётся
    response.assertStatus(201)
  })
})

// ─── Защита workouts ──────────────────────────────────────────────────────────

test.group('Workouts: защита', () => {
  const routes = [
    { method: 'get', url: '/workouts' },
    { method: 'post', url: '/workouts' },
    { method: 'put', url: '/workouts/1' },
    { method: 'delete', url: '/workouts/1' },
    { method: 'get', url: '/workouts/stats' },
  ] as const

  for (const { method, url } of routes) {
    test(`${method.toUpperCase()} ${url} → 401 для анонима`, async ({ client }) => {
      const response = await client[method](url)
      response.assertStatus(401)
    })
  }

  test('GET /workouts/stats доступен авторизованному атлету', async ({ client, assert }) => {
    const user = await athleteUser()
    const response = await client.get('/workouts/stats').loginAs(user)
    assert.notEqual(response.status(), 401)
  })
})

// ─── Profile ─────────────────────────────────────────────────────────────────

test.group('Profile', () => {
  test('GET /profile → 401 без авторизации', async ({ client }) => {
    const response = await client.get('/profile')
    response.assertStatus(401)
  })

  test('GET /profile возвращает данные пользователя', async ({ client }) => {
    const user = await athleteUser()
    const response = await client.get('/profile').loginAs(user)
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
  })

  test('GET /profile/qr-data → 401 без авторизации', async ({ client }) => {
    const response = await client.get('/profile/qr-data')
    response.assertStatus(401)
  })

  test('GET /profile/qr-data возвращает athleteId атлету', async ({ client }) => {
    const user = await athleteUser()
    const response = await client.get('/profile/qr-data').loginAs(user)
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
  })

  test('PUT /profile → 401 без авторизации', async ({ client }) => {
    const response = await client.put('/profile')
    response.assertStatus(401)
  })

  test('PUT /profile обновляет данные пользователя', async ({ client }) => {
    const user = await athleteUser()
    const response = await client
      .put('/profile')
      .loginAs(user)
      .json({ fullName: 'Обновлённое Имя' })
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
  })
})

// ─── Avatar ───────────────────────────────────────────────────────────────────

test.group('Avatar routes: защита', () => {
  test('GET /avatar/stats → 401 без авторизации', async ({ client }) => {
    const response = await client.get('/avatar/stats')
    response.assertStatus(401)
  })

  test('GET /avatar/stats возвращает данные интенсивности зон', async ({ client }) => {
    const user = await athleteUser()
    const response = await client.get('/avatar/stats').loginAs(user)
    response.assertStatus(200)
  })
})

// ─── Streak & Achievements ────────────────────────────────────────────────────

test.group('Streak & Achievements: защита', () => {
  const routes = [
    { method: 'get', url: '/streak' },
    { method: 'get', url: '/streak/history' },
    { method: 'get', url: '/achievements' },
    { method: 'post', url: '/achievements/seen' },
  ] as const

  for (const { method, url } of routes) {
    test(`${method.toUpperCase()} ${url} → 401 без авторизации`, async ({ client }) => {
      const response = await client[method](url)
      response.assertStatus(401)
    })
  }
})

test.group('Streak & Achievements: доступ атлету', () => {
  test('GET /streak возвращает streak данные', async ({ client }) => {
    const user = await athleteUser()
    const response = await client.get('/streak').loginAs(user)
    response.assertStatus(200)
  })

  test('GET /streak/history возвращает историю', async ({ client }) => {
    const user = await athleteUser()
    const response = await client.get('/streak/history').loginAs(user)
    response.assertStatus(200)
  })

  test('GET /achievements возвращает список достижений', async ({ client }) => {
    const user = await athleteUser()
    const response = await client.get('/achievements').loginAs(user)
    response.assertStatus(200)
  })

  test('POST /achievements/seen принимает массив achievementIds', async ({ client }) => {
    const user = await athleteUser()
    const response = await client
      .post('/achievements/seen')
      .loginAs(user)
      .json({ achievementIds: [999] }) // несуществующий id — просто не обновит ничего
    response.assertStatus(200)
  })
})

// ─── AI routes ────────────────────────────────────────────────────────────────

test.group('AI routes: защита (401 без авторизации)', () => {
  const routes = [
    { method: 'get', url: '/ai/status' },
    { method: 'get', url: '/ai/balance' },
    { method: 'get', url: '/ai/transactions' },
    { method: 'post', url: '/ai/recognize-workout' },
    { method: 'post', url: '/ai/generate-workout' },
    { method: 'post', url: '/ai/chat' },
  ] as const

  for (const { method, url } of routes) {
    test(`${method.toUpperCase()} ${url} → 401`, async ({ client }) => {
      const response = await client[method](url)
      response.assertStatus(401)
    })
  }
})

test.group('AI routes: доступ авторизованному пользователю', () => {
  test('GET /ai/status → 200 с данными о провайдере', async ({ client }) => {
    const user = await athleteUser()
    const response = await client.get('/ai/status').loginAs(user)
    response.assertStatus(200)
  })

  test('GET /ai/balance → 200 с полями balance и costs', async ({ client, assert }) => {
    const user = await athleteUser()
    const response = await client.get('/ai/balance').loginAs(user)
    response.assertStatus(200)
    const body = response.body()
    assert.property(body, 'balance')
    assert.property(body, 'costs')
  })

  test('GET /ai/transactions → 200 со списком транзакций', async ({ client }) => {
    const user = await athleteUser()
    const response = await client.get('/ai/transactions').loginAs(user)
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
  })
})

// ─── Payments routes ──────────────────────────────────────────────────────────

test.group('Payments routes: защита', () => {
  test('POST /payments/topup → 401 без авторизации', async ({ client }) => {
    const response = await client.post('/payments/topup').json({ amount: 100 })
    response.assertStatus(401)
  })

  test('POST /payments/topup → 422 при некорректной сумме', async ({ client }) => {
    const user = await athleteUser()
    const response = await client
      .post('/payments/topup')
      .loginAs(user)
      .json({ amount: 999 }) // не входит в допустимые: 100/250/500/1000
    response.assertStatus(422)
  })
})

// ─── Feedback ─────────────────────────────────────────────────────────────────

test.group('Feedback: защита', () => {
  test('POST /feedback → 401 без авторизации', async ({ client }) => {
    const response = await client.post('/feedback').json({ message: 'test' })
    response.assertStatus(401)
  })
})

// ─── Shared chats ─────────────────────────────────────────────────────────────

test.group('Shared chats: защита', () => {
  const routes = [
    { method: 'get', url: '/chats/1/messages' },
    { method: 'post', url: '/chats/1/messages' },
    { method: 'post', url: '/chats/1/read' },
  ] as const

  for (const { method, url } of routes) {
    test(`${method.toUpperCase()} ${url} → 401 без авторизации`, async ({ client }) => {
      const response = await client[method](url)
      response.assertStatus(401)
    })
  }
})

// ─── Athlete routes ───────────────────────────────────────────────────────────

test.group('Athlete routes: защита', () => {
  const routes = [
    { method: 'get', url: '/athlete/my-groups' },
    { method: 'get', url: '/athlete/my-trainers' },
    { method: 'get', url: '/athlete/unread-counts' },
    { method: 'get', url: '/athlete/chats/group/1' },
    { method: 'get', url: '/athlete/chats/trainer/1' },
    { method: 'get', url: '/athlete/upcoming-workouts' },
    { method: 'get', url: '/athlete/periodization' },
  ] as const

  for (const { method, url } of routes) {
    test(`${method.toUpperCase()} ${url} → 401 без авторизации`, async ({ client }) => {
      const response = await client[method](url)
      response.assertStatus(401)
    })
  }

  test('GET /athlete/my-groups доступен атлету', async ({ client, assert }) => {
    const user = await athleteUser()
    const response = await client.get('/athlete/my-groups').loginAs(user)
    assert.notEqual(response.status(), 401)
  })

  test('GET /athlete/unread-counts доступен атлету', async ({ client }) => {
    const user = await athleteUser()
    const response = await client.get('/athlete/unread-counts').loginAs(user)
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
  })

  test('GET /athlete/upcoming-workouts возвращает список', async ({ client }) => {
    const user = await athleteUser()
    const response = await client.get('/athlete/upcoming-workouts').loginAs(user)
    response.assertStatus(200)
  })

  test('GET /athlete/periodization возвращает ATL/CTL/TSB данные', async ({ client }) => {
    const user = await athleteUser()
    const response = await client.get('/athlete/periodization').loginAs(user)
    response.assertStatus(200)
  })
})

// ─── Trainer routes: защита (401) ─────────────────────────────────────────────

test.group('Trainer routes: защита (401 без авторизации)', () => {
  const routes = [
    { method: 'get', url: '/trainer/today' },
    { method: 'get', url: '/trainer/profile-stats' },
    { method: 'get', url: '/trainer/athletes' },
    { method: 'post', url: '/trainer/athletes/by-email' },
    { method: 'post', url: '/trainer/athletes/by-qr' },
    { method: 'post', url: '/trainer/athletes/invite' },
    { method: 'delete', url: '/trainer/athletes/1' },
    { method: 'get', url: '/trainer/athletes/1/stats' },
    { method: 'get', url: '/trainer/athletes/1/avatar' },
    { method: 'get', url: '/trainer/athletes/1/periodization' },
    { method: 'get', url: '/trainer/groups' },
    { method: 'post', url: '/trainer/groups' },
    { method: 'put', url: '/trainer/groups/1' },
    { method: 'delete', url: '/trainer/groups/1' },
    { method: 'get', url: '/trainer/groups/1/athletes' },
    { method: 'post', url: '/trainer/groups/1/athletes' },
    { method: 'delete', url: '/trainer/groups/1/athletes/1' },
    { method: 'get', url: '/trainer/chats/group/1' },
    { method: 'get', url: '/trainer/chats/athlete/1' },
    { method: 'get', url: '/trainer/scheduled-workouts' },
    { method: 'get', url: '/trainer/scheduled-workouts/today' },
    { method: 'post', url: '/trainer/scheduled-workouts' },
    { method: 'put', url: '/trainer/scheduled-workouts/1' },
    { method: 'delete', url: '/trainer/scheduled-workouts/1' },
    { method: 'get', url: '/trainer/workout-templates' },
    { method: 'post', url: '/trainer/workout-templates' },
    { method: 'put', url: '/trainer/workout-templates/1' },
    { method: 'delete', url: '/trainer/workout-templates/1' },
    { method: 'get', url: '/trainer/unread-counts' },
  ] as const

  for (const { method, url } of routes) {
    test(`${method.toUpperCase()} ${url} → 401`, async ({ client }) => {
      const response = await client[method](url)
      response.assertStatus(401)
    })
  }
})

// ─── Trainer routes: роль (403 для атлета) ────────────────────────────────────

test.group('Trainer routes: роль (403 для атлета)', () => {
  const routes = [
    { method: 'get', url: '/trainer/today' },
    { method: 'get', url: '/trainer/profile-stats' },
    { method: 'get', url: '/trainer/athletes' },
    { method: 'get', url: '/trainer/groups' },
    { method: 'get', url: '/trainer/scheduled-workouts' },
    { method: 'get', url: '/trainer/scheduled-workouts/today' },
    { method: 'get', url: '/trainer/workout-templates' },
    { method: 'get', url: '/trainer/unread-counts' },
  ] as const

  for (const { method, url } of routes) {
    test(`${method.toUpperCase()} ${url} → 403 для атлета`, async ({ client }) => {
      const user = await athleteUser()
      const response = await client[method](url).loginAs(user)
      response.assertStatus(403)
    })
  }
})

// ─── Trainer routes: доступ тренеру ───────────────────────────────────────────

test.group('Trainer routes: доступ тренеру', () => {
  test('GET /trainer/today возвращает обзор дня', async ({ client }) => {
    const trainer = await trainerUser()
    const response = await client.get('/trainer/today').loginAs(trainer)
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
  })

  test('GET /trainer/profile-stats возвращает статистику профиля', async ({ client }) => {
    const trainer = await trainerUser()
    const response = await client.get('/trainer/profile-stats').loginAs(trainer)
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
  })

  test('GET /trainer/athletes возвращает список', async ({ client }) => {
    const trainer = await trainerUser()
    const response = await client.get('/trainer/athletes').loginAs(trainer)
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
  })

  test('GET /trainer/groups возвращает список', async ({ client }) => {
    const trainer = await trainerUser()
    const response = await client.get('/trainer/groups').loginAs(trainer)
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
  })

  test('GET /trainer/unread-counts возвращает счётчики', async ({ client }) => {
    const trainer = await trainerUser()
    const response = await client.get('/trainer/unread-counts').loginAs(trainer)
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
  })

  test('GET /trainer/scheduled-workouts возвращает список', async ({ client }) => {
    const trainer = await trainerUser()
    const response = await client
      .get('/trainer/scheduled-workouts')
      .qs({ from: '2026-02-01', to: '2026-02-28' })
      .loginAs(trainer)
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
  })

  test('GET /trainer/scheduled-workouts/today возвращает тренировки на сегодня', async ({
    client,
  }) => {
    const trainer = await trainerUser()
    const response = await client.get('/trainer/scheduled-workouts/today').loginAs(trainer)
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
  })

  test('GET /trainer/workout-templates возвращает список', async ({ client }) => {
    const trainer = await trainerUser()
    const response = await client.get('/trainer/workout-templates').loginAs(trainer)
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
  })

  test('POST /trainer/groups создаёт группу', async ({ client }) => {
    const trainer = await trainerUser()
    const response = await client
      .post('/trainer/groups')
      .loginAs(trainer)
      .json({ name: 'Тест-группа' })
    response.assertStatus(201)
    response.assertBodyContains({ success: true })
  })

  test('POST /trainer/scheduled-workouts создаёт тренировку', async ({ client }) => {
    const trainer = await trainerUser()
    const response = await client
      .post('/trainer/scheduled-workouts')
      .loginAs(trainer)
      .json({
        scheduledDate: '2026-03-01',
        workoutData: { type: 'crossfit', exercises: [] },
        assignedTo: [],
      })
    response.assertStatus(201)
    response.assertBodyContains({ success: true })
  })

  test('POST /trainer/workout-templates создаёт шаблон', async ({ client }) => {
    const trainer = await trainerUser()
    const response = await client
      .post('/trainer/workout-templates')
      .loginAs(trainer)
      .json({ name: 'Тест-шаблон', workoutType: 'crossfit', exercises: [] })
    response.assertStatus(201)
    response.assertBodyContains({ success: true })
  })

  test('POST /trainer/athletes/by-email → 404 для несуществующего email', async ({ client }) => {
    const trainer = await trainerUser()
    const response = await client
      .post('/trainer/athletes/by-email')
      .loginAs(trainer)
      .json({ email: 'noexist_xyz@test.ru' })
    response.assertStatus(404)
  })

  test('POST /trainer/athletes/invite → 201 с ссылкой-приглашением', async ({ client }) => {
    const trainer = await trainerUser()
    const response = await client.post('/trainer/athletes/invite').loginAs(trainer).json({})
    response.assertStatus(201)
    response.assertBodyContains({ success: true })
  })
})
