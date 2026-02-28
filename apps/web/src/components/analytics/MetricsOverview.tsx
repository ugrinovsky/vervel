import { useMemo } from 'react';
import { WorkoutStats } from '@/types/Analytics';
import { DISPLAY, METRICS } from '@/constants/AnalyticsConstants';

interface MetricOverviewProps {
  stats: WorkoutStats;
}

// SVG arc gauge: sweeps 240° centered at bottom
function ArcGauge({ pct, color }: { pct: number; color: string }) {
  const r = 20;
  const cx = 26;
  const cy = 28;
  const fullDeg = 240;
  const startDeg = 150; // degrees from East (clockwise)

  function toXY(deg: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const s = toXY(startDeg);
  const e = toXY(startDeg + fullDeg);
  const f = toXY(startDeg + (pct / 100) * fullDeg);
  const largeArcTrack = fullDeg > 180 ? 1 : 0;
  const largeArcFill = (pct / 100) * fullDeg > 180 ? 1 : 0;

  const trackD = `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${largeArcTrack} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  const fillD =
    pct > 0
      ? `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFill} 1 ${f.x.toFixed(2)} ${f.y.toFixed(2)}`
      : '';

  return (
    <svg width="52" height="44" viewBox="0 0 52 44">
      <path d={trackD} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" strokeLinecap="round" />
      {fillD && (
        <path d={fillD} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
      )}
    </svg>
  );
}

function badge(score: number): { label: string; cls: string } {
  if (score >= 85) return { label: 'Отлично', cls: 'text-emerald-400 bg-emerald-400/10' };
  if (score >= 65) return { label: 'Хорошо', cls: 'text-emerald-300 bg-emerald-300/10' };
  if (score >= 45) return { label: 'Норма', cls: 'text-amber-400 bg-amber-400/10' };
  return { label: 'Слабо', cls: 'text-red-400 bg-red-400/10' };
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

export function MetricsOverview({ stats }: MetricOverviewProps) {
  const timeline = stats?.timeline ?? [];
  const zones: Record<string, number> = stats?.zones ?? {};

  const computed = useMemo(() => {
    const avgIntensityRaw = stats?.avgIntensity ?? 0;
    const avgIntensity = Math.round(avgIntensityRaw * DISPLAY.PERCENT_MULTIPLIER);
    const workoutsPerWeek = timeline.length > 0 ? +(timeline.length / METRICS.WEEKS_PER_PERIOD).toFixed(1) : 0;

    // Баланс мышц: пропорциональное отклонение от равномерной нагрузки
    // Работает с любым масштабом значений (кг, проценты, 0-1)
    const zoneValues = Object.values(zones);
    let muscleBalance = 0;
    if (zoneValues.length > 1) {
      const total = zoneValues.reduce((s, v) => s + v, 0);
      if (total > 0) {
        const proportions = zoneValues.map((v) => v / total);
        const ideal = 1 / zoneValues.length;
        const deviation = proportions.reduce((s, p) => s + Math.abs(p - ideal), 0);
        const maxDeviation = 2 * (1 - ideal); // при нагрузке только на 1 мышцу
        muscleBalance = Math.max(0, 1 - deviation / maxDeviation);
      }
    }
    const muscleBalancePercent = Math.round(muscleBalance * DISPLAY.PERCENT_MULTIPLIER);

    const volumeWorkouts = timeline.filter((w) => (w.volume ?? 0) >= METRICS.MIN_VOLUME);
    let weightProgress = 0;
    let weightChange = 0;
    if (volumeWorkouts.length >= METRICS.MIN_WORKOUTS_FOR_PROGRESS) {
      const mid = Math.floor(volumeWorkouts.length / 2);
      const avgFirst = volumeWorkouts.slice(0, mid).reduce((s, w) => s + (w.volume ?? 0), 0) / mid;
      const avgSecond = volumeWorkouts.slice(mid).reduce((s, w) => s + (w.volume ?? 0), 0) / (volumeWorkouts.length - mid);
      if (avgFirst > 0) weightProgress = (avgSecond - avgFirst) / avgFirst;
    }
    if (volumeWorkouts.length >= METRICS.MIN_WORKOUTS_FOR_CHANGES) {
      const pv = volumeWorkouts[volumeWorkouts.length - 2];
      const lv = volumeWorkouts[volumeWorkouts.length - 1];
      if (pv?.volume && lv?.volume && pv.volume > 0) {
        weightChange = Math.round(((lv.volume - pv.volume) / pv.volume) * 100);
      }
    }
    const weightProgressPct = Math.round(weightProgress * 100);

    let intensityChange = 0;
    if (timeline.length > 1) {
      const prev = timeline[timeline.length - 2];
      const last = timeline[timeline.length - 1];
      if (prev?.intensity && last?.intensity) {
        intensityChange = Math.round((last.intensity - prev.intensity) * 100);
      }
    }

    const avgVolPerSession =
      stats.workoutsCount > 0 ? Math.round(stats.totalVolume / stats.workoutsCount) : 0;

    // Scores (0-100) for overall rating
    const intensityScore = Math.min((avgIntensity / 75) * 100, 100);
    const freqScore = Math.min((workoutsPerWeek / 4) * 100, 100);
    const balanceScore = muscleBalancePercent;
    const progressScore = Math.min(Math.max(50 + weightProgress * 50, 0), 100);
    const overallScore = Math.round(
      intensityScore * 0.3 + freqScore * 0.3 + balanceScore * 0.2 + progressScore * 0.2
    );

    return {
      avgIntensity,
      workoutsPerWeek,
      muscleBalancePercent,
      weightProgressPct,
      intensityChange,
      weightChange,
      volumeWorkouts,
      avgVolPerSession,
      intensityScore,
      freqScore,
      balanceScore,
      progressScore,
      overallScore,
    };
  }, [stats, timeline, zones]);

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
      desc: 'Средний процент от максимальной нагрузки за тренировку',
    },
    {
      title: 'Частота',
      icon: '📆',
      value: `${computed.workoutsPerWeek}/нед`,
      score: computed.freqScore,
      color: 'var(--color-emerald-300)',
      delta: null,
      desc: 'Среднее кол-во тренировок в неделю за период',
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
      value:
        computed.volumeWorkouts.length >= METRICS.MIN_WORKOUTS_FOR_DYNAMICS
          ? `${computed.weightProgressPct > 0 ? '+' : ''}${computed.weightProgressPct}%`
          : '—',
      score: computed.progressScore,
      color: 'var(--color-emerald-500)',
      delta: computed.volumeWorkouts.length >= METRICS.MIN_WORKOUTS_FOR_DYNAMICS ? computed.weightChange : null,
      desc: 'Изменение среднего объёма (второй половины периода vs первой)',
    },
    {
      title: 'Объём/тренировку',
      icon: '🏋️',
      value: computed.avgVolPerSession > 0 ? formatVol(computed.avgVolPerSession) : '—',
      score: Math.min((computed.avgVolPerSession / 15000) * 100, 100),
      color: 'var(--color-amber-400)',
      delta: null,
      desc: 'Средний суммарный тоннаж за одну тренировку',
    },
    {
      title: 'Всего тренировок',
      icon: '🎯',
      value: `${stats.workoutsCount}`,
      score: Math.min((stats.workoutsCount / 20) * 100, 100),
      color: 'var(--color-emerald-600)',
      delta: null,
      desc: 'Количество завершённых тренировок за период',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Overall score */}
      <div
        className="rounded-2xl p-4 border border-(--color_border) flex items-center gap-4"
        style={{ backgroundColor: overall.color + '14' }}
      >
        <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
          <svg className="absolute inset-0" width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
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
          <span className="text-lg font-bold" style={{ color: overall.color }}>{overallScore}</span>
        </div>
        <div>
          <div className="text-xs text-(--color_text_muted) uppercase tracking-wide">Общий рейтинг</div>
          <div className="text-xl font-bold text-white mt-0.5">{overall.text}</div>
          <div className="text-xs text-(--color_text_muted) mt-0.5">по 4 ключевым показателям</div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => {
          const b = badge(m.score);
          return (
            <div
              key={m.title}
              className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) flex flex-col gap-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-base">{m.icon}</span>
                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${b.cls}`}>
                  {b.label}
                </span>
              </div>
              <div className="flex items-end gap-2 mt-1">
                <div className="text-xl font-bold text-white">{m.value}</div>
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
                  style={{ width: `${Math.round(m.score)}%`, backgroundColor: m.color, opacity: 0.75 }}
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
