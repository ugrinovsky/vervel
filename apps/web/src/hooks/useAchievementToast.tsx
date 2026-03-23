import { useEffect, useRef } from 'react';
import toast, { type Toast } from 'react-hot-toast';
import { streakApi, type Achievement } from '@/api/streak';
import { useAuth, useActiveMode } from '@/contexts/AuthContext';

function AchievementToast({ t, achievement }: { t: Toast; achievement: Achievement }) {
  return (
    <div
      className={`flex items-center gap-3 bg-linear-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-xl border border-yellow-400/40 rounded-2xl px-4 py-3 shadow-2xl max-w-xs transition-all duration-300 ${
        t.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
    >
      <span className="text-2xl shrink-0">{achievement.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-yellow-300/80 font-medium uppercase tracking-wide">
          Новое достижение!
        </p>
        <p className="text-sm font-semibold text-white truncate">{achievement.title}</p>
      </div>
      <button
        onClick={() => toast.dismiss(t.id)}
        className="text-white/40 hover:text-white transition-colors shrink-0 text-xl leading-none pb-0.5"
      >
        ×
      </button>
    </div>
  );
}

let lastCheckAt = 0;
const DEBOUNCE_MS = 10_000; // не чаще раза в 10 сек

/** Вызывается после любого действия, которое может разблокировать ачивку */
export async function checkForNewAchievements() {
  const now = Date.now();
  if (now - lastCheckAt < DEBOUNCE_MS) return;
  lastCheckAt = now;

  try {
    // Сначала запускаем проверку на бэкенде (разблокирует накопленные ачивки)
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
      lastCheckAt = 0; // сбрасываем дебаунс при логауте
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
