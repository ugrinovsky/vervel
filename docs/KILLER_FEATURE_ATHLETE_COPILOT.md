# Athlete Copilot: "что делать сегодня" за один тап

Дата: 2026-05-07  
Статус: proposal → реализация

---

## 0) Одна фраза

Атлет открывает приложение — видит одну карточку с конкретной тренировкой на сегодня. Нажимает "Начать" — форма уже заполнена.

---

## 1) Почему это важно

### Проблема атлета сегодня

Атлет знает что нужно тренироваться. Но каждый раз:
1. Открывает приложение — не понимает что делать сегодня
2. Идёт в "Добавить тренировку" — надо выбрать тип, ввести упражнения
3. Вспоминает что делал в прошлый раз
4. Половина закрывает приложение не начав

Результат: регулярность ломается не из-за лени — из-за трения.

### Что меняет Athlete Copilot

Атлет открывает `/home` и видит:

```
┌─────────────────────────────────────────┐
│  Сегодня                                │
│  Силовая · Ноги · ~45 мин              │
│                                         │
│  Почему: плечи отдыхают, ноги свежие   │
│                                         │
│          [ Начать тренировку ]          │
└─────────────────────────────────────────┘
```

Нажимает — форма уже заполнена с упражнениями на ноги. Тренируется, нажимает "Сохранить".

---

## 2) Два режима

### 2.1 Solo атлет (без тренера)

Copilot строит план полностью автономно: анализирует историю тренировок, TSB, перегруженные зоны — и выбирает тип + упражнения из **каталога Vervel**.

Упражнения выбираются по целевым зонам мышц (не перегруженным). Например: плечи/спина перегружены → берём упражнения с `zones: ['legs', 'glutes']`.

**Важно:** solo-план живёт только в `WorkoutDraft.payload` (MVP). `ScheduledWorkout` для solo — v2, требует миграции схемы (nullable `trainerId`).

### 2.2 Атлет с тренером

Приоритеты строго иерархические:

**1. Тренерское назначение на сегодня (ScheduledWorkout):**
- Copilot показывает назначенную тренировку как "Сегодня"
- Кнопка "Начать" → WorkoutDraft из данных тренерского назначения
- Источник явно помечен: "от тренера"

**2. Нет назначения на сегодня, но есть тренер:**
- Copilot предлагает тренировку самостоятельно
- Дополнительно: кнопка "Предложить тренеру" → отправляет черновик в чат
- Источник явно помечен: "рекомендация Copilot"

**3. Тренер полностью планирует неделю (все дни заняты):**
- Copilot не генерирует ничего лишнего
- Показывает тренерский план на неделю в виде ленты

Copilot **никогда** не перезаписывает и не конкурирует с тренером.

---

## 3) Живой пример (solo)

**Атлет:** Анна, 28 лет, бодибилдинг, 3 раза в неделю  
**История:** вчера — Жим лёжа + разводки (плечи, грудь высоко). TSB = −5, фаза Накопление.

**Copilot:**

```
Диагноз (скрыто, в ExplainWhy):
  TSB = −5, фаза Накопление — держим темп
  Плечи перегружены (0.88 за 2 дня) — исключаем
  Ноги свежие (0.12 за 2 дня) — приоритет

Сегодня → Силовая · Ноги · ~45 мин

Черновик тренировки:
  Приседания со штангой   4×10  60 кг
  Жим ногами              3×12
  Румынская тяга          3×10  40 кг
  Разгибания ног          3×15
```

После тренировки:
```
✓ Сохранено!
ATL: 52 → 55  (+3)
Завтра — отдых
Послезавтра — Верх тела (к тому времени плечи восстановятся)
```

---

## 4) UX / UI

### 4.1 Где живёт

- **Главный entrypoint:** `AvatarScreen` (`/home`) — карточка **"Сегодня"** между блоком восстановления и "Добавить тренировку"
- **Дополнительно:** `ActivityScreen` — "План недели" горизонтальная лента сверху

### 4.2 AthleteCopilotCard — состояния

**Обычный день (есть рекомендация):**
```
┌─────────────────────────────────────────┐
│  Сегодня                    [Copilot] ⓘ │
│  Силовая · Ноги · ~45 мин              │
│  ──────────────────────────            │
│  ▸ Почему так (свернуто)               │
│                                         │
│      [ Начать тренировку ]             │
└─────────────────────────────────────────┘
```

