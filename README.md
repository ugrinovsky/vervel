# Vervel

Приложение для визуализации прогресса тренировок через 2D-аватар и Contribution Graph.

## 🚀 Быстрый старт

### Предварительные требования
- Docker и Docker Compose
- Node.js 20+

### Разработка

```bash
# Запустить все сервисы (API + Web + PostgreSQL)
docker-compose up -d

# Остановить контейнеры
docker-compose down

# Остановить контейнеры и удалить БД (volumes)
docker-compose down -v

# Пересобрать образы и запустить
docker-compose up -d --build

# Просмотр логов
docker-compose logs -f

# Просмотр логов конкретного сервиса
docker-compose logs -f api
docker-compose logs -f web
```

### Доступ к сервисам

- **API**: http://localhost:3333
- **Web**: http://localhost:5173
- **PostgreSQL**: localhost:5432
  - User: `nazar` (или из `.env`)
  - Password: `password` (или из `.env`)
  - Database: `vervel` (или из `.env`)

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

### Контейнеры не запускаются
```bash
# Проверить статус
docker-compose ps

# Посмотреть логи
docker-compose logs
```

### База данных не подключается
```bash
# Проверить, что Postgres запущен
docker-compose ps postgres

# Пересоздать volume с БД
docker-compose down -v
docker-compose up -d
```

### Изменения в коде не применяются
```bash
# Пересобрать образы
docker-compose up -d --build
```

## 🤝 Разработка

1. Создайте ветку от `main`
2. Внесите изменения
3. Создайте Pull Request
