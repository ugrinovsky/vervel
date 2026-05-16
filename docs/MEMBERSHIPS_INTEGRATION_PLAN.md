# План: абонементы (passes) в Vervel

**Зачем:** дать тренеру простой учёт «оплаченного пакета занятий» — закрыть главный пробел относительно 7Coach без превращения Vervel в бухгалтерию.

**Принципы:**
- Абонемент — **необязательный** учётный слой поверх существующих связей. Весь текущий продукт (календарь, fan-out, CRM, чаты) работает без него.
- Списание — **осознанное действие тренера**, никогда не происходит автоматически при создании слота в календаре.
- Деньги хранятся в **рублях (decimal)** — так же, как `users.balance` и `balance_transactions`.
- Код следует паттернам существующих контроллеров — в первую очередь `TrainerLeadsController` и паттерну `AiBalanceService` для транзакций.

---

## 1. Что реализуем в MVP

| Идея | Реализация |
|------|------------|
| Сколько клиент заплатил | Поле `price_amount decimal(10,2)` на абонементе (рубли) |
| Сколько занятий в пакете | `sessions_total integer` |
| Сколько осталось | `sessions_total − COUNT(pass_usages)` — вычисляется при чтении, не кэшируется |
| Срок действия | `valid_until date` nullable — если null, только по счётчику |
| Напоминание «скоро кончится» | Фаза 4, job по образцу CRM-напоминаний |

**Не входит в MVP:** учёт расходов тренера, налоги, онлайн-оплата клиентом, абонемент на группу как одну сущность, списание из формы создания слота.

---

## 2. Модель данных

### 2.1. Таблица `trainer_athlete_passes`

FK на `trainer_athletes.id` — один пакет всегда принадлежит конкретной связи тренер–атлет.

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | bigint PK | |
| `trainer_athlete_id` | bigint FK → `trainer_athletes.id` | NOT NULL |
| `title` | varchar(255) | «Абонемент» по умолчанию |
| `price_amount` | decimal(10,2) | Сумма оплаты в рублях |
| `sessions_total` | integer | Количество занятий в пакете (≥ 1) |
| `valid_from` | date | Начало действия |
| `valid_until` | date nullable | Конец по дате; если null — только по счётчику |
| `status` | enum | `active` \| `depleted` \| `expired` \| `cancelled` |
| `notes` | text nullable | Произвольная заметка тренера |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Индексы: `(trainer_athlete_id, status)` — для быстрого поиска активного пакета у атлета.

**Без soft-delete** — отменённый пакет получает `status = 'cancelled'`, история остаётся.

### 2.2. Таблица `trainer_athlete_pass_usages`

Журнал списаний. Каждая строка = одно занятие снято с пакета.

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | bigint PK | |
| `pass_id` | bigint FK → `trainer_athlete_passes.id` | NOT NULL |
| `workout_id` | bigint FK → `workouts.id` nullable | Фактическая тренировка из дневника атлета |
| `scheduled_workout_id` | bigint FK → `scheduled_workouts.id` nullable | Слот календаря (v1.1, сценарий S2) |
| `consumed_at` | timestamptz | Когда списали |
| `created_at` | timestamptz | |

**Уникальные ограничения (защита от двойного списания):**
- `UNIQUE (pass_id, workout_id)` — WHERE workout_id IS NOT NULL
- `UNIQUE (pass_id, scheduled_workout_id)` — WHERE scheduled_workout_id IS NOT NULL

---

## 3. Логика: план, факт, абонемент (три разных объекта)

| Объект | Таблица | Что это |
|--------|---------|---------|
| Слот в календаре | `scheduled_workouts` | План тренера: дата, содержимое, assignedTo, status |
| Запись в дневнике | `workouts` | Факт у атлета; может иметь `scheduled_workout_id` если пришёл из fan-out |
| Списание | `trainer_athlete_pass_usages` | Бизнес-факт «занятие зачтено в пакет» |

