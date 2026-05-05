# Vervel — Онбординг и Adaptive UX

Дата: 2026-05-05

## Зачем это

Продукт сильный, но высокая плотность функций на старте снижает activation и retention. Решение — не убирать функции, а управлять тем **когда и кому** они показываются.

Ключевые метрики которые это улучшает:
- Доля пользователей с первым полезным действием в первые 24 часа
- D7 / D30 retention через progressive disclosure и поведенческие петли
- Конверсия тренеров в активных (добавили первого атлета)

---

## Архитектура

### Источники правды

| Поле | Где хранится | Назначение |
|---|---|---|
| `clientPreferences.uiMode` | `users.client_preferences` (PostgreSQL JSON) | Какой режим выбрал пользователь в онбординге |
| `clientPreferences.feat*` | То же | Реальное состояние каждой функции. **Единственный источник правды** |
| `clientPreferences.athleteScenario` | То же | Путь атлета: solo / with_coach / in_team |
| `clientPreferences.trainerWorkStyle` | То же | Формат тренера: individual / groups / both |

### Как feat* флаги и uiMode соотносятся

`uiMode` — **ярлык** режима выбранного в онбординге. При выборе режима батч-записываются все `feat*` флаги.

После этого пользователь может менять отдельные флаги вручную. `uiMode` остаётся меткой «последнего выбранного режима» и показывает «изменён» если флаги отличаются от пресета.

Хук `useFeatureFlags()` читает только `feat*` флаги напрямую, `uiMode` не использует:

```ts
// Дефолты ?? применяются только для старых аккаунтов без флагов
ai: prefs?.featAi ?? true,
analytics: prefs?.featAnalytics ?? true,
// ...
```

---

## Онбординг: 5 шагов

### Шаг 1 — Сценарий

**Атлет выбирает:** solo / with_coach / in_team  
**Тренер выбирает:** individual / groups / both

**Что реально происходит:**
- Батч-вызов `PATCH /profile/client-preferences`
- Для атлета: пишет `athleteScenario` + `athleteCoachIntent` (backwards compat)
- Для тренера: пишет `trainerWorkStyle` (уже использовалось ранее — персонализирует «Сегодня»)
- Сразу переходит к следующему шагу (без кнопки «Далее»)

### Шаг 2 — Уточнение (адаптивный)

| Путь | Что показывает | Реальное действие |
|---|---|---|
| Атлет solo | Выбор цели: сила / кардио / общая форма / гибкость | Сохраняет `athletePrimaryGoal` → влияет на тип тренировки по умолчанию |
| Атлет with_coach | QR-код (реальный, сканируемый) + email с кнопкой копирования | Нет API-вызова — пользователь уже показывает тренеру данные |
| Атлет in_team | То же QR + email | То же |
| Тренер (любой стиль) | Как добавить атлетов: email / ссылка / QR | Информационный шаг, контент зависит от `trainerWorkStyle` |

### Шаг 3 — Режим

Три карточки. «МНЕ НУЖНО ВСЁ» с анимированным glow-эффектом.

**Что реально происходит:**
```ts
// Один API-вызов с batch всех флагов
PATCH /profile/client-preferences {
  uiMode: 'starter' | 'pro' | 'unleash',
  featAi: true/false,
  featAnalytics: true/false,
  // ... все feat* флаги по пресету
}
```

Пресеты — `MODE_FLAGS` в `apps/web/src/hooks/useFeatureFlags.ts`.

| Флаг | starter | pro | unleash |
|---|---|---|---|
| featAi | ❌ | ✅ | ✅ |
| featAnalytics | ❌ | ✅ | ✅ |
| featProgression | ❌ | ✅ | ✅ |
| featAdvancedAnalytics | ❌ | ❌ | ✅ |
| featTeams | ❌ | ✅ | ✅ |
| featDialogs | ❌ | ✅ | ✅ |
| featLeaderboard | ❌ | ✅ | ✅ |
| featStreaks | ✅ | ✅ | ✅ |
| featAvatar | ✅ | ✅ | ✅ |
| featVideoCalls | ❌ | ❌ | ✅ |

### Шаг 4 — Первое действие (не заглушка)

| Путь | Реальное действие |
|---|---|
| Атлет solo | Форма тренировки — создаёт реальную первую запись в БД |
| Атлет with_coach / in_team | Кнопка «Перейти в Команда» — `athleteOnboardingComplete: true` + навигация |
| Тренер | Шаблоны и Календарь — информация по формату + `trainerOnboardingComplete: true` |

На этом шаге — **спойлер** «Посмотреть весь функционал»:
- Раскрывается AnimatePresence
- Каждый тогл немедленно вызывает `PATCH /profile/client-preferences`
- Реальное состояние тоглов берётся из `clientPreferences.feat*`

### Шаг 5 — Done

PWA install hint + push notifications (существующий компонент `OnboardingPwaPushSection`).

