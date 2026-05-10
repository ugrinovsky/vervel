/** Должен совпадать с JSON `users.client_preferences` на API. */
export type ClientPreferences = {
  // ─── Onboarding completion ───────────────────────────────────────────────
  athleteOnboardingComplete?: boolean;
  trainerOnboardingComplete?: boolean;

  // ─── Scenario (path chosen in onboarding step 2) ─────────────────────────
  /** Unified athlete scenario — supersedes athleteCoachIntent */
  athleteScenario?: 'solo' | 'with_coach' | 'in_team';
  /** kept for backwards compat — new code reads athleteScenario instead */
  athleteCoachIntent?: 'solo' | 'with_coach';
  /** Primary fitness goal (solo athletes) */
  athletePrimaryGoal?: 'strength' | 'cardio' | 'general' | 'flexibility';
  /** Trainer work style */
  trainerWorkStyle?: 'individual' | 'groups' | 'both';

  // ─── UI ──────────────────────────────────────────────────────────────────
  coachTeamBannerDismissed?: boolean;
  /** Active UI mode set during onboarding step 3 */
  uiMode?: 'starter' | 'pro' | 'unleash';

  // ─── Feature flags (source of truth — batch-set by mode or toggled manually) ──
  featAi?: boolean;
  featAnalytics?: boolean;
  featProgression?: boolean;
  /** @deprecated читайте featAdvancedAnalytics; оставлено для старых записей в БД */
  featPeriodization?: boolean;
  /** Периодизация ATL/CTL/TSB, ACWR и прочие модельные метрики в аналитике */
  featAdvancedAnalytics?: boolean;
  featTeams?: boolean;
  featDialogs?: boolean;
  featLeaderboard?: boolean;
  featStreaks?: boolean;
  featAvatar?: boolean;
  featVideoCalls?: boolean;
  /** Кабинет тренера: раздел шаблонов и AI из шаблонов */
  featTrainerTemplates?: boolean;
  /** Кабинет тренера: каталог упражнений */
  featTrainerLibrary?: boolean;
  /** Кабинет тренера: CRM (пайплайн лидов и аналитика) */
  featTrainerCrm?: boolean;
};
