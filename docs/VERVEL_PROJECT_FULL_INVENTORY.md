# Vervel — архитектурный инвентарь продукта и кодовой базы

**Методология (что реально сделано):** не построчный аудит всех исходников, а сшивка **контракта API** (`start/routes.ts`), **маршрутов SPA** (`constants/routes.tsx`, `App.tsx`), дерева **контроллеров / моделей / сервисов / экранов** и инфраструктуры. Так можно за один проход описать *что система умеет* и *где это живёт*; отдельные тысячи строк в одном экране или контроллере здесь **не** разбираются по веткам.

**Объём кода (подсчёт файлов):** ~263 файла `*.ts` в `apps/api`, ~317 файлов `*.ts`/`*.tsx` в `apps/web/src` (на момент подсчёта). Папка `packages/*` в workspace объявлена, но пакетов пока нет — общий код живёт внутри приложений.

**Связанные документы:** индекс [docs/README.md](./README.md), [ТД.md](./ТД.md), [**продуктовый обзор**](./VERVEL_PRODUCT_OVERVIEW.md), [**функциональные модули**](./VERVEL_FUNCTIONAL_MODULES.md), [**полный перечень путей git**](./VERVEL_FILE_MANIFEST.md) (`npm run docs:manifest`), корневой [README.md](../README.md), `docs/audits/`.

---

## 1. Назначение продукта

Фитнес-платформа для **атлетов** и **тренеров**: учёт тренировок, визуализация нагрузки (2D-аватар, зоны), календарь и аналитика, периодизация (ATL/CTL/TSB и смежные метрики), прогрессия и силовой дневник, чаты (в т.ч. стикеры/GIF через Klipy), расписание тренировок, **видеозвонки** (LiveKit), **AI** на базе Yandex Cloud (распознавание тренировки с фото, парсинг заметок, генерация, чат-ассистент, копилоты), **кошелёк и пополнение** через **ЮKassa**, достижения и стрики, лидерборды по группам, web push, PWA.

**Роли пользователя:** `athlete`, `trainer`, `both` — в UI доступно переключение кабинета.

---

## 2. Архитектура репозитория

| Компонент | Технологии | Назначение |
|-----------|------------|------------|
| `apps/api` | AdonisJS 6, Lucid ORM, PostgreSQL, Vine validators | HTTP API, фоновые джобы, интеграции |
| `apps/web` | React 19, Vite 7, React Router 7, Tailwind 4, PWA | SPA, VK/Yandex OAuth UX |
| Корень | npm workspaces, Docker Compose, GitHub Actions | Сборка, CI/CD, локальный/прод стек |

**Инфраструктура (docker-compose):** PostgreSQL 16, API, статика web, LiveKit-сервер; при локальной разработке опционально `docker-compose.dev.yml` для hot reload.

---

## 3. Backend (`apps/api`)

### 3.1. Контроллеры (23)

Вся бизнес-логика уровня HTTP сгруппирована по доменам:

- **auth_controller** — регистрация, логин, logout.
- **oauth_controller** — редирект/callback OAuth, выбор роли после OAuth, VK SDK / VK Mini App / Yandex SDK вход.
- **profile_controller** — профиль, фото, пароль, измерения, client preferences, переход athlete/trainer, публичный профиль тренера.
- **workouts_controller** — CRUD тренировок, статистика, по зонам, черновик, пропуск, связь с запланированной тренировкой.
- **avatars_controller** — статистика для аватара (интенсивности по зонам).
- **athlete_copilot_controller** — недельный план копилота атлета, старт, отправка тренеру.
- **streak_controller** — стрики, история, режим, достижения (список, проверка, «просмотрено»).
- **progression_controller** — прогрессия, силовой лог, пины, эталоны упражнений и алиасы, AI-подсказки связей, батч-применение/откат алиасов, лидерборд группы.
- **invite_controller** — инфо по инвайту, принятие, QR-данные, реферальная статистика.
- **video_calls_controller** — создание/завершение звонка, join/decline, активный звонок атлета, история тренера.
- **athlete_controller** — группы, тренеры, непрочитанное, предстоящие тренировки, периодизация атлета, чаты (группа/персонал), лидерборд.
- **chat_controller** — список чатов, поток сообщений, отправка, прочитано, Klipy (статус, категории, поиск), тренерские эндпоинты чатов.
- **trainer_controller** — сегодня, статистика профиля, атлеты (список, email, инвайт, QR, удаление, никнейм, CRM), группы CRUD и состав, календарные данные атлета (статы, аватар периодизации, тренировки), лидерборд группы.
- **trainer_leads_controller** — CRM-лиды CRUD и конвертация.
- **trainer_custom_exercises_controller** — кастомные упражнения тренера.
- **scheduled_workout_controller** — запланированные тренировки (в т.ч. сегодня, результаты).
- **workout_template_controller** — шаблоны тренировок.
- **push_controller** — VAPID-ключ, подписка/отписка web push.
- **exercises_controller** — каталог упражнений (публичные GET).
- **ai_controller** — баланс AI, транзакции, распознавание, парсинг заметок, применение распарсенной тренировки, генерация, чат с ассистентом.
- **payments_controller** — webhook ЮKassa, пополнение (topup).
- **feedback_controller** — обратная связь.
- **trainer_copilot_controller** — приоритетный список, черновик, сообщение, отмена недельного плана.

