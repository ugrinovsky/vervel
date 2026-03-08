import { WorkoutStats } from '@/types/Analytics';
import { useMemo } from 'react';
import { WORKOUT_TYPE_CONFIG } from '@/constants/AnalyticsConstants';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface WeeklyOverviewProps {
  period: 'week' | 'month' | 'year';
  data: WorkoutStats;
}

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

const TYPE_COLORS: Record<string, string> = {
  bodybuilding: '#a78bfa',
  crossfit: '#f87171',
  cardio: '#38bdf8',
  mixed: '#fbbf24',
};


function formatVolume(v?: number) {
  if (!v || v === 0) return '—';
  if (v >= 1000) return `${(v / 1000).toFixed(1)}т`;
  return `${Math.round(v)} кг`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-gray-900/95 border border-white/10 rounded-xl px-3 py-2.5 text-xs shadow-2xl">
      <p className="text-white font-semibold mb-1">{label}</p>
      {d?.type && <p className="text-white/50 mb-1">{WORKOUT_TYPE_CONFIG[d.type] ?? d.type}</p>}
      <p style={{ color: payload[0].fill }}>Интенсивность: {d?.intensity ?? 0}%</p>
      {d?.volume > 0 && <p className="text-white/60">Объём: {formatVolume(d.volume)}</p>}
    </div>
  );
}

export default function WeeklyOverview({ period, data }: WeeklyOverviewProps) {
  const timeline = data?.timeline ?? [];

  const chartData = useMemo(() => {
    if (period === 'week') {
      const last7 = timeline.slice(-7);
      return WEEK_DAYS.map((label, idx) => {
        const entry = last7[idx];
        return {
          label,
          intensity: entry ? Math.round((entry.intensity ?? 0) * 100) : 0,
          volume: entry?.volume ?? 0,
          type: entry?.type ?? '',
        };
      });
    }

    if (period === 'month') {
      const dayMap: Record<number, { intensity: number; volume: number; type: string }> = {};
      timeline.forEach((t) => {
        const d = new Date(t.date).getDate();
        dayMap[d] = {
          intensity: Math.round((t.intensity ?? 0) * 100),
          volume: t.volume ?? 0,
          type: t.type ?? '',
        };
      });
      const maxDay = timeline.length ? Math.max(...timeline.map((t) => new Date(t.date).getDate())) : 30;
      return Array.from({ length: maxDay }, (_, i) => ({
        label: `${i + 1}`,
        intensity: dayMap[i + 1]?.intensity ?? 0,
        volume: dayMap[i + 1]?.volume ?? 0,
        type: dayMap[i + 1]?.type ?? '',
      }));
    }

    // year — aggregate by month, show avg intensity + sum volume
    const monthMap: Record<number, { intensities: number[]; volume: number; type: string }> = {};
    timeline.forEach((t) => {
      const m = new Date(t.date).getMonth();
      if (!monthMap[m]) monthMap[m] = { intensities: [], volume: 0, type: '' };
      monthMap[m].intensities.push((t.intensity ?? 0) * 100);
      monthMap[m].volume += t.volume ?? 0;
      monthMap[m].type = t.type ?? '';
    });
    return MONTH_NAMES.map((label, m) => {
      const bucket = monthMap[m];
      const intensities = bucket?.intensities ?? [];
      return {
        label,
        intensity: intensities.length
          ? Math.round(intensities.reduce((a, b) => a + b, 0) / intensities.length)
          : 0,
        volume: bucket?.volume ?? 0,
        type: bucket?.type ?? '',
        workouts: intensities.length,
      };
    });
  }, [timeline, period]);

  const summaryStats = useMemo(() => {
    const active = chartData.filter((d) => d.intensity > 0);
    const avg = active.length
      ? Math.round(active.reduce((s, d) => s + d.intensity, 0) / active.length)
      : 0;
    const maxDay = active.reduce((m, d) => (d.intensity > m.intensity ? d : m), { label: '—', intensity: 0 });
    const totalVol = chartData.reduce((s, d) => s + d.volume, 0);
    return { activeDays: active.length, avg, peakDay: maxDay.label, totalVol };
  }, [chartData]);

  const periodTotals = [
    { label: 'Активных', value: `${summaryStats.activeDays}`, sub: period === 'year' ? 'мес' : 'дн' },
    { label: 'Ср. интенс.', value: `${summaryStats.avg}%`, sub: 'в активные дни' },
    { label: 'Пик', value: summaryStats.peakDay, sub: 'самый нагруженный' },
    { label: 'Объём', value: formatVolume(summaryStats.totalVol), sub: 'всего за период' },
  ];

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-4 gap-2">
        {periodTotals.map((s) => (
          <div key={s.label} className="bg-(--color_bg_card) rounded-xl p-2.5 text-center border border-(--color_border)">
            <div className="text-base font-bold text-white">{s.value}</div>
            <div className="text-[11px] text-(--color_text_muted) leading-tight mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border)">
        <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide mb-3">
          Интенсивность по {period === 'week' ? 'дням' : period === 'month' ? 'числам' : 'месяцам'}
        </p>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--color_text_muted)' }}
              interval={period === 'month' ? 4 : 0}
            />
            <YAxis tick={{ fontSize: 11, fill: 'var(--color_text_muted)' }} domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar dataKey="intensity" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.intensity === 0
                      ? 'rgba(255,255,255,0.06)'
                      : (TYPE_COLORS[entry.type] ?? '#10b981')
                  }
                  fillOpacity={entry.intensity > 0 ? 0.85 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        {Object.keys(data.byType ?? {}).length > 0 && (
          <div className="flex flex-wrap gap-3 mt-2">
            {Object.keys(data.byType ?? {}).map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[type] ?? '#10b981' }}
                />
                <span className="text-xs text-(--color_text_muted)">{WORKOUT_TYPE_CONFIG[type] ?? type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Volume bars — if available */}
      {summaryStats.totalVol > 0 && (
        <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border)">
          <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide mb-3">
            Объём ({formatVolume(summaryStats.totalVol)} всего)
          </p>
          <div className="space-y-1.5">
            {chartData
              .filter((d) => d.volume > 0)
              .sort((a, b) => b.volume - a.volume)
              .slice(0, 5)
              .map((d) => {
                const maxVol = Math.max(...chartData.map((x) => x.volume));
                const pct = maxVol > 0 ? (d.volume / maxVol) * 100 : 0;
                return (
                  <div key={d.label} className="flex items-center gap-2">
                    <span className="text-xs text-(--color_text_muted) w-8 shrink-0">{d.label}</span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: TYPE_COLORS[d.type] ?? '#10b981',
                          opacity: 0.7,
                        }}
                      />
                    </div>
                    <span className="text-xs text-white/60 w-10 text-right">{formatVolume(d.volume)}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
