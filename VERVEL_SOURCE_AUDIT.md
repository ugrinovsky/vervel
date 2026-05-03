# Итеративный обход исходников Vervel

**Методика:** каждый блок — файлы открыты и прочитаны (не инференс по имени). Для очень больших файлов зафиксированы входные импорты, публичные API и фактические отличия от `ТД.md`, если есть.

Журнал: краткий конспект назначения. Полный перечень эндпоинтов — `apps/api/start/routes.ts`; общее ТЗ — `ТД.md`.

**Расхождение с `ТД.md`:** в §4 про streak описана простая «подряд дней» логика; в коде **`StreakService` + `streak_logic`** считаются **недельные** серии (завершённая неделя = N тренировок в ISO-неделе, режим simple/intensive). Имеет смысл обновить ТД или пометить как устаревшее.

**Объём (приблизительно):** `apps/api` ~202 `.ts` файла (включая миграции ~57 и тесты); `apps/web/src` ~275 `.ts`/`.tsx`.

---

## Итерация 1 — монорепо, точки входа API, конфиг, middleware, события push

### Корень и workspaces

| Файл | Назначение |
|------|------------|
| `package.json` | Workspaces `apps/*`; скрипты `dev` (postgres + concurrently api+web), `db:*`, `lint`, `typecheck`, `test`; husky |

### `apps/api/package.json`

Импорты `#controllers` … `#utils`; зависимости Adonis, lucid, auth, cors, limiter, sharp, heic-convert, livekit-server-sdk, web-push, fuzzball; **hotHook** границы на контроллеры и middleware.

### `apps/web/package.json`

React 19, Vite 7, Tailwind 4, react-router 7, axios, recharts, framer-motion, LiveKit client/UI, VK SDK/bridge, vite-plugin-pwa, vitest.

### `apps/api/bin/`

| Файл | Назначение |
|------|------------|
| `server.ts` | Ignitor → HTTP-сервер; boot `#start/env`; SIGTERM/SIGINT |
| `console.ts` | Ace CLI |
| `test.ts` | `NODE_ENV=test`; Japa runner + `tests/bootstrap` |

### `apps/api/start/`

| Файл | Назначение |
|------|------------|
| `kernel.ts` | Глобальный стек: static, container bindings, force JSON, CORS; роутер: bodyparser, auth init, **cookie auth**, request logger; именованные `auth`, `trainer` |
| `routes.ts` | Все HTTP-маршруты (см. файл; единственный источник API) |
| `events.ts` | Регистрация слушателя push: `push:message`, `push:athlete_added`, `push:invite_accepted`, `push:workout_scheduled`, `push:call_incoming` → `PushListener` |
| `env.ts` | Валидация env: DB, OAuth VK/Яндекс, VK Mini App, AI Yandex и тарифы, ЮKassa, LiveKit, VAPID, CORS, Klipy |

### `apps/api/config/`

| Файл | Назначение |
|------|------------|
| `app.ts` | `APP_KEY`, cookie `maxAge` 2h, httpOnly, secure в production, sameSite lax |
| `auth.ts` | Guard `api`: access tokens, провайдер User + `accessTokens` |
| `database.ts` | PostgreSQL через lucid, migrations `database/migrations`, naturalSort |
| `bodyparser.ts` | JSON/multipart до 20mb |

### `apps/api/app/middleware/`

| Файл | Назначение |
|------|------------|
| `cookie_auth_middleware.ts` | Читает `auth_token` cookie → подставляет `Authorization: Bearer`, если нет валидного Bearer в заголовке |
| `auth_middleware.ts` | Стандартная аутентификация guard |
| `trainer_middleware.ts` | 403 если роль не `trainer` и не `both` |
| `container_bindings_middleware.ts` | Bind HttpContext и Logger в контейнер запроса |
| `request_logger_middleware.ts` | После ответа: method, path, status, durationMs (пропуск OPTIONS) |
| `force_json_response_middleware.ts` | Accept → application/json для JSON-ошибок |

### События и push

| Файл | Назначение |
|------|------------|
| `app/events/push_events.ts` | Типизация доменных событий для emitter (chat message payload + push:* формы) |
| `app/listeners/push_listener.ts` | На `push:message` пропускает контент с JSON и `__type` (внутренние сообщения); иначе push пользователям; отдельные тексты для добавления атлета, инвайта, расписания, входящего звонка |

### `apps/api/app/exceptions/handler.ts`

Debug вне production; `report` не логирует WARN для `E_ROW_NOT_FOUND`.

---

## Следующие итерации (план)

| # | Область |
|---|---------|
| 2 | `app/validators/`, оставшиеся `app/utils/`, `commands/` |
| 3 | Все `app/models/` (по файлам) |
| 4 | `app/services/` (по файлам) |
| 5 | `app/controllers/` (по файлам или парами) |
| 6 | `database/migrations/` — сводная таблица таблиц + отличия от ТД |
| 7 | `database/seeders/`, `tests/` |
| 8 | `apps/web/src` — `main`, `App`, `api/*`, `contexts/*`, затем экраны пакетами |
| 9 | `apps/web` — `components/*`, `hooks/*`, `util/*`, `sw.ts`, vite config |

---

## Итерация 2 — validators, utils, commands

### `app/validators/` (VineJS)

| Файл | Назначение |
|------|------------|
| `auth_validator.ts` | Регистрация: имя, email, пароль (буква+цифра), роль, опционально пол и `refId` |
| `trainer_validator.ts` | Создание группы, добавление атлета по email, атлет в группу |
| `workout_validator.ts` | Создание/обновление тренировки: дата, тип, RPE, массив упражнений (силовые сеты, WOD, зоны, `zoneWeights`, и т.д.); `update` = тот же shape |

