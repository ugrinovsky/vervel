import { profileApi } from '@/api/profile';
import type { AuthUser } from '@/contexts/auth-types';
import type { ClientPreferences } from '@/types/clientPreferences';

const LEGACY_KEYS = {
  athleteOnboarding: (id: number) => `vervel_athlete_onboarding_v1_${id}`,
  trainerOnboarding: (id: number) => `vervel_trainer_onboarding_v1_${id}`,
  coachIntent: (id: number) => `vervel_athlete_coach_intent_v1_${id}`,
  workStyle: (id: number) => `vervel_trainer_work_style_v1_${id}`,
  coachBanner: (id: number) => `vervel_coach_team_banner_dismissed_v1_${id}`,
} as const;

function clearLegacyLocalKeys(userId: number): void {
  for (const fn of Object.values(LEGACY_KEYS)) {
    try {
      localStorage.removeItem(fn(userId));
    } catch {
      /* ignore */
    }
  }
}

/**
 * Одноразово поднимает старые значения из localStorage в `users.client_preferences` после деплоя API.
 * Также мигрирует athleteCoachIntent → athleteScenario если новое поле ещё не выставлено.
 * @returns `true`, если синхронизация не нужна или прошла успешно (можно не повторять в этой сессии).
 */
export async function migrateLocalOnboardingToServer(
  user: AuthUser,
  updateUser: (u: AuthUser) => void
): Promise<boolean> {
  const prefs = user.clientPreferences ?? {};
  const patch: Partial<ClientPreferences> = {};

  try {
    if (
      localStorage.getItem(LEGACY_KEYS.athleteOnboarding(user.id)) === '1' &&
      prefs.athleteOnboardingComplete !== true
    ) {
      patch.athleteOnboardingComplete = true;
    }
    if (
      localStorage.getItem(LEGACY_KEYS.trainerOnboarding(user.id)) === '1' &&
      prefs.trainerOnboardingComplete !== true
    ) {
      patch.trainerOnboardingComplete = true;
    }
    const ci = localStorage.getItem(LEGACY_KEYS.coachIntent(user.id));
    if ((ci === 'solo' || ci === 'with_coach') && prefs.athleteCoachIntent == null) {
      patch.athleteCoachIntent = ci;
    }
    const ws = localStorage.getItem(LEGACY_KEYS.workStyle(user.id));
    if (
      (ws === 'individual' || ws === 'groups' || ws === 'both') &&
      prefs.trainerWorkStyle == null
    ) {
      patch.trainerWorkStyle = ws;
    }
    if (
      localStorage.getItem(LEGACY_KEYS.coachBanner(user.id)) === '1' &&
      prefs.coachTeamBannerDismissed !== true
    ) {
      patch.coachTeamBannerDismissed = true;
    }
  } catch {
    return false;
  }

  // Migrate athleteCoachIntent → athleteScenario for existing users who already have the old field
  // but haven't gone through the new onboarding yet.
  if (prefs.athleteCoachIntent != null && prefs.athleteScenario == null) {
    patch.athleteScenario = prefs.athleteCoachIntent; // 'solo' | 'with_coach' are valid athleteScenario values
  }

  if (Object.keys(patch).length === 0) return true;

  try {
    const res = await profileApi.patchClientPreferences(patch);
    updateUser({ ...user, clientPreferences: res.data.data.clientPreferences });
    clearLegacyLocalKeys(user.id);
    return true;
  } catch {
    /* офлайн — оставляем локальные ключи */
    return false;
  }
}
