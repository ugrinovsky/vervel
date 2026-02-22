import { test } from '@japa/runner';
import User from '#models/user';

// ─── helpers ──────────────────────────────────────────────────────────────────

async function athleteUser() {
  return User.firstOrCreate(
    { email: 'test_athlete@test.ru' },
    { password: 'password', role: 'athlete' }
  );
}

async function trainerUser() {
  return User.firstOrCreate(
    { email: 'test_trainer@test.ru' },
    { password: 'password', role: 'trainer' }
  );
}

// ─── Публичные роуты ──────────────────────────────────────────────────────────

test.group('Публичные роуты', () => {
  test('GET / возвращает hello world', async ({ client }) => {
    const response = await client.get('/');
    response.assertStatus(200);
    response.assertBody({ hello: 'world' });
  });

  test('GET /exercises доступен без авторизации', async ({ client }) => {
    const response = await client.get('/exercises');
    response.assertStatus(200);
  });

  test('POST /login возвращает 400 при неверных данных', async ({ client }) => {
    const response = await client.post('/login').json({ email: 'no@no.com', password: 'wrong' });
    response.assertStatus(400);
  });
});

// ─── Защита workouts ──────────────────────────────────────────────────────────

test.group('Workouts: защита', () => {
  const routes = [
    { method: 'get',    url: '/workouts' },
    { method: 'post',   url: '/workouts' },
    { method: 'put',    url: '/workouts/1' },
    { method: 'delete', url: '/workouts/1' },
    { method: 'get',    url: '/workouts/stats' },
  ] as const;

  for (const { method, url } of routes) {
    test(`${method.toUpperCase()} ${url} → 401 для анонима`, async ({ client }) => {
      const response = await client[method](url);
      response.assertStatus(401);
    });
  }

  test('GET /workouts/stats доступен авторизованному атлету', async ({ client, assert }) => {
    const user = await athleteUser();
    const response = await client.get('/workouts/stats').loginAs(user);
    assert.notEqual(response.status(), 401);
  });
});

// ─── Profile ─────────────────────────────────────────────────────────────────

test.group('Profile', () => {
  test('GET /profile → 401 без авторизации', async ({ client }) => {
    const response = await client.get('/profile');
    response.assertStatus(401);
  });

  test('GET /profile возвращает данные пользователя', async ({ client }) => {
    const user = await athleteUser();
    const response = await client.get('/profile').loginAs(user);
    response.assertStatus(200);
    response.assertBodyContains({ success: true });
  });

  test('GET /profile/qr-data → 401 без авторизации', async ({ client }) => {
    const response = await client.get('/profile/qr-data');
    response.assertStatus(401);
  });

  test('GET /profile/qr-data возвращает athleteId атлету', async ({ client }) => {
    const user = await athleteUser();
    const response = await client.get('/profile/qr-data').loginAs(user);
    response.assertStatus(200);
    response.assertBodyContains({ success: true });
  });
});

// ─── Shared chats ─────────────────────────────────────────────────────────────

test.group('Shared chats: защита', () => {
  const routes = [
    { method: 'get',  url: '/chats/1/messages' },
    { method: 'post', url: '/chats/1/messages' },
    { method: 'post', url: '/chats/1/read' },
  ] as const;

  for (const { method, url } of routes) {
    test(`${method.toUpperCase()} ${url} → 401 без авторизации`, async ({ client }) => {
      const response = await client[method](url);
      response.assertStatus(401);
    });
  }
});

// ─── Athlete routes ───────────────────────────────────────────────────────────

test.group('Athlete routes: защита', () => {
  const routes = [
    { method: 'get', url: '/athlete/my-groups' },
    { method: 'get', url: '/athlete/my-trainers' },
    { method: 'get', url: '/athlete/unread-counts' },
    { method: 'get', url: '/athlete/chats/group/1' },
    { method: 'get', url: '/athlete/chats/trainer/1' },
  ] as const;

  for (const { method, url } of routes) {
    test(`${method.toUpperCase()} ${url} → 401 без авторизации`, async ({ client }) => {
      const response = await client[method](url);
      response.assertStatus(401);
    });
  }

  test('GET /athlete/my-groups доступен атлету', async ({ client, assert }) => {
    const user = await athleteUser();
    const response = await client.get('/athlete/my-groups').loginAs(user);
    assert.notEqual(response.status(), 401);
  });

  test('GET /athlete/unread-counts доступен атлету', async ({ client }) => {
    const user = await athleteUser();
    const response = await client.get('/athlete/unread-counts').loginAs(user);
    response.assertStatus(200);
    response.assertBodyContains({ success: true });
  });
});

// ─── Trainer routes: защита ───────────────────────────────────────────────────

