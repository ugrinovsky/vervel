import { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { WorkoutStats } from '@/types/Analytics';
import { TYPE_LABELS, PERIOD_LABELS, DISPLAY, formatVolume } from '@/constants/AnalyticsConstants';

type Period = 'week' | 'month' | 'year';

interface StatsOverviewProps {
  period: Period;
  data: WorkoutStats;
}

const TYPE_COLORS: Record<string, string> = {
  bodybuilding: '#a78bfa',
  crossfit: '#f87171',
  cardio: '#38bdf8',
  mixed: '#fbbf24',
};

const calcAvgIntensity = (data: WorkoutStats): number => {
  if (data.avgIntensity != null) {
    return Math.round(data.avgIntensity * DISPLAY.PERCENT_MULTIPLIER);
  }
  if (!data.timeline?.length) return 0;
  const sum = data.timeline.reduce((acc, item) => {
    const val = typeof item.intensity === 'string' ? parseFloat(item.intensity) : item.intensity || 0;
    return acc + val;
  }, 0);
  return Math.round((sum / data.timeline.length) * DISPLAY.PERCENT_MULTIPLIER);
};

function SparklineTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900/95 border border-white/10 rounded-lg px-2 py-1.5 text-xs shadow-xl">
      <p className="text-white/50">{payload[0]?.payload?.label}</p>
      <p className="text-emerald-400 font-semibold">{formatVolume(payload[0]?.value)}</p>
    </div>
  );
}

export default function StatsOverview({ period, data }: StatsOverviewProps) {
  const avgIntensity = useMemo(() => calcAvgIntensity(data), [data]);

  const sparklineData = useMemo(() => {
    const tl = data.timeline ?? [];
    if (!tl.length) return [];
    return tl.map((t) => ({ label: t.date, volume: t.volume ?? 0 }));
  }, [data.timeline]);

  const volumeTrend = useMemo(() => {
    const withVol = sparklineData.filter((d) => d.volume > 0);
    if (withVol.length < 2) return 0;
    const mid = Math.floor(withVol.length / 2);
    const avgFirst = withVol.slice(0, mid).reduce((s, d) => s + d.volume, 0) / mid;
    const avgSecond = withVol.slice(mid).reduce((s, d) => s + d.volume, 0) / (withVol.length - mid);
    return avgFirst > 0 ? Math.round(((avgSecond - avgFirst) / avgFirst) * 100) : 0;
  }, [sparklineData]);

  const byType = data.byType ?? {};
  const typeTotal = Object.values(byType).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-(--color_text_muted)">За {PERIOD_LABELS[period]}</p>
        <div className="px-3 py-1 text-xs bg-(--color_bg_card) rounded-full text-(--color_text_secondary)">
          {data.workoutsCount} тренировок
        </div>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) text-center">
          <div className="text-2xl font-bold text-white">{data.workoutsCount}</div>
          <div className="text-xs text-(--color_text_muted) mt-0.5">тренировок</div>
        </div>
        <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) text-center">
          <div className="text-2xl font-bold text-amber-400">{formatVolume(data.totalVolume)}</div>
          <div className="text-xs text-(--color_text_muted) mt-0.5">объём</div>
        </div>
        <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) text-center">
          <div className="text-2xl font-bold text-orange-400">{avgIntensity}%</div>
          <div className="text-xs text-(--color_text_muted) mt-0.5">интенсивность</div>
        </div>
      </div>

      {/* Volume sparkline */}
      {sparklineData.length > 1 && (
        <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border)">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide">
              Тренд объёма
            </p>
            {volumeTrend !== 0 && (
              <span className={`text-xs font-semibold ${volumeTrend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {volumeTrend > 0 ? '↑' : '↓'} {Math.abs(volumeTrend)}%
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={60}>
            <AreaChart data={sparklineData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color_primary_light)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color_primary_light)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="volume"
                stroke="var(--color_primary_light)"
                strokeWidth={2}
                fill="url(#volGrad)"
                dot={false}
              />
              <Tooltip content={<SparklineTooltip />} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Type breakdown */}
      {typeTotal > 0 && (
        <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border)">
          <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide mb-3">
            Типы тренировок
          </p>
          <div className="space-y-2">
            {Object.entries(byType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const pct = Math.round((count / typeTotal) * 100);
                const color = TYPE_COLORS[type] ?? 'var(--color_primary_light)';
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-(--color_text_secondary)">
                        {TYPE_LABELS[type] ?? type}
                      </span>
                      <span className="text-xs font-semibold text-white">
                        {count}{' '}
                        <span className="text-(--color_text_muted) font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.8 }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
