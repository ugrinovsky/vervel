import { useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { WorkoutStats } from '@/types/Analytics';
import { normalizeIntensity } from '@/constants/AnalyticsConstants';
import { parseApiDateTime } from '@/utils/date';
import { AnalyticsEmptyState } from './AnalyticsEmptyState';
import { AnalyticsSheetIntro } from './AnalyticsSheetIntro';
import type { RechartsTooltipContentProps } from './rechartsTooltip';

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

type WeekdayBarPayload = {
  fullName?: string;
  workouts?: number;
  avgIntensity?: number;
};

function CustomTooltip({ active, payload }: RechartsTooltipContentProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as WeekdayBarPayload | undefined;
  if (!d) return null;
  const avg = Number(d.avgIntensity ?? 0);
  return (
    <div className="bg-gray-900/95 border border-white/10 rounded-xl px-3 py-2.5 text-xs shadow-2xl">
      <p className="text-white font-semibold mb-0.5">{d.fullName ?? ''}</p>
      <p className="text-white/50">
        Тренировок: <span className="text-white/80">{d.workouts ?? 0}</span>
      </p>
      {avg > 0 && (
        <p className="text-white/50">
          Ср. интенсивность: <span className="text-white/80">{avg}%</span>
        </p>
      )}
    </div>
  );
}

export default function WeekdayChart({ data }: Props) {
  const weekdayData = useMemo(() => {
    const timeline = data.timeline ?? [];
    const counts = Array(7).fill(0);
    const intensities: number[][] = Array.from({ length: 7 }, () => []);

    timeline.forEach((t) => {
      const d = parseApiDateTime(t.date);
      const jsDay = d.getDay(); // 0=Sun
      const idx = jsDay === 0 ? 6 : jsDay - 1; // Mon=0..Sun=6
      counts[idx]++;
      intensities[idx].push(normalizeIntensity(Number(t.intensity) || 0));
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
  }, [data]);

  const totalWorkouts = weekdayData.reduce((s, d) => s + d.workouts, 0);
  const favIdx = weekdayData.indexOf(
    weekdayData.reduce((m, d) => (d.workouts > m.workouts ? d : m))
  );
  const weekendLoad = weekdayData.slice(5).reduce((s, d) => s + d.workouts, 0);
  const weekdayLoad = weekdayData.slice(0, 5).reduce((s, d) => s + d.workouts, 0);
  const weekendPct = totalWorkouts > 0 ? Math.round((weekendLoad / totalWorkouts) * 100) : 0;

  if (!totalWorkouts) {
    return (
      <AnalyticsEmptyState
        hint="Нужны тренировки за месяц или год, чтобы увидеть распределение по дням недели."
        message="Нет данных за период"
      />
    );
  }

  return (
    <div className="space-y-4">
      <AnalyticsSheetIntro>
        Все тренировки за период свёрнуты в семь слотов «пн … вс»: не календарная лента, а ответ на
        вопрос, в какие дни недели вы обычно выходите на тренировку и как делится объём между
        буднями и выходными.
      </AnalyticsSheetIntro>
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-xl font-bold" style={{ color: 'var(--color-yellow-400)' }}>
            {DAYS[favIdx]}
          </div>
          <div className="text-xs text-(--color_text_muted) mt-0.5">любимый день</div>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-xl font-bold" style={{ color: 'var(--color_primary_icon)' }}>
            {weekdayLoad}
          </div>
          <div className="text-xs text-(--color_text_muted) mt-0.5">пн–пт</div>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-xl font-bold" style={{ color: 'var(--color_primary_icon)' }}>
            {weekendPct}%
          </div>
          <div className="text-xs text-(--color_text_muted) mt-0.5">сб–вс</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="glass rounded-xl p-3">
        <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide mb-3">
          Число тренировок по дню недели (за весь период)
        </p>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={weekdayData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color_text_muted)' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color_bg_card)' }} />
            <Bar dataKey="workouts" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {weekdayData.map((entry, i) => (
                <Cell
                  key={i}
                  fill="var(--color_primary_icon)"
                  fillOpacity={i === favIdx ? 1 : i >= 5 ? 0.7 : 0.35 + entry.ratio * 0.55}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-day breakdown */}
      <div className="glass rounded-xl p-3">
        <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide mb-1">
          Детали по дням
        </p>
        <p className="text-[11px] text-(--color_text_muted) leading-snug mb-3">
          Сортировка по числу тренировок. Полоска — насколько этот день недели близок к самому
          частому (не процент от всех тренировок). Колонка «Ср. инт.» — средняя интенсивность
          тренировок в этот день недели; «—» если интенсивность в данных не заполнена.
        </p>
        <div className="flex items-center gap-2 mb-1.5 text-[10px] font-medium uppercase tracking-wide text-(--color_text_muted)">
          <span className="w-5 shrink-0" aria-hidden />
          <span className="flex-1 min-w-0 pl-0.5">Частота</span>
          <span className="w-7 shrink-0 text-right tabular-nums">Трен.</span>
          <span className="w-[3.25rem] shrink-0 text-right">Ср. инт.</span>
        </div>
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
                  <div className="flex-1 min-w-0 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: 'var(--color_primary_icon)',
                        opacity: d.i === favIdx ? 1 : 0.6,
                      }}
                    />
                  </div>
                  <span className="text-xs text-white/60 w-7 shrink-0 text-right tabular-nums">
                    {d.workouts}
                  </span>
                  <span className="text-[11px] text-(--color_text_muted) w-[3.25rem] shrink-0 text-right tabular-nums">
                    {d.avgIntensity > 0 ? `${d.avgIntensity}%` : '—'}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Insight */}
      <div className="glass rounded-xl p-3 flex gap-3 items-start">
        <span className="text-xl shrink-0">💡</span>
        <p className="text-xs text-(--color_text_muted) leading-relaxed">
          Чаще всего вы тренируетесь в{' '}
          <span className="font-semibold" style={{ color: 'var(--color-yellow-400)' }}>
            {DAYS_FULL[favIdx]}
          </span>
          .{' '}
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
