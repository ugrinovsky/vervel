import { useMemo } from 'react';
import type { WorkoutStats } from '@/types/Analytics';
import { computeAnalyticsInsights } from '@/util/computeAnalyticsInsights';
import { AnalyticsEmptyState } from './AnalyticsEmptyState';
import { AnalyticsSheetIntro } from './AnalyticsSheetIntro';

interface Props {
  data: WorkoutStats;
  period: 'week' | 'month' | 'year';
}

type RecoveryRow = {
  label: string;
  days: number | null;
  recommended: string;
  isShort: boolean;
};

export default function RecoveryCard({ data, period }: Props) {
  const { recovery } = useMemo(() => computeAnalyticsInsights(data, period), [data, period]);

  if (!recovery) {
    return (
      <AnalyticsEmptyState hint="Нужно несколько тренировок разных классов нагрузки, чтобы посчитать паузы по уровням." />
    );
  }

  const rows: RecoveryRow[] = [
    {
      label: 'После тяжёлых (>15 т)',
      days: recovery.afterHigh,
      recommended: '2+ дн.',
      isShort: recovery.afterHigh !== null && recovery.afterHigh < 2,
    },
    {
      label: 'После средних (10–15 т)',
      days: recovery.afterMedium,
      recommended: '1.5+ дн.',
      isShort: recovery.afterMedium !== null && recovery.afterMedium < 1.5,
    },
    {
      label: 'После лёгких (<10 т)',
      days: recovery.afterLow,
      recommended: '1+ дн.',
      isShort: recovery.afterLow !== null && recovery.afterLow < 1,
    },
  ].filter((r) => r.days !== null);

  const hasWarning = rows.some((r) => r.isShort);

  return (
    <div className="space-y-4">
      <AnalyticsSheetIntro>
        Среднее время между тренировкой определённой интенсивности и следующей сессией. Помогает
        понять, достаточно ли отдыха после тяжёлых дней. Тоннажные классы — как в календаре (~10 т и
        ~15 т).
      </AnalyticsSheetIntro>

      <div className="glass rounded-xl overflow-hidden">
        <div className="grid grid-cols-3 px-3 py-2 border-b border-(--color_border)">
          <span className="text-[11px] font-semibold text-(--color_text_muted) uppercase tracking-wide">
            Класс
          </span>
          <span className="text-[11px] font-semibold text-(--color_text_muted) uppercase tracking-wide text-center">
            Факт
          </span>
          <span className="text-[11px] font-semibold text-(--color_text_muted) uppercase tracking-wide text-right">
            Рек.
          </span>
        </div>
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-3 px-3 py-3 border-b border-(--color_border) last:border-0 items-center"
          >
            <span className="text-xs text-(--color_text_muted) leading-snug pr-2">{row.label}</span>
            <span
              className={`text-sm font-bold text-center tabular-nums ${row.isShort ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {row.days} дн.
            </span>
            <span className="text-xs text-(--color_text_muted) text-right">{row.recommended}</span>
          </div>
        ))}
      </div>

      {hasWarning && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/8 p-3 text-xs text-(--color_text_muted) leading-relaxed">
          <span className="text-red-300 font-semibold">Недостаточно отдыха: </span>
          после тяжёлых сессий тело восстанавливается 48–72 ч. Слишком короткие паузы — риск
          накопления усталости и травм.
        </div>
      )}

      {!hasWarning && rows.length > 0 && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-3 text-xs text-emerald-300/80 leading-relaxed">
          Паузы между тренировками выглядят адекватно интенсивности.
        </div>
      )}
    </div>
  );
}
