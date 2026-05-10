# Vervel — манифест файлов репозитория

Список **всех** путей, отслеживаемых git (`git ls-files`). Группировка по родительскому каталогу.

**Пересборка:** из корня репозитория `npm run docs:manifest` (скрипт `scripts/generate-file-manifest.mjs`).

| Метрика | Значение |
|---------|----------|
| Файлов | 640 |
| Каталогов (включая `.`) | 144 |
| Сгенерировано (UTC) | 2026-05-10T16:30:43.467Z |

См. также [VERVEL_PROJECT_FULL_INVENTORY.md](./VERVEL_PROJECT_FULL_INVENTORY.md) — смысловой обзор без перечисления каждого файла.

---

## `.` (12)

- `.editorconfig`
- `.gitignore`
- `.prettierrc.json`
- `docker-compose.dev.yml`
- `docker-compose.yml`
- `exercises.ts`
- `lint-staged.config.mjs`
- `livekit.prod.yaml`
- `livekit.yaml`
- `package.json`
- `README.md`
- `translate_exercises.js`

## `.github` (1)

- `.github/dependabot.yml`

## `.github/workflows` (1)

- `.github/workflows/deploy.yml`

## `.husky` (1)

- `.husky/pre-commit`

## `.vscode` (1)

- `.vscode/settings.json`

## `"docs` (1)

- `"docs/\320\242\320\224.md"`

## `apps/api` (10)

- `apps/api/.env.example`
- `apps/api/.gitignore`
- `apps/api/ace.js`
- `apps/api/adonisrc.ts`
- `apps/api/docker-entrypoint.sh`
- `apps/api/Dockerfile`
- `apps/api/eslint.config.js`
- `apps/api/package.json`
- `apps/api/test_copilot.mjs`
- `apps/api/tsconfig.json`

## `apps/api/app/controllers` (23)

- `apps/api/app/controllers/ai_controller.ts`
- `apps/api/app/controllers/athlete_controller.ts`
- `apps/api/app/controllers/athlete_copilot_controller.ts`
- `apps/api/app/controllers/auth_controller.ts`
- `apps/api/app/controllers/avatars_controller.ts`
- `apps/api/app/controllers/chat_controller.ts`
- `apps/api/app/controllers/exercises_controller.ts`
- `apps/api/app/controllers/feedback_controller.ts`
- `apps/api/app/controllers/invite_controller.ts`
- `apps/api/app/controllers/oauth_controller.ts`
- `apps/api/app/controllers/payments_controller.ts`
- `apps/api/app/controllers/profile_controller.ts`
- `apps/api/app/controllers/progression_controller.ts`
- `apps/api/app/controllers/push_controller.ts`
- `apps/api/app/controllers/scheduled_workout_controller.ts`
- `apps/api/app/controllers/streak_controller.ts`
- `apps/api/app/controllers/trainer_controller.ts`
- `apps/api/app/controllers/trainer_copilot_controller.ts`
- `apps/api/app/controllers/trainer_custom_exercises_controller.ts`
- `apps/api/app/controllers/trainer_leads_controller.ts`
- `apps/api/app/controllers/video_calls_controller.ts`
- `apps/api/app/controllers/workout_template_controller.ts`
- `apps/api/app/controllers/workouts_controller.ts`

## `apps/api/app/events` (1)

- `apps/api/app/events/push_events.ts`

## `apps/api/app/exceptions` (1)

- `apps/api/app/exceptions/handler.ts`

## `apps/api/app/listeners` (1)

- `apps/api/app/listeners/push_listener.ts`

## `apps/api/app/middleware` (6)

- `apps/api/app/middleware/auth_middleware.ts`
- `apps/api/app/middleware/container_bindings_middleware.ts`
- `apps/api/app/middleware/cookie_auth_middleware.ts`
- `apps/api/app/middleware/force_json_response_middleware.ts`
- `apps/api/app/middleware/request_logger_middleware.ts`
- `apps/api/app/middleware/trainer_middleware.ts`

## `apps/api/app/models` (27)

- `apps/api/app/models/achievement.ts`
- `apps/api/app/models/chat_read.ts`
- `apps/api/app/models/chat.ts`
- `apps/api/app/models/exercise_anatomy_cache.ts`
- `apps/api/app/models/exercise.ts`
- `apps/api/app/models/message.ts`
- `apps/api/app/models/oauth_provider.ts`
- `apps/api/app/models/push_subscription.ts`
- `apps/api/app/models/scheduled_workout.ts`
- `apps/api/app/models/streak_history.ts`
- `apps/api/app/models/topic.ts`
- `apps/api/app/models/trainer_athlete.ts`
- `apps/api/app/models/trainer_custom_exercise.ts`
- `apps/api/app/models/trainer_group.ts`
- `apps/api/app/models/trainer_lead.ts`
- `apps/api/app/models/user_achievement.ts`
- `apps/api/app/models/user_exercise_standard_alias.ts`
- `apps/api/app/models/user_exercise_standard_link_batch_snapshot.ts`
- `apps/api/app/models/user_exercise_standard.ts`
- `apps/api/app/models/user_measurement.ts`
- `apps/api/app/models/user_pinned_exercise.ts`
- `apps/api/app/models/user_streak.ts`
- `apps/api/app/models/user.ts`
- `apps/api/app/models/video_call.ts`
- `apps/api/app/models/workout_draft.ts`
- `apps/api/app/models/workout_template.ts`
- `apps/api/app/models/workout.ts`

## `apps/api/app/services` (32)

