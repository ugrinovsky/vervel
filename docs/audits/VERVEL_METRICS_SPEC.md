# Vervel — Metrics & Events Spec (PMF B2B2C)

Дата: 2026-05-06  
Цель: единый словарь метрик/событий для команды, чтобы измерять эффект фокуса и упрощений.

Связано: [VERVEL_PMF_SCOPE.md](./VERVEL_PMF_SCOPE.md), [VERVEL_PMF_FOCUS_PLAN.md](./VERVEL_PMF_FOCUS_PLAN.md).

---

## 1) Принципы (чтобы метрики были честными)

- **Сегментация по роли** обязательна: `trainer` vs `athlete` vs `both`.
- Все метрики считаются по **cohort по дате регистрации** (или по дате первого логина).
- Для B2B2C важнее “привязка к тренеру/команде”, чем “просто открыл приложение”.

---

## 2) Северная звезда (North Star)

**Weekly Active Trainer with Active Athletes (WAT+):**  
тренер, который за 7 дней сделал ≥1 значимое действие **и** у которого есть ≥1 активный атлет за те же 7 дней.

Значимое действие тренера (минимум одно):
- назначил тренировку атлету/группе;
- создал/использовал шаблон;
- отправил сообщение клиенту/группе.

Активный атлет (минимум одно):
- зафиксировал тренировку;
- открыл назначенную тренировку и отметил выполнение (если есть такой UX);
- отправил сообщение тренеру/в группу.

---

## 3) Воронки (must-have)

### 3.1 Trainer activation funnel (7 дней)
**T0:** `trainer_signup` / `trainer_first_login`  
→ **T1:** `trainer_invite_created`  
→ **T2:** `trainer_first_athlete_attached` (первый принятый инвайт)  
→ **T3:** `trainer_first_plan_assigned`  
→ **T4:** `trainer_first_value` (любое из: assigned OR chat sent OR template used)  

### 3.2 Athlete attachment funnel (7 дней)
**A0:** `athlete_signup` / `athlete_first_login`  
→ **A1:** `athlete_invite_opened`  
→ **A2:** `athlete_invite_accepted` (attached_to_trainer/team)  
→ **A3:** `athlete_first_workout_logged` (или first completion)  

---

## 4) KPI (минимальный набор)

### 4.1 Onboarding
- **role_completion_rate**: доля пользователей, дошедших до выбора роли.
- **invite_accepted_rate**: доля инвайтов, завершившихся `athlete_invite_accepted`.
- **ttfv_minutes_p50/p90**: время до первого полезного действия (для тренера и атлета отдельно).

### 4.2 Retention
- **trainer_retention_d7 / d30** (по когортам тренеров).
- **athlete_retention_d7 / d30** (в разрезе: `solo` vs `with_coach`/`in_team`).

### 4.3 Monetization (после запуска тарифов)
- **trainer_pay_conversion_d30**
- **ARPA_trainer_month**
- **NRR_trainer_cohort** (если появятся апгрейды/даунгрейды).

---

## 5) События (event names) — зафиксировать в коде

Ниже — минимальные события, которые должны быть единообразно отправлены с web.

### 5.1 Auth / role
- `signup_completed` { method: email|vk|yandex }
- `login_completed` { method }
- `role_selected` { role: athlete|trainer|both }

### 5.2 Onboarding (adaptive)
- `onboarding_started` { role }
- `onboarding_step_completed` { role, step: 1|2|3|4|5 }
- `onboarding_completed` { role }
- `ui_mode_selected` { uiMode: starter|pro|unleash }
- `feature_flags_saved` { uiMode, flags_changed: boolean }

### 5.3 Invites / attachment
- `trainer_invite_created` { channel: link|qr|email }
- `athlete_invite_opened` { channel }
- `athlete_invite_accepted` { channel }

### 5.4 Planning / workouts
- `trainer_workout_assigned` { target: athlete|group }
- `athlete_workout_logged` { input: manual|ai_photo|ai_text|notes_parse }
- `athlete_workout_completed` { source: assigned|self }

### 5.5 Chat
- `message_sent` { scope: dm|group, sender_role }

---

## 6) Где считать (уровень продукта)

- Onboarding KPI — в продуктовой панели (cohort + funnel).
- Retention — cohort tables по ролям.
- Монетизацию — раздельно: **trainer** деньги, **athlete** retention.

---

## 7) Следующий инженерный шаг (из этого спека)

В репозитории нужно:
- выбрать провайдера аналитики (или серверный event log),
- внедрить отправку событий из web,
- определить server-side source of truth (если нужно для платежей/инвайтов).

