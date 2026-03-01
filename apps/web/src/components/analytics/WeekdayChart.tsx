import { useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { WorkoutStats } from '@/types/Analytics';

interface Props {
  data: WorkoutStats;
}

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAYS_FULL = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-gray-900/95 border border-white/10 rounded-xl px-3 py-2.5 text-xs shadow-2xl">
      <p className="text-white font-semibold mb-0.5">{d?.fullName}</p>
      <p className="text-white/50">
        Тренировок: <span className="text-white/80">{d?.workouts}</span>
      </p>
      {d?.avgIntensity > 0 && (
        <p className="text-white/50">
          Ср. интенсивность: <span className="text-white/80">{d.avgIntensity}%</span>
        </p>
      )}
    </div>
  );
}

export default function WeekdayChart({ data }: Props) {
  const timeline = data.timeline ?? [];

  const weekdayData = useMemo(() => {
    const counts = Array(7).fill(0);
    const intensities: number[][] = Array.from({ length: 7 }, () => []);

    timeline.forEach((t) => {
      const d = new Date(t.date);
      const jsDay = d.getDay(); // 0=Sun
      const idx = jsDay === 0 ? 6 : jsDay - 1; // Mon=0..Sun=6
      counts[idx]++;
      if (t.intensity) intensities[idx].push(t.intensity * 100);
    });

    const maxCount = Math.max(...counts, 1);

    return DAYS.map((label, i) => ({
      label,
      fullName: DAYS_FULL[i],
      workouts: counts[i],
      avgIntensity: intensities[i].length
        ? Math.round(intensities[i].reduce((a, b) => a + b, 0) / intensities[i].length)
        : 0,
      ratio: counts[i] / maxCount,
    }));
  }, [timeline]);

  const totalWorkouts = weekdayData.reduce((s, d) => s + d.workouts, 0);
  const favIdx = weekdayData.indexOf(
    weekdayData.reduce((m, d) => (d.workouts > m.workouts ? d : m))
  );
  const weekendLoad = weekdayData.slice(5).reduce((s, d) => s + d.workouts, 0);
  const weekdayLoad = weekdayData.slice(0, 5).reduce((s, d) => s + d.workouts, 0);
  const weekendPct = totalWorkouts > 0 ? Math.round((weekendLoad / totalWorkouts) * 100) : 0;

  if (!totalWorkouts) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-(--color_text_muted)">
        Нет данных за период
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) text-center">
          <div className="text-xl font-bold text-amber-400">{DAYS[favIdx]}</div>
          <div className="text-xs text-(--color_text_muted) mt-0.5">любимый день</div>
        </div>
        <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) text-center">
          <div className="text-xl font-bold text-emerald-400">{weekdayLoad}</div>
          <div className="text-xs text-(--color_text_muted) mt-0.5">пн–пт</div>
        </div>
        <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) text-center">
          <div className="text-xl font-bold text-emerald-400">{weekendPct}%</div>
          <div className="text-xs text-(--color_text_muted) mt-0.5">сб–вс</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border)">
        <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide mb-3">
          Тренировки по дням недели
        </p>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={weekdayData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color_text_muted)' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="workouts" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {weekdayData.map((entry, i) => (
                <Cell
                  key={i}
                  fill="var(--color_primary_light)"
                  fillOpacity={i === favIdx ? 1 : i >= 5 ? 0.7 : 0.35 + entry.ratio * 0.55}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-day breakdown */}
      <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border)">
        <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide mb-3">
          Детали по дням
        </p>
        <div className="space-y-2">
          {weekdayData
            .map((d, i) => ({ ...d, i }))
            .filter((d) => d.workouts > 0)
            .sort((a, b) => b.workouts - a.workouts)
            .map((d) => {
              const maxW = Math.max(...weekdayData.map((x) => x.workouts));
              const pct = (d.workouts / maxW) * 100;
              return (
                <div key={d.label} className="flex items-center gap-2">
                  <span className="text-xs text-(--color_text_muted) w-5 shrink-0">{d.label}</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: 'var(--color_primary_light)',
                        opacity: d.i === favIdx ? 1 : 0.6,
                      }}
                    />
                  </div>
                  <span className="text-xs text-white/60 w-4 text-right">{d.workouts}</span>
                  {d.avgIntensity > 0 && (
                    <span className="text-[11px] text-(--color_text_muted) w-10 text-right">
                      {d.avgIntensity}%
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Insight */}
      <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) flex gap-3 items-start">
        <span className="text-xl shrink-0">💡</span>
        <p className="text-xs text-(--color_text_muted) leading-relaxed">
          Чаще всего вы тренируетесь в{' '}
          <span className="text-amber-400 font-semibold">{DAYS_FULL[favIdx]}</span>.{' '}
          {weekendPct > 50
            ? 'Большинство тренировок — на выходных. Попробуйте добавить будни для лучшего восстановления.'
            : weekendPct < 15
              ? 'Вы предпочитаете тренироваться в будни — хорошо для режима и дисциплины.'
              : 'Хорошее сочетание будних дней и выходных.'}
        </p>
      </div>
    </div>
  );
}