test.group('Trainer routes: защита (401 без авторизации)', () => {
  const routes = [
    { method: 'get',    url: '/trainer/today' },
    { method: 'get',    url: '/trainer/athletes' },
    { method: 'post',   url: '/trainer/athletes/by-email' },
    { method: 'post',   url: '/trainer/athletes/by-qr' },
    { method: 'get',    url: '/trainer/groups' },
    { method: 'post',   url: '/trainer/groups' },
    { method: 'get',    url: '/trainer/chats/group/1' },
    { method: 'get',    url: '/trainer/chats/athlete/1' },
    { method: 'get',    url: '/trainer/scheduled-workouts' },
    { method: 'post',   url: '/trainer/scheduled-workouts' },
    { method: 'get',    url: '/trainer/workout-templates' },
    { method: 'post',   url: '/trainer/workout-templates' },
    { method: 'get',    url: '/trainer/unread-counts' },
  ] as const;

  for (const { method, url } of routes) {
    test(`${method.toUpperCase()} ${url} → 401`, async ({ client }) => {
      const response = await client[method](url);
      response.assertStatus(401);
    });
  }
});

test.group('Trainer routes: роль (403 для атлета)', () => {
  const routes = [
    { method: 'get',  url: '/trainer/today' },
    { method: 'get',  url: '/trainer/athletes' },
    { method: 'get',  url: '/trainer/groups' },
    { method: 'get',  url: '/trainer/scheduled-workouts' },
    { method: 'get',  url: '/trainer/workout-templates' },
    { method: 'get',  url: '/trainer/unread-counts' },
  ] as const;

  for (const { method, url } of routes) {
    test(`${method.toUpperCase()} ${url} → 403 для атлета`, async ({ client }) => {
      const user = await athleteUser();
      const response = await client[method](url).loginAs(user);
      response.assertStatus(403);
    });
  }
});

test.group('Trainer routes: доступ тренеру', () => {
  test('GET /trainer/today возвращает обзор дня', async ({ client }) => {
    const trainer = await trainerUser();
    const response = await client.get('/trainer/today').loginAs(trainer);
    response.assertStatus(200);
    response.assertBodyContains({ success: true });
  });

  test('GET /trainer/athletes возвращает список', async ({ client }) => {
    const trainer = await trainerUser();
    const response = await client.get('/trainer/athletes').loginAs(trainer);
    response.assertStatus(200);
    response.assertBodyContains({ success: true });
  });

  test('GET /trainer/groups возвращает список', async ({ client }) => {
    const trainer = await trainerUser();
    const response = await client.get('/trainer/groups').loginAs(trainer);
    response.assertStatus(200);
    response.assertBodyContains({ success: true });
  });

  test('GET /trainer/unread-counts возвращает счётчики', async ({ client }) => {
    const trainer = await trainerUser();
    const response = await client.get('/trainer/unread-counts').loginAs(trainer);
    response.assertStatus(200);
    response.assertBodyContains({ success: true });
  });

  test('GET /trainer/scheduled-workouts возвращает список', async ({ client }) => {
    const trainer = await trainerUser();
    const response = await client.get('/trainer/scheduled-workouts').loginAs(trainer);
    response.assertStatus(200);
    response.assertBodyContains({ success: true });
  });

  test('GET /trainer/workout-templates возвращает список', async ({ client }) => {
    const trainer = await trainerUser();
    const response = await client.get('/trainer/workout-templates').loginAs(trainer);
    response.assertStatus(200);
    response.assertBodyContains({ success: true });
  });

  test('POST /trainer/groups создаёт группу', async ({ client }) => {
    const trainer = await trainerUser();
    const response = await client
      .post('/trainer/groups')
      .loginAs(trainer)
      .json({ name: 'Тест-группа' });
    response.assertStatus(201);
    response.assertBodyContains({ success: true });
  });

  test('POST /trainer/scheduled-workouts создаёт тренировку', async ({ client }) => {
    const trainer = await trainerUser();
    const response = await client
      .post('/trainer/scheduled-workouts')
      .loginAs(trainer)
      .json({
        scheduledDate: '2026-03-01',
        scheduledTime: '10:00',
        workoutType: 'crossfit',
        assignedTo: [],
      });
    response.assertStatus(201);
    response.assertBodyContains({ success: true });
  });

  test('POST /trainer/workout-templates создаёт шаблон', async ({ client }) => {
    const trainer = await trainerUser();
    const response = await client
      .post('/trainer/workout-templates')
      .loginAs(trainer)
      .json({ name: 'Тест-шаблон', workoutType: 'crossfit', exercises: [] });
    response.assertStatus(201);
    response.assertBodyContains({ success: true });
  });

  test('POST /trainer/athletes/by-email → 404 для несуществующего email', async ({ client }) => {
    const trainer = await trainerUser();
    const response = await client
      .post('/trainer/athletes/by-email')
      .loginAs(trainer)
      .json({ email: 'noexist_xyz@test.ru' });
    response.assertStatus(404);
  });
});
