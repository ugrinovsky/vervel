# Vervel — полное описание продукта по исходникам

Документ составлен по репозиторию (`README.md`, `ТД.md`, `apps/api/start/routes.ts`, контроллеры, модели, сервисы, миграции, `apps/web` — экраны, роутинг, `src/api`). Детальные формулы периодизации, тарифы AI и пошаговые UX-спеки см. в [**ТД.md**](./ТД.md).

---

## 1. Что это за продукт

**Vervel** — веб-приложение (React SPA + PWA) и REST API (AdonisJS) для фитнеса: двусторонняя связка **тренер ↔ атлет** с учётом тренировок, визуализацией нагрузки по зонам тела (2D-аватар), календарём, аналитикой и периодизацией (ATL/CTL/TSB), чатами (SSE), видеозвонками (LiveKit), опциональным **AI на Yandex** (распознавание/генерация тренировок, парсинг заметок, чат-советник) и монетизацией AI через **внутренний баланс** и пополнение через **ЮKassa**.

**Роли пользователя** (`users.role`): `athlete`, `trainer`, `both`, либо `null` до выбора роли после OAuth. В UI для `both` есть переключение активного режима (атлет / тренер) — см. `AuthContext`, `Navigation`, редирект `/home` → `/trainer` для тренерского режима в `App.tsx`.

---

## 2. Карта репозитория

| Путь | Назначение |
|------|------------|
| `apps/api/` | Backend: AdonisJS 6, Lucid, PostgreSQL |
| `apps/web/` | Frontend: React 19, Vite, Tailwind v4, React Router 7 |
| `packages/` | Зарезервировано под общие пакеты (workspaces) |
| `docker-compose.yml`, `docker-compose.dev.yml` | Postgres, API, web, при необходимости LiveKit |
| `ТД.md` | Расширенное ТЗ: модели, API, сервисы, экраны, деплой, тесты |

---

## 3. Backend (`apps/api`)

### 3.1. Точка входа и инфраструктура

- Сервер: `bin/server.ts`, роуты: **`start/routes.ts`** (единственный источник правды по HTTP).
- Глобальный стек: CORS, JSON, cookie auth — `start/kernel.ts`.
- Именованные middleware: `auth`, `trainer` — защита групп роутов.

### 3.2. Контроллеры (19 файлов в `app/controllers/`)

| Контроллер | Зона ответственности |
|------------|----------------------|
| `auth_controller` | Логин, регистрация, logout |
| `oauth_controller` | VK/Яндекс redirect/callback, set-role, SDK и VK Mini App login |
| `workouts_controller` | CRUD тренировок, stats, by-zone, draft, привязка к scheduled |
| `avatars_controller` | Интенсивности по зонам для аватара |
| `profile_controller` | Профиль, фото, пароль, смена роли, замеры, публичный профиль тренера, **`PATCH profile/client-preferences`** |
| `streak_controller` | Серии, история, режим, ачивки (list/check/seen) |
| `progression_controller` | Прогрессия, силовой журнал, пины, эталоны/алиасы, AI-подсказки связей, батч-откат, лидерборд группы |
| `athlete_controller` | Группы, тренеры, unread, upcoming, периодизация атлета, получение/создание чатов |
| `trainer_controller` | Сегодня, статы тренера, атлеты, группы, шаблоны (частично в других контроллерах), данные по атлету |
| `scheduled_workout_controller` | Плановые тренировки |
| `workout_template_controller` | Шаблоны тренировок |
| `chat_controller` | Списки чатов, сообщения, SSE stream, read, Klipy; тренерские эндпоинты чатов |
| `video_calls_controller` | Создание/завершение звонка (тренер), join/decline, активный звонок атлета, история |
| `ai_controller` | Статус AI, баланс, транзакции, recognize/generate/parse/apply/chat |
| `payments_controller` | Top-up, webhook ЮKassa |
| `push_controller` | VAPID, subscribe/unsubscribe |
| `exercises_controller` | Публичный каталог упражнений |
| `invite_controller` | Инфо по токену, accept, QR-данные, реферальная статистика |
| `feedback_controller` | Обратная связь |

### 3.3. Модели Lucid (`app/models/`, 25 файлов)

Сущности: `User`, `Workout`, `Exercise`, `TrainerAthlete`, `TrainerGroup`, `Chat`, `Message`, `ChatRead`, `ScheduledWorkout`, `WorkoutTemplate`, `UserStreak`, `StreakHistory`, `Achievement`, `UserAchievement`, `WorkoutDraft`, `VideoCall`, `PushSubscription`, `Topic`, `ExerciseAnatomyCache`, `OAuthProvider`, `UserPinnedExercise`, `UserExerciseStandard`, `UserExerciseStandardAlias`, `UserExerciseStandardLinkBatchSnapshot`, `UserMeasurement`.

**Таблицы без отдельных файлов моделей в списке** (используются через Query Builder / миграции): `balance_transactions`, `payments`, `access_tokens` — см. `AiBalanceService`, `payments_controller`, миграции.

