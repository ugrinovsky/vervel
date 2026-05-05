import { useAuth } from '@/contexts/AuthContext';
import { profileApi } from '@/api/profile';
import type { ClientPreferences } from '@/types/clientPreferences';

export type FeatureFlags = {
  ai: boolean;
  analytics: boolean;
  progression: boolean;
  /** ATL/CTL/TSB, ACWR и др. модельная нагрузка */
  advancedAnalytics: boolean;
  teams: boolean;
  dialogs: boolean;
  leaderboard: boolean;
  streaks: boolean;
  avatar: boolean;
  videoCalls: boolean;
  /** Кабинет тренера */
  trainerTemplates: boolean;
  trainerLibrary: boolean;
};

/**
 * Возвращает какие функции включены для текущего пользователя.
 *
 * Источник правды — явно выставленные feat* флаги в clientPreferences.
 * Дефолты применяются только для старых аккаунтов (флаги не выставлены).
 * После онбординга все флаги явные — дефолты не используются.
 */
export function useFeatureFlags(): FeatureFlags {
  const { user } = useAuth();
  const p = user?.clientPreferences;

  return {
    ai: p?.featAi ?? true,
    analytics: p?.featAnalytics ?? true,
    progression: p?.featProgression ?? true,
    advancedAnalytics: p?.featAdvancedAnalytics ?? p?.featPeriodization ?? false,
    teams: p?.featTeams ?? true,
    dialogs: p?.featDialogs ?? true,
    leaderboard: p?.featLeaderboard ?? true,
    streaks: p?.featStreaks ?? true,
    avatar: p?.featAvatar ?? true,
    videoCalls: p?.featVideoCalls ?? false,
    trainerTemplates: p?.featTrainerTemplates ?? true,
    trainerLibrary: p?.featTrainerLibrary ?? true,
  };
}

/** Флаги для каждого режима — используется в онбординге и настройках */
export const MODE_FLAGS: Record<
  NonNullable<ClientPreferences['uiMode']>,
  Omit<ClientPreferences, 'uiMode'>
> = {
  starter: {
    featAi: false,
    featAnalytics: false,
    featProgression: false,
    featAdvancedAnalytics: false,
    featTeams: false,
    featDialogs: false,
    featLeaderboard: false,
    featStreaks: true,
    featAvatar: true,
    featVideoCalls: false,
    featTrainerTemplates: true,
    featTrainerLibrary: true,
  },
  pro: {
    featAi: true,
    featAnalytics: true,
    featProgression: true,
    featAdvancedAnalytics: false,
    featTeams: true,
    featDialogs: true,
    featLeaderboard: true,
    featStreaks: true,
    featAvatar: true,
    featVideoCalls: false,
    featTrainerTemplates: true,
    featTrainerLibrary: true,
  },
  unleash: {
    featAi: true,
    featAnalytics: true,
    featProgression: true,
    featAdvancedAnalytics: true,
    featTeams: true,
    featDialogs: true,
    featLeaderboard: true,
    featStreaks: true,
    featAvatar: true,
    featVideoCalls: true,
    featTrainerTemplates: true,
    featTrainerLibrary: true,
  },
};

/**
 * Применяет режим: batch-пишет все feat* флаги + uiMode.
 * Возвращает обновлённые clientPreferences с сервера.
 */
export async function applyUiMode(
  mode: NonNullable<ClientPreferences['uiMode']>
): Promise<ClientPreferences> {
  const res = await profileApi.patchClientPreferences({
    uiMode: mode,
    ...MODE_FLAGS[mode],
  });
  return res.data.data.clientPreferences;
}

/**
 * Устанавливает один feature flag.
 */
export async function setFeatureFlag(
  key: keyof (typeof MODE_FLAGS)['pro'],
  value: boolean
): Promise<ClientPreferences> {
  const res = await profileApi.patchClientPreferences({ [key]: value });
  return res.data.data.clientPreferences;
}