- `apps/api/app/services/AchievementService.ts`
- `apps/api/app/services/ai_parse_chain.ts`
- `apps/api/app/services/ai_workout_ocr_parse.ts`
- `apps/api/app/services/AiBalanceService.ts`
- `apps/api/app/services/AiZonesService.ts`
- `apps/api/app/services/AthleteCopilotPlanService.ts`
- `apps/api/app/services/call_logic.ts`
- `apps/api/app/services/chat_stream_logic.ts`
- `apps/api/app/services/CopilotInsightsService.ts`
- `apps/api/app/services/CopilotPlanService.ts`
- `apps/api/app/services/CopilotPriorityService.ts`
- `apps/api/app/services/CopilotSharedRules.ts`
- `apps/api/app/services/DialogService.ts`
- `apps/api/app/services/exercise_match_helpers.ts`
- `apps/api/app/services/ExerciseAnatomyService.ts`
- `apps/api/app/services/ExerciseCatalog.ts`
- `apps/api/app/services/JobQueueService.ts`
- `apps/api/app/services/JobWorkerService.ts`
- `apps/api/app/services/KlipyService.ts`
- `apps/api/app/services/LiveKitService.ts`
- `apps/api/app/services/PeriodizationService.ts`
- `apps/api/app/services/ProgressionService.ts`
- `apps/api/app/services/PushNotificationService.ts`
- `apps/api/app/services/ScheduledWorkoutFanoutService.ts`
- `apps/api/app/services/streak_logic.ts`
- `apps/api/app/services/StreakService.ts`
- `apps/api/app/services/strength_log_support.ts`
- `apps/api/app/services/WorkoutCalculator.ts`
- `apps/api/app/services/WorkoutConverter.ts`
- `apps/api/app/services/xp_logic.ts`
- `apps/api/app/services/XpService.ts`
- `apps/api/app/services/YandexAiService.ts`

## `apps/api/app/utils` (13)

- `apps/api/app/utils/auth_cookie.ts`
- `apps/api/app/utils/auth_user_payload.ts`
- `apps/api/app/utils/client_preferences.ts`
- `apps/api/app/utils/date.ts`
- `apps/api/app/utils/error.ts`
- `apps/api/app/utils/klipy_message.ts`
- `apps/api/app/utils/scheduled_workout_entry.ts`
- `apps/api/app/utils/scheduled_workout_types.ts`
- `apps/api/app/utils/trainer_custom_exercise_helpers.ts`
- `apps/api/app/utils/trusted_vk_photo_url.ts`
- `apps/api/app/utils/type_guards.ts`
- `apps/api/app/utils/vk_mini_app_launch.ts`
- `apps/api/app/utils/zone_weights.ts`

## `apps/api/app/validators` (3)

- `apps/api/app/validators/auth_validator.ts`
- `apps/api/app/validators/trainer_validator.ts`
- `apps/api/app/validators/workout_validator.ts`

## `apps/api/bin` (3)

- `apps/api/bin/console.ts`
- `apps/api/bin/server.ts`
- `apps/api/bin/test.ts`

## `apps/api/commands` (2)

- `apps/api/commands/backfill_workouts_exercise_zones_month.ts`
- `apps/api/commands/backfill_workouts_zones_load_abs.ts`

## `apps/api/config` (9)

- `apps/api/config/app.ts`
- `apps/api/config/auth.ts`
- `apps/api/config/bodyparser.ts`
- `apps/api/config/cors.ts`
- `apps/api/config/database.ts`
- `apps/api/config/hash.ts`
- `apps/api/config/limiter.ts`
- `apps/api/config/logger.ts`
- `apps/api/config/static.ts`

## `apps/api/database/data` (2)

- `apps/api/database/data/exercises_en.json`
- `apps/api/database/data/exercises.json`

## `apps/api/database/migrations` (66)

- `apps/api/database/migrations/1769258737490_create_users_table.ts`
- `apps/api/database/migrations/1769258737492_create_access_tokens_table.ts`
- `apps/api/database/migrations/1769344328936_create_exercises_table.ts`
- `apps/api/database/migrations/1769957076440_create_create_workouts_table.ts`
- `apps/api/database/migrations/1770000000001_add_role_to_users.ts`
- `apps/api/database/migrations/1770000000002_create_trainer_athletes_table.ts`
- `apps/api/database/migrations/1770000000003_create_trainer_groups_table.ts`
- `apps/api/database/migrations/1770000000004_create_group_athletes_table.ts`
- `apps/api/database/migrations/1770100000001_create_user_streaks_table.ts`
- `apps/api/database/migrations/1770100000002_create_achievements_table.ts`
- `apps/api/database/migrations/1770100000003_create_user_achievements_table.ts`
- `apps/api/database/migrations/1770100000004_create_streak_history_table.ts`
- `apps/api/database/migrations/1770200000001_make_password_nullable.ts`
- `apps/api/database/migrations/1770200000002_create_oauth_providers_table.ts`
- `apps/api/database/migrations/1770300000001_create_chats_table.ts`
- `apps/api/database/migrations/1770300000002_create_messages_table.ts`
- `apps/api/database/migrations/1770300000003_create_workout_templates_table.ts`
- `apps/api/database/migrations/1770300000004_create_scheduled_workouts_table.ts`
- `apps/api/database/migrations/1770400000001_add_deleted_at_to_workout_templates.ts`
- `apps/api/database/migrations/1770400000002_add_deleted_at_to_trainer_groups.ts`
- `apps/api/database/migrations/1770400000003_add_deleted_at_to_scheduled_workouts.ts`
- `apps/api/database/migrations/1770400000004_add_deleted_at_to_workouts.ts`
- `apps/api/database/migrations/1770500000001_create_chat_reads_table.ts`
- `apps/api/database/migrations/1771744425597_create_add_scheduled_workout_id_to_workouts_table.ts`
- `apps/api/database/migrations/1771800000001_add_trainer_profile_fields.ts`
- `apps/api/database/migrations/1771900000001_add_gender_to_users.ts`
- `apps/api/database/migrations/1772000000001_add_ai_balance_to_users.ts`
- `apps/api/database/migrations/1772000000002_create_ai_transactions_table.ts`
- `apps/api/database/migrations/1772100000001_create_payments_table.ts`
- `apps/api/database/migrations/1772200000001_add_theme_hue_to_users.ts`
- `apps/api/database/migrations/1772370795734_create_update_achievements_category_constraints_table.ts`
- `apps/api/database/migrations/1772385024229_create_create_feedbacks_table.ts`
- `apps/api/database/migrations/1772386503023_create_create_rate_limits_table.ts`
- `apps/api/database/migrations/1772500000001_add_donate_fields_to_users.ts`
- `apps/api/database/migrations/1772600000001_add_rpe_to_workouts.ts`
- `apps/api/database/migrations/1772700000001_add_referred_by_to_users.ts`
- `apps/api/database/migrations/1773000000001_create_jobs_table.ts`
- `apps/api/database/migrations/1773000000001_create_push_subscriptions_table.ts`
- `apps/api/database/migrations/1773100000001_add_nickname_to_trainer_athletes.ts`
- `apps/api/database/migrations/1774292387425_create_video_calls_table.ts`
- `apps/api/database/migrations/1775000000001_add_weekly_mode_to_user_streaks.ts`
- `apps/api/database/migrations/1775200000001_add_body_weight_to_users.ts`
- `apps/api/database/migrations/1775200000002_add_xp_to_users.ts`
- `apps/api/database/migrations/1775200000003_add_progress_to_achievements_category.ts`
- `apps/api/database/migrations/1775300000001_create_topics_table.ts`
- `apps/api/database/migrations/1775400000001_create_workout_drafts_table.ts`
- `apps/api/database/migrations/1775500000001_add_ai_notes_free_to_users.ts`
- `apps/api/database/migrations/1775600000001_add_athlete_id_index_to_group_athletes.ts`
- `apps/api/database/migrations/1775700000001_add_index_to_balance_transactions.ts`
- `apps/api/database/migrations/1775800000001_create_user_pinned_exercises_table.ts`
- `apps/api/database/migrations/1775900000001_create_user_dashboard_exercises_table.ts`
- `apps/api/database/migrations/1776000000001_create_user_exercise_standards_tables.ts`
- `apps/api/database/migrations/1776100000001_drop_user_dashboard_exercises_table.ts`
- `apps/api/database/migrations/1776200000001_create_user_exercise_standard_link_batch_snapshots.ts`
- `apps/api/database/migrations/1776300000001_make_users_role_nullable.ts`
- `apps/api/database/migrations/1776500000001_add_client_preferences_to_users.ts`
- `apps/api/database/migrations/1779000000001_add_zones_load_abs_to_workouts.ts`
- `apps/api/database/migrations/1779100000000_create_exercise_anatomy_cache_table.ts`
- `apps/api/database/migrations/1779200000001_add_ai_assistant_chats.ts`
- `apps/api/database/migrations/1779300000001_add_is_detached_to_workouts.ts`
- `apps/api/database/migrations/1780000000001_create_trainer_leads_table.ts`
- `apps/api/database/migrations/1780000000002_add_crm_fields_to_trainer_athletes.ts`
- `apps/api/database/migrations/1780100000001_create_trainer_custom_exercises_table.ts`
- `apps/api/database/migrations/1780100000002_add_type_defaults_to_trainer_custom_exercises.ts`
- `apps/api/database/migrations/1780100000003_drop_workout_type_from_trainer_custom_exercises.ts`
- `apps/api/database/migrations/1780200000001_ensure_chats_owner_user_id.ts`

