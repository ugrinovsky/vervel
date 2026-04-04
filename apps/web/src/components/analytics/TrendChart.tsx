import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { WorkoutStats } from '@/types/Analytics';
import { formatVolume } from '@/constants/AnalyticsConstants';

interface Props {
  period: 'week' | 'month' | 'year';
  data: WorkoutStats;
}

const RU_MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function formatDate(iso: string, period: string) {
  const [, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (period === 'year') return RU_MONTHS[m - 1];
  return `${d} ${RU_MONTHS[m - 1]}`;
}


function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const vol = payload.find((p: any) => p.dataKey === 'volume');
  const int = payload.find((p: any) => p.dataKey === 'intensity');
  return (
    <div className="bg-gray-900/95 border border-white/10 rounded-xl px-3 py-2.5 text-xs shadow-2xl">
      <p className="text-white/50 mb-1.5">{label}</p>
      {vol && <p style={{ color: vol.fill ?? 'var(--color_primary_icon)' }}>Объём: {formatVolume(vol.value)}</p>}
      {int && <p style={{ color: int.stroke }}>Интенсивность: {int.value}%</p>}
    </div>
  );
}

export default function TrendChart({ period, data }: Props) {
  const timeline = data.timeline ?? [];

  const chartData = useMemo(() => {
    if (!timeline.length) return [];

    if (period === 'year') {
      // Aggregate by month
      const monthMap: Record<number, { volume: number; intensities: number[]; count: number }> = {};
      timeline.forEach((t) => {
        const m = new Date(t.date).getMonth();
        if (!monthMap[m]) monthMap[m] = { volume: 0, intensities: [], count: 0 };
        monthMap[m].volume += t.volume ?? 0;
        if (t.intensity) monthMap[m].intensities.push(t.intensity * 100);
        monthMap[m].count++;
      });
      return Array.from({ length: 12 }, (_, m) => {
        const bucket = monthMap[m];
        const label = RU_MONTHS[m];
        if (!bucket) return { label, volume: 0, intensity: 0 };
        const avgInt = bucket.intensities.length
          ? Math.round(bucket.intensities.reduce((a, b) => a + b, 0) / bucket.intensities.length)
          : 0;
        return { label, volume: bucket.volume, intensity: avgInt };
      });
    }

    // week / month — show per entry
    return timeline.map((t) => ({
      label: formatDate(t.date, period),
      volume: t.volume ?? 0,
      intensity: Math.round((t.intensity ?? 0) * 100),
    }));
  }, [timeline, period]);

  const maxVol = Math.max(...chartData.map((d) => d.volume), 1);

  // Stats
  const totalVol = chartData.reduce((s, d) => s + d.volume, 0);
  const avgInt = chartData.filter((d) => d.intensity > 0).length
    ? Math.round(
        chartData.filter((d) => d.intensity > 0).reduce((s, d) => s + d.intensity, 0) /
          chartData.filter((d) => d.intensity > 0).length
      )
    : 0;

  const peakVol = chartData.reduce((m, d) => (d.volume > m.volume ? d : m), { label: '—', volume: 0, intensity: 0 });

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-(--color_text_muted)">
        Нет данных за период
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) text-center">
          <div className="text-lg font-bold text-emerald-400">{formatVolume(totalVol)}</div>
          <div className="text-xs text-(--color_text_muted) mt-0.5">суммарный объём</div>
        </div>
        <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) text-center">
          <div className="text-lg font-bold" style={{ color: 'var(--color-rose-400)' }}>{avgInt}%</div>
          <div className="text-xs text-(--color_text_muted) mt-0.5">ср. интенсивность</div>
        </div>
        <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) text-center">
          <div className="text-lg font-bold text-emerald-400">{peakVol.label}</div>
          <div className="text-xs text-(--color_text_muted) mt-0.5">пиковый день</div>
        </div>
      </div>

      {/* Combined chart */}
      <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border)">
        <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide mb-3">
          Объём и интенсивность
        </p>
        <ResponsiveContainer width="100%" height={170}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color_border_light)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--color_text_muted)' }}
              interval={period === 'month' ? 4 : 0}
            />
            <YAxis
              yAxisId="vol"
              tick={{ fontSize: 11, fill: 'var(--color_text_muted)' }}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}т` : `${v}`)}
            />
            <YAxis
              yAxisId="int"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: 'var(--color_text_muted)' }}
              tickFormatter={(v) => `${v}%`}
              width={32}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color_bg_card)' }} />
            <Bar yAxisId="vol" dataKey="volume" radius={[3, 3, 0, 0]} maxBarSize={32}>
              {chartData.map((entry, i) => {
                const ratio = maxVol > 0 ? entry.volume / maxVol : 0;
                return (
                  <Cell
                    key={i}
                    fill="var(--color_primary_icon)"
                    fillOpacity={entry.volume > 0 ? 0.5 + ratio * 0.4 : 0.07}
                  />
                );
              })}
            </Bar>
            <Line
              yAxisId="int"
              type="monotone"
              dataKey="intensity"
              stroke="var(--color-rose-400)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--color_primary_icon)', opacity: 0.6 }} />
            <span className="text-xs text-(--color_text_muted)">Объём</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5" style={{ backgroundColor: 'var(--color-rose-400)' }} />
            <span className="text-xs text-(--color_text_muted)">Интенсивность</span>
          </div>
        </div>
      </div>

      {/* Top days by volume */}
      {totalVol > 0 && (
        <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border)">
          <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide mb-3">
            Топ дней по объёму
          </p>
          <div className="space-y-2">
            {[...chartData]
              .filter((d) => d.volume > 0)
              .sort((a, b) => b.volume - a.volume)
              .slice(0, 4)
              .map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-(--color_text_muted) w-5">{i + 1}.</span>
                  <span className="text-xs text-white/80 w-16 shrink-0">{d.label}</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(d.volume / maxVol) * 100}%`,
                        backgroundColor: 'var(--color_primary_icon)',
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <span className="text-xs w-12 text-right text-emerald-400">{formatVolume(d.volume)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
