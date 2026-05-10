# Vervel — функциональные модули (по законченным кускам)

Документ описывает **что делает** продукт по смысловым блокам: сценарии, ответственность кода, связь backend ↔ web. Сверка с [ТД.md](./ТД.md) и с `apps/api/start/routes.ts`. Это не дублирование [манифеста путей](./VERVEL_FILE_MANIFEST.md) и не построчный разбор каждого утилитарного файла — мелкие хелперы сгруппированы внутри своего модуля.

**Как читать:** у каждого блока — «Зачем», «Как ведёт себя кратко», «Где в коде» (ключевые файлы и папки).

**Как поддерживать:** при появлении нового домена добавьте сюда секцию; детальный список путей всегда можно пересобрать: `npm run docs:manifest`.

---

## Оглавление

1. [Аутентификация, сессия, OAuth](#1-аутентификация-сессия-oauth)
2. [Профиль, роли, измерения, публичный профиль тренера](#2-профиль-роли-измерения-публичный-профиль-тренера)
3. [Тренировки: учёт, черновики, пропуск, статистика](#3-тренировки-учёт-черновики-пропуск-статистика)
4. [2D-аватар и зоны нагрузки](#4-2d-аватар-и-зоны-нагрузки)
5. [Аналитика и периодизация (атлет)](#5-аналитика-и-периодизация-атлет)
6. [Стрики и достижения](#6-стрики-и-достижения)
7. [Прогрессия, силовой лог, эталоны упражнений, лидерборды](#7-прогрессия-силовой-лог-эталоны-упражнений-лидерборды)
8. [Приглашения, QR, реферальная статистика](#8-приглашения-qr-реферальная-статистика)
9. [Чаты и сообщения](#9-чаты-и-сообщения)
10. [Поиск GIF (Klipy) в чатах](#10-поиск-gif-klipy-в-чатах)
11. [Видеозвонки (LiveKit)](#11-видеозвонки-livekit)
12. [Атлет: команда, тренеры, непрочитанное, предстоящие тренировки](#12-атлет-команда-тренеры-непрочитанное-предстоящие-тренировки)
13. [Тренер: сегодня, атлеты, группы, статистика](#13-тренер-сегодня-атлеты-группы-статистика)
14. [Лиды и CRM по атлетам](#14-лиды-и-crm-по-атлетам)
15. [Запланированные тренировки и календарь](#15-запланированные-тренировки-и-календарь)
16. [Шаблоны тренировок](#16-шаблоны-тренировок)
17. [Кастомные упражнения тренера и библиотека](#17-кастомные-упражнения-тренера-и-библиотека)
18. [Trainer Copilot (ИИ-помощник тренера)](#18-trainer-copilot-ии-помощник-тренера)
19. [Athlete Copilot (план недели, связь с тренером)](#19-athlete-copilot-план-недели-связь-с-тренером)
20. [AI: баланс, OCR, парсинг заметок, генерация, чат-ассистент](#20-ai-баланс-ocr-парсинг-заметок-генерация-чат-ассистент)
21. [Платежи ЮKassa и кошелёк](#21-платежи-yukassa-и-кошелёк)
22. [Web Push, события, PWA](#22-web-push-события-pwa)
23. [Каталог упражнений и данные (импорт/сидеры)](#23-каталог-упражнений-и-данные-импортсидеры)
24. [Обратная связь](#24-обратная-связь)
25. [Фоновые задачи (очередь `jobs`)](#25-фоновые-задачи-очередь-jobs)
26. [Кросс-срез: middleware, валидация, ошибки](#26-кросс-срез-middleware-валидация-ошибки)
27. [Кросс-срез: web — оболочка приложения](#27-кросс-срез-web--оболочка-приложения)
28. [Инфраструктура репозитория](#28-инфраструктура-репозитория)
29. [Тесты](#29-тесты)

---

## 1. Аутентификация, сессия, OAuth

**Зачем:** вход по email/паролю, регистрация, выход, а также вход через **VK** (веб/SDK/мини-приложение), **Яндекс** (SDK), привязка OAuth-аккаунта к пользователю и постановка роли после первого входа.

**Поведение:** cookie-сессия (в т.ч. нюансы SameSite для VK iframe), модель связей OAuth-провайдера с пользователем; редиректы `/oauth/:provider/redirect|callback`; отдельные эндпоинты для VK/Yandex SDK и VK Mini App (`vkMiniAppLogin`, `vkidSdkConfigProxy`, `yandexSdkLogin`). Роль до выбора атлет/тренер может быть не задана — редирект на экран выбора роли.

**Где в коде:**

- API: `app/controllers/auth_controller.ts`, `app/controllers/oauth_controller.ts`, `app/models/oauth_provider.ts`, `app/middleware/auth_middleware.ts`, `app/middleware/cookie_auth_middleware.ts`, `app/utils/auth_cookie.ts`, `start/routes.ts` (публичные маршруты auth/oauth).
- Web: `screens/LoginScreen`, `RegisterScreen`, `OAuthCallbackScreen`, `SelectRoleScreen`, `contexts/AuthProvider.tsx`, `contexts/AuthContext.ts`, `api/auth.ts`, `components/VkIdButton`, `components/YandexIdButton`, `vk/EmbeddedOAuthLaunchGate.tsx`, `vk/useEmbeddedOAuthLaunch.ts`.

---

## 2. Профиль, роли, измерения, публичный профиль тренера

**Зачем:** данные пользователя, фото, смена пароля, переключение «стать атлетом/тренером», лог антропометрии; настройки клиента (`clientPreferences`); для атлета — просмотр **публичной карточки тренера**.

**Поведение:** загрузка и обработка фото (часто через sharp на API), CRUD измерений, JSON-патч клиентских предпочтений (тема, UX-флаги и т.д.).

**Где в коде:**

- API: `app/controllers/profile_controller.ts`, соответствующие поля в `app/models/user.ts`, загрузки в `validators` при наличии.
- Web: `screens/ProfileScreen` и вкладки `ProfileScreen/tabs`, `api/profile.ts`, `components/UserAvatar`, `components/AvatarCropModal`, `types/clientPreferences.ts`, `util/clientPreferencesMigration.ts`.

---

## 3. Тренировки: учёт, черновики, пропуск, статистика

**Зачем:** полный жизненный цикл тренировки атлета, черновик на сервере, привязка к запланированной тренировке, пропуск, агрегированная статистика и разрезы по зонам / расписанию.

**Поведение:** расчёты нагрузки и конвертации типов тренировок лежат в сервисах калькуляции; `Workout` хранит структурированные данные упражнений, зоны, RPE, зоны «на мышцах» и т.д. (эволюция схемы отражена в миграциях).

**Где в коде:**

- API: `app/controllers/workouts_controller.ts`, `app/models/workout.ts`, `app/models/workout_draft.ts`, `app/services/WorkoutCalculator.ts`, `WorkoutConverter.ts`, `AiZonesService.ts` (где уместно для зон), `commands/backfill_*.ts` для исторических данных.
- Web: `screens/WorkoutForm`, `screens/ActivityScreen` (+ листы, детали, `useActivityData`), `api/workouts.ts`, `components/WorkoutFormBase`, `WorkoutExercisesEditor`, `WorkoutInlineForm`, `lib/workoutListDnd.ts`, общие стили `workoutExerciseShared`.

---

## 4. 2D-аватар и зоны нагрузки

**Зачем:** визуализация распределения нагрузки по зонам/«мышечным» областям для мотивации и обратной связи.

**Поведение:** API отдаёт агрегированные интенсивности/статы для отрисовки; фронт рисует аватар и зоны (в т.ч. `MuscleZones`, обвязка экрана аватара).

**Где в коде:**

- API: `app/controllers/avatars_controller.ts`, связанные расчёты в сервисах тренировок/зон.
- Web: `screens/AvatarScreen`, `components/AvatarView`, `components/Avatar`, `components/MuscleZones`, `api/avatar.ts`, `util/zoneIntensity.ts`.

---

## 5. Аналитика и периодизация (атлет)

**Зачем:** графики, ACWR, CTL/ATL/TSB, рекомендации, срезы по периодам.

**Поведение:** часть метрик считается на клиенте из истории тренировок, часть запрашивается с API (`athlete/periodization`); компоненты recharts в `components/analytics`.

**Где в коде:**

- API: `app/controllers/athlete_controller.ts` (периодизация), `app/services/PeriodizationService.ts`.
- Web: `screens/AnalyticsScreen`, `components/analytics/*`, `constants/AnalyticsConstants.ts`, `util/computeAnalyticsInsights.ts`, `util/analyticsPeriodDays.ts`.

---

## 6. Стрики и достижения

**Зачем:** streak-дни, режимы недели, бейджи достижений, XP-связанная логика где применимо.

**Поведение:** проверка условий разблокировки, «посмотрел ачивку», история стрика.

**Где в коде:**

- API: `app/controllers/streak_controller.ts`, `app/services/StreakService.ts`, `AchievementService.ts`, `XpService.ts`, `streak_logic.ts`, `xp_logic.ts`, модели `user_streak`, `streak_history`, `achievement`, `user_achievement`.
- Web: `screens/StreakScreen`, `components/AchievementsList`, `components/StreakCard`, `hooks/useAchievementToast.tsx`, `api/streak.ts`.

---

## 7. Прогрессия, силовой лог, эталоны упражнений, лидерборды

**Зачем:** отслеживание PR/записей по упражнениям, закреплённые «пины» силового дня, пользовательские эталоны и алиасы каталога к эталонам (в т.ч. AI-подсказки и батч- применение), рейтинги по группам.

**Поведение:** сложная доменная логика прогрессии и нормализации названий упражнений (`exercise_match_helpers`, fuzzy match), снапшоты батчей алиасов.

**Где в коде:**

- API: `app/controllers/progression_controller.ts`, `app/services/ProgressionService.ts`, `strength_log_support.ts`, `exercise_match_helpers.ts`, соответствующие модели (`user_exercise_standard*`, `user_pinned_exercise`, …).
- Web: `screens/ProgressionHubScreen`, `screens/StrengthLogScreen`, `screens/LeaderboardScreen`, `api` через профиль/athlete/trainer по факту вызовов из `profile.ts` / `athlete.ts` / `trainer.ts` (прогрессия сосредоточена в API progression).

---

## 8. Приглашения, QR, реферальная статистика

**Зачем:** тренер приглашает атлета ссылкой; публичная страница инвайта; приём инвайта; QR для быстрого добавления; учёт `referred_by` и статистика.

**Поведение:** токен инвайта, идемпотентное принятие, обогащение событиями пуша.

**Где в коде:**

- API: `app/controllers/invite_controller.ts`, поля в `app/models/user.ts`, связи тренер–атлет.
- Web: `screens/InviteScreen`, `components/AthleteQrCode`, `components/AddAthleteDrawer`, `api/invite.ts`.

---

## 9. Чаты и сообщения

**Зачем:** личные и групповые диалоги тренер–атлет(ы), история сообщений, поток для «живой» подгрузки, отметки прочитанного, непрочитанное в шапках/списках.

**Поведение:** модели `chat`, `message`, `chat_read`; для стрима — `chat_stream_logic`, `DialogService`; SSE или polling — по реализации в `chat_controller`.

**Где в коде:**

- API: `app/controllers/chat_controller.ts`, `app/services/chat_stream_logic.ts`, `DialogService.ts`, модели чата/сообщений.
- Web: `screens/DialogsScreen`, `components/ChatBox`, `components/ChatScreen`, `components/FullScreenChat`, `api/chat.ts`, `utils/chatUtils.ts`.

---

## 10. Поиск GIF (Klipy) в чатах

**Зачем:** вставка анимированных ответов из внешнего API по категориям и поиску.

**Поведение:** прокси-эндпоинты статуса, категорий, поиска; ключ `KLIPY_*` в env; клиент дергает только backend.

**Где в коде:**

- API: методы `klipyStatus`, `listKlipyCategories`, `searchKlipy` в `chat_controller.ts`, `app/services/KlipyService.ts`.
- Web: интеграция в чат (`util/klipyMessage.ts`, `util/klipyRecent.ts` и UI чата).

---

## 11. Видеозвонки (LiveKit)

**Зачем:** тренер инициирует звонок; атлет принимает/отклоняет; комнаты LiveKit, токены, история у тренера.

**Поведение:** `LiveKitService` выдаёт доступ; события нового звонка ставятся в очередь пушей (`push:call_incoming`).

**Где в коде:**

- API: `app/controllers/video_calls_controller.ts`, `app/services/LiveKitService.ts`, `call_logic.ts`, `app/models/video_call.ts`.
- Web: `components/VideoCall/*` (в т.ч. комната, контролы, входящий), `api/calls.ts`, `IncomingCallWatcher` в `App.tsx`.

---

## 12. Атлет: команда, тренеры, непрочитанное, предстоящие тренировки

**Зачем:** список групп и тренеров, счётчики непрочитанного, ближайшие запланированные тренировки; открытие чатов группа/персонал.

**Где в коде:**

- API: `app/controllers/athlete_controller.ts`.
- Web: `screens/AthleteMyTeamScreen`, часть данных в `DialogsScreen`, хуки непрочитанного, `api/athlete.ts`.

---

## 13. Тренер: сегодня, атлеты, группы, статистика

**Зачем:** дашборд «сегодня», управление атлетами (email, QR, инвайт, удаление, никнейм), CRUD групп и состава, просмотр статистики/аватара периодизации/тренировок атлета, лидерборд группы.

**Где в коде:**

- API: `app/controllers/trainer_controller.ts`, `app/middleware/trainer_middleware.ts`.
- Web: `screens/TrainerTodayScreen`, `TrainerAthletesListScreen`, `TrainerGroupsListScreen`, `TrainerGroupDetailScreen`, `TrainerAthleteDetailScreen`, `TrainerTeamScreen`, `TrainerPublicProfileScreen`, `api/trainer.ts`, компоненты `components/trainer/*`, `AddAthleteDrawer`, карточки атлетов/групп.

---

## 14. Лиды и CRM по атлетам

**Зачем:** воронка лидов тренера; CRM-поля у связи тренер–атлет (статусы, заметки, напоминания — по миграциям `crm`); экраны для работы с базой контактов.

**Поведение:** лиды конвертируются в реальных атлетов; фоновая напоминалка CRM через jobs (см. §25).

**Где в коде:**

- API: `app/controllers/trainer_leads_controller.ts`, поля в `trainer_athlete` / миграции CRM, `app/models/trainer_lead.ts`.
- Web: `screens/TrainerLeadsScreen`, `screens/TrainerCrmScreen`, `TrainerCrmScreen/crmUtils.ts`, соответствующие вызовы в `api/trainer.ts`.

---

## 15. Запланированные тренировки и календарь

**Зачем:** тренер планирует занятия на даты, смотрит результаты; у атлета тренировки попадают в календарь/ленту; фан-аут создания «фактических» тренировок у атлетов при создании/изменении плана.

**Поведение:** `ScheduledWorkoutFanoutService`, джоба `scheduled_workout_fanout`; мягкое удаление и связь с `workout.scheduled_workout_id`.

**Где в коде:**

- API: `app/controllers/scheduled_workout_controller.ts`, `app/services/ScheduledWorkoutFanoutService.ts`, `app/models/scheduled_workout.ts`.
- Web: `screens/TrainerCalendarScreen` (крупный экран планирования), связанные вызовы `api/trainer.ts` / `workouts`.

---

## 16. Шаблоны тренировок

**Зачем:** сохранение типовых тренировок для быстрого назначения и повторного использования.

**Где в коде:**

- API: `app/controllers/workout_template_controller.ts`, `app/models/workout_template.ts`.
- Web: `screens/TrainerTemplatesScreen`, работа с шаблонами из календаря/форм где подключено.

---

## 17. Кастомные упражнения тренера и библиотека

**Зачем:** тренер создаёт собственные упражнения поверх глобального каталога; выбор в конструкторе тренировки.

**Где в коде:**

- API: `app/controllers/trainer_custom_exercises_controller.ts`, `app/models/trainer_custom_exercise.ts`.
- Web: `screens/TrainerExerciseLibraryScreen`, `components/CustomExercisePicker`, `util/trainerCustomExerciseWithSets.ts`.

---

## 18. Trainer Copilot (ИИ-помощник тренера)

**Зачем:** приоритизация атлетов, генерация черновиков планов/сообщений, отправка в чаты, отмена недельного плана — с тарификацией AI.

**Поведение:** оркестрация в `CopilotPlanService`, `CopilotPriorityService`, `CopilotInsightsService`, общие правила `CopilotSharedRules.ts`.

**Где в коде:**

- API: `app/controllers/trainer_copilot_controller.ts`, сервисы `Copilot*.ts`, `AthleteCopilotPlanService.ts` там, где общая логика плана.
- Web: UI вызывает `trainer` API (отдельные методы в `api/trainer.ts` или аналог), `test_copilot.mjs` — вспомогательный скрипт отладки на API.

---

## 19. Athlete Copilot (план недели, связь с тренером)

**Зачем:** атлет получает недельный план от копилота и может отправить сводку тренеру.

**Где в коде:**

- API: `app/controllers/athlete_copilot_controller.ts`, `AthleteCopilotPlanService.ts`.
- Web: `components/athlete/WeeklyPlanSheet` и связанные сценарии в кабинете атлета.

---

## 20. AI: баланс, OCR, парсинг заметок, генерация, чат-ассистент

**Зачем:** списание баланса в рублях (условных), транзакции; распознавание тренировки с фото (OCR + GPT-пайплайн); парсинг текста заметок; генерация тренировки; долгоживущий чат с отдельной тарификацией токенов.

**Поведение:** `YandexAiService`, цепочки `ai_parse_chain`, `ai_workout_ocr_parse`; списания через `AiBalanceService`; зоны из текста (`AiZonesService`).

**Где в коде:**

- API: `app/controllers/ai_controller.ts`, `app/services/YandexAiService.ts`, `AiBalanceService.ts`, парсинг/OCR/зоны, `start/env.ts` (все `YANDEX_*`, `AI_*`).
- Web: `components/AiWorkoutRecognizer`, `AiWorkoutGenerator`, `AiWorkoutTextParser`, `components/AiChat`, `api/ai.ts`, `hooks/useAiBalance.ts`, `constants/ai.ts`.

---

## 21. Платежи ЮKassa и кошелёк

**Зачем:** пополнение внутреннего баланса (в т.ч. для AI); webhook от ЮKassa с проверкой IP/статуса оплаты по флагам env.

**Где в коде:**

- API: `app/controllers/payments_controller.ts`, миграции платежей, `start/env.ts` (`YOOKASSA_*`, `APP_URL`).
- Web: `ProfileScreen/tabs/WalletTab.tsx`, `api/payments.ts`.

---

## 22. Web Push, события, PWA

**Зачем:** подписка на push, рассылка при сообщениях чата, приглашениях, запланированных тренировках, входящем звонке; PWA (manifest, service worker, установка).

**Поведение:** доменные события (`app/events/push_events.ts`) → `PushListener` → очередь `push_event` → `JobWorkerService` → `PushNotificationService`; VAPID из env.

**Где в коде:**

- API: `app/controllers/push_controller.ts`, `app/listeners/push_listener.ts`, `app/services/PushNotificationService.ts`, `app/models/push_subscription.ts`.
- Web: `sw.ts`, `sw/push.ts`, `sw/offline.ts`, `hooks/usePushNotifications.ts`, `components/PwaInstallHint`, `components/OnboardingPwaPushSection`, `vite-plugin-pwa` в конфиге Vite.

---

## 23. Каталог упражнений и данные (импорт/сидеры)

**Зачем:** единый справочник упражнений для подбора в формах; кэш анатомии для подсказок/графики; начальное наполнение БД.

**Где в коде:**

- Корень репозитория: `exercises.ts`, `translate_exercises.js` — данные/утилиты для каталога (как принято в проекте).
- API: `app/controllers/exercises_controller.ts`, `app/services/ExerciseCatalog.ts`, `ExerciseAnatomyService.ts`, `database/seeders/*`, `database/data`, миграции `exercises`, `exercise_anatomy_cache`.

---

## 24. Обратная связь

**Зачем:** пользователь отправляет фидбек с авторизацией (привязка к `user_id`).

**Где в коде:**

- API: `app/controllers/feedback_controller.ts`, таблица/миграция feedbacks.
- Web: точка вызова из UI настроек/профиля (поиск по проекту `feedback` при необходимости).

---

## 25. Фоновые задачи (очередь `jobs`)

**Зачем:** асинхронная доставка пушей, развёртывание изменений запланированных тренировок по атлетам, ежедневные CRM-напоминания.

**Поведение:** таблица `jobs`; воркер в `start/jobs.ts` при `JOBS_WORKER_ENABLED`; типы в `JobWorkerService`: `crm_daily_reminder`, `push_event`, `scheduled_workout_fanout`.

**Где в коде:**

- API: `app/services/JobQueueService.ts`, `JobWorkerService.ts`, `start/jobs.ts`, миграция `jobs`.

---

## 26. Кросс-срез: middleware, валидация, ошибки

**Зачем:** единый JSON-ответ, логирование запросов, разделение прав тренера, биндинги контейнера Adonis.

**Где в коде:** `app/middleware/*`, `app/validators/*`, `app/exceptions/handler.ts`, `start/kernel.ts`.

---

## 27. Кросс-срез: web — оболочка приложения

**Зачем:** маршрутизация, защищённые маршруты, онбординг, переключение атлет/тренер, стеки шитов (модальные панели), навигация, VK-гейт, глобальные тосты достижений.

**Где в коде:** `main.tsx`, `App.tsx`, `constants/routes.tsx`, `components/Navigation`, `contexts/SheetStackContext.ts`, `vk/EmbeddedOAuthLaunchGate.tsx`, экраны `OnboardingScreen`, `LandingScreen`, `DocsScreen` (публичные юридические тексты).

---

## 28. Инфраструктура репозитория

**Зачем:** локальная и прод-сборка, Postgres, LiveKit, CI/CD, форматирование, git hooks.

**Где в коде:** `docker-compose*.yml`, `apps/api/Dockerfile`, `apps/web/Dockerfile`, `livekit.yaml`, `livekit.prod.yaml`, `.github/workflows/deploy.yml`, `husky`, `.editorconfig`, `lint-staged.config.mjs`.

---

## 29. Тесты

**Зачем:** регрессия доменной логики без ручного прогона всего приложения.

**Где в коде:** `apps/api/tests/unit`, `apps/api/tests/functional`, `apps/web` — vitest (хуки, утилиты, отдельные тесты экранов/графиков).

---

*При существенном рефакторинге домена обновите соответствующую секцию и сценарии в этом файле.*