## `apps/api/database/seeders` (7)

- `apps/api/database/seeders/achievement_seeder.ts`
- `apps/api/database/seeders/exercise_seeder.ts`
- `apps/api/database/seeders/free_exercise_seeder.ts`
- `apps/api/database/seeders/trainer_seeder.ts`
- `apps/api/database/seeders/trainer_workouts_seeder.ts`
- `apps/api/database/seeders/user_seeder.ts`
- `apps/api/database/seeders/workout_seeder.ts`

## `apps/api/start` (5)

- `apps/api/start/env.ts`
- `apps/api/start/events.ts`
- `apps/api/start/jobs.ts`
- `apps/api/start/kernel.ts`
- `apps/api/start/routes.ts`

## `apps/api/tests` (1)

- `apps/api/tests/bootstrap.ts`

## `apps/api/tests/functional` (2)

- `apps/api/tests/functional/copilot_routes.spec.ts`
- `apps/api/tests/functional/routes.spec.ts`

## `apps/api/tests/unit` (34)

- `apps/api/tests/unit/achievement_logic.spec.ts`
- `apps/api/tests/unit/ai_balance_db.spec.ts`
- `apps/api/tests/unit/ai_balance.spec.ts`
- `apps/api/tests/unit/ai_zones_service.spec.ts`
- `apps/api/tests/unit/athlete_copilot_plan_service.spec.ts`
- `apps/api/tests/unit/call_logic.spec.ts`
- `apps/api/tests/unit/chat_stream_logic.spec.ts`
- `apps/api/tests/unit/chat_unread_counts.spec.ts`
- `apps/api/tests/unit/client_preferences.spec.ts`
- `apps/api/tests/unit/copilot_plan_service.spec.ts`
- `apps/api/tests/unit/copilot_priority_service.spec.ts`
- `apps/api/tests/unit/copilot_shared_rules.spec.ts`
- `apps/api/tests/unit/date_utils.spec.ts`
- `apps/api/tests/unit/dialog_service.spec.ts`
- `apps/api/tests/unit/exercise_anatomy_service.spec.ts`
- `apps/api/tests/unit/exercise_catalog.spec.ts`
- `apps/api/tests/unit/exercise_match_helpers.spec.ts`
- `apps/api/tests/unit/klipy_message.spec.ts`
- `apps/api/tests/unit/klipy_service.spec.ts`
- `apps/api/tests/unit/payments_webhook.spec.ts`
- `apps/api/tests/unit/progression_logic.spec.ts`
- `apps/api/tests/unit/progression_standard_alias_batch.spec.ts`
- `apps/api/tests/unit/scheduled_workout_fanout.spec.ts`
- `apps/api/tests/unit/streak_logic.spec.ts`
- `apps/api/tests/unit/strength_log_support.spec.ts`
- `apps/api/tests/unit/strength_log_workout_type_pins.spec.ts`
- `apps/api/tests/unit/trainer_custom_exercise_helpers.spec.ts`
- `apps/api/tests/unit/trusted_vk_photo_url.spec.ts`
- `apps/api/tests/unit/vk_mini_app_launch.spec.ts`
- `apps/api/tests/unit/workout_calculator.spec.ts`
- `apps/api/tests/unit/workout_detach_flag.spec.ts`
- `apps/api/tests/unit/xp_logic.spec.ts`
- `apps/api/tests/unit/yandex_ai_service.spec.ts`
- `apps/api/tests/unit/zone_weights.spec.ts`

## `apps/web` (13)

- `apps/web/.env.example`
- `apps/web/.env.production`
- `apps/web/.gitignore`
- `apps/web/Dockerfile`
- `apps/web/Dockerfile.dev`
- `apps/web/eslint.config.js`
- `apps/web/index.html`
- `apps/web/nginx.conf`
- `apps/web/package.json`
- `apps/web/README.md`
- `apps/web/tsconfig.json`
- `apps/web/vite.config.ts`
- `apps/web/vitest.config.ts`

## `apps/web/dev-dist` (1)

- `apps/web/dev-dist/registerSW.js`

