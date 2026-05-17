import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { trainerApi, type CopilotAthletePriority } from '@/api/trainer';
import Button from '@/components/ui/Button';
import CopilotPanel from './CopilotPanel';

function fatigueLabel(tsb: number): string {
  if (tsb < -20) return 'критически устал';
  if (tsb < -10) return 'сильно устал';
  if (tsb < 0) return 'немного устал';
  if (tsb > 15) return 'свежий, готов';
  if (tsb > 5) return 'в хорошей форме';
  return 'в норме';
}

const PHASE_EMOJI: Record<string, string> = {
  overload: '⚠️',
  accumulation: '📈',
  intensification: '🔥',
  peak: '🏆',
  deload: '🔄',
};

const URGENCY_CONFIG = {
  high: { dot: 'bg-red-400', badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
  medium: { dot: 'bg-yellow-400', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  low: { dot: 'bg-white/20', badge: 'bg-white/10 text-white/50 border-white/10' },
};

const LABEL_TEXT: Record<string, string> = {
  overload: '⚠️ Перегрузка',
  deload: '🔄 Затянулся отдых',
  inactive: '😴 Долго не тренировался',
  no_plan: '📋 Нет плана',
  ok: '✅ Всё в порядке',
};

function AthleteRow({
  athlete,
  isOpen,
  onToggle,
  onCommitted,
}: {
  athlete: CopilotAthletePriority;
  isOpen: boolean;
  onToggle: () => void;
  onCommitted: () => void;
}) {
  const { dot, badge } = URGENCY_CONFIG[athlete.urgency];

  return (
    <motion.div className="glass rounded-2xl overflow-hidden">
      <Button
        type="button"
        variant="unstyled"
        fullWidth
        onClick={onToggle}
        className="flex items-center gap-3 p-4 text-left hover:bg-(--color_bg_card_hover) transition-colors"
      >
        {/* Dot indicator */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />

        {/* Name + label */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {athlete.fullName ?? `Атлет #${athlete.athleteId}`}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${badge}`}>
              {LABEL_TEXT[athlete.label] ?? athlete.label}
            </span>
            {athlete.daysSinceLastWorkout < 99 && (
              <span className="text-xs text-(--color_text_muted)">
                {athlete.daysSinceLastWorkout === 0
                  ? 'тренировался сегодня'
                  : `${athlete.daysSinceLastWorkout} дн. без тренировки`}
              </span>
            )}
          </div>
        </div>

        {/* Усталость */}
        <div className="text-right shrink-0">
          <div className="text-sm font-bold text-white">{PHASE_EMOJI[athlete.phase] ?? ''}</div>
          <div className="text-xs text-(--color_text_muted)">{fatigueLabel(athlete.tsb)}</div>
        </div>

        {/* Chevron */}
        <ChevronDownIcon
          className={`w-4 h-4 text-white/40 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </Button>

      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
      >
        <div className="p-4 pt-0 bg-(--color_bg_card) border-t border-(--color_border)">
          <CopilotPanel athleteId={athlete.athleteId} onCommitted={onCommitted} />
        </div>
      </motion.div>
    </motion.div>
  );
}

interface Props {
  onAnyCommitted?: () => void;
}

export default function CopilotAthleteList({ onAnyCommitted }: Props) {
  const [data, setData] = useState<{
    needsAttention: CopilotAthletePriority[];
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = async () => {
    try {
      const res = await trainerApi.copilotPriorityList();
      setData(res.data.data);
    } catch {
      // тихо — не критично
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCommitted = () => {
    load();
    onAnyCommitted?.();
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <p className="text-sm text-(--color_text_muted) text-center py-4">
        Нет атлетов — добавьте первого в разделе «Атлеты»
      </p>
    );
  }

  if (data.needsAttention.length === 0) {
    return (
      <p className="text-sm text-(--color_text_muted) text-center py-4">
        Все атлеты на этой неделе охвачены ✓
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {data.needsAttention.map((athlete) => (
        <AthleteRow
          key={athlete.athleteId}
          athlete={athlete}
          isOpen={openId === athlete.athleteId}
          onToggle={() => setOpenId(openId === athlete.athleteId ? null : athlete.athleteId)}
          onCommitted={handleCommitted}
        />
      ))}
    </div>
  );
}