### `app/utils/`

| Файл | Назначение |
|------|------------|
| `auth_user_payload.ts` | Публичный DTO пользователя для login/OAuth/профиля + `clientPreferences` |
| `auth_cookie.ts` | `setAuthTokenCookie` / `clearAuthTokenCookie`; при `AUTH_COOKIE_SAME_SITE=none` — Secure + SameSite none (VK iframe) |
| `client_preferences.ts` | Тип `ClientPreferences` (онбординг атлет/тренер, intent, work style, баннер); `patchClientPreferencesFromBody`, `mergeClientPreferences` |
| `date.ts` | Локальный день `YYYY-MM-DD`, Luxon-утилиты, начало недели (понедельник), `parseDateRange` для query |
| `zone_weights.ts` | `distributeZoneWeights` — нормализация долей по зонам упражнения |
| `error.ts` | `errorMessage(unknown)` для catch |
| `type_guards.ts` | `isRecord`, типы `JsonValue` / `JsonObject` |
| `vk_mini_app_launch.ts` | Проверка подписи VK Mini App (HMAC-SHA256 по `vk_*`, гибкость для лишних/пропущенных ключей, legacy MD5), `normalizeVkLaunchParams`, `verifyVkMiniAppLaunchFromRawSearch` |
| `trusted_vk_photo_url.ts` | Allowlist доменов VK CDN для `photoUrl` |
| `klipy_message.ts` | Префикс `klipy:`, парсинг GIF URL (`media.klipy.com`), текст для push-превью |

### `commands/` (Ace, `startApp: true`)

| Файл | Назначение |
|------|------------|
| `backfill_workouts_zones_load_abs.ts` | Батчевый пересчёт `zones_load_abs` и согласованных полей (`--force`, `--dry-run`) |
| `backfill_workouts_exercise_zones_month.ts` | За N дней: AI-уточнение `exercises[].zones` + пересчёт зон нагрузки (`--days`, `--force`, `--dry-run`) |

---

---

## Итерация 3 — модели Lucid (`app/models/`, 25 файлов)

Все файлы прочитаны. Ниже — таблица и особенности; без отдельной модели в коде остаются **`access_tokens`**, **`balance_transactions`**, **`payments`** (работа через Lucid provider / raw query в сервисах и контроллерах).

