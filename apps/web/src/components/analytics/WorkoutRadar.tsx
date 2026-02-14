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
import { DISPLAY, RADAR, NORMALIZATION } from '@/constants/AnalyticsConstants';

interface WorkoutRadarProps {
  period: 'week' | 'month' | 'year';
  data?: any;
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

export default function WorkoutRadar({ period, data = {} }: WorkoutRadarProps) {
  // Безопасное получение avgIntensity (может быть 0-1 или уже 0-100)
  const rawIntensity = Number(data.avgIntensity) || 0;
  const intensity =
    rawIntensity > NORMALIZATION.PERCENT_THRESHOLD
      ? rawIntensity
      : rawIntensity * DISPLAY.PERCENT_MULTIPLIER;

  const zones = data.zones || {};
  const totalVolume = Number(data.totalVolume) || 0;

  // Баланс: средняя нагрузка по зонам (от 0 до 1, конвертируем в проценты)
  const zoneValues = Object.values(zones).map((v) => Number(v) || 0);
  const balance = zoneValues.length
    ? Math.round(
        (zoneValues.reduce((sum, v) => sum + v, 0) / zoneValues.length) * DISPLAY.PERCENT_MULTIPLIER
      )
    : 0;

  const metrics: RadarMetric[] = [
    {
      metric: 'Сила',
      fullName: 'Максимальная сила',
      description: 'Способность поднимать максимальные веса',
      value: Math.round(intensity),
      max: RADAR.MAX_VALUE,
      icon: <BoltIcon className="w-5 h-5" />,
      color: '#0E5C4D',
    },
    {
      metric: 'Объем',
      fullName: 'Рабочий объем',
      description: 'Общий тоннаж за период',
      value: Math.min(RADAR.MAX_VALUE, Math.round(totalVolume / DISPLAY.VOLUME_TO_TONS_DIVIDER)),
      max: RADAR.MAX_VALUE,
      icon: <ChartBarIcon className="w-5 h-5" />,
      color: '#0E3A48',
    },
    {
      metric: 'Выносливость',
      fullName: 'Мышечная выносливость',
      description: 'Способность к многоповторной работе',
      value: Math.round(intensity * RADAR.ENDURANCE_COEFFICIENT),
      max: RADAR.MAX_VALUE,
      icon: <HeartIcon className="w-5 h-5" />,
      color: '#0E5C4D',
    },
    {
      metric: 'Интенсивность',
      fullName: 'Тренировочная интенсивность',
      description: 'Процент от максимальных возможностей',
      value: Math.round(intensity),
      max: RADAR.MAX_VALUE,
      icon: <FireIcon className="w-5 h-5" />,
      color: '#0E3A48',
    },
    {
      metric: 'Баланс',
      fullName: 'Мышечный баланс',
      description: 'Симметрия развития мышечных групп',
      value: balance,
      max: RADAR.MAX_VALUE,
      icon: <ArrowsRightLeftIcon className="w-5 h-5" />,
      color: '#0E5C4D',
    },
  ];

  const chartData = metrics.map((m) => ({ metric: m.metric, value: m.value, fullMark: m.max }));

  const averageValue =
    Math.round(metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length) || 0;
  const bestMetric = metrics.reduce((best, current) =>
    current.value > best.value ? current : best
  );
  const worstMetric = metrics.reduce((worst, current) =>
    current.value < worst.value ? current : worst
  );

  return (
    <div className="glass p-6 rounded-xl">
      <style>{`
        .recharts-polar-grid-concentric-polygon {
          stroke: #9CA3AF;
        }
        /* Градиент от зелёного в центре к красному по краям */
        .recharts-polar-grid-concentric-polygon:nth-child(1) {
          fill: rgba(16, 185, 129, 0.12); /* Зелёный - центр (самый маленький) */
        }
        .recharts-polar-grid-concentric-polygon:nth-child(2) {
          fill: rgba(132, 204, 22, 0.13); /* Зелёно-жёлтый */
        }
        .recharts-polar-grid-concentric-polygon:nth-child(3) {
          fill: rgba(251, 191, 36, 0.14); /* Жёлтый */
        }
        .recharts-polar-grid-concentric-polygon:nth-child(4) {
          fill: rgba(251, 146, 60, 0.15); /* Оранжевый */
        }
        .recharts-polar-grid-concentric-polygon:nth-child(5) {
          fill: rgba(239, 68, 68, 0.16); /* Красный - край (самый большой) */
        }
      `}</style>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Профиль нагрузки</h3>
          <p className="text-sm text-[var(--color_text_muted)]">
            Радарная диаграмма ваших показателей
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full whitespace-nowrap">
            Среднее: {averageValue}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <defs>
                <radialGradient id="radarGradient" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.4} />
                </radialGradient>
              </defs>
              <PolarGrid stroke="#9CA3AF" />
              <PolarAngleAxis
                dataKey="metric"
                tick={({ x, y, payload }) => {
                  const text = String(payload.value);
                  const padding = 8;
                  const charWidth = 7.5;
                  const rectWidth = text.length * charWidth + padding * 2;
                  const rectHeight = 26;
                  const offsetY = 20;

                  return (
                    <g>
                      <rect
                        x={Number(x) - rectWidth / 2}
                        y={Number(y) - rectHeight / 2 + offsetY}
                        width={rectWidth}
                        height={rectHeight}
                        fill="rgba(5, 46, 37, 0.95)"
                        stroke="#10B981"
                        strokeWidth={1.5}
                        rx={8}
                        ry={8}
                      />
                      <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        fill="#10B981"
                        fontSize={13}
                        fontWeight={600}
                        dy={offsetY + 5}
                      >
                        {text}
                      </text>
                    </g>
                  );
                }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, RADAR.MAX_VALUE]}
                stroke="transparent"
                tick={false}
              />
              <Radar
                dataKey="value"
                stroke="#10B981"
                fill="url(#radarGradient)"
                fillOpacity={0.6}
                strokeWidth={2.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-[var(--color_text_secondary)] text-sm mb-2">
            Лучший показатель:
          </div>
          <div className="flex items-center justify-between">
            <div className="font-bold text-white">{bestMetric.metric}</div>
            <div className="font-bold">{bestMetric.value}%</div>
          </div>

          <div className="flex items-center justify-between text-[var(--color_text_secondary)] text-sm mt-2">
            Для улучшения:
          </div>
          <div className="flex items-center justify-between">
            <div className="font-bold text-white">{worstMetric.metric}</div>
            <div className="font-bold">{worstMetric.value}%</div>
          </div>

          <div className="flex items-center justify-between text-[var(--color_text_secondary)] text-sm mt-2">
            Общий балл:
          </div>
          <div className="text-2xl font-bold text-emerald-400">{averageValue}%</div>
        </div>
      </div>
    </div>
  );
}
