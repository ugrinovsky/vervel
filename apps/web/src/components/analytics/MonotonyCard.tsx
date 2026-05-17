import { useMemo } from 'react';
import type { WorkoutStats } from '@/types/Analytics';
import { computeAnalyticsInsights } from '@/util/computeAnalyticsInsights';
import { AnalyticsSheetIntro } from './AnalyticsSheetIntro';

interface Props {
  data: WorkoutStats;
  period: 'week' | 'month' | 'year';
}

const RISK_CONFIG = {
  low: {
    label: 'Низкая',
    hint: 'Хорошее разнообразие нагрузок',
    color: 'text-emerald-400',
    bg: 'border-emerald-500/30 bg-emerald-500/8',
    bar: 'bg-emerald-400',
  },
  moderate: {
    label: 'Умеренная',
    hint: 'Нагрузки однообразны, следи за усталостью',
    color: 'text-amber-400',
    bg: 'border-amber-500/30 bg-amber-500/8',
    bar: 'bg-amber-400',
  },
  high: {
    label: 'Высокая',
    hint: 'Слишком однообразные нагрузки — риск перегрузки связок',
    color: 'text-red-400',
    bg: 'border-red-500/30 bg-red-500/8',
    bar: 'bg-red-400',
  },
};

export default function MonotonyCard({ data, period }: Props) {
  const { monotony } = useMemo(() => computeAnalyticsInsights(data, period), [data, period]);

  if (!monotony) {
    return (
      <div className="space-y-4">
        <AnalyticsSheetIntro>Нужно минимум 3 тренировки с данными об объёме.</AnalyticsSheetIntro>
        <p className="text-sm text-(--color_text_muted) text-center py-6">
          Пока недостаточно данных.
        </p>
      </div>
    );
  }

  const cfg = RISK_CONFIG[monotony.riskLevel];
  // Gauge: 0–1 = low, 1–2 = moderate, 2+ = high. Cap visual at 3.
  const gaugePct = Math.min(100, (monotony.value / 3) * 100);

  return (
    <div className="space-y-4">
      <AnalyticsSheetIntro>
        Индекс монотонности (Foster): среднедневная нагрузка / стандартное отклонение. Чем выше —
        тем однообразнее тренинг. Значение выше 2.0 ассоциируется с риском перегрузки связок и
        суставов даже при умеренном объёме.
      </AnalyticsSheetIntro>

      <div className={`rounded-xl border p-4 ${cfg.bg}`}>
        <div className="flex items-end gap-2">
          <span className={`text-4xl font-bold tabular-nums leading-none ${cfg.color}`}>
            {monotony.value}
          </span>
          <span className="text-sm text-(--color_text_muted) mb-1">из 3.0</span>
        </div>
        <p className={`text-sm font-medium mt-2 ${cfg.color}`}>{cfg.hint}</p>
      </div>

      {/* Gauge bar */}
      <div className="glass rounded-xl p-3 space-y-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-(--color_text_muted)">Монотонность</span>
          <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
            style={{ width: `${gaugePct}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-(--color_text_muted)">
          <span>0 — разнообразно</span>
          <span>2+ — риск</span>
        </div>
      </div>

      <div className="glass rounded-xl p-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-(--color_text_muted)">Порог умеренного риска</span>
          <span className="text-white font-medium">&gt; 1.5</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-(--color_text_muted)">Порог высокого риска</span>
          <span className="text-white font-medium">&gt; 2.0</span>
        </div>
      </div>

      {monotony.riskLevel !== 'low' && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-3 text-xs text-(--color_text_muted) leading-relaxed">
          <span className="text-amber-300 font-semibold">Совет: </span>
          добавь вариативность — чередуй тяжёлые и лёгкие дни, меняй упражнения или типы тренировок.
        </div>
      )}
    </div>
  );
}