**Тренерское назначение:**
```
┌─────────────────────────────────────────┐
│  Сегодня              🏋️ от тренера     │
│  Силовая · Верх тела · 17:00           │
│                                         │
│      [ Начать тренировку ]             │
└─────────────────────────────────────────┘
```

**День отдыха:**
```
┌─────────────────────────────────────────┐
│  Сегодня                                │
│  🛋️ Отдых — запланировано              │
│  TSB растёт, всё идёт по плану         │
└─────────────────────────────────────────┘
```

**Cold start (< 3 тренировок):**
```
┌─────────────────────────────────────────┐
│  Сегодня                                │
│  Добавьте 3 первые тренировки —        │
│  Copilot начнёт адаптировать план      │
│                                         │
│      [ Добавить тренировку ]           │
└─────────────────────────────────────────┘
```

### 4.3 ExplainWhy — accordion, collapsed

Раскрывается тапом на "▸ Почему так". Только факты из данных, никаких "мне кажется":

```
▾ Почему так

• Плечи/спина: нагрузка высокая 2 дня подряд → сегодня нижний блок
• TSB = −5 · фаза Накопление → держим интенсивность
• 5 дней с последней тренировки ног → пора
```

### 4.4 WeeklyPlanSheet — bottom sheet по тапу на "Неделя"

```
Пн  ● Ноги · 45 мин          ← сегодня
Вт  ○ Отдых
Ср  ● Верх тела · 50 мин
Чт  ○ Отдых
Пт  ● Кардио · 30 мин
Сб  ○ Отдых
Вс  ○ Отдых

               [ Предложить план тренеру ]   ← только if with_coach
```

Дни с тренерским назначением отмечены 🏋️, не редактируются.

### 4.5 После логирования — micro-insight

Появляется сразу после "Сохранить", 3–5 секунд:

```
✓ Тренировка сохранена

ATL: 52 → 55   Форма растёт
Следующая тренировка: Верх тела, Ср
```

Это не просто подтверждение — это ответ на вопрос "ну и что?".

### 4.6 Push-уведомление (retention-крючок)

Если у атлета есть тренировка на сегодня (тренерская или Copilot):

```
Утро (9:00 local): "Сегодня — Силовая (ноги) ~45 мин"
Вечер (19:00, если не залогировано): "Как прошла тренировка?"
```

Пуш не отправляется в day-off. Использует существующий `PushService`.

---

## 5) Данные и алгоритм

### 5.1 Источники данных

| Источник | Зачем |
|---|---|
| `PeriodizationService.calculate(userId, 'athlete')` | TSB/ATL/CTL/фаза |
| `Workout` (last 14 days) · `zonesLoadAbs` | Перегруженные зоны |
| `ScheduledWorkout` · trainerId ≠ null | Тренерские назначения |
| `TrainerAthlete.isActiveBinding()` | Режим solo vs with_coach |
| `WorkoutDraft` | Текущий черновик (не создавать если есть актуальный) |
| `ExerciseCatalog` (фильтр по зонам) | Упражнения для solo-плана |
| `clientPreferences.workoutFrequency` | Сессий в неделю (дефолт: 3) |

### 5.2 `clientPreferences.workoutFrequency`

Поле уже читается из `user.clientPreferences` (JSON). Для MVP — читаем как `p?.workoutFrequency ?? 3`. Если поле не задано у пользователя — дефолт 3.

Онбординг должен спрашивать частоту тренировок и сохранять в `clientPreferences`. Если онбординг уже прошли без этого вопроса — используем 3 как разумный дефолт.

### 5.3 Алгоритм выбора упражнений (solo)

```typescript
// Шаг 1: определить перегруженные зоны
const overloadedZones = getOverloadedZones(last3DaysWorkouts) // порог 0.70

// Шаг 2: определить целевые зоны (не перегруженные + не тренированные недавно)
const targetZones = ALL_ZONES.filter(z => !overloadedZones.includes(z))
// Приоритет: те у кого наименьший суммарный load за последние 7 дней

// Шаг 3: взять N упражнений из каталога по целевым зонам
const exercises = ExerciseCatalog.getForZones(targetZones, { count: 4..6, workoutType })
// ExerciseCatalog.getForZones — уже существует, используется в AI-генерации
```

### 5.4 Расписание недели по фазе

Константы из `CopilotSharedRules` (единый источник с Trainer Copilot):

| Фаза | Сессий | Интенсивность |
|---|---|---|
| overload (TSB < −20) | min(freq, 2) | лёгкая / кардио |
| accumulation / maintenance | freq | умеренная |
| peak / deload (TSB > 15) | min(freq + 1, 5) | умеренная+ |

