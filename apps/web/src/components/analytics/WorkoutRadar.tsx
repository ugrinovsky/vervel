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
import {
  DISPLAY,
  RADAR,
  NORMALIZATION,
} from '@/constants/AnalyticsConstants';

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

// Функция затемнения HEX цвета на заданный процент
function darkenColor(hex: string, percent: number) {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;

  r = Math.floor(r * (1 - percent));
  g = Math.floor(g * (1 - percent));
  b = Math.floor(b * (1 - percent));

  return `rgb(${r}, ${g}, ${b})`;
}

export default function WorkoutRadar({ period, data = {} }: WorkoutRadarProps) {
  // Безопасное получение avgIntensity (может быть 0-1 или уже 0-100)
  const rawIntensity = Number(data.avgIntensity) || 0;
  const intensity = rawIntensity > NORMALIZATION.PERCENT_THRESHOLD
    ? rawIntensity
    : rawIntensity * DISPLAY.PERCENT_MULTIPLIER;

  const zones = data.zones || {};
  const totalVolume = Number(data.totalVolume) || 0;

  // Баланс: средняя нагрузка по зонам (от 0 до 1, конвертируем в проценты)
  const zoneValues = Object.values(zones).map(v => Number(v) || 0);
  const balance = zoneValues.length
    ? Math.round((zoneValues.reduce((sum, v) => sum + v, 0) / zoneValues.length) * DISPLAY.PERCENT_MULTIPLIER)
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

  const averageValue = Math.round(metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length) || 0;
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
          <p className="text-sm text-[var(--color_text_muted)]">Радарная диаграмма ваших показателей</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full whitespace-nowrap">
            Среднее: {averageValue}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis
                dataKey="metric"
                tick={({ x, y, payload }) => (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    fill="#D1D5DB"
                    fontSize={12}
                    dy={4}
                  >
                    {payload.value}
                  </text>
                )}
              />
              <PolarRadiusAxis angle={30} domain={[0, RADAR.MAX_VALUE]} stroke="transparent" tick={false} />
              <Radar
                dataKey="value"
                stroke={darkenColor(metrics[0].color, RADAR.DARKEN_PERCENT)}
                fill={darkenColor(metrics[0].color, RADAR.DARKEN_PERCENT)}
                fillOpacity={0.3}
                strokeWidth={2}
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
          <div className="text-2xl font-bold text-blue-400">{averageValue}%</div>
        </div>
      </div>
    </div>
  );
}
