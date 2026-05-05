import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { profileApi } from '@/api/profile';
import type { ClientPreferences } from '@/types/clientPreferences';
import toast from 'react-hot-toast';

type Trigger = 'workout_saved' | 'invite_accepted' | 'group_joined';

type FeatKey = Extract<keyof ClientPreferences, `feat${string}`>;

const FEAT_FLAG_MAP: Record<FeatKey, string> = {
  featAi: 'AI-ассистент',
  featAnalytics: 'Аналитика',
  featProgression: 'Сила и прогрессия',
  featPeriodization: 'Сложная аналитика',
  featAdvancedAnalytics: 'Сложная аналитика',
  featTeams: 'Атлеты и группы',
  featDialogs: 'Диалоги',
  featLeaderboard: 'Лидерборд',
  featStreaks: 'Серии и достижения',
  featAvatar: 'Карта нагрузки',
  featVideoCalls: 'Видеозвонки',
  featTrainerTemplates: 'Шаблоны тренировок',
  featTrainerLibrary: 'Каталог упражнений',
};

/**
 * Проверяет тригер и разблокирует функции через API если условия выполнены.
 * Вызывается после реальных действий — сохранение тренировки, принятие инвайта.
 *
 * Важно: только ДОБАВЛЯЕТ функции, никогда не убирает.
 * Пропускает если все нужные флаги уже true (unleash-пользователи).
 */
export function useFeatureUnlock() {
  const { user, updateUser } = useAuth();

  const unlock = useCallback(
    async (trigger: Trigger) => {
      if (!user) return;

      const prefs = user.clientPreferences ?? {};
      const patch: Partial<ClientPreferences> = {};
      const unlocked: string[] = [];

      // helper — только если флаг не выставлен или явно false
      const tryUnlock = (key: FeatKey) => {
        const alreadyOn =
          key === 'featAdvancedAnalytics'
            ? !!(prefs.featAdvancedAnalytics || prefs.featPeriodization)
            : !!prefs[key];
        if (!alreadyOn) {
          patch[key] = true;
          unlocked.push(FEAT_FLAG_MAP[key]);
        }
      };

      // Early exit: если uiMode = unleash — всё уже включено, незачем патчить
      if (prefs.uiMode === 'unleash') return;

      switch (trigger) {
        case 'invite_accepted':
          // Атлет принял инвайт → разблокировать Команду, Диалоги, Видеозвонки
          tryUnlock('featTeams');
          tryUnlock('featDialogs');
          tryUnlock('featVideoCalls');
          if (prefs.athleteScenario !== 'with_coach' && prefs.athleteScenario !== 'in_team') {
            patch.athleteScenario = 'with_coach';
            patch.athleteCoachIntent = 'with_coach';
          }
          break;

        case 'group_joined':
          // Добавлен в группу → разблокировать Лидерборд дополнительно
          tryUnlock('featTeams');
          tryUnlock('featLeaderboard');
          break;

        case 'workout_saved': {
          // Считаем тренировки через profileApi stats (правильный источник правды)
          // Разблокируем функции постепенно на основе реального количества тренировок
          try {
            const statsRes = await profileApi.getProfile();
            const count = statsRes.data.data.stats.totalWorkouts;

            if (count >= 3) tryUnlock('featAnalytics');
            if (count >= 5) tryUnlock('featProgression');
            if (count >= 10) tryUnlock('featAdvancedAnalytics');
          } catch {
            // Не критично — просто не разблокируем в этот раз
            return;
          }
          break;
        }
      }

      if (Object.keys(patch).length === 0) return;

      try {
        const res = await profileApi.patchClientPreferences(patch);
        updateUser({ ...user, clientPreferences: res.data.data.clientPreferences });

        if (unlocked.length > 0) {
          toast(`✨ Разблокировано: ${unlocked.join(', ')}`, {
            duration: 4000,
            icon: '🎉',
          });
        }
      } catch {
        // Молча — попробуем в следующий раз
      }
    },
    [user, updateUser]
  );

  return { unlock };
}
