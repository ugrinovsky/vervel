import { useMemo } from 'react';
import type { WorkoutStats } from '@/types/Analytics';
import { computeAnalyticsInsights } from '@/util/computeAnalyticsInsights';
import { AnalyticsSheetIntro } from './AnalyticsSheetIntro';

interface Props {
  data: WorkoutStats;
  period: 'week' | 'month' | 'year';
}

export default function WeeklySlopeCard({ data, period }: Props) {
  const { weeklySlope } = useMemo(() => computeAnalyticsInsights(data, period), [data, period]);

  if (!weeklySlope) {
    return (
      <div className="space-y-4">
        <AnalyticsSheetIntro>
          Нужно минимум 2 недели данных, чтобы посчитать темп роста нагрузки.
        </AnalyticsSheetIntro>
        <p className="text-sm text-(--color_text_muted) text-center py-6">
          Пока недостаточно данных.
        </p>
      </div>
    );
  }

  const { slopePerWeek, weekCount, isRising, isTooFast } = weeklySlope;
  const abs = Math.abs(slopePerWeek);

  const color = isTooFast ? 'text-red-400' : isRising ? 'text-emerald-400' : 'text-amber-400';

  const statusText = isTooFast
    ? 'Слишком быстро — риск перегрузки'
    : isRising
      ? 'Безопасный рост'
      : 'Нагрузка снижается';

  const statusBg = isTooFast
    ? 'border-red-500/30 bg-red-500/8'
    : isRising
      ? 'border-emerald-500/30 bg-emerald-500/8'
      : 'border-amber-500/30 bg-amber-500/8';

  const sign = isRising ? '+' : '−';

  return (
    <div className="space-y-4">
      <AnalyticsSheetIntro>
        Линейная регрессия еженедельного объёма (тоннажа) за период. Показывает, насколько в среднем
        растёт или падает нагрузка за каждую неделю. Безопасный рост — до 10% в неделю (правило
        10%).
      </AnalyticsSheetIntro>

      <div className={`rounded-xl border p-4 ${statusBg}`}>
        <div className="flex items-end gap-2">
          <span className={`text-4xl font-bold tabular-nums leading-none ${color}`}>
            {sign}
            {abs}%
          </span>
          <span className="text-sm text-(--color_text_muted) mb-1">в неделю</span>
        </div>
        <p className={`text-sm font-medium mt-2 ${color}`}>{statusText}</p>
      </div>

      <div className="glass rounded-xl p-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-(--color_text_muted)">Период расчёта</span>
          <span className="text-white font-medium">{weekCount} нед.</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-(--color_text_muted)">Безопасный рост</span>
          <span className="text-white font-medium">до +10%/нед.</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-(--color_text_muted)">Направление</span>
          <span className="text-white font-medium">{isRising ? '↑ Растёт' : '↓ Снижается'}</span>
        </div>
      </div>

      {isTooFast && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-3 text-xs text-(--color_text_muted) leading-relaxed">
          <span className="text-amber-300 font-semibold">Рекомендация: </span>
          замедли рост объёма. Добавь разгрузочную неделю или уменьши количество подходов на 2–3
          недели.
        </div>
      )}
    </div>
  );
}