## `apps/web/public` (9)

- `apps/web/public/apple-touch-icon.png`
- `apps/web/public/favicon.ico`
- `apps/web/public/icon-192.png`
- `apps/web/public/icon-512.png`
- `apps/web/public/logo.png`
- `apps/web/public/logo.svg`
- `apps/web/public/manifest.json`
- `apps/web/public/offline.html`
- `apps/web/public/theme-init.js`

## `apps/web/public/suggest` (1)

- `apps/web/public/suggest/token.html`

## `apps/web/src` (5)

- `apps/web/src/App.css`
- `apps/web/src/App.tsx`
- `apps/web/src/main.tsx`
- `apps/web/src/sw.ts`
- `apps/web/src/vite-env.d.ts`

## `apps/web/src/api` (14)

- `apps/web/src/api/ai.ts`
- `apps/web/src/api/athlete.ts`
- `apps/web/src/api/auth.ts`
- `apps/web/src/api/avatar.ts`
- `apps/web/src/api/calls.ts`
- `apps/web/src/api/chat.ts`
- `apps/web/src/api/exercises.ts`
- `apps/web/src/api/invite.ts`
- `apps/web/src/api/payments.ts`
- `apps/web/src/api/profile.ts`
- `apps/web/src/api/push.ts`
- `apps/web/src/api/streak.ts`
- `apps/web/src/api/trainer.ts`
- `apps/web/src/api/workouts.ts`

## `apps/web/src/api/http` (3)

- `apps/web/src/api/http/baseApi.ts`
- `apps/web/src/api/http/privateApi.ts`
- `apps/web/src/api/http/publicApi.ts`

## `apps/web/src/assets` (3)

- `apps/web/src/assets/female.svg`
- `apps/web/src/assets/male.svg`
- `apps/web/src/assets/maleFront.svg`

## `apps/web/src/auth` (1)

- `apps/web/src/auth/auxiliarySessionStorage.ts`

## `apps/web/src/components` (4)

- `apps/web/src/components/FormField.tsx`
- `apps/web/src/components/SectionLabel.tsx`
- `apps/web/src/components/WorkoutDateTimeRow.tsx`
- `apps/web/src/components/WorkoutTypeTabs.tsx`

## `apps/web/src/components/AchievementNotification` (2)

- `apps/web/src/components/AchievementNotification/AchievementNotification.tsx`
- `apps/web/src/components/AchievementNotification/AchievementToast.tsx`

## `apps/web/src/components/AchievementsList` (1)

- `apps/web/src/components/AchievementsList/AchievementsList.tsx`

## `apps/web/src/components/AddAthleteDrawer` (1)

- `apps/web/src/components/AddAthleteDrawer/AddAthleteDrawer.tsx`

## `apps/web/src/components/AiChat` (1)

- `apps/web/src/components/AiChat/AiChat.tsx`

## `apps/web/src/components/AiWorkoutGenerator` (1)

- `apps/web/src/components/AiWorkoutGenerator/AiWorkoutGenerator.tsx`

## `apps/web/src/components/AiWorkoutRecognizer` (1)

- `apps/web/src/components/AiWorkoutRecognizer/AiWorkoutRecognizer.tsx`

## `apps/web/src/components/AiWorkoutTextParser` (1)

- `apps/web/src/components/AiWorkoutTextParser/AiWorkoutTextParser.tsx`

## `apps/web/src/components/analytics` (17)

- `apps/web/src/components/analytics/AcwrChart.tsx`
- `apps/web/src/components/analytics/AnalyticsCards.tsx`
- `apps/web/src/components/analytics/AnalyticsInsights.tsx`
- `apps/web/src/components/analytics/AnalyticsPeriodToggle.tsx`
- `apps/web/src/components/analytics/AnalyticsSheetIntro.tsx`
- `apps/web/src/components/analytics/MetricsOverview.tsx`
- `apps/web/src/components/analytics/MuscleBalance.tsx`
- `apps/web/src/components/analytics/PeriodizationChart.tsx`
- `apps/web/src/components/analytics/rechartsTooltip.ts`
- `apps/web/src/components/analytics/Recommendations.tsx`
- `apps/web/src/components/analytics/StatsOverview.tsx`
- `apps/web/src/components/analytics/StreakBlock.tsx`
- `apps/web/src/components/analytics/TopMuscles.tsx`
- `apps/web/src/components/analytics/TrendChart.tsx`
- `apps/web/src/components/analytics/WeekdayChart.tsx`
- `apps/web/src/components/analytics/WeeklyOverview.tsx`
- `apps/web/src/components/analytics/WorkoutRadar.tsx`

## `apps/web/src/components/athlete` (3)

- `apps/web/src/components/athlete/AthleteCopilotCard.tsx`
- `apps/web/src/components/athlete/ExplainWhy.tsx`
- `apps/web/src/components/athlete/WeeklyPlanSheet.tsx`

## `apps/web/src/components/AthleteAvatarsRow` (1)

- `apps/web/src/components/AthleteAvatarsRow/AthleteAvatarsRow.tsx`

## `apps/web/src/components/AthleteCard` (1)

- `apps/web/src/components/AthleteCard/AthleteCard.tsx`

## `apps/web/src/components/AthleteQrCode` (1)

- `apps/web/src/components/AthleteQrCode/AthleteQrCode.tsx`

## `apps/web/src/components/Avatar` (3)

- `apps/web/src/components/Avatar/Avatar.tsx`
- `apps/web/src/components/Avatar/bodyZones.ts`
- `apps/web/src/components/Avatar/styles.css`

## `apps/web/src/components/AvatarCropModal` (1)

- `apps/web/src/components/AvatarCropModal/AvatarCropModal.tsx`

## `apps/web/src/components/AvatarView` (2)

- `apps/web/src/components/AvatarView/AvatarView.tsx`
- `apps/web/src/components/AvatarView/avatarViewZoneNormalize.ts`

## `apps/web/src/components/BackButton` (1)

- `apps/web/src/components/BackButton/BackButton.tsx`

## `apps/web/src/components/BottomSheet` (1)

- `apps/web/src/components/BottomSheet/BottomSheet.tsx`

## `apps/web/src/components/ChatBox` (5)

- `apps/web/src/components/ChatBox/ChatBox.tsx`
- `apps/web/src/components/ChatBox/KlipyPicker.tsx`
- `apps/web/src/components/ChatBox/WorkoutDetailSheet.tsx`
- `apps/web/src/components/ChatBox/WorkoutPreviewCard.tsx`
- `apps/web/src/components/ChatBox/workoutPreviewParse.ts`