| Модель | Назначение |
|--------|------------|
| `User` | AuthFinder + scrypt; роль nullable; баланс, aiNotesFree, themeHue, clientPreferences (JSON), xp, referredById, донат-реквизиты; связи trainerAthletes, groups, streak, achievements, oauth, chats, scheduled, templates, measurements; геттеры isTrainer/isAthlete; `accessTokens` provider |
| `Exercise` | Каталог: string id, title, category, keywords/zones JSON, intensity |
| `Workout` | SoftDeletes; типы `WorkoutExercise` / `WorkoutSet` в файле; exercises/zonesLoad/**zonesLoadAbs** JSON; totalIntensity/Volume; notes, rpe, scheduledWorkoutId |
| `TrainerAthlete` | Связь тренер–атлет; status; inviteToken; nickname; `isActiveBinding` |
| `TrainerGroup` | SoftDeletes; many-to-many User через `group_athletes` |
| `Chat` | group/personal; trainerId, groupId, athleteId; `findOrCreatePersonal` |
| `Message` | content; кастомный `serialize()` с вложенным sender |
| `ChatRead` | lastReadAt по chatId + userId |
| `ScheduledWorkout` | SoftDeletes; workoutData, assignedTo[], status; templateId |
| `WorkoutTemplate` | SoftDeletes; exercises[], description, isPublic; связь с scheduled |
| `UserStreak` | current/longest, mode simple/intensive, недельные поля для intensive |
| `StreakHistory` | eventType, streakValue, metadata |
| `Achievement` | key, category, requirement*, isActive |
| `UserAchievement` | unlockedAt, isSeen |
| `WorkoutDraft` | payload JSON на пользователя |
| `VideoCall` | roomName, trainer/athlete/group, status, started/ended |
| `PushSubscription` | endpoint, p256dh, auth |
| `OAuthProvider` | vk/yandex, providerUserId, tokens |
| `Topic` | Ветки в групповом чате: groupId, chatId, name, emoji, order, isDefault |
| `ExerciseAnatomyCache` | normalized_label → zones, status ok/unknown, promptVersion, modelId |
| `UserMeasurement` | type (напр. body_weight), value, loggedAt |
| `UserPinnedExercise` | exerciseId строка для журнала |
| `UserExerciseStandard` | эталон: catalogExerciseId nullable, displayLabel |
| `UserExerciseStandardAlias` | sourceExerciseId → standardId |
| `UserExerciseStandardLinkBatchSnapshot` | touchesJson для отката батча алиасов |

---

---

## Итерация 4 — сервисы (`app/services/`, 24 файла)

Файлы просмотрены (крупные — начало + назначение по структуре импортов и экспортов).

| Файл | Назначение |
|------|------------|
| `WorkoutCalculator` | Расчёт zonesLoad / zonesLoadAbs, объём/интенсивность по типам тренировки; восстановление аватара (экспоненциальное затухание); подтягивание последнего body_weight из замеров; интеграция с каталогом и `distributeZoneWeights` |
| `PeriodizationService` | ATL/CTL/TSB за ~132 дня, фазы с текстами для athlete/trainer, weeklyLoad |
| `StreakService` | После тренировки — обновление `UserStreak` через **`streak_logic.computeWeeklyStreakUpdate`** (недельные серии simple/intensive); логирование истории; вызов AchievementService + XpService |
| `streak_logic` | Чистая логика: «завершённая неделя» = ≥3 (simple) или ≥5 (intensive) тренировок в ISO-неделе; подсчёт подряд идущих завершённых недель |
| `AchievementService` | Ленивая загрузка счётчиков по `requirementType`; разблокировка; XP по категории; использование ProgressionService для personal_records / progression_coeff |
| `XpService` | Инкремент `users.xp`; уровень через `xp_logic.computeLevel` |
| `xp_logic` | Пороги уровней (формула ~100×n^1.6), названия уровней, таблица наград `XP_REWARDS` |
| `AiBalanceService` | Стоимости из env; `charge` + `balance_transactions`; `calculateChatCost`; welcome/referral бонусы (остальное в файле) |
| `YandexAiService` | Vision/OCR (HEIC), парсинг программы, генерация, чат с биллингом токенов; интеграция с цепочками и зонами; логирование LLM I/O |
| `ai_parse_chain.ts` | Тип `AiParseChainCtx` для trace в логах |
| `ai_workout_ocr_parse.ts` | Промпты и нормализация текста до LLM; `shouldSkipWorkoutProgramCleanup` |
| `WorkoutConverter` | Маппинг упрощённых ExerciseData → `WorkoutExercise` для калькулятора |
| `ExerciseCatalog` | Загрузка JSON каталога, `MUSCLE_ZONES`, fuzzy-match, выдача упражнений |
| `exercise_match_helpers` | Нормализация строк, токены, fuzzyball; `canonicalCustomExerciseKey`; capitalize для UI |
| `ExerciseAnatomyService` | Двухшаговый CoT (биомеханика → JSON зон), кэш в `exercise_anatomy_cache`, версия промпта |
| `AiZonesService` | Обёртка `refineZonesForExercises` → ExerciseAnatomyService |
| `ProgressionService` | Большой модуль: силовой журнал, пины, эталоны/алиасы, AI-подсказки связей, батч-откат, лидерборд, Epley 1RM, dashboardMetric |
| `strength_log_support.ts` | `normalizePinnedExerciseIdList`, `pickTopExerciseIdsBySessionCount` |
| `DialogService` | Тяжёлый SQL для списка диалогов с last message и unread |
| `chat_stream_logic.ts` | `resolveAfterId` для SSE reconnect; `formatSseEvent` |
| `KlipyService` | HTTP к Klipy API, кэш grid/categories, парсинг ответов |
| `LiveKitService` | JWT токены, create/delete/list room, имена комнат personal/group |
| `PushNotificationService` | web-push, удаление мёртвых подписок 410/404; resolveAthleteIds для scheduled |
| `call_logic.ts` | `computeCallAction` — чистая логика повторного создания комнаты / уведомления |

---

## Итерация 5 — контроллеры (`app/controllers/`, 19 классов)

Методы сверены с `grep` по файлам + выборочное чтение критичных кусков.

| Контроллер | Методы / роль |
|------------|----------------|
| `auth_controller` | `login` — limiter 10/15min per IP, cookie token; `register` — 5/10min, honeypot `website`, disposable email block, **апгрейд существующего user до `both`**, refId с капом рефералов и бонус рефереру через `AiBalanceService.topup`; `me`, `logout` (удаление access token + clear cookie) |
| `oauth_controller` | `redirect`/`callback` VK и Яндекс; `vkSdkLogin`, `vkMiniAppLogin` (проверка подписи через `#utils/vk_mini_app_launch`), `yandexSdkLogin`; `setRole`; приватный `linkOrCreateVkUser` |
| `exercises_controller` | `index` → `ExerciseCatalog.all()`; `show` → `findFull` или 404 |
| `workouts_controller` | REST + `stats`, `byZone`, draft GET/PUT/DELETE, `getByScheduledId`; при сохранении тренировки — калькулятор, streak, achievements (по коду внутри) |
| `avatars_controller` | `getZoneIntensities` — зоны для экрана аватара |
| `profile_controller` | CRUD профиля, фото (sharp), пароль, become athlete/trainer, замеры, публичный профиль тренера, **`patchClientPreferences`** |
| `streak_controller` | streak + history + `setMode`; achievements list / check / seen |
| `progression_controller` | progression summary, strength log, pins, CRUD эталонов/алиасов, AI suggest links, batch apply/revert, group leaderboard |
| `athlete_controller` | группы, тренеры, unread (диалоги), чаты group/trainer, upcoming, периодизация «моя» |
| `trainer_controller` | today, athletes CRUD/invite/QR/nickname, athlete stats/avatar/periodization/workouts, groups CRUD + athletes, profile-stats, group leaderboard |
| `scheduled_workout_controller` | list (фильтры), today, create/update/delete плановых |
| `workout_template_controller` | CRUD шаблонов |
| `chat_controller` | тренерские get/send/last; общие listChats, SSE `streamMessages`, shared messages/read; Klipy status/categories/search |
| `video_calls_controller` | create → LiveKit + DB + push; join/decline/end; trainerHistory; athleteActive |
| `ai_controller` | recognize, generate, parse notes / parse text / apply; status, balance, transactions, chat |
| `payments_controller` | `topup` ЮKassa; **`webhook`** с IP-проверкой (или skip в dev) |
| `push_controller` | VAPID key публично; subscribe upsert по endpoint; unsubscribe |
| `invite_controller` | accept, referral stats, qr-data athlete, **публичный** getInviteInfo по token |
| `feedback_controller` | вставка в таблицу `feedbacks` |

---

## Итерация 6 — миграции (`database/migrations/`, 57 файлов)

Не каждый файл читался целиком; собрана карта **таблиц** и заметных операций.

**Создание таблиц (имена из `tableName` / raw SQL):**

| Таблица | Примечание |
|---------|------------|
| `users` | базовая; далее множество `alter` (роль nullable, AI balance, theme, gender, trainer fields, donate, client_preferences, xp, ai_notes_free, …) |
| `auth_access_tokens` | JWT/access tokens Adonis |
| `exercises` | каталог |
| `workouts` | + soft delete, scheduled_workout_id, rpe, zones_load_abs |
| `trainer_athletes` | + nickname |
| `trainer_groups` | + soft delete |
| `group_athletes` | pivot; позже индекс athlete_id |
| `user_streaks` | + weekly mode поля |
| `achievements` | + правки категорий (отдельные миграции) |
| `user_achievements` | |
| `streak_history` | |
| `oauth_providers` | |
| `chats` | |
| `messages` | |
| `chat_reads` | |
| `workout_templates` | + soft delete |
| `scheduled_workouts` | + soft delete |
| `rate_limits` | Adonis limiter |
| `balance_transactions` | AI charges/topups; индекс user_id+created_at |
| `payments` | ЮKassa |
| `feedbacks` | |
| `push_subscriptions` | |
| `workout_drafts` | |
| `video_calls` | |
| `user_measurements` | миграция названа add_body_weight — создаёт таблицу замеров |
| `user_pinned_exercises` | |
| `topics` | + сид дефолтных тем в той же миграции |
| `exercise_anatomy_cache` | |
| `user_dashboard_exercises` | **создана и удалена** (`drop_user_dashboard_exercises`) — логика ушла в progression |
| `user_exercise_standards` / `user_exercise_standard_aliases` | raw SQL IF NOT EXISTS |
| `user_exercise_standard_link_batch_snapshots` | raw SQL |

**Индекс и сводка:** физическая схема = порядок миграций; источник правды для «что в БД» — текущие файлы в `database/migrations/` + `node ace migration:status` на окружении.

---

---

## Итерация 7 — сидеры и тесты API

### `database/seeders/` (7 файлов)

| Сидер | Назначение |
|------|------------|
| `user_seeder` | `test@example.com` / пароль для локальных проверок |
| `exercise_seeder` | Большой статический набор `Exercise` в dev/production |
| `free_exercise_seeder` | Импорт из JSON + маппинг мышц → зоны |
| `achievement_seeder` | Удаляет старые day-based streak-ключи; вставляет недельные и прочие ачивки |
| `trainer_seeder` | Тренер + несколько атлетов, группы, связи, плановые тренировки |
| `workout_seeder` | Тренировки для `test@example.com` |
| `trainer_workouts_seeder` | 14 дней тренировок для демо-атлетов с zonesLoad для аватаров |

### `tests/` (`bootstrap.ts` + 28 спекафайлов)

- **`bootstrap`**: для `functional` поднимается HTTP-сервер; для `unit` — `TestUtils.boot()` и **`db().migrate()`** перед тестами с БД.
- **`functional/routes.spec.ts`** — сквозные проверки роутов (~100 сценариев по названию из ТД).
- **Unit** (по имени файла): `workout_calculator`, `streak_logic`, `ai_balance` (+ `ai_balance_db`), `xp_logic`, `zone_weights`, `exercise_match_helpers`, `exercise_catalog`, `strength_log_support`, `progression_logic`, `progression_standard_alias_batch`, `strength_log_workout_type_pins`, `achievement_logic`, `call_logic`, `chat_stream_logic`, `dialog_service`, `chat_unread_counts`, `klipy_service`, `klipy_message`, `payments_webhook`, `vk_mini_app_launch`, `trusted_vk_photo_url`, `client_preferences`, `date_utils`, `ai_zones_service`, `exercise_anatomy_service`, `yandex_ai_service`.

---

---

## Итерация 8 — web: вход, роутинг, HTTP, контексты, VK-обёртка, тема, SW

### Точка входа и оболочка

| Файл | Назначение |
|------|------------|
| `src/main.tsx` | `ThemeController.init` + авто-листенер; глобальный запрет pinch-zoom (touchmove multi-touch); StrictMode, ErrorBoundary, BrowserRouter → App |
| `src/App.tsx` | Toaster; все `<Route>`; `ProtectedRoute` (логин → `/login`, нет роли → `/select-role`, онбординг атлет/тренер); `HomeScreen` редирект тренера на `/trainer` иначе Avatar; дедуп маршрутов из `routes`; нижняя `Navigation` вне «публичных» путей; `IncomingCallWatcher` для атлета в приложении |
| `src/constants/routes.tsx` | `athleteRoutes` / `trainerRoutes` — пути, подписи, иконки Heroicons, элементы экранов; экспорт `routes` |

### HTTP (`src/api/`)

| Модуль | Назначение |
|--------|------------|
| `http/baseApi.ts` | `VITE_API_URL` или localhost:3333; `withCredentials: true`; опциональный Bearer из `localStorage` (`vervel_access_token`); интерцептор 401 + `clearAuthAndRedirectToLogin`; отладка 401 через `VERVEL_DEBUG_401` |
| `http/privateApi.ts` | `createApi({ redirectOn401: true })` |
| `http/publicApi.ts` | без редиректа на 401 |
| `auth.ts` | login/register/logout/setRole; `getOAuthRedirectUrl` |
| `profile.ts` | профиль, фото, пароль, замеры, публичный профиль тренера, client preferences |
| `workouts.ts` | CRUD тренировок, stats, by-zone, draft |
| `exercises.ts` | каталог |
| `athlete.ts` | группы, тренеры, unread, upcoming, периодизация, чаты, **strength log / эталоны / AI links / leaderboard** |
| `trainer.ts` | today, атлеты, группы, расписание, шаблоны, чаты, непрочитанное, статы атлета |
| `chat.ts` | диалоги, сообщения, SSE (через URL), Klipy |
| `ai.ts` | статус, баланс, транзакции, recognize/generate/parse/apply/chat |
| `streak.ts` | streak, история, ачивки |
| `avatar.ts` | зоны аватара |
| `calls.ts` | звонки |
| `payments.ts` | topup |
| `push.ts` | VAPID, subscribe/unsubscribe |
| `invite.ts` | инвайт, QR, accept |

### Контексты и auth-хелперы

| Файл | Назначение |
|------|------------|
| `contexts/AuthProvider.tsx` | user + activeMode + balance в state; синхронизация с `localStorage` (`user`, `activeMode`); `migrateLocalOnboardingToServer` после логина; ThemeController при user; logout чистит user/mode/token + auxiliary session |
| `contexts/auth-types.ts`, `auth-hooks.ts`, `auth-contexts.ts` | типы, `useAuth` / `useActiveMode` / `useBalance` |
| `contexts/SheetStackProvider.tsx` | стек bottom-sheet: subscribe/unsubscribe, Escape закрывает верхний, `body overflow`, лимит `MAX_SHEETS` |
| `auth/auxiliarySessionStorage.ts` | ключи sessionStorage для VK mini launch; очистка при logout/401 |

### VK mini app

| Файл | Назначение |
|------|------------|
| `vk/EmbeddedOAuthLaunchGate.tsx` | при `VITE_ENABLE_VK_MINI_APP` — сплэш «Вход…» до bootstrap `useEmbeddedOAuthLaunch` |
| `vk/vkLaunchParams.ts`, `vk/useEmbeddedOAuthLaunch.ts` | (см. при следующем углублении) |

### Тема и онбординг

| Файл | Назначение |
|------|------------|
| `util/ThemeController.ts` | единая точка: hue vs special themes (dark/light/auto через sentinel hue в БД), CSS variables, синхронизация с профилем |
| `util/athleteOnboarding.ts`, `util/trainerOnboarding.ts` | флаги complete из `clientPreferences` + legacy localStorage; `shouldShow*Onboarding` для редиректов в App |
| `util/clientPreferencesMigration.ts` | импортируется из AuthProvider — перенос локальных флагов на сервер |

### Service worker

| Файл | Назначение |
|------|------------|
| `src/sw.ts` | воркер: `registerOffline()` + `registerPush()` из `sw/offline`, `sw/push` |

---

---

## Итерация 9 — экраны (`src/screens/`)

Каждый файл открыт минимум на заголовок/импорты; для неочевидных — начало компонента.

| Экран | Назначение |
|-------|------------|
| `LandingScreen` | Маркетинговый лендинг, вход/регистрация |
| `LoginScreen` / `RegisterScreen` | Email-вход и регистрация (refId, honeypot на регистрации) |
| `OAuthCallbackScreen` | Завершение OAuth редиректа |
| `SelectRoleScreen` | Выбор роли после OAuth при `role === null` |
| `InviteScreen` | Принятие приглашения по токену в URL |
| `DocsScreen` | Юридические тексты (privacy / offer / seller) по пути |
| `AthleteOnboardingScreen` | Первый заход атлета (intent с тренером/соло, PWA/push блоки) |
| `TrainerOnboardingScreen` | Первый заход тренера (стиль работы и т.д.) |
| `ActivityScreen` | Календарь тренировок, детали дня |
| `AnalyticsScreen` | Статистика, графики, радар зон |
| `AvatarScreen` | 2D-аватар восстановления по зонам |
| `DialogsScreen` | Список чатов |
| `ProfileScreen` | Вкладки: профиль, настройки, кошелёк |
| `WorkoutForm` | Создание/редактирование тренировки (ручной ввод + AI) |
| `StreakScreen` | Серии и достижения |
| `AthleteMyTeamScreen` | Группы и тренеры атлета |
| `ProgressionHubScreen` | Хаб «Сила и прогресс» → встраивает StrengthLog |
| `StrengthLogScreen` | Силовой журнал (в т.ч. `embedded`) |
| `LeaderboardScreen` | Лидерборд группы |
| `TrainerTodayScreen` | Обзор «Сегодня» для тренера |
| `TrainerTeamScreen` | Сводная команда |
| `TrainerGroupsListScreen` / `TrainerAthletesListScreen` | Списки групп и атлетов |
| `TrainerCalendarScreen` | Календарь тренера |
| `TrainerTemplatesScreen` | Шаблоны тренировок |
| `TrainerExerciseLibraryScreen` | Библиотека упражнений |
| `TrainerAthleteDetailScreen` | Карточка атлета (статы, звонок, данные) |
| `TrainerGroupDetailScreen` | Карточка группы |
| `TrainerPersonalScreen` | Редактирование публичного профиля тренера: био, специализации, донат-реквизиты, фото |
| `TrainerPublicProfileScreen` | Просмотр публичного профиля тренера по id |

Вспомогательные файлы в экранах: `ActivityScreen/*`, `ProfileScreen/tabs/*`, `LandingScreen/*`, `WorkoutForm/*`, тесты `*.test.ts` у части экранов.

---

## Итерация 10 — хуки и компоненты (обзор)

### `src/hooks/` (~21 файл)

| Хук | Назначение |
|-----|------------|
| `useAchievementToast` | Тосты при новых ачивках |
| `useAiBalance` | Доступность AI по балансу относительно `cost` |
| `useAthleteAvatar` | Данные аватара атлета для тренера |
| `useAthleteStats` | Статистика атлета за период |
| `useBodyScrollLock` | Блокировка скролла body |
| `useCallControls` | LiveKit leave и т.п. |
| `useClientInfiniteScroll` | Бесконечная прокрутка на клиентском списке |
| `useDialogs` | Список диалогов + поллинг |
| `useEscapeKey` | Обработка Escape |
| `useExerciseFilters` | Фильтрация каталога упражнений |
| `useExercises` | Загрузка каталога |
| `useImageLoad` | Состояние загрузки изображений |
| `usePushNotifications` | Подписка web push |
| `useServerPagination` | Пагинация с сервера |
| `useTrainerUnreadCounts` | Непрочитанное у тренера (поллинг) |
| `useVideoCall` | Сессия видеозвонка |
| `useVisualViewportBottomInset` | Inset для мобильной клавиатуры / safe area |
| `useWorkoutStats` | Агрегаты тренировок за период |

Плюс тесты: `useDialogs.test.ts`, `useExerciseFilters.test.ts`, `useTrainerUnreadCounts.test.ts`.

### `src/components/` (~122 файла — по доменам)

- **`analytics/`** — карточки, графики Recharts, радар, периодизация, неделя/тренды, рекомендации, мышцы.
- **`Avatar/`**, **`AvatarView/`**, **`MuscleZones/`** — тело и зоны.
- **`Ai*`** — `AiWorkoutRecognizer`, `AiWorkoutGenerator`, `AiWorkoutTextParser`, `AiChat`, `AiLoadingView`.
- **`ChatBox/`**, **`ChatScreen/`**, **`FullScreenChat/`** — чаты, превью тренировок, Klipy.
- **`VideoCall/`** — комната, контролы, входящий звонок, watcher.
- **`Workout*`** — форма база, редактор упражнений, интенсивность, типы, inline form, shared DnD-строки.
- **`Exercise*`** — карточка, фильтр, пикер, параметры, детальный sheet.
- **`ui/`** — кнопки, инпуты, модалки, табы, combobox, спиннеры, разделители.
- **Остальное** — `Navigation`, `Screen`/`ScreenHeader`, онбординг PWA, QR, достижения, карточки групп/атлетов, `ErrorBoundary`, PWA install hint, OAuth-кнопки.

---

## Итерация 11 — VK Mini App, service worker, Vite/PWA, типы, `utils` / `util`

### `src/vk/` (кроме уже описанного `EmbeddedOAuthLaunchGate`)

| Файл | Назначение |
|------|------------|
| `vkLaunchParams.ts` | Флаг `VITE_ENABLE_VK_MINI_APP`; сбор `vk_*` из `location.search` и hash; сохранение bundle в `sessionStorage` (`AUX_OAUTH_LAUNCH_BUNDLE_KEY`); `getVkLaunchRawQueryForVerify` для HMAC как в VK examples; `hasEmbeddedOAuthLaunchContext` (URL, session, iframe, referrer vk.com) |
| `useEmbeddedOAuthLaunch.ts` | Динамический импорт `vk-bridge` → `VKWebAppInit`; при отсутствии `sign` — `VKWebAppGetLaunchParams`; POST `/oauth/vk/mini-app-login` с `launchParams` + опционально `launchQuery`; `setApiAccessToken`; защита от повторов failed sign; `needsRole` → `/select-role`; иначе `syncVkMiniAppProfileFromBridge` + `login` + `/home` |
| `syncVkMiniAppProfile.ts` | `VKWebAppGetUserInfo` → PUT `/profile` (имя, фото с доверенных CDN, пол); 401 без глобального редиректа |

### Service worker (`src/sw.ts` + `src/sw/`)

| Файл | Назначение |
|------|------------|
| `sw/offline.ts` | Кэш `offline.html` (`offline-v1`); на `fetch` с `mode === 'navigate'` — сеть, при ошибке отдача из кэша |
| `sw/push.ts` | `push` → `showNotification` (JSON: title/body/url); `notificationclick` — focus существующего окна + `navigate(url)` или `openWindow` |

### Сборка (`vite.config.ts`, `vitest.config.ts`)

| Файл | Назначение |
|------|------------|
| `vite.config.ts` | React, Tailwind v4 (`@tailwindcss/vite`), SVGR; **VitePWA** `injectManifest` из `src/sw.ts`; alias `@` → `src`; CSP `worker-src blob: 'self'` на dev-сервере |
| `vitest.config.ts` | Отдельный конфиг без полного vite (избегание зависания); `environment: node`; тесты `src/**/*.{test,spec}.{ts,tsx}`; `maxWorkers: 1`, без параллелизма файлов |

### `src/types/`

| Файл | Назначение |
|------|------------|
| `clientPreferences.ts` | Должен совпадать с API `users.client_preferences` |
| `User.ts`, `Exercise.ts`, `Workout.ts`, `WorkoutResult.ts`, `Analytics.ts`, `SVGMuscleZone.ts` | Доменные типы фронта |
| `svg.d.ts` | Декларации импорта SVG |

### `src/utils/` (общие хелперы + тесты)

| Файл | Назначение |
|------|------------|
| `date.ts` | Даты для UI |
| `textNormalize.ts` | Нормализация строк (синхрон с API `exercise_match_helpers` по смыслу) |
| `canonicalCustomExerciseKey.ts` | Ключи кастомных упражнений |
| `exerciseIdForDisplay.ts` | Отображение id упражнения |
| `photoUrl.ts` | URL фото (абсолютные/относительные) |
| `chatUtils.ts` | Утилиты чата |
| `shareCard.ts` | Шаринг карточек |
| `apiError.ts` | Разбор ошибок API |
| `typeGuards.ts` | Узкие проверки типов |

### `src/util/` (прикладная логика рядом с фичами)

| Файл | Назначение |
|------|------------|
| `ThemeController.ts`, `athleteOnboarding.ts`, `trainerOnboarding.ts`, `clientPreferencesMigration.ts` | Уже в ит. 8–9 |
| `parseStoredAuthUser.ts` | Разбор user из storage |
| `localStorageWorkoutDraft.ts` | Черновик тренировки в localStorage |
| `oauthPlaceholderEmail.ts` | Заглушки email для OAuth |
| `userRole.ts` | Хелперы ролей |
| `exercise.ts`, `workoutExerciseConversions.ts`, `zones.ts`, `zoneIntensity.ts` | Упражнения и зоны |
| `analyticsPeriodDays.ts` | Длительность периодов аналитики |
| `getRecomendations.ts` | Рекомендации для UI аналитики |
| `klipyMessage.ts`, `klipyCategoryRu.ts`, `klipyRecent.ts` | Клиентский Klipy (префиксы, i18n категорий, недавнее) |

### Прочее

| Путь | Назначение |
|------|------------|
| `src/workoutExerciseShared/sortableWorkoutExerciseCardStyles.ts` | Стили карточек DnD упражнений |

---

## Итерация 12 — Docker, CI/CD, nginx, PWA-оболочка, линтеры, git hooks

### Docker

| Файл | Назначение |
|------|------------|
| `apps/api/Dockerfile` | `node:24` + `postgresql-client`; `npm install`; entrypoint `docker-entrypoint.sh` |
| `apps/api/docker-entrypoint.sh` | `npm install` → ожидание `pg_isready` → `node ace migration:run --force` → если нет таблицы `exercises` → `db:seed` → `node ace serve --watch` |
| `apps/web/Dockerfile` | Многостадийная: builder `npm run build` → **nginx:alpine**, копия `dist`, конфиг `nginx.conf` |
| `apps/web/Dockerfile.dev` | `npm run dev` на 5173 (для `docker-compose.dev.yml`) |
| `docker-compose.yml` | **postgres:16**, **api** (монтирование кода + volume `node_modules_api`), **web** (прод-сборка → порт 5173→80), **livekit** с `livekit.yaml` |
| `docker-compose.dev.yml` | Только **web** с `Dockerfile.dev`, hot reload, порт **5174→5173**, volume `node_modules_web` |

### Nginx (образ web)

`apps/web/nginx.conf`: SPA `try_files` → `index.html`; прокси **`/api/`** → `http://api:3333/` (префикс `/api` снимается); кэш `/assets/` 1y; `client_max_body_size 25m`.