Дни: равномерно от сегодня, пропуская уже занятые тренерскими назначениями.

---

## 6) Backend API

### GET `/athlete/copilot/week?weekStart=YYYY-MM-DD`

Один запрос — всё что нужно UI.

Ответ:
```json
{
  "todaySuggestion": {
    "date": "2026-05-12",
    "title": "Силовая · Ноги · ~45 мин",
    "workoutType": "bodybuilding",
    "source": "copilot",
    "scheduledWorkoutId": null,
    "draftWorkoutData": {
      "type": "bodybuilding",
      "exercises": [
        { "name": "Приседания со штангой", "sets": 4, "reps": 10, "zones": ["legs", "glutes"] },
        { "name": "Жим ногами", "sets": 3, "reps": 12, "zones": ["legs"] }
      ]
    }
  },
  "weekItems": [
    { "date": "2026-05-12", "kind": "train", "title": "Ноги", "workoutType": "bodybuilding", "source": "copilot" },
    { "date": "2026-05-13", "kind": "rest", "title": "Отдых", "source": "copilot" },
    { "date": "2026-05-14", "kind": "train", "title": "Верх тела", "workoutType": "bodybuilding", "source": "trainer" }
  ],
  "explain": [
    { "key": "zones", "title": "Плечи/спина отдыхают", "detail": "Нагрузка 0.88 за 2 дня → исключаем верх" },
    { "key": "phase", "title": "TSB −5, Накопление", "detail": "Держим темп, не снижаем интенсивность" }
  ],
  "meta": {
    "mode": "solo",
    "coldStart": false,
    "canSendToCoach": false,
    "workoutFrequency": 3
  }
}
```

### POST `/athlete/copilot/start`

Создаёт/обновляет `WorkoutDraft` для немедленного старта.

Тело:
```json
{
  "date": "2026-05-12",
  "scheduledWorkoutId": null,
  "durationMin": 45,
  "mode": "gym"
}
```

Логика:
- Если `scheduledWorkoutId` → берём `workoutData` из `ScheduledWorkout` (тренерское)
- Если null → используем `draftWorkoutData` из weekly plan (предсчитан на `/week`)
- `mode` и `durationMin` — сохраняем в `WorkoutDraft.payload.meta`, не в Workout-модель

Ответ:
```json
{
  "success": true,
  "draft": {
    "type": "bodybuilding",
    "exercises": [...],
    "notes": "Copilot: ноги · TSB −5",
    "meta": { "copilot": true, "mode": "gym", "durationMin": 45 }
  },
  "redirectTo": "/workout/form"
}
```

### POST `/athlete/copilot/send-to-coach`

Только если `meta.canSendToCoach = true`.

Создаёт `Message` в `Chat.findOrCreatePersonal(trainerId, athleteId)`.

Формат сообщения (генерируется на бэке, атлет видит preview перед отправкой):
```
[Copilot] Предлагаю план на неделю с 12 мая:
• Пн — Силовая (ноги), ~45 мин
• Ср — Верх тела, ~50 мин
• Пт — Кардио, ~30 мин

Обоснование: TSB −5, фаза Накопление. Плечи/спина разгружаю.
Подтвердите или скорректируйте.
```

**UI перед отправкой:** атлет видит preview сообщения с возможностью отредактировать — только тогда "Отправить". Не auto-send.

Ответ: `{ chatId, messageId }` → UI открывает этот чат.

---

## 7) Сервисный слой

```
AthleteCopilotInsightsService  — периодизация + зоны + история + режим
AthleteCopilotPlanService      — weekItems + todaySuggestion + draftWorkoutData
CopilotSharedRules             — общие константы с Trainer Copilot
```

---

## 8) Связь с Trainer Copilot: единый flywheel

```
ТРЕНЕР (Trainer Copilot)                    АТЛЕТ (Athlete Copilot)
─────────────────────────────────────────────────────────────────────

Пн утро: тренер видит "Анна — нет плана"
  → генерирует черновик, назначает
    ScheduledWorkout × 3               → появляется в /home как "от тренера"
    Message в чат                      → пуш "Тренер назначил план"

Пн вечер:
                                       Анна: "Сегодня — Ноги от тренера"
                                       Нажимает "Начать"
                                         → WorkoutDraft из ScheduledWorkout
                                       Тренируется, сохраняет
                                         → Workout.zonesLoadAbs обновлён

Вт:
  Trainer Copilot: insights Анны       Athlete Copilot: TSB пересчитан
  учитывают вчерашнее "ноги"          "Сегодня отдых — молодец!"
  → среда не включает ноги            (согласовано с тренерским планом)

Следующий Пн:
  Trainer Copilot видит: Анна          ─────────────────────────────
  выполнила 2 из 3 назначений
  TSB = −3 · пропустила пятницу
  → корректирует план под факты
```

