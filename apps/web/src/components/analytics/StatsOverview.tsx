import { useMemo } from 'react';
import { CalendarIcon, ChartBarIcon, FireIcon } from '@heroicons/react/24/outline';
import { WorkoutStats } from '@/types/Analytics';
import { TYPE_LABELS, PERIOD_LABELS, DISPLAY, formatVolume } from '@/constants/AnalyticsConstants';

type Period = 'week' | 'month' | 'year';

interface StatsOverviewProps {
  period: Period;
  data: WorkoutStats;
}

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

export default function StatsOverview({ period, data }: StatsOverviewProps) {
  const avgIntensity = useMemo(() => calcAvgIntensity(data), [data]);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-(--color_text_muted)">За {PERIOD_LABELS[period]}</p>
        <div className="px-3 py-1 text-xs bg-[var(--color_bg_card)] rounded-full text-[var(--color_text_secondary)]">
          {data.workoutsCount} тренировок
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Metric icon={<CalendarIcon className="w-5 h-5 text-emerald-400" />} label="Тренировок" value={data.workoutsCount} sub="за период" />
        <Metric icon={<ChartBarIcon className="w-5 h-5 text-yellow-400" />} label="Общий объем" value={formatVolume(data.totalVolume)} sub="вес × повторения" />
        <Metric icon={<FireIcon className="w-5 h-5 text-orange-400" />} label="Интенсивность" value={`${avgIntensity}%`} sub="средняя" />
      </div>

      {!!Object.keys(data.byType || {}).length && (
        <div className="pt-4 border-t border-[var(--color_border)]">
          <h4 className="text-sm font-medium text-white mb-3">Типы тренировок</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.byType || {}).map(([type, count]) => (
              <div key={type} className="px-3 py-1.5 bg-(--color_bg_card)/50 rounded-lg flex items-center gap-2">
                <span className="text-xs text-[var(--color_text_secondary)]">{TYPE_LABELS[type] || type}</span>
                <span className="text-xs font-bold text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="p-4 bg-[var(--color_bg_card)]/30 rounded-lg hover:bg-[var(--color_bg_card_hover)] transition">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-white/5 rounded-lg shrink-0">{icon}</div>
        <div className="text-3xl font-bold text-white">{value}</div>
      </div>
      <div className="text-sm text-[var(--color_text_secondary)] font-medium">{label}</div>
      <div className="text-xs text-(--color_text_muted) mt-1">{sub}</div>
    </div>
  );
}