### 3.4. Сервисы (`app/services/`, 24 файла)

| Файл | Роль (кратко) |
|------|----------------|
| `WorkoutCalculator` | Объём/интенсивность по зонам, восстановление, агрегаты периода |
| `PeriodizationService` | PMC / ATL, CTL, TSB |
| `ProgressionService` | Силовой журнал, эталоны, алиасы, 1RM, dashboardMetric |
| `strength_log_support`, `exercise_match_helpers` | Вспомогательная логика журнала и матчинга имён |
| `StreakService`, `streak_logic` | Серии и история |
| `AchievementService` | Условия ачивок, разблокировка |
| `XpService`, `xp_logic` | Опыт за ачивки |
| `AiBalanceService` | Списание/пополнение баланса, стоимость чата |
| `YandexAiService` | Vision/OCR, генерация, чат |
| `ai_parse_chain`, `ai_workout_ocr_parse`, `WorkoutConverter` | Цепочки парсинга AI |
| `ExerciseCatalog` | Статический каталог + fuzzy-match |
| `AiZonesService` | Зоны для AI-пайплайна |
| `ExerciseAnatomyService` | Кэш анатомии |
| `DialogService`, `chat_stream_logic` | Чаты и SSE |
| `KlipyService` | GIF-поиск (если провайдер включён) |
| `LiveKitService`, `call_logic` | Комнаты и токены звонков |
| `PushNotificationService` | Push |
| `KlipyService` | Интеграция Klipy |

### 3.5. HTTP API — сводка по `start/routes.ts`

**Публично:** `GET /`, `POST /login`, `/register`, `POST /logout` (с auth), `GET /exercises`, `/exercises/:id`, `GET /invite/info/:token`, `POST /payments/webhook`, OAuth-роуты, `GET /push/vapid-key`.

**С `middleware.auth()`:** тренировки и черновик, avatar stats, профиль (включая замеры и публичную карточку тренера), streak, progression (полный набор из файла), achievements, invite/referral/qr, звонки join/decline и активный звонок, athlete-роуты, чаты + SSE + Klipy + сообщения + read.

**Отдельно с auth:** `POST /feedback`, `POST /payments/topup`.

**Префикс `/ai` + auth:** status, balance, transactions, recognize-workout, parse-workout-notes, parse-notes-text, apply-parsed-workout, generate-workout, chat.

**Префикс `/trainer` + auth + `middleware.trainer()`:** today, profile-stats, unread-counts, атлеты (CRUD-связи, инвайты, статы/аватар/периодизация/тренировки), группы, чаты, scheduled-workouts, workout-templates, звонки create/end/list.

Полный перечень путей и методов — только в **`apps/api/start/routes.ts`** (277 строк).

### 3.6. Миграции

В `database/migrations/` **57 файлов** — эволюция схемы: пользователи и OAuth, тренировки и soft delete, группы, чаты и чтение, шаблоны и расписание, streak/achievements, AI-баланс и транзакции, платежи, push, видеозвонки, эталоны силового журнала, снимки батч-отката, темы, рефералы, клиентские настройки (`client_preferences` на `users`), и др. Таблица `user_dashboard_exercises` создавалась и **удалялась** миграцией — логика «дашборда» перенесена в payload журнала (см. `ТД.md` §7).

---

## 4. Frontend (`apps/web`)

### 4.1. Точка входа

- `index.html`, `main.tsx` — React root, `BrowserRouter`, `ErrorBoundary`.
- `App.tsx` — все `<Route>`, `ProtectedRoute` (логин, роль, онбординг атлета/тренера), `Navigation`, `IncomingCallWatcher` для атлета вне «публичных» страниц.

### 4.2. Маршруты

**Из `constants/routes.tsx` (нижняя навигация):**

- **Атлет:** `/dialogs`, `/analytics`, `/calendar`, `/home` (Avatar), `/my-team`, `/profile`, `/workouts/new`; `/streak` без пункта в баре.
- **Тренер:** `/dialogs`, `/trainer`, `/trainer/team`, `/trainer/templates`, `/trainer/calendar`, `/trainer/library`, `/profile`; `/trainer/groups`, `/trainer/athletes` без пункта в баре.

**Дополнительно в `App.tsx`:** `/`, `/login`, `/register`, `/auth/callback`, `/select-role`, `/invite/:token`, `/docs/*`, `/athlete-onboarding`, `/trainer-onboarding`, `/trainer/athletes/:athleteId`, `/trainer/groups/:groupId`, `/trainer/personal`, `/trainer/profile/:trainerId`, `/groups/:groupId/leaderboard`, `/progression`, редиректы `/strength-log` и `/exercise-dashboard` → `/progression`.

### 4.3. Экраны (`src/screens/`)

