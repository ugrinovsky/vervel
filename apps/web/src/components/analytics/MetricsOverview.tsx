import { useMemo } from 'react';
import { WorkoutStats } from '@/types/Analytics';
import {
  METRICS,
  ANALYTICS_PERIOD_WEEKS,
  IDEAL_WORKOUTS_PER_WEEK,
  analyticsCalendarDaysApprox,
  computeMuscleBalancePercent,
  metricCardBadge,
  normalizeIntensity,
  referenceVolumePerSessionKg,
} from '@/constants/AnalyticsConstants';
import { AnalyticsSheetIntro } from './AnalyticsSheetIntro';

interface MetricOverviewProps {
  stats: WorkoutStats;
  period: 'week' | 'month' | 'year';
}

function overallLabel(score: number) {
  if (score >= 90) return { text: 'Элитный', color: 'var(--color_primary_icon)' };
  if (score >= 75) return { text: 'Отличный', color: 'var(--color_primary_light)' };
  if (score >= 55) return { text: 'Хороший', color: 'var(--color-emerald-300)' };
  if (score >= 35) return { text: 'Средний', color: 'var(--color-amber-400)' };
  return { text: 'Начальный', color: '#f87171' };
}

function formatVol(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}т`;
  return `${Math.round(v)} кг`;
}

export function MetricsOverview({ stats, period }: MetricOverviewProps) {
  const timeline = stats?.timeline ?? [];
  const zones: Record<string, number> = stats?.zones ?? {};

  const computed = useMemo(() => {
    const avgIntensity = Math.round(normalizeIntensity(Number(stats?.avgIntensity) || 0));
    const weeks = ANALYTICS_PERIOD_WEEKS[period];
    const workoutsPerWeek =
      weeks > 0 && stats.workoutsCount > 0 ? +(stats.workoutsCount / weeks).toFixed(1) : 0;

    const muscleBalancePercent = computeMuscleBalancePercent(zones);

    /** Уникальные календарные дни с тренировкой (ключ YYYY-MM-DD из таймлайна) */
    const activeDayKeys = new Set<string>();
    for (const t of timeline) {
      const key = typeof t.date === 'string' ? t.date.slice(0, 10) : '';
      if (key.length === 10) activeDayKeys.add(key);
    }
    const activeDays = activeDayKeys.size;
    const approxDaysInWindow = analyticsCalendarDaysApprox(period);
    const activeDaysScore = Math.min(100, Math.round((activeDays / approxDaysInWindow) * 100));

    const volumeProgressWorkouts = timeline.filter(
      (w) => (w.volume ?? 0) >= METRICS.MIN_VOLUME_FOR_VOLUME_PROGRESS
    );
    let weightProgress = 0;
    let weightChange = 0;
    const canComputeVolumeProgress =
      volumeProgressWorkouts.length >= METRICS.MIN_WORKOUTS_FOR_VOLUME_PROGRESS;
    if (canComputeVolumeProgress) {
      const mid = Math.floor(volumeProgressWorkouts.length / 2);
      const avgFirst =
        volumeProgressWorkouts.slice(0, mid).reduce((s, w) => s + (w.volume ?? 0), 0) / mid;
      const rest = volumeProgressWorkouts.length - mid;
      const avgSecond =
        volumeProgressWorkouts.slice(mid).reduce((s, w) => s + (w.volume ?? 0), 0) / rest;
      if (avgFirst > 0) weightProgress = (avgSecond - avgFirst) / avgFirst;
    }
    /** Сессии с ненулевым объёмом по хронологии API (старые → новые) */
    const volChrono = timeline.filter((w) => (w.volume ?? 0) > 0);
    if (volChrono.length >= METRICS.MIN_WORKOUTS_FOR_CHANGES) {
      const pv = volChrono[volChrono.length - 2];
      const lv = volChrono[volChrono.length - 1];
      const pvVol = pv?.volume ?? 0;
      const lvVol = lv?.volume ?? 0;
      if (pvVol > 0) {
        weightChange = Math.round(((lvVol - pvVol) / pvVol) * 100);
      }
    }
    const weightProgressPct = Math.round(weightProgress * 100);

    let intensityChange = 0;
    if (timeline.length >= 2) {
      const prev = timeline[timeline.length - 2];
      const last = timeline[timeline.length - 1];
      const iPrev = normalizeIntensity(Number(prev?.intensity) || 0);
      const iLast = normalizeIntensity(Number(last?.intensity) || 0);
      intensityChange = Math.round(iLast - iPrev);
    }

    const avgVolPerSession =
      stats.workoutsCount > 0 ? Math.round(stats.totalVolume / stats.workoutsCount) : 0;
    const refVolPerSession = referenceVolumePerSessionKg(period);
    const volPerSessionScore =
      refVolPerSession > 0 && avgVolPerSession > 0
        ? Math.min(100, Math.round((avgVolPerSession / refVolPerSession) * 100))
        : 0;

    // Баллы 0–100 для общего рейтинга (четыре осмысленные оси)
    const intensityScore = Math.min((avgIntensity / 75) * 100, 100);
    const freqScore = Math.min((workoutsPerWeek / IDEAL_WORKOUTS_PER_WEEK) * 100, 100);
    const balanceScore = muscleBalancePercent;
    /** Для карточки и бейджа; null — нет данных, бейдж «—», полоска 0 */
    const progressScore = canComputeVolumeProgress
      ? Math.min(Math.max(50 + weightProgress * 50, 0), 100)
      : null;
    /** В общий рейтинг при отсутствии тренда объёма — нейтральные 50%, чтобы не занижать оценку */
    const progressScoreForOverall = progressScore ?? 50;
    const overallScore = Math.round(
      intensityScore * 0.3 +
        freqScore * 0.3 +
        balanceScore * 0.2 +
        progressScoreForOverall * 0.2
    );

    return {
      avgIntensity,
      workoutsPerWeek,
      muscleBalancePercent,
      weightProgressPct,
      intensityChange,
      weightChange,
      volumeProgressWorkouts,
      canComputeVolumeProgress,
      avgVolPerSession,
      activeDays,
      activeDaysScore,
      approxDaysInWindow,
      volPerSessionScore,
      refVolPerSession,
      intensityScore,
      freqScore,
      balanceScore,
      progressScore,
      overallScore,
      showWeightVolumeDelta: volChrono.length >= METRICS.MIN_WORKOUTS_FOR_CHANGES,
    };
  }, [stats, timeline, zones, period]);

  const { overallScore } = computed;
  const overall = overallLabel(overallScore);

  const metrics = [
    {
      title: 'Интенсивность',
      icon: '🔥',
      value: `${computed.avgIntensity}%`,
      score: computed.intensityScore,
      color: 'var(--color_primary_light)',
      delta: computed.intensityChange,
      desc: 'Средняя интенсивность по всем тренировкам периода (оценка приложения, 0–100%). Стрелка — разница в п.п. между двумя последними сессиями в списке.',
    },
    {
      title: 'Частота',
      icon: '📆',
      value:
        stats.workoutsCount > 0
          ? `${computed.workoutsPerWeek}/нед · ${stats.workoutsCount} всего`
          : `${computed.workoutsPerWeek}/нед`,
      score: computed.freqScore,
      color: 'var(--color-emerald-300)',
      delta: null,
      desc: `Среднее число тренировок в неделю за окно аналитики; второе число — всего сессий за период. Ориентир — около ${IDEAL_WORKOUTS_PER_WEEK}×/нед.`,
    },
    {
      title: 'Баланс мышц',
      icon: '⚖️',
      value: `${computed.muscleBalancePercent}%`,
      score: computed.balanceScore,
      color: 'var(--color_primary_icon)',
      delta: null,
      desc: 'Равномерность распределения нагрузки по мышечным группам',
    },
    {
      title: 'Прогресс объёма',
      icon: '📈',
      value: computed.canComputeVolumeProgress
        ? `${computed.weightProgressPct > 0 ? '+' : ''}${computed.weightProgressPct}%`
        : '—',
      score: computed.progressScore,
      color: 'var(--color-emerald-500)',
      delta: computed.showWeightVolumeDelta ? computed.weightChange : null,
      desc:
        'Сравнение среднего тоннажа за период: вторая половина тренировок с ненулевым объёмом (по датам) против первой. Нужно минимум две такие сессии.',
    },
    {
      title: 'Объём/тренировку',
      icon: '🏋️',
      value: computed.avgVolPerSession > 0 ? formatVol(computed.avgVolPerSession) : '—',
      score: computed.volPerSessionScore,
      color: 'var(--color-amber-400)',
      delta: null,
      desc: `Средний тоннаж за тренировку за период. Полоска — относительно ориентира ~${formatVol(Math.round(computed.refVolPerSession))}/трен. при ~${IDEAL_WORKOUTS_PER_WEEK}×/нед (как на радаре объёма).`,
    },
    {
      title: 'Дней с тренировкой',
      icon: '📍',
      value: stats.workoutsCount > 0 ? `${computed.activeDays}` : '—',
      score: computed.activeDaysScore,
      color: 'var(--color-emerald-600)',
      delta: null,
      desc: `Сколько разных календарных дней в периоде попала хотя бы одна тренировка (макс. около ${computed.approxDaysInWindow} дн. в выбранном окне). Не путать с числом тренировок.`,
    },
  ];

  return (
    <div className="space-y-4">
      <AnalyticsSheetIntro>
        Карточки ниже — производные от ваших тренировок за период. «Общий рейтинг» — внутренняя сводка из
        частоты, интенсивности, баланса зон и динамики объёма; это не оценка здоровья. Точные веса и прогресс
        по упражнениям — в разделе «Сила и прогресс».
      </AnalyticsSheetIntro>
      {/* Overall score */}
      <div
        className="rounded-2xl p-4 border border-(--color_border) flex items-center gap-4"
        style={{ backgroundColor: overall.color + '14' }}
      >
        <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
          <svg className="absolute inset-0" width="56" height="56" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" className="stroke-white/6" strokeWidth="6" />
            <circle
              cx="32" cy="32" r="26"
              fill="none"
              stroke={overall.color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(overallScore / 100) * 163.4} 163.4`}
              strokeDashoffset="40.8"
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          </svg>
          <span className="text-base font-bold" style={{ color: overall.color }}>{overallScore}</span>
        </div>
        <div>
          <div className="text-xs text-(--color_text_muted) uppercase tracking-wide">Общий рейтинг</div>
          <div className="text-lg font-bold text-white mt-0.5">{overall.text}</div>
          <div className="text-xs text-(--color_text_muted) mt-0.5">
            частота, интенсивность, баланс зон, динамика объёма
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => {
          const b = metricCardBadge(m.score);
          return (
            <div
              key={m.title}
              className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) flex flex-col gap-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">{m.icon}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${b.cls}`}>
                  {b.label}
                </span>
              </div>
              <div className="flex items-end gap-2 mt-1">
                <div className="text-lg font-bold text-white leading-tight">{m.value}</div>
                {m.delta !== null && Math.abs(m.delta) > 0 && (
                  <span
                    className={`text-xs font-semibold mb-0.5 ${m.delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {m.delta > 0 ? '↑' : '↓'}{Math.abs(m.delta)}%
                  </span>
                )}
              </div>
              <div className="text-[11px] text-(--color_text_muted) leading-tight">{m.title}</div>
              {/* Progress bar */}
              <div className="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.round(typeof m.score === 'number' ? m.score : 0)}%`,
                    backgroundColor: m.color,
                    opacity: 0.75,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Metric descriptions */}
      <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) space-y-2">
        <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide">О показателях</p>
        {metrics.map((m) => (
          <div key={m.title} className="flex gap-2">
            <span className="text-sm shrink-0">{m.icon}</span>
            <p className="text-xs text-(--color_text_muted) leading-relaxed">
              <span className="text-white/70 font-medium">{m.title}: </span>
              {m.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
