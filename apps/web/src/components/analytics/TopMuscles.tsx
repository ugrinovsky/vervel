import { useState, useMemo } from 'react';
import { FireIcon } from '@heroicons/react/24/outline';
import { WorkoutStats } from '@/types/Analytics';

interface TopMusclesProps {
  period: 'week' | 'month' | 'year';
  data: WorkoutStats;
}

interface MuscleData {
  id: string;
  name: string;
  displayName: string;
  percentage: number;
  volume: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

const ZONE_LABELS: Record<string, string> = {
  chests: 'Грудь',
  backMuscles: 'Спина',
  legMuscles: 'Ноги',
  shoulders: 'Плечи',
  biceps: 'Бицепсы',
  triceps: 'Трицепс',
  forearms: 'Предплечья',
  glutes: 'Ягодицы',
  trapezoids: 'Трапеции',
  calfMuscles: 'Икры',
  abdominalPress: 'Пресс',
};

export default function TopMuscles({ period, data }: TopMusclesProps) {
  const [viewMode, setViewMode] = useState<'percentage' | 'volume'>('percentage');

  const muscles: MuscleData[] = useMemo(() => {
    const zones = data?.zones || {};
    const timeline = data?.timeline || [];
    const totalVolume = data?.totalVolume || 0;

    return Object.entries(zones)
      .map(([zone, value]) => {
        const percentage = Math.round((value as number) * 100);

        let previousValue = percentage;
        if (timeline.length > 1) {
          const prevZones = timeline[timeline.length - 2]?.zones || {};
          previousValue = Math.round((prevZones[zone] || 0) * 100);
        }

        const change = percentage - previousValue;
        let trend: MuscleData['trend'] = 'stable';
        if (change > 2) trend = 'up';
        else if (change < -2) trend = 'down';

        const volume = `${Math.round(((value as number) / Math.max(...Object.values(zones), 1)) * totalVolume)}кг`;

        return {
          id: zone,
          name: ZONE_LABELS[zone] || zone,
          displayName: ZONE_LABELS[zone] || zone,
          percentage,
          volume,
          trend,
          change,
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }, [data]);

  const getTrendColor = (trend: MuscleData['trend']) => {
    switch (trend) {
      case 'up':
        return 'text-green-400';
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

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-400">
            {period === 'week' ? 'За неделю' : period === 'month' ? 'За месяц' : 'За год'}
          </p>
        </div>

        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('percentage')}
            className={`px-3 py-1 text-sm rounded-md transition ${
              viewMode === 'percentage'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            %
          </button>
          <button
            onClick={() => setViewMode('volume')}
            className={`px-3 py-1 text-sm rounded-md transition ${
              viewMode === 'volume' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Объем
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
                        ? 'bg-red-500/20 text-red-400'
                        : index === 1
                          ? 'bg-orange-500/20 text-orange-400'
                          : index === 2
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-gray-800 text-gray-400'
                    }
                  `}
                >
                  {index === 0 && <FireIcon className="w-4 h-4" />}
                  {index > 0 && <span className="text-sm font-bold">{index + 1}</span>}
                </div>

                <div>
                  <div className="font-medium text-white">{muscle.displayName}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={getTrendColor(muscle.trend)}>
                      {getTrendIcon(muscle.trend, muscle.change)}
                    </span>
                    {viewMode === 'volume' && (
                      <span className="text-gray-500">{muscle.volume}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold text-white">
                  {viewMode === 'percentage' ? `${muscle.percentage}%` : muscle.volume}
                </div>
                <div className="text-xs text-gray-400">
                  {viewMode === 'percentage' ? muscle.volume : `${muscle.percentage}%`}
                </div>
              </div>
            </div>

            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`
                  h-full rounded-full transition-all duration-500
                  ${
                    index === 0
                      ? 'bg-gradient-to-r from-red-500 to-red-600'
                      : index === 1
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                        : index === 2
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                          : 'bg-gradient-to-r from-blue-500 to-blue-600'
                  }
                `}
                style={{ width: `${muscle.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-400">Всего мышц:</div>
          <div className="text-white font-medium">{muscles.length}</div>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <div className="text-gray-400">Средняя нагрузка:</div>
          <div className="text-green-400 font-medium">
            {Math.round(muscles.reduce((sum, m) => sum + m.percentage, 0) / muscles.length)}%
          </div>
        </div>
      </div>
    </>
  );
}