## `apps/web/src/components/ChatScreen` (1)

- `apps/web/src/components/ChatScreen/ChatScreen.tsx`

## `apps/web/src/components/CustomExercisePicker` (1)

- `apps/web/src/components/CustomExercisePicker/CustomExercisePicker.tsx`

## `apps/web/src/components/Drawer` (1)

- `apps/web/src/components/Drawer/Drawer.tsx`

## `apps/web/src/components/ErrorBoundary` (1)

- `apps/web/src/components/ErrorBoundary/ErrorBoundary.tsx`

## `apps/web/src/components/ExerciseCard` (1)

- `apps/web/src/components/ExerciseCard/ExerciseCard.tsx`

## `apps/web/src/components/ExerciseDetailSheet` (1)

- `apps/web/src/components/ExerciseDetailSheet/ExerciseDetailSheet.tsx`

## `apps/web/src/components/ExerciseFilterBar` (2)

- `apps/web/src/components/ExerciseFilterBar/ExerciseFilterBar.tsx`
- `apps/web/src/components/ExerciseFilterBar/exerciseFilterConstants.ts`

## `apps/web/src/components/ExerciseParamsEditor` (1)

- `apps/web/src/components/ExerciseParamsEditor/ExerciseParamsEditor.tsx`

## `apps/web/src/components/ExercisePicker` (1)

- `apps/web/src/components/ExercisePicker/ExercisePicker.tsx`

## `apps/web/src/components/ExercisesList` (1)

- `apps/web/src/components/ExercisesList/ExercisesList.tsx`

## `apps/web/src/components/FullScreenChat` (1)

- `apps/web/src/components/FullScreenChat/FullScreenChat.tsx`

## `apps/web/src/components/GroupCard` (1)

- `apps/web/src/components/GroupCard/GroupCard.tsx`

## `apps/web/src/components/ImageGallery` (1)

- `apps/web/src/components/ImageGallery/ImageGallery.tsx`

## `apps/web/src/components/MiniAvatar` (2)

- `apps/web/src/components/MiniAvatar/InlineAthleteAvatar.tsx`
- `apps/web/src/components/MiniAvatar/MiniAvatar.tsx`

## `apps/web/src/components/ModalOverlay` (1)

- `apps/web/src/components/ModalOverlay/ModalOverlay.tsx`

## `apps/web/src/components/MuscleZones` (1)

- `apps/web/src/components/MuscleZones/MuscleZones.tsx`

## `apps/web/src/components/Navigation` (2)

- `apps/web/src/components/Navigation/Navigation.tsx`
- `apps/web/src/components/Navigation/styles.css`

## `apps/web/src/components/OnboardingPwaPushSection` (1)

- `apps/web/src/components/OnboardingPwaPushSection/OnboardingPwaPushSection.tsx`

## `apps/web/src/components/PwaInstallHint` (2)

- `apps/web/src/components/PwaInstallHint/PwaInstallHint.tsx`
- `apps/web/src/components/PwaInstallHint/pwaInstallShared.tsx`

## `apps/web/src/components/QrScanner` (1)

- `apps/web/src/components/QrScanner/QrScanner.tsx`

## `apps/web/src/components/Screen` (2)

- `apps/web/src/components/Screen/Screen.tsx`
- `apps/web/src/components/Screen/styles.css`

## `apps/web/src/components/ScreenHeader` (1)

- `apps/web/src/components/ScreenHeader/ScreenHeader.tsx`

## `apps/web/src/components/ScreenHint` (1)

- `apps/web/src/components/ScreenHint/ScreenHint.tsx`

## `apps/web/src/components/ScreenLinks` (1)

- `apps/web/src/components/ScreenLinks/ScreenLinks.tsx`

## `apps/web/src/components/ShareResultCard` (1)

- `apps/web/src/components/ShareResultCard/ShareResultCard.tsx`

## `apps/web/src/components/StreakCard` (1)

- `apps/web/src/components/StreakCard/StreakCard.tsx`

## `apps/web/src/components/trainer` (5)

- `apps/web/src/components/trainer/AthleteCrmSheet.tsx`
- `apps/web/src/components/trainer/CopilotAthleteList.tsx`
- `apps/web/src/components/trainer/CopilotPanel.tsx`
- `apps/web/src/components/trainer/LeadDetailSheet.tsx`
- `apps/web/src/components/trainer/TemplateListSheet.tsx`

## `apps/web/src/components/ui` (40)

- `apps/web/src/components/ui/AccentButton.tsx`
- `apps/web/src/components/ui/AiCostNotice.tsx`
- `apps/web/src/components/ui/AiLoadingView.tsx`
- `apps/web/src/components/ui/AiSheetHeader.tsx`
- `apps/web/src/components/ui/AnimatedBlock.tsx`
- `apps/web/src/components/ui/AppInput.tsx`
- `apps/web/src/components/ui/Badge.tsx`
- `apps/web/src/components/ui/Calendar.tsx`
- `apps/web/src/components/ui/Card.tsx`
- `apps/web/src/components/ui/CardHeader.tsx`
- `apps/web/src/components/ui/ChipScrollRow.tsx`
- `apps/web/src/components/ui/CloseButton.tsx`
- `apps/web/src/components/ui/CollapsibleBlock.tsx`
- `apps/web/src/components/ui/Combobox.tsx`
- `apps/web/src/components/ui/ConfirmDeleteButton.tsx`
- `apps/web/src/components/ui/confirmDeleteOpenEvent.ts`
- `apps/web/src/components/ui/ConfirmDeleteWrapper.tsx`
- `apps/web/src/components/ui/FloatingPanel.tsx`
- `apps/web/src/components/ui/GenderToggle.tsx`
- `apps/web/src/components/ui/GhostButton.tsx`
- `apps/web/src/components/ui/IconButton.tsx`
- `apps/web/src/components/ui/LineChart.tsx`
- `apps/web/src/components/ui/Listbox.tsx`
- `apps/web/src/components/ui/ListButton.tsx`
- `apps/web/src/components/ui/LoadingSpinner.tsx`
- `apps/web/src/components/ui/NumberInput.tsx`
- `apps/web/src/components/ui/PhoneInput.tsx`
- `apps/web/src/components/ui/PillButton.tsx`
- `apps/web/src/components/ui/RouteLoading.tsx`
- `apps/web/src/components/ui/SearchInput.tsx`
- `apps/web/src/components/ui/SectionBreak.tsx`
- `apps/web/src/components/ui/SectionCard.tsx`
- `apps/web/src/components/ui/SectionDivider.tsx`
- `apps/web/src/components/ui/SectionGroup.tsx`
- `apps/web/src/components/ui/Switch.tsx`
- `apps/web/src/components/ui/Tabs.tsx`
- `apps/web/src/components/ui/TextInput.tsx`
- `apps/web/src/components/ui/TimeInput.tsx`
- `apps/web/src/components/ui/ToggleGroup.tsx`
- `apps/web/src/components/ui/UiModeCard.tsx`

