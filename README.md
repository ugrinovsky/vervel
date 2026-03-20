# Vervel

Приложение для визуализации прогресса тренировок через 2D-аватар и Contribution Graph.

## 🚀 Локальная разработка

### Предварительные требования
- Docker и Docker Compose
- Node.js 24 (через nvm: `nvm use 24`)

### Запуск

```bash
# Запустить API + PostgreSQL
docker compose up -d

# Запустить только фронт (dev-сервер с hot reload)
docker compose -f docker-compose.dev.yml up -d

# Запустить всё сразу
docker compose up -d && docker compose -f docker-compose.dev.yml up -d
```

### Доступ к сервисам

- **API**: http://localhost:3333
- **Web (прод-сборка)**: http://localhost:5173
- **Web (dev с hot reload)**: http://localhost:5174
- **PostgreSQL**: localhost:5432 (user: `nazar`, password: `password`, db: `vervel`)

### Остановка и перезапуск

```bash
# Остановить
docker compose down

# Перезапустить конкретный сервис
docker compose restart api

# Пересобрать и перезапустить (после изменений в Dockerfile или зависимостях)
docker compose up -d --build api
```

### Обновление зависимостей (npm install)

При добавлении/удалении пакетов `node_modules` хранится в named volume и не пересоздаётся автоматически:

```bash
docker compose down
docker volume rm vervel_node_modules_api   # для API
docker volume rm vervel_node_modules_web   # для Web (dev)
docker compose up -d --build
```

### Полный сброс (удалить всё включая БД)

```bash
docker compose down -v
docker compose -f docker-compose.dev.yml down -v
```

---

## 🌐 Продакшн (сервер)

### Первый деплой

```bash
ssh user@vervel.ru
cd /app
git clone <repo> .
cp apps/api/.env.example apps/api/.env
# Заполнить .env нужными значениями
docker compose up -d --build
```

### Деплой обновлений

Деплой происходит **автоматически** при пуше в `master` через GitHub Actions.

Вручную (если нужно):
```bash
cd /app
git pull
docker compose up -d --build
```

### Перезапуск сервисов

```bash
# Перезапустить API (например, после правки .env)
docker compose restart api

# Перезапустить всё
docker compose restart
```

### Просмотр логов

```bash
# Логи API (последние 50 строк)
docker logs vervel_api --tail 50

# Логи в реальном времени
docker logs vervel_api -f

# Логи всех сервисов
docker compose logs -f
```

### Статус контейнеров

```bash
docker compose ps -a
```

### Обновление зависимостей на проде

При добавлении/удалении npm-пакетов обычный `--build` не помогает — нужно удалить том node_modules:

```bash
docker compose down
docker volume rm app_node_modules_api
docker compose up -d --build
```

> БД (`pgdata`) при этом **не удаляется**.

---

## 📦 Работа с базой данных

```bash
# Войти в контейнер API
docker exec -it vervel_api sh

# Запустить миграции
node ace migration:run

# Откатить последнюю миграцию
node ace migration:rollback

# Пересоздать все миграции (fresh)
node ace migration:refresh

# Заполнить БД начальными данными
node ace db:seed

# Создать новую миграцию
node ace make:migration add_something_to_table

# Создать новый сидер
node ace make:seeder SomethingSeeder
```

## 🔧 Полезные команды

### Docker

```bash
# Перезапустить конкретный сервис
docker-compose restart api

# Зайти в контейнер с Postgres
docker exec -it vervel-postgres-1 psql -U nazar -d vervel

# Очистить неиспользуемые Docker ресурсы
docker system prune -a
```

### Локальная разработка (без Docker)

```bash
# API
cd apps/api
npm install
npm run dev

# Web
cd apps/web
npm install
npm run dev
```

## 📁 Структура проекта

```
vervel/
├── apps/
│   ├── api/          # AdonisJS API
│   └── web/          # React Frontend
├── packages/         # Shared packages
├── docker-compose.yml
└── README.md
```

## 🛠️ Технологии

- **Backend**: AdonisJS 6, PostgreSQL, Lucid ORM
- **Frontend**: React, Vite, TailwindCSS
- **Infrastructure**: Docker, Docker Compose

## 📝 Дополнительная информация

- [API Documentation](./apps/api/README.md)
- [Web Documentation](./apps/web/README.md)

## 🐛 Troubleshooting

### Диагностика 502 Bad Gateway на проде

**Шаг 1 — смотри логи:**
```bash
docker logs vervel_api --tail 50
```

**Шаг 2 — определи причину по тексту ошибки:**

| Ошибка в логах | Причина | Решение |
|---|---|---|
| `Cannot find package 'xxx'` | Пакет не установлен в node_modules | См. ниже — сброс тома node_modules |
| `ERESOLVE unable to resolve dependency tree` | Конфликт версий пакетов | Исправить версию в package.json |
| `migration error` / `relation does not exist` | Миграция не накатилась | `docker exec vervel_api node ace migration:run --force` |
| `Cannot find module '#start/events'` | Файл не найден (новый preload) | Убедиться что файл закоммичен |

---

### Зависимости изменились (добавил/удалил пакет) — node_modules не обновляются

**Важно:** `node_modules` хранятся в named volume `node_modules_api` и **переживают пересборку образа**. Обычный `--build` не помогает — нужно удалить том:

```bash
cd /app
docker compose down
docker volume rm app_node_modules_api
docker compose up --build -d
```

> `pgdata` при этом не удаляется — данные БД сохранятся.

---

### Контейнер не запускается (вылетает сразу)
```bash
# Проверить статус
docker compose ps -a

# Посмотреть логи
docker logs vervel_api --tail 50

# Запустить без -d чтобы видеть вывод в реальном времени
docker compose up api
```

### База данных не подключается
```bash
# Проверить, что Postgres запущен
docker compose ps postgres

# Пересоздать volume с БД (УДАЛИТ ВСЕ ДАННЫЕ!)
docker compose down -v
docker compose up -d
```

### Изменения в коде не применяются (без смены зависимостей)
```bash
docker compose up -d --build
```

## 🤝 Разработка

1. Создайте ветку от `main`
2. Внесите изменения
3. Создайте Pull Request