Ключевые точки интеграции:

| Данные | Пишет | Читает |
|---|---|---|
| `ScheduledWorkout` | Trainer Copilot | Athlete Copilot (today/week) |
| `Workout.zonesLoadAbs` | Athlete (логирование) | Trainer Copilot (insights) |
| `Message` (чат) | Оба | Оба (один чат) |
| `WorkoutDraft` | Athlete Copilot | WorkoutForm (старт) |

---

## 9) Метрики

Новые события:
- `athlete_copilot_viewed` { screen, mode, coldStart, source: 'trainer'|'copilot' }
- `athlete_copilot_start_clicked` { source: 'trainer_assigned'|'copilot_generated' }
- `athlete_copilot_draft_created`
- `athlete_copilot_plan_sent_to_coach`
- `athlete_copilot_explain_opened` — важно для понимания engagement

Переиспользовать:
- `athlete_workout_logged` + `input: 'copilot'`

KPI:
- Конверсия "copilot_start_clicked → athlete_workout_logged" (целевая: > 60%)
- Рост D7/D30 у solo-когорты
- Снижение времени от открытия приложения до начала тренировки

---

## 10) Этапы реализации

### MVP (1 неделя)

Backend:
- `AthleteCopilotInsightsService`, `AthleteCopilotPlanService`
- `GET /athlete/copilot/week`, `POST /athlete/copilot/start`
- Cold start fallback
- Режим solo: упражнения из каталога по зонам
- Режим with_coach: чтение ScheduledWorkout как приоритет

Frontend:
- `AthleteCopilotCard` на `AvatarScreen`
- Состояния: обычный / тренерское / отдых / cold start
- `ExplainWhy` accordion
- Micro-insight после сохранения
- `WeeklyPlanSheet` bottom sheet

### v1 (2–3 недели после MVP)

- `POST /athlete/copilot/send-to-coach` (с preview перед отправкой)
- Авто-адаптация: если пропущена тренировка → сдвиг + −10% объём
- Push-уведомления (утро + вечер)
- `workoutFrequency` в онбординге

### v2 (позже)

- `ScheduledWorkout` для solo (nullable `trainerId`, миграция)
- Policy B: proposed-назначения с подтверждением тренера
- AI для текста `explain[]` (перефразировка фактов)

---

## 11) Риски

| Риск | Митигация |
|---|---|
| Solo: нет данных о зонах (новый пользователь) | Cold start UI, дефолтный план по 3 базовым упражнениям |
| Athlete Copilot конфликтует с тренером | Жёсткий приоритет: тренерское назначение = read-only |
| Плохие упражнения из каталога | Ограничиваем: только популярные (используемые > 10 раз глобально) |
| Атлет не хочет отправлять draft тренеру | Кнопка опциональная; preview перед отправкой |
| `workoutFrequency` не задан | Дефолт 3, без запроса к пользователю |

---

## 12) Точки входа в кодовую базу

```
Существующее (переиспользуем):
  PeriodizationService.calculate(userId, 'athlete')
  WorkoutCalculator — zonesLoadAbs уже в Workout
  ExerciseCatalog.getForZones() — уже используется в AI-генерации
  WorkoutDraft (GET|PUT|DELETE /workouts/draft)
  ScheduledWorkout.query().where('status', 'scheduled')
  TrainerAthlete.isActiveBinding(trainerId, athleteId)
  Chat.findOrCreatePersonal(trainerId, athleteId)
  Message.create({ chatId, senderId, content })
  PushService / emitter ('push:message')

Новое:
  apps/api/app/services/CopilotSharedRules.ts  ← общее с Trainer Copilot
  apps/api/app/services/AthleteCopilotInsightsService.ts
  apps/api/app/services/AthleteCopilotPlanService.ts
  apps/api/app/controllers/athlete_copilot_controller.ts
  apps/web/src/components/athlete/AthleteCopilotCard.tsx
  apps/web/src/components/athlete/WeeklyPlanSheet.tsx
  apps/web/src/components/athlete/ExplainWhy.tsx
```
