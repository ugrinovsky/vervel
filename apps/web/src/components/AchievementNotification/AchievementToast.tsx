import toast, { type Toast } from 'react-hot-toast';
import Button from '@/components/ui/Button';
import type { Achievement } from '@/api/streak';

export function AchievementToast({ t, achievement }: { t: Toast; achievement: Achievement }) {
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
      <Button
        type="button"
        variant="unstyled"
        onClick={() => toast.dismiss(t.id)}
        className="text-white/40 hover:text-white transition-colors shrink-0 text-xl leading-none pb-0.5 p-0"
        aria-label="Закрыть"
      >
        ×
      </Button>
    </div>
  );
}
