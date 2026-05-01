import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { streakApi } from '@/api/streak';
import { AchievementToast } from '@/components/AchievementNotification/AchievementToast';
import { useAuth, useActiveMode } from '@/contexts/AuthContext';

let lastCheckAt = 0;
const DEBOUNCE_MS = 10_000; // не чаще раза в 10 сек

/** Вызывается после любого действия, которое может разблокировать ачивку */
export async function checkForNewAchievements() {
  const now = Date.now();
  if (now - lastCheckAt < DEBOUNCE_MS) return;
  lastCheckAt = now;

  try {
    await streakApi.checkAndUnlock().catch(() => {});

    const res = await streakApi.getAchievements();
    const unseen = res.data.data.unlocked.filter((a) => !a.isSeen);
    if (!unseen.length) return;

    unseen.forEach((achievement, i) => {
      setTimeout(() => {
        toast.custom((t) => <AchievementToast t={t} achievement={achievement} />, {
          duration: 5000,
        });
      }, i * 900);
    });

    streakApi.markAchievementsSeen(unseen.map((a) => a.id)).catch(() => {});
  } catch {
    // silent
  }
}

/** Монтируется в App — проверяет при старте и при возврате на вкладку */
export function useAchievementToast() {
  const { user } = useAuth();
  const { activeMode } = useActiveMode();
  const initialDone = useRef(false);

  useEffect(() => {
    if (!user || activeMode === 'trainer') {
      initialDone.current = false;
      lastCheckAt = 0;
      return;
    }

    if (!initialDone.current) {
      initialDone.current = true;
      checkForNewAchievements();
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForNewAchievements();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, activeMode]);
}