## `apps/web/src/components/UserAvatar` (1)

- `apps/web/src/components/UserAvatar/UserAvatar.tsx`

## `apps/web/src/components/VerveLogo` (1)

- `apps/web/src/components/VerveLogo/VerveLogo.tsx`

## `apps/web/src/components/VideoCall` (5)

- `apps/web/src/components/VideoCall/CallButton.tsx`
- `apps/web/src/components/VideoCall/CallControls.tsx`
- `apps/web/src/components/VideoCall/IncomingCall.tsx`
- `apps/web/src/components/VideoCall/IncomingCallWatcher.tsx`
- `apps/web/src/components/VideoCall/VideoCallRoom.tsx`

## `apps/web/src/components/VkIdButton` (2)

- `apps/web/src/components/VkIdButton/VkIdButton.tsx`
- `apps/web/src/components/VkIdButton/vkSdkStatsShim.ts`

## `apps/web/src/components/WorkoutExercisesEditor` (2)

- `apps/web/src/components/WorkoutExercisesEditor/normalizeForWorkoutType.ts`
- `apps/web/src/components/WorkoutExercisesEditor/WorkoutExercisesEditor.tsx`

## `apps/web/src/components/workoutExerciseShared` (3)

- `apps/web/src/components/workoutExerciseShared/SortableDragHandle.tsx`
- `apps/web/src/components/workoutExerciseShared/WorkoutExerciseBetweenRow.tsx`
- `apps/web/src/components/workoutExerciseShared/WorkoutExerciseInsertControls.tsx`

## `apps/web/src/components/WorkoutFormBase` (3)

- `apps/web/src/components/WorkoutFormBase/WorkoutFormBase.tsx`
- `apps/web/src/components/WorkoutFormBase/workoutTypeConversion.test.ts`
- `apps/web/src/components/WorkoutFormBase/workoutTypeConversion.ts`

## `apps/web/src/components/WorkoutInlineForm` (1)

- `apps/web/src/components/WorkoutInlineForm/WorkoutInlineForm.tsx`

## `apps/web/src/components/WorkoutIntensityBar` (1)

- `apps/web/src/components/WorkoutIntensityBar/WorkoutIntensityBar.tsx`

## `apps/web/src/components/YandexIdButton` (1)

- `apps/web/src/components/YandexIdButton/YandexIdButton.tsx`

## `apps/web/src/constants` (6)

- `apps/web/src/constants/ai.ts`
- `apps/web/src/constants/AnalyticsConstants.test.ts`
- `apps/web/src/constants/AnalyticsConstants.ts`
- `apps/web/src/constants/routes.tsx`
- `apps/web/src/constants/workoutTypes.ts`
- `apps/web/src/constants/zones.ts`

## `apps/web/src/contexts` (11)

- `apps/web/src/contexts/auth-contexts.ts`
- `apps/web/src/contexts/auth-hooks.ts`
- `apps/web/src/contexts/auth-types.ts`
- `apps/web/src/contexts/AuthContext.ts`
- `apps/web/src/contexts/AuthProvider.tsx`
- `apps/web/src/contexts/sheet-stack-react-context.ts`
- `apps/web/src/contexts/sheet-stack-types.ts`
- `apps/web/src/contexts/sheet-stack-z-index.ts`
- `apps/web/src/contexts/SheetStackContext.ts`
- `apps/web/src/contexts/SheetStackProvider.tsx`
- `apps/web/src/contexts/useSheetStack.ts`

## `apps/web/src/hooks` (26)

- `apps/web/src/hooks/useAchievementToast.tsx`
- `apps/web/src/hooks/useAiBalance.ts`
- `apps/web/src/hooks/useAthleteAvatar.ts`
- `apps/web/src/hooks/useAthleteStats.ts`
- `apps/web/src/hooks/useAthleteWorkoutDraftLocal.ts`
- `apps/web/src/hooks/useBodyScrollLock.ts`
- `apps/web/src/hooks/useCallControls.ts`
- `apps/web/src/hooks/useClientInfiniteScroll.ts`
- `apps/web/src/hooks/useDialogs.test.ts`
- `apps/web/src/hooks/useDialogs.ts`
- `apps/web/src/hooks/useEscapeKey.ts`
- `apps/web/src/hooks/useExerciseFilters.test.ts`
- `apps/web/src/hooks/useExerciseFilters.ts`
- `apps/web/src/hooks/useExercises.ts`
- `apps/web/src/hooks/useFeatureFlags.ts`
- `apps/web/src/hooks/useFeatureUnlock.ts`
- `apps/web/src/hooks/useImageLoad.ts`
- `apps/web/src/hooks/usePushNotifications.ts`
- `apps/web/src/hooks/useServerPagination.ts`
- `apps/web/src/hooks/useTrainerCabinetRedirect.ts`
- `apps/web/src/hooks/useTrainerTeamsFeatureRedirect.ts`
- `apps/web/src/hooks/useTrainerUnreadCounts.test.ts`
- `apps/web/src/hooks/useTrainerUnreadCounts.ts`
- `apps/web/src/hooks/useVideoCall.ts`
- `apps/web/src/hooks/useVisualViewportBottomInset.ts`
- `apps/web/src/hooks/useWorkoutsStats.ts`

## `apps/web/src/lib` (2)

- `apps/web/src/lib/noPullRefresh.ts`
- `apps/web/src/lib/workoutListDnd.ts`

## `apps/web/src/screens/ActivityScreen` (11)