### 3.2. Маршруты (сводка)

- Публичные: health `/`, логин/регистрация, invite info, payments webhook, OAuth, каталог `/exercises`, VAPID GET `/push/vapid-key`.
- С `middleware.auth()`: тренировки, аватар-статы, копилот атлета, профиль, стрики, прогрессия, достижения, инвайты, звонки (join/decline), атлет (группы, чаты, периодизация), общие чаты, push subscribe/delete, feedback, `payments/topup`, префикс `ai/*`.
- С `auth` + `trainer`: префикс `trainer/*` — сегодня, атлеты, лиды, кастомные упражнения, группы, чаты тренера, scheduled workouts, шаблоны, звонки, trainer copilot.

Полный список — файл `apps/api/start/routes.ts`.

### 3.3. Модели Lucid (27)

`user`, `oauth_provider`, `access_tokens` (через миграции), `trainer_athlete`, `trainer_group`, `group_athletes`, `workout`, `workout_draft`, `scheduled_workout`, `exercise`, `trainer_custom_exercise`, `exercise_anatomy_cache`, `achievement`, `user_achievement`, `user_streak`, `streak_history`, `chat`, `message`, `chat_read`, `topic`, `push_subscription`, `video_call`, `user_measurement`, `user_exercise_standard`, `user_exercise_standard_alias`, `user_exercise_standard_link_batch_snapshot`, `user_pinned_exercise`, `trainer_lead`, плюс таблицы платежей/AI/джоб из миграций.

### 3.4. Сервисы (ядро)

Включают: расчёт тренировок и конвертацию (`WorkoutCalculator`, `WorkoutConverter`), периодизация (`PeriodizationService`), прогрессия и силовой лог (`ProgressionService`, `strength_log_support`), стрики/ачивки/Xp (`StreakService`, `AchievementService`, `XpService`, `streak_logic`, `xp_logic`), каталог и анатомия упражнений (`ExerciseCatalog`, `ExerciseAnatomyService`), AI (`YandexAiService`, `ai_parse_chain`, `ai_workout_ocr_parse`, `AiZonesService`, `AiBalanceService`), копилоты (`CopilotPlanService`, `AthleteCopilotPlanService`, `CopilotPriorityService`, `CopilotInsightsService`, `CopilotSharedRules`), чаты и стрим (`chat_stream_logic`, `DialogService`, `KlipyService`), звонки (`LiveKitService`, `call_logic`), пуши (`PushNotificationService`), очередь (`JobQueueService`, `JobWorkerService`), фан-аут расписания (`ScheduledWorkoutFanoutService`), матчинг упражнений (`exercise_match_helpers`).

### 3.5. Фоновые задачи

Таблица `jobs`. Типы обработки в `JobWorkerService`: `crm_daily_reminder`, `push_event` (сообщения, приглашения, запланированные тренировки, входящий звонок и др.), `scheduled_workout_fanout`. Планировщик CRM-напоминаний — `start/jobs.ts` при `JOBS_WORKER_ENABLED=true`.