### LiveKit

`livekit.yaml` (корень): порт 7880, TCP 7881, dev-ключи `devkey`/`devsecret…`, `use_external_ip: false`. Переменная `LIVEKIT_CONFIG` в compose для пути к конфигу.

### GitHub Actions (`.github/workflows/deploy.yml`)

- **CI** на `push` и `pull_request`: сервис **postgres:16**, Node **24**, `npm install`, генерация `apps/api/.env` для тестов, **lint + typecheck + test** для api и web.
- **deploy** после успешного CI только на **push в `master`**: SSH через `webfactory/ssh-agent`, секреты `VDS_*`, на сервере `cd /app && git pull && docker compose up -d --build`.

### Dependabot

`.github/dependabot.yml`: npm в корне `/`, weekly, до 10 открытых PR.

### Статический фронт и PWA

| Файл | Назначение |
|------|------------|
| `apps/web/index.html` | `lang=ru`, manifest, apple-touch, viewport без zoom, SEO/OG/Twitter, `theme-color`, **`/theme-init.js`** до бандла, entry `/src/main.js` |
| `apps/web/public/manifest.json` | `start_url` **`/home`**, standalone, иконки 192/512, theme/background |

### Линтинг и форматирование

| Файл | Назначение |
|------|------------|
| `apps/web/eslint.config.js` | Flat config: `typescript-eslint` recommended, react-hooks, react-refresh; игнор `dist` и `*.test.*`; строгие правила по `any` и assertions |
| `apps/api/eslint.config.js` | `@adonisjs/eslint-config`; игнор `tests/**`; для `app/services/**` выключен `filename-case` (PascalCase классов) |
| `.prettierrc.json` | semi, singleQuote, trailingComma es5, printWidth 100 |