- `apps/web/src/screens/ActivityScreen/ActivityScreen.tsx`
- `apps/web/src/screens/ActivityScreen/ActivitySkeleton.tsx`
- `apps/web/src/screens/ActivityScreen/DayDetails.tsx`
- `apps/web/src/screens/ActivityScreen/InfoRow.tsx`
- `apps/web/src/screens/ActivityScreen/MonthlyStats.tsx`
- `apps/web/src/screens/ActivityScreen/StatCard.tsx`
- `apps/web/src/screens/ActivityScreen/StatItem.tsx`
- `apps/web/src/screens/ActivityScreen/useActivityData.ts`
- `apps/web/src/screens/ActivityScreen/utils.test.ts`
- `apps/web/src/screens/ActivityScreen/utils.ts`
- `apps/web/src/screens/ActivityScreen/WorkoutDetailSheet.tsx`

## `apps/web/src/screens/AnalyticsScreen` (1)

- `apps/web/src/screens/AnalyticsScreen/AnalyticsScreen.tsx`

## `apps/web/src/screens/AthleteMyTeamScreen` (1)

- `apps/web/src/screens/AthleteMyTeamScreen/AthleteMyTeamScreen.tsx`

## `apps/web/src/screens/AthleteOnboardingScreen` (1)

- `apps/web/src/screens/AthleteOnboardingScreen/AthleteOnboardingScreen.tsx`

## `apps/web/src/screens/AvatarScreen` (1)

- `apps/web/src/screens/AvatarScreen/AvatarScreen.tsx`

## `apps/web/src/screens/DialogsScreen` (1)

- `apps/web/src/screens/DialogsScreen/DialogsScreen.tsx`

## `apps/web/src/screens/DocsScreen` (1)

- `apps/web/src/screens/DocsScreen/DocsScreen.tsx`

## `apps/web/src/screens/InviteScreen` (1)

- `apps/web/src/screens/InviteScreen/InviteScreen.tsx`

## `apps/web/src/screens/LandingScreen` (4)

- `apps/web/src/screens/LandingScreen/LandingPhoneMock.css`
- `apps/web/src/screens/LandingScreen/LandingPhoneMock.tsx`
- `apps/web/src/screens/LandingScreen/LandingScreen.css`
- `apps/web/src/screens/LandingScreen/LandingScreen.tsx`

## `apps/web/src/screens/LandingScreen/assets` (3)

- `apps/web/src/screens/LandingScreen/assets/analytics.png`
- `apps/web/src/screens/LandingScreen/assets/avatar.png`
- `apps/web/src/screens/LandingScreen/assets/AvatarScreen.png`

## `apps/web/src/screens/LeaderboardScreen` (1)

- `apps/web/src/screens/LeaderboardScreen/LeaderboardScreen.tsx`

## `apps/web/src/screens/LoginScreen` (1)

- `apps/web/src/screens/LoginScreen/LoginScreen.tsx`

## `apps/web/src/screens/OAuthCallbackScreen` (1)

- `apps/web/src/screens/OAuthCallbackScreen/OAuthCallbackScreen.tsx`

## `apps/web/src/screens/OnboardingScreen` (1)

- `apps/web/src/screens/OnboardingScreen/OnboardingScreen.tsx`

## `apps/web/src/screens/ProfileScreen` (1)

- `apps/web/src/screens/ProfileScreen/ProfileScreen.tsx`

## `apps/web/src/screens/ProfileScreen/tabs` (3)

- `apps/web/src/screens/ProfileScreen/tabs/ProfileTab.tsx`
- `apps/web/src/screens/ProfileScreen/tabs/SettingsTab.tsx`
- `apps/web/src/screens/ProfileScreen/tabs/WalletTab.tsx`

## `apps/web/src/screens/ProgressionHubScreen` (1)

- `apps/web/src/screens/ProgressionHubScreen/ProgressionHubScreen.tsx`

## `apps/web/src/screens/RegisterScreen` (1)

- `apps/web/src/screens/RegisterScreen/RegisterScreen.tsx`

## `apps/web/src/screens/SelectRoleScreen` (1)

- `apps/web/src/screens/SelectRoleScreen/SelectRoleScreen.tsx`

## `apps/web/src/screens/StreakScreen` (1)

- `apps/web/src/screens/StreakScreen/StreakScreen.tsx`

## `apps/web/src/screens/StrengthLogScreen` (3)

- `apps/web/src/screens/StrengthLogScreen/strengthLogChart.test.ts`
- `apps/web/src/screens/StrengthLogScreen/strengthLogChart.ts`
- `apps/web/src/screens/StrengthLogScreen/StrengthLogScreen.tsx`

## `apps/web/src/screens/TrainerAthleteDetailScreen` (1)

- `apps/web/src/screens/TrainerAthleteDetailScreen/TrainerAthleteDetailScreen.tsx`

## `apps/web/src/screens/TrainerAthletesListScreen` (1)

- `apps/web/src/screens/TrainerAthletesListScreen/TrainerAthletesListScreen.tsx`

## `apps/web/src/screens/TrainerCalendarScreen` (1)

- `apps/web/src/screens/TrainerCalendarScreen/TrainerCalendarScreen.tsx`

## `apps/web/src/screens/TrainerCrmScreen` (3)

- `apps/web/src/screens/TrainerCrmScreen/crmUtils.test.ts`
- `apps/web/src/screens/TrainerCrmScreen/crmUtils.ts`
- `apps/web/src/screens/TrainerCrmScreen/TrainerCrmScreen.tsx`

## `apps/web/src/screens/TrainerExerciseLibraryScreen` (1)

- `apps/web/src/screens/TrainerExerciseLibraryScreen/TrainerExerciseLibraryScreen.tsx`

## `apps/web/src/screens/TrainerGroupDetailScreen` (1)

- `apps/web/src/screens/TrainerGroupDetailScreen/TrainerGroupDetailScreen.tsx`

## `apps/web/src/screens/TrainerGroupsListScreen` (1)

- `apps/web/src/screens/TrainerGroupsListScreen/TrainerGroupsListScreen.tsx`

## `apps/web/src/screens/TrainerLeadsScreen` (1)

- `apps/web/src/screens/TrainerLeadsScreen/TrainerLeadsScreen.tsx`

## `apps/web/src/screens/TrainerOnboardingScreen` (1)

- `apps/web/src/screens/TrainerOnboardingScreen/TrainerOnboardingScreen.tsx`

## `apps/web/src/screens/TrainerPersonalScreen` (1)

