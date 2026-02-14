import { useMemo, useState } from 'react';
import {
  CalendarIcon,
  ChartBarIcon,
  FireIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { WorkoutStats } from '@/types/Analytics';
import {
  ZONE_LABELS,
  TYPE_LABELS,
  PERIOD_LABELS,
  DISPLAY,
  normalizeZones,
  formatVolume,
} from '@/constants/AnalyticsConstants';

type Period = 'week' | 'month' | 'year';

interface TimelineItem {
  date: string;
  intensity: number | string;
  volume: number;
  type: string;
}

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
    const val =
      typeof item.intensity === 'string' ? parseFloat(item.intensity) : item.intensity || 0;

    return acc + val;
  }, 0);

  return Math.round((sum / data.timeline.length) * DISPLAY.PERCENT_MULTIPLIER);
};

export default function StatsOverview({ period, data }: StatsOverviewProps) {
  const [showAllZones, setShowAllZones] = useState(false);

  const avgIntensity = useMemo(() => calcAvgIntensity(data), [data]);

  const zonesStats = useMemo(() => {
    const normalized = normalizeZones(data.zones || {});

    const sorted = Object.entries(normalized)
      .map(([zone, value]) => [ZONE_LABELS[zone] || zone, value] as [string, number])
      .sort(([, a], [, b]) => b - a);

    const mostLoaded = sorted[0] ?? ['Нет данных', 0];

    return { sorted, mostLoaded };
  }, [data.zones]);

  const zonesToShow = showAllZones ? zonesStats.sorted : zonesStats.sorted.slice(0, DISPLAY.DEFAULT_ZONES_TO_SHOW);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-[var(--color_text_muted)]">За {PERIOD_LABELS[period]}</p>
        </div>
        <div className="px-3 py-1 text-xs bg-[var(--color_bg_card)] rounded-full text-[var(--color_text_secondary)]">
          {data.workoutsCount} тренировок
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Metric
          icon={<CalendarIcon className="w-5 h-5 text-blue-400" />}
          label="Тренировок"
          value={data.workoutsCount}
          sub="за период"
        />

        <Metric
          icon={<ChartBarIcon className="w-5 h-5 text-yellow-400" />}
          label="Общий объем"
          value={formatVolume(data.totalVolume)}
          sub="вес × повторения"
        />

        <Metric
          icon={<FireIcon className="w-5 h-5 text-red-400" />}
          label="Интенсивность"
          value={`${avgIntensity}%`}
          sub="средняя"
        />
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-white flex items-center gap-2">
            <ArrowUpIcon className="w-4 h-4" />
            Нагрузка по зонам
          </h4>

          {zonesStats.sorted.length > 3 && (
            <button
              onClick={() => setShowAllZones((v) => !v)}
              className="text-xs text-blue-400 flex items-center gap-1"
            >
              {showAllZones ? 'Скрыть' : `Все (${zonesStats.sorted.length})`}
              {showAllZones ? (
                <ChevronUpIcon className="w-3 h-3" />
              ) : (
                <ChevronDownIcon className="w-3 h-3" />
              )}
            </button>
          )}
        </div>

        {zonesToShow.map(([zone, value]) => {
          const percent = Math.round(value * DISPLAY.PERCENT_MULTIPLIER);
          const isTop = zone === zonesStats.mostLoaded[0];

          return <ZoneBar key={zone} zone={zone} percent={percent} isTop={isTop} />;
        })}

        {!zonesStats.sorted.length && (
          <div className="text-center py-4 text-[var(--color_text_muted)] text-sm">Нет данных по зонам нагрузки</div>
        )}
      </div>

      {!!Object.keys(data.byType || {}).length && (
        <div className="pt-4 border-t border-[var(--color_border)]">
          <h4 className="text-sm font-medium text-white mb-3">Типы тренировок</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.byType || {}).map(([type, count]) => (
              <div
                key={type}
                className="px-3 py-1.5 bg-[var(--color_bg_card)]/50 rounded-lg flex items-center gap-2"
              >
                <span className="text-xs text-[var(--color_text_secondary)]">{TYPE_LABELS[type] || type}</span>
                <span className="text-xs font-bold text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-[var(--color_border)]">
        <div className="text-sm text-[var(--color_text_muted)] mb-2">Самая нагруженная зона:</div>
        <div className="flex items-center gap-3 p-3 bg-[var(--color_bg_card)]/30 rounded-lg">
          <div className="w-10 h-10 flex items-center justify-center bg-red-500/20 rounded-lg">
            <FireIcon className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-white">{zonesStats.mostLoaded[0]}</div>
            <div className="text-xs text-[var(--color_text_muted)]">
              Нагрузка {Math.round(zonesStats.mostLoaded[1] * DISPLAY.PERCENT_MULTIPLIER)}%
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub: string;
}) {
  return (
    <div className="p-4 bg-[var(--color_bg_card)]/30 rounded-lg">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-white/10 rounded-lg">{icon}</div>
        <div className="text-sm text-[var(--color_text_muted)]">{label}</div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-[var(--color_text_muted)] mt-1">{sub}</div>
    </div>
  );
}

function ZoneBar({ zone, percent, isTop }: { zone: string; percent: number; isTop: boolean }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className={isTop ? 'text-white font-medium' : 'text-[var(--color_text_secondary)]'}>{zone}</span>
        <span className="text-sm text-[var(--color_text_muted)]">{percent}%</span>
      </div>
      <div className="h-2 bg-[var(--color_bg_card)] rounded-full overflow-hidden">
        <div
          className={`h-full ${
            isTop
              ? 'bg-gradient-to-r from-red-500 to-yellow-500'
              : 'bg-gradient-to-r from-blue-500 to-cyan-400'
          }`}
          style={{ width: `${Math.min(percent, DISPLAY.PERCENT_MULTIPLIER)}%` }}
        />
      </div>
    </div>
  );
}