**Золотое правило:** создание / перенос слота в календаре **никогда** не уменьшает абонемент.

### 3.1. Сценарии списания

| Код | Когда | Точка входа в UI | Что пишем в usage | Фаза |
|-----|-------|-------------------|-------------------|------|
| **S1** | Тренировка завершена, есть запись в дневнике | Карточка атлета → «Списать занятие» → список тренировок → тап | `workout_id` обязателен; `scheduled_workout_id` заполняем из `workout.scheduledWorkoutId` если есть | **MVP** |
| **S2** | Тренировка запланирована, дневника ещё нет | Панель слота в календаре → «Списать с абонемента» | `scheduled_workout_id` обязателен; при появлении дневника — дописать `workout_id` в ту же строку | v1.1 |

### 3.2. Защита от дублей (S1 → S2 и обратно)

Если тренер сначала списал по слоту S2, а потом хочет S1 по связанной тренировке:
- Проверить: есть ли уже usage с `scheduled_workout_id = workout.scheduledWorkoutId` на этом пассе
- Если да — **обновить** существующую строку (добавить `workout_id`), не создавать вторую
- Иначе создать новую с `workout_id`

### 3.3. Статус пасса

Статус вычисляется при чтении (не хранится отдельным фоновым job-ом до фазы 4):

```
sessions_used = COUNT(pass_usages WHERE pass_id = X)
sessions_left = sessions_total - sessions_used

if status == 'cancelled' → cancelled
else if valid_until < today → expired
else if sessions_left == 0 → depleted
else → active
```

При записи usage: если `sessions_left` упал до 0 — обновляем `status = 'depleted'` в той же транзакции.

### 3.4. Атлет без абонемента — нормальный режим

Связь `TrainerAthlete` и весь продукт работают без строки в `trainer_athlete_passes`. В карточке атлета блок абонемента в таком состоянии — нейтральный, с одной кнопкой «Добавить абонемент».

---

## 4. Проверки безопасности в контроллере

Для каждой операции с пассом:

1. Получить `TrainerAthlete` по `trainer_athlete_id` → `where('trainerId', trainer.id)` → иначе 404
2. Проверить `trainerAthlete.status === 'active'`
3. Для списания: `workout.userId === trainerAthlete.athleteId` → иначе 403
4. Для списания: `pass.status === 'active'` и `sessions_left > 0` → иначе 422
5. Для редактирования пасса: нет usage-строк → иначе запретить изменение `sessions_total`

---

## 5. API

Новый контроллер `trainer_passes_controller.ts`. Роуты под `middleware.auth()` + `middleware.trainer()`.

```
GET    /trainer/athletes/:athleteId/passes        — список пассов атлета (active первыми)
POST   /trainer/athletes/:athleteId/passes        — создать пасс
PATCH  /trainer/passes/:id                        — редактировать (title, notes, validUntil, cancel)
POST   /trainer/passes/:id/usages                 — списать занятие
DELETE /trainer/pass-usages/:usageId              — отменить ошибочное списание
```

### POST `/trainer/athletes/:athleteId/passes` — тело запроса

```json
{
  "title": "Абонемент июнь",   // optional, default = "Абонемент"
  "priceAmount": 5000,          // decimal, рубли
  "sessionsTotal": 8,           // integer >= 1
  "validFrom": "2026-06-01",    // date, default = today
  "validUntil": "2026-07-01",   // date, optional
  "notes": "Оплатил наличными" // optional
}
```

`athleteId` в URL — это `users.id` атлета. Контроллер резолвит `trainer_athlete_id` через:
```ts
const ta = await TrainerAthlete.query()
  .where('trainerId', trainer.id)
  .where('athleteId', athleteId)
  .where('status', 'active')
  .firstOrFail()
```

### POST `/trainer/passes/:id/usages` — тело запроса (MVP)

```json
{ "workoutId": 123 }
```