- `apps/web/src/screens/TrainerPersonalScreen/TrainerPersonalScreen.tsx`

## `apps/web/src/screens/TrainerPublicProfileScreen` (1)

- `apps/web/src/screens/TrainerPublicProfileScreen/TrainerPublicProfileScreen.tsx`

## `apps/web/src/screens/TrainerTeamScreen` (1)

- `apps/web/src/screens/TrainerTeamScreen/TrainerTeamScreen.tsx`

## `apps/web/src/screens/TrainerTemplatesScreen` (1)

- `apps/web/src/screens/TrainerTemplatesScreen/TrainerTemplatesScreen.tsx`

## `apps/web/src/screens/TrainerTodayScreen` (1)

- `apps/web/src/screens/TrainerTodayScreen/TrainerTodayScreen.tsx`

## `apps/web/src/screens/WorkoutForm` (2)

- `apps/web/src/screens/WorkoutForm/ExerciseDrawer.tsx`
- `apps/web/src/screens/WorkoutForm/WorkoutForm.tsx`

## `apps/web/src/styles` (2)

- `apps/web/src/styles/datepicker.css`
- `apps/web/src/styles/variables.css`

## `apps/web/src/sw` (2)

- `apps/web/src/sw/offline.ts`
- `apps/web/src/sw/push.ts`

## `apps/web/src/types` (8)

- `apps/web/src/types/Analytics.ts`
- `apps/web/src/types/clientPreferences.ts`
- `apps/web/src/types/Exercise.ts`
- `apps/web/src/types/svg.d.ts`
- `apps/web/src/types/SVGMuscleZone.ts`
- `apps/web/src/types/User.ts`
- `apps/web/src/types/Workout.ts`
- `apps/web/src/types/WorkoutResult.ts`

## `apps/web/src/util` (27)

- `apps/web/src/util/analyticsPeriodDays.ts`
- `apps/web/src/util/athleteOnboarding.ts`
- `apps/web/src/util/athletePrimaryGoalWorkoutType.ts`
- `apps/web/src/util/clientPreferencesMigration.ts`
- `apps/web/src/util/computeAnalyticsInsights.test.ts`
- `apps/web/src/util/computeAnalyticsInsights.ts`
- `apps/web/src/util/exercise.ts`
- `apps/web/src/util/getRecomendations.test.ts`
- `apps/web/src/util/getRecomendations.ts`
- `apps/web/src/util/klipyCategoryRu.ts`
- `apps/web/src/util/klipyMessage.ts`
- `apps/web/src/util/klipyRecent.ts`
- `apps/web/src/util/localStorageWorkoutDraft.ts`
- `apps/web/src/util/oauthPlaceholderEmail.ts`
- `apps/web/src/util/parseStoredAuthUser.ts`
- `apps/web/src/util/shouldShowOnboarding.ts`
- `apps/web/src/util/ThemeController.ts`
- `apps/web/src/util/trainerCustomExerciseWithSets.test.ts`
- `apps/web/src/util/trainerCustomExerciseWithSets.ts`
- `apps/web/src/util/trainerOnboarding.test.ts`
- `apps/web/src/util/trainerOnboarding.ts`
- `apps/web/src/util/uiModeCopy.ts`
- `apps/web/src/util/userRole.ts`
- `apps/web/src/util/workoutExerciseConversions.test.ts`
- `apps/web/src/util/workoutExerciseConversions.ts`
- `apps/web/src/util/zoneIntensity.ts`
- `apps/web/src/util/zones.ts`

## `apps/web/src/utils` (14)

- `apps/web/src/utils/apiError.ts`
- `apps/web/src/utils/canonicalCustomExerciseKey.ts`
- `apps/web/src/utils/chatUtils.test.ts`
- `apps/web/src/utils/chatUtils.ts`
- `apps/web/src/utils/date.test.ts`
- `apps/web/src/utils/date.ts`
- `apps/web/src/utils/exerciseIdForDisplay.test.ts`
- `apps/web/src/utils/exerciseIdForDisplay.ts`
- `apps/web/src/utils/photoUrl.test.ts`
- `apps/web/src/utils/photoUrl.ts`
- `apps/web/src/utils/shareCard.ts`
- `apps/web/src/utils/textNormalize.test.ts`
- `apps/web/src/utils/textNormalize.ts`
- `apps/web/src/utils/typeGuards.ts`

## `apps/web/src/vk` (4)

- `apps/web/src/vk/EmbeddedOAuthLaunchGate.tsx`
- `apps/web/src/vk/syncVkMiniAppProfile.ts`
- `apps/web/src/vk/useEmbeddedOAuthLaunch.ts`
- `apps/web/src/vk/vkLaunchParams.ts`

## `apps/web/src/workoutExerciseShared` (1)

- `apps/web/src/workoutExerciseShared/sortableWorkoutExerciseCardStyles.ts`

## `docs` (4)

- `docs/CRM_MVP.md`
- `docs/KILLER_FEATURE_ATHLETE_COPILOT.md`
- `docs/KILLER_FEATURE_TRAINER_COPILOT.md`
- `docs/ONBOARDING_ADAPTIVE_UX.md`

## `docs/audits` (13)

- `docs/audits/VERVEL_AUDIT_CIS_2026.md`
- `docs/audits/VERVEL_AUTH_OAUTH_PROD_CHECKLIST.md`
- `docs/audits/VERVEL_BUSINESS_PROCESS_AUDIT.md`
- `docs/audits/VERVEL_METRICS_SPEC.md`
- `docs/audits/VERVEL_PMF_FOCUS_PLAN.md`
- `docs/audits/VERVEL_PMF_SCOPE.md`
- `docs/audits/VERVEL_PRODUCT_DOCUMENT.md`
- `docs/audits/VERVEL_PRODUCT_FULL_DESCRIPTION.md`
- `docs/audits/VERVEL_REAUDIT_PROGRESS_2026_05_06.md`
- `docs/audits/VERVEL_SOURCE_AUDIT.md`
- `docs/audits/VERVEL_SPRINT_PLAN_AUDIT_7_5.md`
- `docs/audits/VERVEL_UI_SIMPLIFICATION.md`
- `docs/audits/VERVEL_WEB_PERF_BUDGET.md`

## `nginx` (1)

- `nginx/livekit.vervel.ru`

## `scripts` (1)

- `scripts/ai-parse-notes.sh`

## `tests` (1)

- `tests/bootstrap.ts`

