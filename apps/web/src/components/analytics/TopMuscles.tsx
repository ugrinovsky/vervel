import { useState, useMemo } from 'react';
import { FireIcon } from '@heroicons/react/24/outline';
import { WorkoutStats } from '@/types/Analytics';
import {
  DISPLAY,
  aggregateZonesFromTimeline,
  getTrendDirection,
  getLoadLabel,
  type TrendDirection,
} from '@/constants/AnalyticsConstants';
import { getZoneLabel } from '@/util/zones';
import { AnalyticsSheetIntro } from './AnalyticsSheetIntro';

interface TopMusclesProps {
  period: 'week' | 'month' | 'year';
  data: WorkoutStats;
}

interface MuscleData {
  id: string;
  name: string;
  displayName: string;
  percentage: number;
  relativeLoad: string;
  trend: TrendDirection;
  change: number;
}

export default function TopMuscles({ period, data }: TopMusclesProps) {
  const [viewMode, setViewMode] = useState<'percentage' | 'relative'>('percentage');

  const totalZoneKeys = useMemo(() => Object.keys(data?.zones ?? {}).length, [data?.zones]);

  const muscles: MuscleData[] = useMemo(() => {
    const zones = data?.zones || {};
    const timeline = data?.timeline || [];

    // Если нет зон, возвращаем пустой массив
    if (Object.keys(zones).length === 0) {
      return [];
    }

    const mid = Math.floor(timeline.length / 2);
    const firstHalfZones =
      timeline.length >= 2 ? aggregateZonesFromTimeline(timeline.slice(0, mid)) : {};
    const secondHalfZones =
      timeline.length >= 2 ? aggregateZonesFromTimeline(timeline.slice(mid)) : {};

    return Object.entries(zones)
      .map(([zone, value]) => {
        const numValue = Number(value) || 0;
        const percentage = Math.round(numValue * DISPLAY.PERCENT_MULTIPLIER);

        // Тренд: сравнение первой и второй половины периода (та же логика агрегации, что у API), а не «весь период vs одна тренировка»
        const firstHalfPct = Math.round(
          (Number(firstHalfZones[zone]) || 0) * DISPLAY.PERCENT_MULTIPLIER
        );
        const secondHalfPct = Math.round(
          (Number(secondHalfZones[zone]) || 0) * DISPLAY.PERCENT_MULTIPLIER
        );
        const change =
          timeline.length >= 2 ? secondHalfPct - firstHalfPct : 0;
        const trend = getTrendDirection(change);

        // Относительная нагрузка (для отображения вместо объёма)
        const relativeLoad = getLoadLabel(percentage);

        return {
          id: zone,
          name: getZoneLabel(zone),
          displayName: getZoneLabel(zone),
          percentage,
          relativeLoad,
          trend,
          change,
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, DISPLAY.TOP_MUSCLES_COUNT);
  }, [data]);

  const getTrendClass = (trend: MuscleData['trend']): string => {
    switch (trend) {
      case 'up':
        return 'text-emerald-400';
      case 'down':
        return 'text-red-400';
      case 'stable':
        return 'text-yellow-400';
    }
  };

  const getTrendIcon = (trend: MuscleData['trend'], change: number) => {
    if (trend === 'stable') return '→';
    return trend === 'up' ? `↑ ${change}%` : `↓ ${Math.abs(change)}%`;
  };

  // Если нет данных
  if (muscles.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--color_text_muted)]">
        <p>Нет данных о нагрузке на мышцы</p>
        <p className="text-sm mt-2">Добавьте тренировки, чтобы увидеть статистику</p>
      </div>
    );
  }

  return (
    <>
      <AnalyticsSheetIntro>
        Доля нагрузки по зонам за период: после суммирования по тренировкам каждая зона делится на пиковую
        за период (топ = 100%, остальные — доля от этого пика). Стрелка — сдвиг между первой и второй
        половиной периода на той же логике. «Уровень» — текстовая шкала относительно %, не сравнение с
        другими людьми.
      </AnalyticsSheetIntro>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-[var(--color_text_muted)]">
            {period === 'week' ? 'За неделю' : period === 'month' ? 'За месяц' : 'За год'}
          </p>
        </div>

        <div className="flex gap-1 bg-[var(--color_bg_card)] rounded-lg p-1">
          <button
            onClick={() => setViewMode('percentage')}
            className={`px-3 py-1 text-sm rounded-md transition ${
              viewMode === 'percentage'
                ? 'bg-[var(--color_bg_card_hover)] text-white'
                : 'text-[var(--color_text_muted)] hover:text-white'
            }`}
          >
            %
          </button>
          <button
            onClick={() => setViewMode('relative')}
            className={`px-3 py-1 text-sm rounded-md transition ${
              viewMode === 'relative' ? 'bg-[var(--color_bg_card_hover)] text-white' : 'text-[var(--color_text_muted)] hover:text-white'
            }`}
          >
            Уровень
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {muscles.map((muscle, index) => (
          <div key={muscle.id} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <div
                  className={`
                    w-7 h-7 flex items-center justify-center rounded-lg
                    ${
                      index === 0
                        ? 'bg-emerald-600/20 text-emerald-400'
                        : index === 1
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : index === 2
                            ? 'bg-emerald-400/20 text-emerald-300'
                            : 'bg-emerald-300/20 text-emerald-200'
                    }
                  `}
                >
                  {index === 0 && <FireIcon className="w-4 h-4" />}
                  {index > 0 && <span className="text-sm font-bold">{index + 1}</span>}
                </div>

                <div>
                  <div className="font-medium text-white">{muscle.displayName}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={getTrendClass(muscle.trend)}>
                      {getTrendIcon(muscle.trend, muscle.change)}
                    </span>
                    {viewMode === 'relative' && (
                      <span className="text-[var(--color_text_muted)]">{muscle.relativeLoad}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold text-white">
                  {viewMode === 'percentage' ? `${muscle.percentage}%` : muscle.relativeLoad}
                </div>
                <div className="text-xs text-[var(--color_text_muted)]">
                  {viewMode === 'percentage' ? muscle.relativeLoad : `${muscle.percentage}%`}
                </div>
              </div>
            </div>

            <div className="h-2 bg-[var(--color_bg_card)] rounded-full overflow-hidden">
              <div
                className={`
                  h-full rounded-full transition-all duration-500
                  ${
                    index === 0
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                      : index === 1
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                        : index === 2
                          ? 'bg-gradient-to-r from-emerald-300 to-emerald-400'
                          : 'bg-gradient-to-r from-teal-300 to-teal-400'
                  }
                `}
                style={{ width: `${muscle.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-[var(--color_border)]">
        <div className="flex items-center justify-between text-sm">
          <div className="text-[var(--color_text_muted)]">В топе / всего зон:</div>
          <div className="text-white font-medium">
            {muscles.length}
            {totalZoneKeys > 0 ? ` из ${totalZoneKeys}` : ''}
          </div>
        </div>
      </div>
    </>
  );
}