В v1.1 добавляем альтернативу: `{ "scheduledWorkoutId": 456 }` (ровно одно из двух).

### PATCH `/trainer/passes/:id` — разрешённые поля

- `title`, `notes`, `validUntil` — всегда
- `sessionsTotal` — только если `COUNT(usages) === 0`
- `status: "cancelled"` — только если текущий статус не `depleted`/`expired`; при отмене запрещаем, если есть usage (предлагаем сначала удалить их)

### Ответ GET (список пассов)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Абонемент июнь",
      "priceAmount": "5000.00",
      "sessionsTotal": 8,
      "sessionsUsed": 3,
      "sessionsLeft": 5,
      "validFrom": "2026-06-01",
      "validUntil": "2026-07-01",
      "status": "active",
      "notes": null,
      "createdAt": "2026-06-01T10:00:00.000Z"
    }
  ]
}
```

`sessionsUsed` и `sessionsLeft` вычисляются через `COUNT` JOIN на `pass_usages` при каждом запросе.

---

## 6. UX

### 6.1. Связь с CRM — что раздельно, что рядом

CRM и абонемент — **две независимые оси**, не смешивать:

| Ось | Что измеряет | Где в UI |
|-----|-------------|----------|
| CRM-статус | Отношения (активен / пауза / ушёл) | Чип в хедере карточки → `AthleteCrmSheet` |
| Абонемент | Финансы (оплаченных занятий осталось N) | Отдельный блок ниже кнопок действий, перед табами |

Атлет может быть CRM-active без абонемента (разовые оплаты) и иметь активный пасс при crmStatus=paused (заморозил, но занятия ещё не сгорели) — это нормально.

Не добавлять поля пасса в `AthleteCrmSheet` — там только отношения.

**CRM-сигнал от абонемента (фаза 4):** атлеты с `sessions_left = 0` или `valid_until < today+7` — кандидаты на продление. Добавить в `GET /trainer/copilot/priority-list` и/или автоставить `nextFollowUpAt` при создании пасса с датой окончания.

### 6.2. Настройки пассов

Отдельной страницы настроек не нужно. Форма создания запоминает **последние введённые значения** в `localStorage` (кол-во занятий, цена) — тренер, который всегда продаёт по 8 занятий за 5000₽, второй раз откроет форму уже заполненной.

Если понадобятся явные настройки — добавить 2-3 поля в `users.clientPreferences` (JSON-колонка уже есть, миграция не нужна). Показывать в `SettingsTab.tsx` в новой секции «Абонементы».

### 6.3. Онбординг — шаг в `TrainerOnboardingScreen`

Добавить **шаг 3 «Абонементы»** в `TrainerOnboardingScreen` между «CRM» и «Атлеты»:

```
Абонементы                              (3/6)

Учитывайте оплаченные занятия прямо
в карточке клиента.

  [💳]  Сколько занятий оплачено
  [📉]  Остаток уменьшается при списании
  [🔔]  Напоминание когда пакет заканчивается

            [ Дальше ]