### Husky

`.husky/pre-commit`: `npx lint-staged`, затем **`npm run lint`**, **`typecheck`**, **`test`** по всему монорепо (тяжёлый pre-commit; отдельной секции `lint-staged` в `package.json` нет — по умолчанию lint-staged может ничего не делать без конфига).

### VS Code

`.vscode/settings.json`: `prettier.configPath` → корневой `.prettierrc.json`.

---

## Честная сверка: всё ли пройдено?

**Нет — не каждый файл и не каждая строка.** Журнал выше — это структурированный обход с реальным чтением ключевых файлов и сводками по каталогам, а не полный построчный аудит всего репозитория.

### Что по факту покрыто хорошо

- Весь слой HTTP API: `start/routes.ts`, все **19 контроллеров** (по методам + выборочное чтение).
- Все **25 моделей**, **24 сервиса** (крупные — по началу и назначению), **middleware**, **validators**, **utils** API, **commands**, **seeders**, список **тестов API**, **миграции** — сводной таблицей.
- Web: **App**, **main**, **api/**, контексты, **vk/**, **sw/**, **vite/vitest**, экраны таблицей, хуки таблицей, компоненты по доменам, **utils** vs **util**, Docker/CI.

### Оценка объёма (чтобы не было иллюзии «всё»)

- `apps/api`: порядка **202** `.ts` файлов (миграции, тесты, приложение).
- `apps/web`: порядка **290+** файлов с расширениями вроде `ts/tsx/js/css/html` (включая `public/`).

### Почему изначально не у каждого модуля была строка «назначение / примечание»

1. **Масштаб**: сотни файлов; полный единый реестр «файл → абзац» раздувает документ и его приходилось бы генерировать/поддерживать как артефакт (например скриптом из дерева).
2. **Стратегия журнала**: сначала — **сквозные слои** (роуты, модели, сервисы, экраны), чтобы быстро ориентироваться; деталь «каждый config и каждый constants» шла второй волной.
3. **Ниже итерация 13** закрывает ранее перечисленные **мелкие модули** в том же формате.

---

## Итерация 13 — модули с назначением и примечанием (дополнение к ит. 1 и 11–12)

### API `config/` (остальные файлы)

| Модуль | Назначение | Примечание |
|--------|------------|------------|
| `cors.ts` | CORS с `credentials: true`; список Origin из `CORS_ALLOWED_ORIGINS` (через запятую). | Пустой список: в **production** `origin: false` (жёстко); в dev — разрешены все. Запросы **без** заголовка `Origin` (curl, тесты) проходят. |
| `limiter.ts` | Хранилище rate limit: **БД**, таблица `rate_limits`. | Используется `@adonisjs/limiter` (логин/регистрация и др.). |
| `hash.ts` | Драйвер **scrypt** для паролей. | Параметры cost/blockSize/maxMemory зашиты в конфиге. |
| `logger.ts` | Pino: уровень из `LOG_LEVEL`, имя логгера из `env.get('APP_NAME')`. | В **`start/env.ts` поля `APP_NAME` нет** — при строгой схеме возможна рассинхронизация; в CI `.env` из workflow `APP_NAME` не задаётся (стоит сверить поведение в test/prod). |
| `static.ts` | Раздача статики Adonis: etag, lastModified, dotfiles ignore. | Включено (`enabled: true`). |

### `adonisrc.ts`

| Назначение | Примечание |
|------------|------------|
| Регистрация **providers** (core, hash, vine, cors, lucid, auth, soft-deletes, limiter, static), **preloads** (`routes`, `kernel`, `events`), **commands** из пакетов + автоскан `commands/`, **test suites**. | experimental: merge multipart, shutdown order. Кастомной папки `providers/` в репо нет. |

### `database/data/`

| Файл | Назначение | Примечание |
|------|------------|------------|
| `exercises.json` / `exercises_en.json` | Исходные данные каталога для сидов / `ExerciseCatalog` (путь в сервисе). | Не дублировать в журнале содержимое; объём большой. |

### Web `src/constants/` (кроме `routes.tsx`)

| Модуль | Назначение | Примечание |
|--------|------------|------------|
| `workoutTypes.ts` | Лейблы типов тренировки, конфиг WOD (AMRAP/EMOM/…), хелпер `exerciseBrief` для чипов. | Единая точка для русских подписей типов в UI. |
| `zones.ts` | Массив зон с **человеческими** описаниями и примерами упражнений для маркетинга/онбординга. | **ID зон** (`trapezoids`, `abdominalPress`, …) **не совпадают 1:1** с `MUSCLE_ZONES` в API `ExerciseCatalog` (`chests`, `core`, …) — разные домены: «объяснение для пользователя» vs «модель нагрузки». |
| `ai.ts` | `AI_CHAT_MIN_BALANCE` для UI. | Должен совпадать с `AI_CHAT_MIN_CHARGE` на бэкенде (комментарий в файле). |
| `AnalyticsConstants.ts` | Пороги нагрузки, отображение объёма/процентов, периоды и коэффициенты для виджетов аналитики. | Файл большой; деталь — по мере правок аналитики. |
| `AnalyticsConstants.test.ts` | Тесты констант/хелперов аналитики. | — |

### Web `src/lib/`

| Модуль | Назначение | Примечание |
|--------|------------|------------|
| `workoutListDnd.ts` | Модификаторы **@dnd-kit**: только вертикаль, границы списка, `stopPropagation` для кнопок в строке. | Связано с сортировкой упражнений в форме тренировки. |
| `noPullRefresh.ts` | `data-no-pull-refresh` — отключает pull-to-refresh у `Screen`, если жест начался на sortable/drag. | Иначе конфликт жестов на мобильных. |

### `public/` (кроме manifest)

| Файл | Назначение | Примечание |
|------|------------|------------|
| `theme-init.js` | До React: читает `themeSpecial` / hue из `localStorage`, выставляет CSS-переменные и `meta theme-color`. | Устраняет вспышку неверной темы при загрузке; дублирует логику `ThemeController` на подмножестве. |
| `offline.html` | Страница «нет сети» для SW; подключает `theme-init.js`, свои стили. | Кэшируется в `sw/offline.ts`. |
| `suggest/token.html` | Popup Яндекс OAuth: достаёт `access_token` из **hash**, шлёт в **`BroadcastChannel('ya_oauth')`**, закрывает окно. | Пара с клиентским кодом, который слушает канал. |
| `logo.svg`, иконки PWA | Ассеты бренда и установки. | — |

### Остающиеся пробелы (если нужен «абсолютный» реестр)

| Область | Почему всё ещё без построчного описания |
|---------|-------------------------------------------|
| **57 миграций** | Достаточно БД-снимка после `migrate`; пересказ каждого файла избыточен. |
| **Тысячи строк в сервисах** | В журнале — контракт и входные/выходные эффекты, не алгоритм. |
| **Каждый `.tsx` в `components/`** | 120+ файлов; в ит. 10 — группировка по доменам; полный список — отдельный генерируемый индекс. |
| **Вложенные файлы экранов** | `useActivityData`, drawer’ы, css/png — по запросу или отдельная итерация. |

### Вывод

Журнал можно **дополнять итерациями** в формате «модуль → назначение → примечание»; **полный** реестр на каждый файл монорепо без автоматизации неудобен в поддержке.

*Итерации 1–13 + блок честности — актуальное состояние.*
