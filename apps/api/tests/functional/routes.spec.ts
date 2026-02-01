import { test } from '@japa/runner';
import User from '#models/user';

test.group('Роуты: Общие', () => {
  test('GET / возвращает hello world', async ({ client }) => {
    const response = await client.get('/');

    response.assertStatus(200);
    response.assertBody({ hello: 'world' });
  });

  test('GET /exercises доступен без авторизации', async ({ client, assert }) => {
    const response = await client.get('/exercises');

    // Теперь assert работает правильно
    assert.notEqual(response.status(), 401);
  });
});

test.group('Роуты: Авторизация и Защита', () => {
  test('GET /workouts/stats требует авторизации', async ({ client }) => {
    const response = await client.get('/workouts/stats');
    response.assertStatus(401);
  });

  test('Ресурс workouts защищен middleware auth', async ({ client }) => {
    const response = await client.get('/workouts');
    response.assertStatus(401);
  });

  // Пример теста с авторизованным пользователем
  test('GET /workouts/stats доступен авторизованному пользователю', async ({ assert, client }) => {
    // Создаем или находим тестового пользователя
    const user = await User.firstOrCreate({ email: 'test@test.ru' }, { password: 'password' });

    const response = await client.get('/workouts/stats').loginAs(user); // Эмулирует вход через auth middleware

    // Проверяем, что нас пустило (не 401)
    assert.notEqual(response.status(), 401);
  });
});

test.group('Роуты: Методы Resource', () => {
  const resourceMethods = [
    { method: 'get', url: '/workouts' },
    { method: 'post', url: '/workouts' },
    { method: 'put', url: '/workouts/1' },
    { method: 'delete', url: '/workouts/1' },
  ] as const;

  for (const { method, url } of resourceMethods) {
    test(`${method.toUpperCase()} ${url} возвращает 401 для анонима`, async ({ client }) => {
      const response = await client[method](url);
      response.assertStatus(401);
    });
  }
});