---

## Progressive Disclosure

Реализован в `apps/web/src/hooks/useFeatureUnlock.ts`.

### Триггеры

| Триггер | Условие | Что разблокируется |
|---|---|---|
| `workout_saved` | 3+ тренировки | `featAnalytics` |
| `workout_saved` | 5+ тренировок | `featProgression` |
| `workout_saved` | 10+ тренировок | `featAdvancedAnalytics` |
| `invite_accepted` | Принял инвайт тренера | `featTeams`, `featDialogs`, `featVideoCalls` |
| `group_joined` | Добавлен в группу | `featTeams`, `featLeaderboard` |

### Правила

1. **Только ДОБАВЛЯЕТ** функции, никогда не убирает
2. **Пропускает `unleash`** — у них всё уже включено
3. **Счётчик тренировок** берётся из реального API (`/profile` → `stats.totalWorkouts`), не из localStorage
4. **Toast при разблокировке**: `✨ Разблокировано: Аналитика, Прогрессия`

### Интеграция

```
WorkoutForm.tsx → unlock('workout_saved')
InviteScreen.tsx → unlock('invite_accepted')
```

---

## useFeatureFlags()

`apps/web/src/hooks/useFeatureFlags.ts`

```ts
const flags = useFeatureFlags();
// flags.ai, flags.analytics, flags.teams, ...
```

Используется в:
- `Navigation.tsx` — фильтрует табы по флагам
- `SettingsTab.tsx` — рендерит тоглы
- Можно использовать в любом компоненте для условного рендера

---

## Навигация и feature flags

`Navigation.tsx` фильтрует маршруты атлета:

| Маршрут | Флаг |
|---|---|
| `/dialogs` | `flags.dialogs` |
| `/analytics` | `flags.analytics` |
| `/my-team` | `flags.teams` |

Тренерский `/dialogs` — тоже фильтруется по `flags.dialogs`.

Остальные табы (календарь, профиль, новая тренировка) — всегда видны, это core.

---

## Настройки профиля

`SettingsTab.tsx` → секция **«Функции приложения»**:

### Mode switcher
Показывает текущий режим. Если флаги расходятся с пресетом — показывает «изменён». При смене режима — диалог подтверждения, потом батч-перезапись всех флагов.

### Feature toggles
Сгруппированы по категориям: AI-ассистент / Аналитика и прогресс / Социальное. Каждый тогл — немедленный API-вызов.

### Перезапуск онбординга
Кнопка «Пройти настройку заново» — сбрасывает `athleteOnboardingComplete` / `trainerOnboardingComplete`, навигирует на `/onboarding`.

---

## Роутинг

| Путь | Что делает |
|---|---|
| `/onboarding` | **Единый** онбординг — заменил `/athlete-onboarding` и `/trainer-onboarding` |
| `/athlete-onboarding` | Редирект на `/onboarding` (обратная совместимость) |
| `/trainer-onboarding` | Редирект на `/onboarding` (обратная совместимость) |

`ProtectedRoute` использует `shouldShowOnboarding()` из `OnboardingScreen.tsx`:
- Проверяет роль + activeMode
- Для `both`: тренерский кабинет → проверяет `trainerOnboardingComplete`, атлетский → `athleteOnboardingComplete`

---

## Backwards compatibility

| Старое поле | Новое поле | Что сделали |
|---|---|---|
| `athleteCoachIntent` | `athleteScenario` | Новый онбординг пишет оба. `AthleteMyTeamScreen` использует старое — можно мигрировать постепенно |
| `athleteOnboardingComplete` | не меняли | Используется как прежде |
| `trainerOnboardingComplete` | не меняли | Используется как прежде |

`clientPreferencesMigration.ts` автоматически переносит `athleteCoachIntent → athleteScenario` для существующих пользователей при первом логине.

Старые пользователи без `feat*` флагов получают дефолты `?? true` — видят полный функционал (как раньше).

---

## Файлы

| Файл | Назначение |
|---|---|
| `apps/api/app/utils/client_preferences.ts` | Типы + парсер + мержер на API |
| `apps/web/src/types/clientPreferences.ts` | Типы на фронте |
| `apps/web/src/util/parseStoredAuthUser.ts` | Парсинг localStorage |
| `apps/web/src/util/clientPreferencesMigration.ts` | Миграция старых localStorage данных |
| `apps/web/src/hooks/useFeatureFlags.ts` | Хук + MODE_FLAGS + applyUiMode + setFeatureFlag |
| `apps/web/src/hooks/useFeatureUnlock.ts` | Progressive disclosure по триггерам |
| `apps/web/src/screens/OnboardingScreen/OnboardingScreen.tsx` | Единый онбординг |
| `apps/web/src/components/Navigation/Navigation.tsx` | Навигация с feature flags |
| `apps/web/src/screens/ProfileScreen/tabs/SettingsTab.tsx` | Настройки функций |