```

Это информационный шаг без ввода данных — просто объясняет концепцию. Кнопка «Дальше» переходит к следующему шагу.

### 6.4. Карточка атлета (`TrainerAthleteDetailScreen`)

Новый блок **«Абонемент»** (между кнопками действий и табами):

**Нет активного пасса:**
```
Абонемент · нет активного    [ + Добавить ]
```

**Есть активный:**
```
Абонемент июнь
Осталось 5 из 8 · до 01.07 · 5 000 ₽
[ Списать занятие ]  [ ··· ]
```

Меню `···`: редактировать (notes/validUntil), отменить пакет.

### 6.5. Создание абонемента (BottomSheet)

Поля:
1. Сумма оплаты (число, ₽) — обязательное
2. Количество занятий — обязательное
3. Дата окончания — опциональная
4. Название — опциональное, placeholder «Абонемент»
5. Заметка — опциональная

Одна кнопка «Сохранить». Без мастера. Значения из localStorage как дефолт.

### 6.6. Списание (сценарий S1, MVP) — BottomSheet

Открывается по «Списать занятие»:
- Список последних тренировок атлета из существующего API `/trainer/athletes/:athleteId/workouts`
- Каждая строка: дата + тип + объём; тренировки уже в пассе — заблокированы (серые)
- Тап → `POST /trainer/passes/:id/usages` → тост «Списано, осталось N»

### 6.7. Календарь (v1.1, сценарий S2)

В панели слота (если `assignedTo` — один атлет):
- Информационная строка «Осталось N занятий» если есть активный пасс
- Кнопка «Списать с абонемента» (не в форме создания — только на сохранённом слоте)

---

## 7. Файлы для создания / изменения

### Backend

| Файл | Действие |
|------|----------|
| `apps/api/database/migrations/1781000000001_create_trainer_athlete_passes.ts` | Новая таблица passes |
| `apps/api/database/migrations/1781000000002_create_trainer_athlete_pass_usages.ts` | Новая таблица usages |
| `apps/api/app/models/trainer_athlete_pass.ts` | Модель Pass (belongsTo TrainerAthlete, hasMany Usages) |
| `apps/api/app/models/trainer_athlete_pass_usage.ts` | Модель Usage (belongsTo Pass, belongsTo Workout, belongsTo ScheduledWorkout) |
| `apps/api/app/controllers/trainer_passes_controller.ts` | CRUD + usages (новый контроллер, не расширять trainer_controller) |
| `apps/api/start/routes.ts` | Добавить 5 роутов |

### Frontend

| Файл | Действие |
|------|----------|
| `apps/web/src/api/trainer.ts` | Добавить типы Pass, PassUsage и 5 методов API |
| `apps/web/src/screens/TrainerAthleteDetailScreen/TrainerAthleteDetailScreen.tsx` | Добавить блок абонемента между кнопками и табами |
| `apps/web/src/screens/TrainerAthleteDetailScreen/PassBlock.tsx` | Новый компонент блока (summary + actions) |
| `apps/web/src/screens/TrainerAthleteDetailScreen/CreatePassSheet.tsx` | BottomSheet создания (localStorage для дефолтов) |
| `apps/web/src/screens/TrainerAthleteDetailScreen/ConsumePassSheet.tsx` | BottomSheet списания (S1) |
| `apps/web/src/screens/TrainerOnboardingScreen/TrainerOnboardingScreen.tsx` | Добавить шаг «Абонементы» (информационный, без ввода) |

---

## 8. Фазы

| Фаза | Содержание | Критерий готовности |
|------|------------|---------------------|
| **1** | Миграции + модели + контроллер + роуты | curl-сценарий: создать пасс, списать, получить остаток |
| **2** | API client (`trainer.ts`) + блок в карточке атлета + шиты | Тренер создаёт пакет и списывает менее чем за 30 секунд |
| **3** | Бейдж «осталось N» в `TrainerCalendarScreen` + списание по S2 | Списание с экрана календаря |
| **4** | Push / баннер «мало занятий / истекает срок» | Job по образцу CRM-напоминалок |

---

## 9. Риски

| Риск | Митигация |
|------|-----------|
| Двойное списание одной тренировки | Partial UNIQUE на `(pass_id, workout_id)` и `(pass_id, scheduled_workout_id)` |
| Списание чужой тренировки | Проверка `workout.userId === trainerAthlete.athleteId` перед вставкой |
| Гонка при одновременных списаниях | `SELECT ... FOR UPDATE` на пасс внутри транзакции перед проверкой `sessions_left` |
| Изменение `sessions_total` после списаний | Запрет в `PATCH` если `COUNT(usages) > 0` |
| «Сумма» воспринимается как кассовый чек | Копирайт в UI: «сумма для вашего учёта» |

---

*После релиза фазы 2 добавить параграф «Абонементы» в VERVEL_FUNCTIONAL_MODULES.md.*