По директориям: лендинг и auth (`LandingScreen`, `LoginScreen`, `RegisterScreen`, `OAuthCallbackScreen`, `SelectRoleScreen`), онбординг (`AthleteOnboardingScreen`, `TrainerOnboardingScreen`), активность и аналитика (`ActivityScreen`, `AnalyticsScreen`, `AvatarScreen`), тренировки (`WorkoutForm`), прогрессия (`ProgressionHubScreen`, `StrengthLogScreen`), серии (`StreakScreen`), команда и инвайты (`AthleteMyTeamScreen`, `InviteScreen`), профиль (`ProfileScreen` + вкладки), диалоги (`DialogsScreen`), лидерборд (`LeaderboardScreen`), блок тренера (`TrainerTodayScreen`, `TrainerTeamScreen`, списки групп/атлетов, `TrainerCalendarScreen`, `TrainerTemplatesScreen`, `TrainerExerciseLibraryScreen`, `TrainerAthleteDetailScreen`, `TrainerGroupDetailScreen`, `TrainerPersonalScreen`, `TrainerPublicProfileScreen`), документы (`DocsScreen`).

### 4.4. API-клиент (`src/api/`)

Модули: `http/baseApi`, `privateApi`, `publicApi`, `auth`, `profile`, `workouts`, `exercises`, `athlete`, `trainer`, `chat`, `ai`, `streak`, `avatar`, `calls`, `payments`, `push`, `invite` — обёртки над эндпоинтами бэкенда.

### 4.5. Крупные UI-домены (`src/components/`)

Навигация и каркас (`Navigation`, `Screen`, `ScreenHeader`), аналитика (`analytics/*`), аватар и зоны (`Avatar`, `AvatarView`, `MuscleZones`), тренировки и упражнения (`WorkoutFormBase`, редакторы, карточки), AI (`AiWorkoutRecognizer`, `AiWorkoutGenerator`, `AiWorkoutTextParser`, `AiChat`, `AiLoadingView`), чаты (`ChatBox`, `ChatScreen`, `FullScreenChat`, `KlipyPicker`), видео (`VideoCall/*`), достижения (`AchievementNotification`, `AchievementsList`), PWA (`PwaInstallHint`, `OnboardingPwaPushSection`), OAuth-кнопки (`VkIdButton`, `YandexIdButton`), QR (`AthleteQrCode`, `QrScanner`), прочие UI-примитивы (`ui/*`).

### 4.6. Контексты и утилиты

`AuthContext` — пользователь и активный режим; `SheetStackContext` — модалки/шиты; `vk/EmbeddedOAuthLaunchGate` — сценарии VK; хуки (например `useAchievementToast`, `useVisualViewportBottomInset`).

---

## 5. Потоки данных (сквозные сценарии)

1. **Регистрация / вход:** email+пароль или OAuth → JWT/access token и cookie — `auth_controller`, `oauth_controller`, middleware.
2. **Создание тренировки:** ручной ввод или AI → нормализация упражнений → `WorkoutCalculator` → сохранение `Workout` → streak/achievements/XP.
3. **Периодизация и аватар:** агрегаты по дням → `PeriodizationService` и зоны для UI.
4. **Прогрессия:** исторические `Workout` → `ProgressionService` → журнал, эталоны; опционально платные AI-подсказки связей и батч с откатом.
5. **Коммуникации:** `DialogService` + SSE для списка/чаты; LiveKit для звонков; Klipy для GIF.
6. **Монетизация AI:** баланс на `users.balance`, движения в `balance_transactions`; пополнение через ЮKassa → webhook → зачисление.

---

## 6. Внешние системы

- **PostgreSQL** — основное хранилище.
- **Yandex Cloud** (Vision / GPT-аналог) — AI.
- **ЮKassa** — оплата пополнения баланса.
- **LiveKit** — WebRTC-комнаты.
- **VK / Яндекс** — OAuth; VK Mini Apps — отдельный логин с проверкой подписи (см. `app/utils`, OAuth controller).
- **Web Push** — VAPID, серверные подписки в БД.
- **Klipy** — опционально GIF в чатах.

---

## 7. Тестирование (по репозиторию)

- **API:** `apps/api/tests/unit/*.spec.ts`, `tests/functional/routes.spec.ts` — см. перечень в `ТД.md` §13.
- **Web:** Vitest (например `StrengthLogScreen/strengthLogChart.test.ts`, `ActivityScreen/utils.test.ts`).

---

## 8. Связанные документы

| Документ | Содержание |
|----------|------------|
| [**ТД.md**](./ТД.md) | Детальное ТЗ: поля моделей, формулы, AI-флоу, оплата, экраны, деплой |
| [**README.md**](./README.md) | Запуск Docker, прод-сервер, troubleshooting |
| **Этот файл** | Консолидированная карта продукта по структуре исходников |

Источник маршрутов API при любых расхождениях с текстом: **`apps/api/start/routes.ts`**. Источник экранов и таб-бара: **`apps/web/src/constants/routes.tsx`** и **`apps/web/src/App.tsx`**.
