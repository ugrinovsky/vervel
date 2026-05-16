import { useMemo } from 'react';
import type { WorkoutStats } from '@/types/Analytics';
import { computeAnalyticsInsights } from '@/util/computeAnalyticsInsights';
import { AnalyticsSheetIntro } from './AnalyticsSheetIntro';

interface Props {
  data: WorkoutStats;
  period: 'week' | 'month' | 'year';
}

function weeksNoun(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'недель';
  if (mod10 === 1) return 'неделя';
  if (mod10 >= 2 && mod10 <= 4) return 'недели';
  return 'недель';
}

export default function ActiveWeeksCard({ data, period }: Props) {
  const { activeWeeks } = useMemo(() => computeAnalyticsInsights(data, period), [data, period]);

  if (!activeWeeks) {
    return (
      <div className="space-y-4">
        <AnalyticsSheetIntro>Нужна хотя бы одна тренировка.</AnalyticsSheetIntro>
        <p className="text-sm text-(--color_text_muted) text-center py-6">
          Пока недостаточно данных.
        </p>
      </div>
    );
  }

  const { consecutiveWeeks, totalActiveWeeks } = activeWeeks;

  const streakColor =
    consecutiveWeeks >= 8
      ? 'text-emerald-400'
      : consecutiveWeeks >= 4
        ? 'text-amber-400'
        : 'text-white';

  const streakLabel =
    consecutiveWeeks >= 8
      ? 'Отличная стабильность'
      : consecutiveWeeks >= 4
        ? 'Хорошая регулярность'
        : consecutiveWeeks >= 2
          ? 'Серия идёт'
          : 'Начало пути';

  // Visual bar: filled weeks out of last 12
  const DISPLAY_WEEKS = 12;
  const filledWeeks = Math.min(consecutiveWeeks, DISPLAY_WEEKS);

  return (
    <div className="space-y-4">
      <AnalyticsSheetIntro>
        Сколько недель подряд была хотя бы одна тренировка — считая от последней активной недели
        назад. Отличается от дневного стрика: здесь важна стабильность по неделям, а не
        ежедневность.
      </AnalyticsSheetIntro>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-(--color_bg_card) rounded-xl border border-(--color_border) p-4 text-center">
          <div className={`text-4xl font-bold tabular-nums leading-none ${streakColor}`}>
            {consecutiveWeeks}
          </div>
          <div className="text-xs text-(--color_text_muted) mt-1.5">
            {weeksNoun(consecutiveWeeks)} подряд
          </div>
          <div className={`text-[11px] mt-1 font-medium ${streakColor}`}>{streakLabel}</div>
        </div>
        <div className="bg-(--color_bg_card) rounded-xl border border-(--color_border) p-4 text-center">
          <div className="text-4xl font-bold tabular-nums leading-none text-white">
            {totalActiveWeeks}
          </div>
          <div className="text-xs text-(--color_text_muted) mt-1.5">
            {weeksNoun(totalActiveWeeks)} всего
          </div>
          <div className="text-[11px] mt-1 text-(--color_text_muted)">в периоде</div>
        </div>
      </div>

      {/* Visual strip */}
      <div className="bg-(--color_bg_card) rounded-xl border border-(--color_border) p-3 space-y-2">
        <div className="text-[11px] font-semibold text-(--color_text_muted) uppercase tracking-wide">
          Последние {DISPLAY_WEEKS} недель
        </div>
        <div className="flex gap-1">
          {Array.from({ length: DISPLAY_WEEKS }, (_, i) => {
            const active = i < filledWeeks;
            return (
              <div
                key={i}
                className="flex-1 h-3 rounded-sm transition-all"
                style={{
                  backgroundColor: active
                    ? consecutiveWeeks >= 8
                      ? 'var(--color_primary_light)'
                      : 'rgba(251,191,36,0.7)'
                    : 'var(--color_bg_card_hover)',
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[11px] text-(--color_text_muted)">
          <span>← {DISPLAY_WEEKS} нед. назад</span>
          <span>Сейчас →</span>
        </div>
      </div>
    </div>
  );
}
