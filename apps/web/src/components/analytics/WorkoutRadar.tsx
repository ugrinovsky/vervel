// components/analytics/WorkoutRadar.tsx
import { useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartBarIcon,
  ArrowsRightLeftIcon,
  BoltIcon,
  FireIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';

interface WorkoutRadarProps {
  period: 'week' | 'month' | 'year';
}

type RadarMetric = {
  metric: string;
  fullName: string;
  description: string;
  value: number;
  max: number;
  icon: React.ReactNode;
  color: string;
};

export default function WorkoutRadar({ period }: WorkoutRadarProps) {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  // Данные для радарной диаграммы
  const metrics: RadarMetric[] = [
    {
      metric: 'Сила',
      fullName: 'Максимальная сила',
      description: 'Способность поднимать максимальные веса',
      value: 85,
      max: 100,
      icon: <BoltIcon className="w-5 h-5" />,
      color: '#EF4444', // red-500
    },
    {
      metric: 'Объем',
      fullName: 'Рабочий объем',
      description: 'Общий тоннаж за тренировку',
      value: 72,
      max: 100,
      icon: <ChartBarIcon className="w-5 h-5" />,
      color: '#3B82F6', // blue-500
    },
    {
      metric: 'Выносливость',
      fullName: 'Мышечная выносливость',
      description: 'Способность к многоповторной работе',
      value: 65,
      max: 100,
      icon: <HeartIcon className="w-5 h-5" />,
      color: '#10B981', // green-500
    },
    {
      metric: 'Интенсивность',
      fullName: 'Тренировочная интенсивность',
      description: 'Процент от максимальных возможностей',
      value: 88,
      max: 100,
      icon: <FireIcon className="w-5 h-5" />,
      color: '#F59E0B', // yellow-500
    },
    {
      metric: 'Баланс',
      fullName: 'Мышечный баланс',
      description: 'Симметрия развития мышечных групп',
      value: 78,
      max: 100,
      icon: <ArrowsRightLeftIcon className="w-5 h-5" />,
      color: '#8B5CF6', // purple-500
    },
  ];

  // Подготовка данных для графика
  const chartData = metrics.map((m) => ({
    metric: m.metric,
    value: m.value,
    fullMark: m.max,
  }));

  const averageValue = Math.round(metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length);
  const bestMetric = metrics.reduce((best, current) =>
    current.value > best.value ? current : best
  );
  const worstMetric = metrics.reduce((worst, current) =>
    current.value < worst.value ? current : worst
  );

  return (
    <div className="glass p-6 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Профиль нагрузки</h3>
          <p className="text-sm text-gray-400">Радарная диаграмма ваших показателей</p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full">
            Среднее: {averageValue}%
          </div>
          <div className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full">
            {period === 'week' ? 'Неделя' : period === 'month' ? 'Месяц' : 'Год'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* График */}
        <div className="lg:col-span-2">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis
                  dataKey="metric"
                  stroke="#9CA3AF"
                  fontSize={14}
                  tick={{ fill: '#D1D5DB' }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#374151" />
                <Radar
                  name="Текущие значения"
                  dataKey="value"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Детали метрик */}
        <div className="space-y-4">
          <div className="p-4 bg-gray-800/30 rounded-lg">
            <div className="text-sm text-gray-400 mb-2">Сводка</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-gray-300">Лучший показатель:</div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full`}
                    style={{ backgroundColor: bestMetric.color }}
                  ></div>
                  <div className="font-bold text-white">{bestMetric.metric}</div>
                  <div className="font-bold" style={{ color: bestMetric.color }}>
                    {bestMetric.value}%
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-gray-300">Для улучшения:</div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full`}
                    style={{ backgroundColor: worstMetric.color }}
                  ></div>
                  <div className="font-bold text-white">{worstMetric.metric}</div>
                  <div className="font-bold" style={{ color: worstMetric.color }}>
                    {worstMetric.value}%
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-gray-300">Общий балл:</div>
                <div className="text-2xl font-bold text-blue-400">{averageValue}%</div>
              </div>
            </div>
          </div>

          {/* Список метрик */}
          <div className="space-y-3">
            {metrics.map((metric) => (
              <div
                key={metric.metric}
                className={`p-3 rounded-lg transition-all cursor-pointer ${
                  hoveredMetric === metric.metric
                    ? 'bg-gray-800 scale-[1.02]'
                    : 'bg-gray-800/50 hover:bg-gray-800/70'
                }`}
                onMouseEnter={() => setHoveredMetric(metric.metric)}
                onMouseLeave={() => setHoveredMetric(null)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-700/50">
                      <div style={{ color: metric.color }}>{metric.icon}</div>
                    </div>
                    <div>
                      <div className="font-medium text-white">{metric.metric}</div>
                      <div className="text-xs text-gray-400">{metric.fullName}</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: metric.color }}>
                    {metric.value}%
                  </div>
                </div>

                {/* Прогресс-бар */}
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${metric.value}%`,
                      backgroundColor: metric.color,
                    }}
                  ></div>
                </div>

                <div className="text-xs text-gray-400 mt-2">{metric.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Легенда */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-400">Шкала: 0-100% от максимального потенциала</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500/30 border border-blue-500"></div>
              <span className="text-gray-300">Текущие значения</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