### 3.6. Команды (ace)

- `backfill_workouts_zones_load_abs`
- `backfill_workouts_exercise_zones_month`

### 3.7. База данных

**66 миграций** в `apps/api/database/migrations/`. Сидеры: пользователи, тренер, упражнения, тренировки, достижения и др. в `database/seeders/`.

### 3.8. Middleware

`auth`, `trainer`, cookie auth, JSON response, request logger, container bindings.

### 3.9. Тесты

Unit и functional в `apps/api/tests/` (в т.ч. маршруты, копилот, зоны, матчинг упражнений).

### 3.10. Прочие файлы API

`test_copilot.mjs` — вспомогательный скрипт для копилота; `bin/server.ts`, `bin/console.ts`, `bin/test.ts`.

---

## 4. Frontend (`apps/web`)

### 4.1. Маршруты SPA

Из `App.tsx` и `constants/routes.tsx`:

- Публичные: `/`, `/login`, `/register`, `/auth/callback`, `/select-role`, `/invite/:token`, `/docs/privacy`, `/docs/offer`, `/docs/seller`.
- Защищённые: `/home`, `/onboarding`, `/dialogs`, `/analytics`, `/calendar` (лента активности), `/streak`, `/my-team`, `/profile`, `/workouts/new`, вся ветка `/trainer/*` (сегодня, команда, группы, атлеты, лиды, CRM, шаблоны, календарь, библиотека упражнений), детальные `/trainer/athletes/:id`, `/trainer/groups/:id`, `/trainer/personal`, публичный профиль `/trainer/profile/:trainerId`, лидерборд `/groups/:groupId/leaderboard`, хаб прогрессии `/progression`. Редиректы со старых путей на `/progression` и `/onboarding`.

Навигация: раздельные `athleteRoutes` и `trainerRoutes` в нижнем тулбаре; для тренеров домашняя логика ведёт на `/trainer`.

### 4.2. Экраны (папки `screens/`)

Лендинг, логин/регистрация/OAuth/роль, онбординг, активность и детали тренировок, аналитика, аватар, стрики, диалоги, форма тренировки, профиль (вкладки), команда атлета, лидерборд, прогрессия и силовой лог, приглашения, юридические документы; для тренера — сегодня, списки групп/атлетов, детали атлета/группы, персональный чат, публичный профиль, календарь, шаблоны, библиотека упражнений, лиды, CRM, команда.

### 4.3. Клиентские API-модули (`src/api/`)

`auth`, `profile`, `workouts`, `avatar`, `exercises`, `athlete`, `trainer`, `chat`, `streak`, `ai`, `payments`, `push`, `invite`, `calls` + обёртки `http/baseApi`, `publicApi`, `privateApi`.

### 4.4. Крупные UI-блоки

Видеозвонки (LiveKit), AI-чат и генерация/распознавание тренировок, PWA и push (`sw.ts`, `hooks/usePushNotifications`), VK Embedded OAuth gate, DnD для списков тренировок, графики (recharts), QR для привязки атлета.

### 4.5. Тесты

Vitest (`hooks`, utils, часть экранов).

---

## 5. Переменные окружения (обзор)

Задаются в `apps/api/start/env.ts`: БД; OAuth VK/Yandex; AI/Yandex Cloud и тарификация; ЮKassa; LiveKit; VAPID; опционально `JOBS_*`; CORS; Klipy. Web использует Vite и прокси/API base URL согласно конфигу сборки.

---

## 6. CI/CD

`.github/workflows/deploy.yml`: на PR/push — lint, typecheck, тесты API и web; при push в `master` — депloy (шаги после checkout — по репозиторию). Dependabot для зависимостей.

---

## 7. Что документ **намеренно** не дублирует

- Построчное описание каждого из сотен файлов — поддерживать это вручную нереалистично; при изменениях смотрите `routes.ts`, `routes.tsx`, дерево `controllers/` и `screens/`.
- Детальные продуктовые гипотезы и метрики — см. `docs/audits/` и `CRM_MVP.md`, killer-feature заметки.

---

*Обновляйте этот файл при появлении новых доменов (контроллеров/экранов) или при заведении shared-пакетов в `packages/`.*
