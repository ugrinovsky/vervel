import { generateRecommendations } from '@/util/getRecomendations';
import type { Recommendation } from '@/util/getRecomendations';
import { getZoneLabel } from '@/util/zones';
import { WorkoutStats } from '@/types/Analytics';

interface RecommendationsProps {
  stats: WorkoutStats;
}

const TYPE_CONFIG: Record<
  Recommendation['type'],
  { emoji: string; label: string; color: string; bg: string; border: string }
> = {
  warning: {
    emoji: '⚠️',
    label: 'Внимание',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.07)',
    border: 'rgba(248,113,113,0.25)',
  },
  focus: {
    emoji: '🎯',
    label: 'Фокус',
    color: 'var(--color_primary_light)',
    bg: 'rgb(var(--color_primary_light_ch) / 0.07)',
    border: 'rgb(var(--color_primary_light_ch) / 0.25)',
  },
  improvement: {
    emoji: '📈',
    label: 'Прогресс',
    color: 'var(--color_primary_light)',
    bg: 'rgb(var(--color_primary_light_ch) / 0.07)',
    border: 'rgb(var(--color_primary_light_ch) / 0.25)',
  },
  achievement: {
    emoji: '🏆',
    label: 'Достижение',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.07)',
    border: 'rgba(251,191,36,0.25)',
  },
};

const PRIORITY_DOT: Record<Recommendation['priority'], string | null> = {
  high: '#f87171',
  medium: '#fbbf24',
  low: null,
};

export default function Recommendations({ stats }: RecommendationsProps) {
  const recommendations = generateRecommendations(stats);

  const highCount = recommendations.filter((r) => r.priority === 'high').length;
  const warnCount = recommendations.filter((r) => r.type === 'warning').length;

  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="text-4xl">✅</div>
        <p className="text-sm font-semibold text-white">Всё в порядке</p>
        <p className="text-xs text-(--color_text_muted) text-center leading-relaxed">
          Нагрузка сбалансирована, интенсивность в норме.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Сводка */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-(--color_text_muted)">{recommendations.length} советов</span>
        {highCount > 0 && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ color: '#f87171', backgroundColor: 'rgba(248,113,113,0.12)' }}
          >
            {highCount} важных
          </span>
        )}
        {warnCount > 0 && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ color: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.12)' }}
          >
            {warnCount} предупреждений
          </span>
        )}
      </div>

      {/* Карточки */}
      {recommendations.map((rec) => {
        const cfg = TYPE_CONFIG[rec.type];
        const dotColor = PRIORITY_DOT[rec.priority];
        return (
          <div
            key={rec.id}
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: cfg.border, backgroundColor: cfg.bg }}
          >
            {/* Цветная полоска сверху для warning и high */}
            {rec.priority === 'high' && (
              <div className="h-0.5 w-full" style={{ backgroundColor: cfg.color }} />
            )}

            <div className="p-4">
              {/* Заголовок */}
              <div className="flex items-start gap-2.5 mb-2">
                <span className="text-lg leading-none mt-0.5 shrink-0">{cfg.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white leading-tight">{rec.title}</span>
                    {dotColor && (
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                        style={{ backgroundColor: dotColor }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                </div>
              </div>

              {/* Описание */}
              <p className="text-xs text-(--color_text_muted) leading-relaxed mb-2">
                {rec.description}
              </p>

              {/* Мышечные группы */}
              {rec.muscleGroups && rec.muscleGroups.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {rec.muscleGroups.map((m) => (
                    <span
                      key={m}
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {getZoneLabel(m)}
                    </span>
                  ))}
                </div>
              )}

              {/* Время */}
              {rec.estimatedTime && (
                <div className="flex items-center gap-1 text-[10px] text-(--color_text_muted)">
                  <span>⏱</span>
                  <span>{rec.estimatedTime}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
