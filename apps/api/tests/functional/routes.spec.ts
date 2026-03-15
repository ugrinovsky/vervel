import { test } from '@japa/runner'
import User from '#models/user'

// ─── helpers ──────────────────────────────────────────────────────────────────

async function athleteUser() {
  const user = await User.firstOrCreate(
    { email: 'test_athlete@test.ru' },
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
    { email: 'test_trainer@test.ru' },
    { password: 'password', role: 'trainer' }
  )
  if (user.role !== 'trainer') {
    user.role = 'trainer'
    await user.save()
  }
  return user
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

// ─── OAuth: защита и базовая логика ──────────────────────────────────────────

test.group('OAuth: защита и базовая логика', () => {
  // Редиректы: клиент следует за ними, поэтому проверяем только что нет 500
  test('GET /oauth/vk/redirect → не 500 (редирект на VK)', async ({ client, assert }) => {
    const response = await client.get('/oauth/vk/redirect')
    assert.notEqual(response.status(), 500)
  })

  test('GET /oauth/yandex/redirect → не 500 (редирект на Yandex)', async ({ client, assert }) => {
    const response = await client.get('/oauth/yandex/redirect')
    assert.notEqual(response.status(), 500)
  })

  test('GET /oauth/invalid/redirect → 400', async ({ client }) => {
    const response = await client.get('/oauth/invalid/redirect')
    response.assertStatus(400)
  })

  test('GET /oauth/vk/callback с ?error=access_denied → не 500', async ({ client, assert }) => {
    const response = await client.get('/oauth/vk/callback').qs({ error: 'access_denied' })
    assert.notEqual(response.status(), 500)
  })

  test('GET /oauth/vk/callback без code → не 500', async ({ client, assert }) => {
    const response = await client.get('/oauth/vk/callback')
    assert.notEqual(response.status(), 500)
  })

  test('POST /oauth/vk/sdk-login без тела → 400', async ({ client }) => {
    const response = await client.post('/oauth/vk/sdk-login').json({})
    response.assertStatus(400)
  })

  test('POST /oauth/yandex/sdk-login без тела → 400', async ({ client }) => {
    const response = await client.post('/oauth/yandex/sdk-login').json({})
    response.assertStatus(400)
  })

  test('POST /oauth/set-role без параметров → 400', async ({ client }) => {
    const response = await client.post('/oauth/set-role').json({})
    response.assertStatus(400)
  })
})

// ─── Exercises: детально ──────────────────────────────────────────────────────

test.group('Exercises: детально', () => {
  test('GET /exercises/999999 → 404 для несуществующего id', async ({ client }) => {
    const response = await client.get('/exercises/999999')
    response.assertStatus(404)
  })
})

// ─── Invite: защита и логика ──────────────────────────────────────────────────

test.group('Invite: защита и логика', () => {
  test('GET /invite/info/:token → 404 для несуществующего токена', async ({ client }) => {
    const response = await client.get('/invite/info/nonexistent-token-xyz')
    response.assertStatus(404)
  })

  test('POST /invite/accept → 401 без авторизации', async ({ client }) => {
    const response = await client.post('/invite/accept').json({ token: 'some-token' })
    response.assertStatus(401)
  })

  test('GET /referral/stats → 401 без авторизации', async ({ client }) => {
    const response = await client.get('/referral/stats')
    response.assertStatus(401)
  })

  test('GET /referral/stats → 200 для атлета', async ({ client }) => {
    const user = await athleteUser()
    const response = await client.get('/referral/stats').loginAs(user)
    response.assertStatus(200)
  })
})

// ─── Profile: дополнительные кейсы ───────────────────────────────────────────

test.group('Profile: дополнительные кейсы', () => {
  // Используем уникальных пользователей чтобы не ломать изоляцию тестов роли
  test('POST /profile/become-athlete → 200 для тренера', async ({ client }) => {
    const user = await User.firstOrCreate(
      { email: 'test_become_athlete@test.ru' },
      { password: 'password', role: 'trainer' }
    )
    await user.merge({ role: 'trainer' }).save()
    const response = await client.post('/profile/become-athlete').loginAs(user)
    response.assertStatus(200)
  })

  test('POST /profile/become-trainer → 200 для атлета', async ({ client }) => {
    const user = await User.firstOrCreate(
      { email: 'test_become_trainer@test.ru' },
      { password: 'password', role: 'athlete' }
    )
    await user.merge({ role: 'athlete' }).save()
    const response = await client.post('/profile/become-trainer').loginAs(user)
    response.assertStatus(200)
  })

  test('POST /achievements/check → 200 для атлета', async ({ client }) => {
    const user = await athleteUser()
    const response = await client.post('/achievements/check').loginAs(user).json({})
    response.assertStatus(200)
  })
})

// ─── Feedback: с авторизацией ─────────────────────────────────────────────────

test.group('Feedback: с авторизацией', () => {
  test('POST /feedback с авторизацией → 201', async ({ client }) => {
    const user = await athleteUser()
    const response = await client
      .post('/feedback')
      .loginAs(user)
      .json({ type: 'general', message: 'Тестовый отзыв от пользователя' })
    response.assertStatus(201)
  })
})

// ─── Workouts: CRUD детально ──────────────────────────────────────────────────

test.group('Workouts: CRUD детально', () => {
  test('GET /workouts возвращает список с meta (авторизованный атлет)', async ({
    client,
    assert,
  }) => {
    const user = await athleteUser()
    const response = await client.get('/workouts').loginAs(user)
    response.assertStatus(200)
    const body = response.body()
    assert.property(body, 'data')
    assert.property(body, 'meta')
  })

  test('POST /workouts создаёт тренировку', async ({ client }) => {
    const user = await athleteUser()
    const response = await client
      .post('/workouts')
      .loginAs(user)
      .json({
        date: '2026-03-01',
        workoutType: 'crossfit',
        exercises: [],
      })
    response.assertStatus(201)
  })

  test('GET /workouts/by-zone → 401 без авторизации', async ({ client }) => {
    const response = await client.get('/workouts/by-zone')
    response.assertStatus(401)
  })

  test('GET /workouts/by-zone → 200 с авторизацией и параметром zone', async ({ client }) => {
    const user = await athleteUser()
    const response = await client.get('/workouts/by-zone').qs({ zone: 'chest' }).loginAs(user)
    response.assertStatus(200)
  })

  test('DELETE /workouts/999999 → 404 (несуществующая тренировка)', async ({ client }) => {
    const user = await athleteUser()
    const response = await client.delete('/workouts/999999').loginAs(user)
    response.assertStatus(404)
  })
})

// ─── Trainer CRUD: обновление и удаление ─────────────────────────────────────

test.group('Trainer CRUD: обновление и удаление', () => {
  test('PUT /trainer/groups/:id обновляет группу', async ({ client }) => {
    const trainer = await trainerUser()
    const created = await client
      .post('/trainer/groups')
      .loginAs(trainer)
      .json({ name: 'Временная группа' })
    const id = created.body().data.id
    const response = await client
      .put(`/trainer/groups/${id}`)
      .loginAs(trainer)
      .json({ name: 'Обновлённая группа' })
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
  })

  test('GET /trainer/groups/:id/athletes возвращает список', async ({ client }) => {
    const trainer = await trainerUser()
    const created = await client
      .post('/trainer/groups')
      .loginAs(trainer)
      .json({ name: 'Группа для атлетов' })
    const id = created.body().data.id
    const response = await client.get(`/trainer/groups/${id}/athletes`).loginAs(trainer)
    response.assertStatus(200)
  })

  test('GET /trainer/groups/:id/leaderboard возвращает данные', async ({ client }) => {
    const trainer = await trainerUser()
    const created = await client
      .post('/trainer/groups')
      .loginAs(trainer)
      .json({ name: 'Группа для лидерборда' })
    const id = created.body().data.id
    const response = await client.get(`/trainer/groups/${id}/leaderboard`).loginAs(trainer)
    response.assertStatus(200)
  })

  test('DELETE /trainer/groups/:id удаляет группу', async ({ client }) => {
    const trainer = await trainerUser()
    const created = await client
      .post('/trainer/groups')
      .loginAs(trainer)
      .json({ name: 'Группа для удаления' })
    const id = created.body().data.id
    const response = await client.delete(`/trainer/groups/${id}`).loginAs(trainer)
    response.assertStatus(200)
  })

  test('PUT /trainer/scheduled-workouts/:id обновляет запланированную тренировку', async ({
    client,
  }) => {
    const trainer = await trainerUser()
    const created = await client
      .post('/trainer/scheduled-workouts')
      .loginAs(trainer)
      .json({
        scheduledDate: '2026-03-15',
        workoutData: { type: 'crossfit', exercises: [] },
        assignedTo: [],
      })
    const id = created.body().data.id
    const response = await client
      .put(`/trainer/scheduled-workouts/${id}`)
      .loginAs(trainer)
      .json({
        scheduledDate: '2026-04-01',
        workoutData: { type: 'crossfit', exercises: [] },
        assignedTo: [],
      })
    response.assertStatus(200)
  })

  test('DELETE /trainer/scheduled-workouts/:id удаляет запланированную тренировку', async ({
    client,
  }) => {
    const trainer = await trainerUser()
    const created = await client
      .post('/trainer/scheduled-workouts')
      .loginAs(trainer)
      .json({
        scheduledDate: '2026-03-20',
        workoutData: { type: 'crossfit', exercises: [] },
        assignedTo: [],
      })
    const id = created.body().data.id
    const response = await client.delete(`/trainer/scheduled-workouts/${id}`).loginAs(trainer)
    response.assertStatus(200)
  })

  test('PUT /trainer/workout-templates/:id обновляет шаблон', async ({ client }) => {
    const trainer = await trainerUser()
    const created = await client
      .post('/trainer/workout-templates')
      .loginAs(trainer)
      .json({ name: 'Шаблон для обновления', workoutType: 'crossfit', exercises: [] })
    const id = created.body().data.id
    const response = await client
      .put(`/trainer/workout-templates/${id}`)
      .loginAs(trainer)
      .json({ name: 'Обновлённый шаблон', workoutType: 'crossfit', exercises: [] })
    response.assertStatus(200)
  })

  test('DELETE /trainer/workout-templates/:id удаляет шаблон', async ({ client }) => {
    const trainer = await trainerUser()
    const created = await client
      .post('/trainer/workout-templates')
      .loginAs(trainer)
      .json({ name: 'Шаблон для удаления', workoutType: 'crossfit', exercises: [] })
    const id = created.body().data.id
    const response = await client.delete(`/trainer/workout-templates/${id}`).loginAs(trainer)
    response.assertStatus(200)
  })
})

// ─── Trainer chats: доступ ────────────────────────────────────────────────────

test.group('Trainer chats: доступ', () => {
  test('GET /trainer/chats/group/999999 → 404 (несуществующая группа)', async ({ client }) => {
    const trainer = await trainerUser()
    const response = await client.get('/trainer/chats/group/999999').loginAs(trainer)
    response.assertStatus(404)
  })

  test('GET /trainer/athletes/999999/stats → 403 или 404 (нет доступа)', async ({
    client,
    assert,
  }) => {
    const trainer = await trainerUser()
    const response = await client.get('/trainer/athletes/999999/stats').loginAs(trainer)
    assert.isTrue([403, 404].includes(response.status()))
  })

  test('GET /trainer/athletes/999999/workouts → 403 или 404 (нет доступа)', async ({
    client,
    assert,
  }) => {
    const trainer = await trainerUser()
    const response = await client.get('/trainer/athletes/999999/workouts').loginAs(trainer)
    assert.isTrue([403, 404].includes(response.status()))
  })
})

// ─── Athlete routes: детально ─────────────────────────────────────────────────

test.group('Athlete routes: детально', () => {
  test('GET /athlete/my-trainers → 200 для атлета', async ({ client }) => {
    const user = await athleteUser()
    const response = await client.get('/athlete/my-trainers').loginAs(user)
    response.assertStatus(200)
  })

  test('GET /athlete/chats/trainer/999999 → не 401 (авторизация работает)', async ({
    client,
    assert,
  }) => {
    const user = await athleteUser()
    const response = await client.get('/athlete/chats/trainer/999999').loginAs(user)
    assert.notEqual(response.status(), 401)
  })
})
