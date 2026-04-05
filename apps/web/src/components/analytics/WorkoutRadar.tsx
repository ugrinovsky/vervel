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
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import {
  RADAR,
  DISPLAY,
  formatVolume,
  ANALYTICS_PERIOD_WEEKS,
  RADAR_VOLUME_REF_KG,
  IDEAL_WORKOUTS_PER_WEEK,
  computeMuscleBalancePercent,
  normalizeIntensity,
} from '@/constants/AnalyticsConstants';
import type { WorkoutStats } from '@/types/Analytics';
import { AnalyticsSheetIntro } from './AnalyticsSheetIntro';

interface WorkoutRadarProps {
  period: 'week' | 'month' | 'year';
  data?: Partial<WorkoutStats>;
}

type RadarMetric = {
  metric: string;
  fullName: string;
  description: string;
  value: number;
  max: number;
  icon: React.ReactNode;
};

export default function WorkoutRadar({ period, data = {} }: WorkoutRadarProps) {
  const rawIntensity = Number(data.avgIntensity) || 0;
  const intensityPct = Math.round(normalizeIntensity(rawIntensity));

  const zones = data.zones || {};
  const totalVolume = Number(data.totalVolume) || 0;
  const workoutsCount = Number(data.workoutsCount) || 0;

  const refKg = RADAR_VOLUME_REF_KG[period];
  const volumeScore =
    refKg > 0 ? Math.min(RADAR.MAX_VALUE, Math.round((totalVolume / refKg) * DISPLAY.PERCENT_MULTIPLIER)) : 0;

  const balanceScore = computeMuscleBalancePercent(zones);

  const weeks = ANALYTICS_PERIOD_WEEKS[period];
  const rhythmTarget = weeks * IDEAL_WORKOUTS_PER_WEEK;
  const rhythmScore =
    rhythmTarget > 0
      ? Math.min(RADAR.MAX_VALUE, Math.round((workoutsCount / rhythmTarget) * DISPLAY.PERCENT_MULTIPLIER))
      : 0;

  const metrics: RadarMetric[] = [
    {
      metric: 'Интенсивность',
      fullName: 'Интенсивность',
      description:
        'Средняя «тяжесть» сетов за период (оценка приложения, 0–100%). Не то же самое, что вес на штанге.',
      value: intensityPct,
      max: RADAR.MAX_VALUE,
      icon: <BoltIcon className="w-5 h-5" />,
    },
    {
      metric: 'Объём',
      fullName: 'Объём',
      description: `Суммарный тоннаж ${formatVolume(totalVolume)}. 100% — выше ориентира для этого периода (${(refKg / 1000).toFixed(0)} т), для сравнения формы, не норма.`,
      value: volumeScore,
      max: RADAR.MAX_VALUE,
      icon: <ChartBarIcon className="w-5 h-5" />,
    },
    {
      metric: 'Баланс мышц',
      fullName: 'Баланс мышц',
      description:
        'Насколько равномерно распределена нагрузка между зонами в выбранном периоде. Низко — много работы в одних группах и мало в других.',
      value: balanceScore,
      max: RADAR.MAX_VALUE,
      icon: <ArrowsRightLeftIcon className="w-5 h-5" />,
    },
    {
      metric: 'Ритм',
      fullName: 'Ритм',
      description: `Частота относительно ориентира ~${IDEAL_WORKOUTS_PER_WEEK} тренировок в неделю за этот период.`,
      value: rhythmScore,
      max: RADAR.MAX_VALUE,
      icon: <CalendarDaysIcon className="w-5 h-5" />,
    },
  ];

  const chartData = metrics.map((m) => ({ metric: m.metric, value: m.value, fullMark: m.max }));

  const averageValue =
    Math.round(metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length) || 0;
  const strongest = metrics.reduce((best, current) =>
    current.value > best.value ? current : best
  );
  const weakest = metrics.reduce((worst, current) =>
    current.value < worst.value ? current : worst
  );

  return (
    <div className="glass p-6 rounded-xl">
      <style>{`
        .recharts-polar-grid-concentric-polygon {
          stroke: #9CA3AF;
        }
        .recharts-polar-grid-concentric-polygon:nth-child(1) {
          fill: rgba(16, 185, 129, 0.12);
        }
        .recharts-polar-grid-concentric-polygon:nth-child(2) {
          fill: rgba(132, 204, 22, 0.13);
        }
        .recharts-polar-grid-concentric-polygon:nth-child(3) {
          fill: rgba(251, 191, 36, 0.14);
        }
        .recharts-polar-grid-concentric-polygon:nth-child(4) {
          fill: rgba(251, 146, 60, 0.15);
        }
        .recharts-polar-grid-concentric-polygon:nth-child(5) {
          fill: rgba(239, 68, 68, 0.16);
        }
      `}</style>

      <AnalyticsSheetIntro>
        Четыре шкалы на одной сетке 0–100%: насколько период выглядит «собранным» по интенсивности, объёму,
        разнообразию зон и частоте. Это не абсолютная сила в килограммах — за весами и прогрессом по
        упражнениям откройте «Сила и прогресс».
      </AnalyticsSheetIntro>

      <div className="mb-5">
        <h3 className="text-xl font-bold text-white">Профиль нагрузки</h3>
        <p className="text-sm text-[var(--color_text_muted)] mt-0.5">
          Сводка периода (сопоставимые оси, не смешанные единицы)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,11.5rem)] gap-6 lg:gap-5 items-start">
        <div className="w-full min-h-[320px] min-w-0 overflow-visible [&_.recharts-surface]:overflow-visible">
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart
              data={chartData}
              margin={{ top: 22, right: 28, bottom: 34, left: 28 }}
              outerRadius="80%"
            >
              <defs>
                <radialGradient id="radarGradient" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="var(--color_primary_light)" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="var(--color_primary)" stopOpacity={0.4} />
                </radialGradient>
              </defs>
              <PolarGrid stroke="#9CA3AF" />
              <PolarAngleAxis
                dataKey="metric"
                tick={({ x, y, payload }) => {
                  const text = String(payload.value);
                  const metric = metrics.find((m) => m.metric === text);
                  const short = text;
                  const pct = metric ? `${metric.value}%` : '';
                  const paddingX = 7;
                  const paddingY = 5;
                  const line1 = short;
                  const line2 = pct;
                  const charW = 6.5;
                  const rectWidth =
                    Math.max(
                      line1.length * charW,
                      line2.length * charW * 0.85
                    ) + paddingX * 2;
                  const lineHeight = 13;
                  const rectHeight = lineHeight * 2 + paddingY * 2;
                  const offsetY = 18;

                  let ox = 0;
                  let oy = 0;
                  if (text === 'Баланс мышц') ox = 8;
                  else if (text === 'Интенсивность') oy = -24;
                  else if (text === 'Объём') ox = -6;
                  else if (text === 'Ритм') oy = 12;

                  const finalX = Number(x) + ox;
                  const finalY = Number(y) + oy;
                  const boxY = finalY - rectHeight / 2 + offsetY;

                  return (
                    <g>
                      <rect
                        x={finalX - rectWidth / 2}
                        y={boxY}
                        width={rectWidth}
                        height={rectHeight}
                        fill="var(--color_primary_icon)"
                        fillOpacity={0.15}
                        stroke="var(--color_primary_icon)"
                        strokeWidth={1.5}
                        rx={8}
                        ry={8}
                      />
                      <text
                        x={finalX}
                        y={boxY + paddingY + 11}
                        textAnchor="middle"
                        fill="var(--color_primary_icon)"
                        fontSize={11}
                        fontWeight={600}
                      >
                        {line1}
                      </text>
                      <text
                        x={finalX}
                        y={boxY + paddingY + 11 + lineHeight}
                        textAnchor="middle"
                        fill="var(--color_primary_icon)"
                        fontSize={11}
                        fontWeight={700}
                        opacity={0.95}
                      >
                        {line2}
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
                stroke="var(--color_primary_icon)"
                fill="url(#radarGradient)"
                fillOpacity={0.6}
                strokeWidth={2.5}
                dot={{ r: 4, fill: 'var(--color_primary_icon)', strokeWidth: 0 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-2 min-w-0 w-full lg:w-auto">
          <p className="text-[10px] text-(--color_text_muted) leading-snug lg:mb-0.5">
            Сравнение четырёх шкал между собой: где балл выше или ниже остальных (не «хорошо/плохо»).
          </p>
          <div className="rounded-lg border border-(--color_border) bg-(--color_bg_card) px-2.5 py-2 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <div className="text-[10px] text-(--color_text_muted) leading-none uppercase tracking-wide">
                Самый высокий балл
              </div>
              <div className="text-xs font-semibold text-white mt-1 break-words leading-snug">
                {strongest.fullName}
              </div>
            </div>
            <div className="text-base font-bold text-emerald-400 tabular-nums shrink-0">{strongest.value}%</div>
          </div>
          <div className="rounded-lg border border-(--color_border) bg-(--color_bg_card) px-2.5 py-2 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <div className="text-[10px] text-(--color_text_muted) leading-none uppercase tracking-wide">
                Самый низкий балл
              </div>
              <div className="text-xs font-semibold text-white mt-1 break-words leading-snug">
                {weakest.fullName}
              </div>
            </div>
            <div className="text-base font-bold text-amber-400 tabular-nums shrink-0">{weakest.value}%</div>
          </div>
          <div
            className="rounded-lg border px-2.5 py-2 flex items-center justify-between gap-2 min-w-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color_primary_icon) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color_primary_icon) 28%, transparent)',
            }}
          >
            <div className="min-w-0">
              <div className="text-[10px] text-(--color_text_muted) leading-none uppercase tracking-wide">
                Среднее четырёх
              </div>
              <div className="text-xs text-white/70 mt-1 leading-snug">одинаковый вес у всех четырёх шкал</div>
            </div>
            <div className="text-base font-bold tabular-nums shrink-0" style={{ color: 'var(--color_primary_icon)' }}>
              {averageValue}%
            </div>
          </div>
        </div>
      </div>

      <ul className="mt-5 space-y-2 text-[11px] text-(--color_text_muted) leading-relaxed">
        {metrics.map((m) => (
          <li key={m.metric} className="flex gap-2">
            <span className="shrink-0 mt-0.5 text-(--color_text_secondary)">{m.icon}</span>
            <span>
              <span className="text-white/80 font-medium">{m.fullName}: </span>
              {m.description}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
