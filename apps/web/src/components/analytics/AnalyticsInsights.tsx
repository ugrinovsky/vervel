import { useMemo, type ReactNode } from 'react';
import { ArrowTrendingDownIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import type { WorkoutStats } from '@/types/Analytics';
import {
  computeAnalyticsInsights,
  LOAD_LEVEL_LABELS,
  workoutTypeLabel,
} from '@/util/computeAnalyticsInsights';
import { AnalyticsSheetIntro } from './AnalyticsSheetIntro';

const LOAD_ORDER: Array<keyof typeof LOAD_LEVEL_LABELS> = ['high', 'medium', 'low', 'none'];

interface Props {
  stats: WorkoutStats;
  period: 'week' | 'month' | 'year';
}

/** Окно аналитики (скользящее) — согласованный текст без ошибок в падежах. */
const PACE_SOURCE_SCOPE: Record<Props['period'], string> = {
  week: 'последние ~7 дней',
  month: 'последние ~30 дней',
  year: 'последний год',
};

function trainingsNoun(count: number): string {
  const n = Math.abs(Math.round(count)) % 100;
  const n1 = n % 10;
  if (n >= 11 && n <= 14) return 'тренировок';
  if (n1 === 1) return 'тренировка';
  if (n1 >= 2 && n1 <= 4) return 'тренировки';
  return 'тренировок';
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="glass rounded-xl p-3 space-y-2">
      <div className="text-[11px] font-semibold text-(--color_text_muted) uppercase tracking-wide">
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-(--color_text_muted) leading-relaxed">{label}</span>
      <span className="text-white font-medium text-right shrink-0">{value}</span>
    </div>
  );
}

export default function AnalyticsInsights({ stats, period }: Props) {
  const data = useMemo(() => computeAnalyticsInsights(stats, period), [stats, period]);

  if (!data.hasWorkouts) {
    return (
      <div className="space-y-4">
        <AnalyticsSheetIntro>
          Когда появятся тренировки в выбранном окне, здесь соберутся ритм, полнота журнала и другие
          производные показатели.
        </AnalyticsSheetIntro>
        <p className="text-sm text-(--color_text_muted) text-center py-6">
          Пока нет данных за период.
        </p>
      </div>
    );
  }

  const { journal, rhythm, loadLevels, diversity, zoneShift, coach, pace, softOverloadHint } = data;
  const loadTotal = Object.values(loadLevels).reduce((s, v) => s + (v ?? 0), 0);
  const paceScope = PACE_SOURCE_SCOPE[period];

  return (
    <div className="space-y-4">
      <AnalyticsSheetIntro>
        Дополнительные выводы из таймлайна тренировок: ритм, полнота записей, распределение
        «тяжёлых» сессий и простой ориентир по темпу. Не медицинское заключение и не прогноз
        результатов.
      </AnalyticsSheetIntro>

      {softOverloadHint && (
        <div
          className="rounded-xl border p-3 text-xs leading-relaxed"
          style={{
            borderColor: 'rgba(251,191,36,0.35)',
            backgroundColor: 'rgba(251,191,36,0.08)',
            color: 'var(--color_text_muted)',
          }}
        >
          <span className="text-amber-300 font-semibold">Высокий суммарный темп: </span>
          частые тренировки и высокая средняя интенсивность за период. Имеет смысл следить за
          восстановлением и не наращивать нагрузку резко.
        </div>
      )}

      <Section title="Журнал">
        <Row label="Тренировок за период" value={`${journal.total}`} />
        <Row
          label="Без весов в подходах (где нужны кг)"
          value={journal.missingWeights ? `${journal.missingWeights}` : 'нет'}
        />
        <Row
          label="Без RPE (где учитывается)"
          value={journal.missingRpe ? `${journal.missingRpe}` : 'нет'}
        />
      </Section>

      <Section title="Ритм">
        <Row
          label="Медиана пауз между сессиями"
          value={rhythm.medianGapDays != null ? `${rhythm.medianGapDays} дн.` : '—'}
        />
        <Row
          label="Самая длинная пауза"
          value={rhythm.maxGapDays != null ? `${rhythm.maxGapDays} дн.` : '—'}
        />
      </Section>

      <Section title="Тоннаж за сессию (классы приложения)">
        <p className="text-[11px] text-(--color_text_muted) leading-snug -mt-1">
          Как в календаре: в основном по суммарному тоннажу за сессию (пороги ~10 т и ~15 т). Если
          объёма нет, но в записи есть упражнения или учтённая интенсивность — тоже нижний класс.
          Это не «легко/тяжело на ощущениях». Часто почти все сессии в первой строке — нормально.
          Проценты — сколько тренировок попало в каждый класс за период.
        </p>
        {(loadLevels.none ?? 0) > 0 && (
          <p className="text-[11px] text-(--color_text_muted) leading-snug">
            «Нет тоннажа и упражнений» — сохранённая запись без подходов и без посчитанного объёма
            (не черновик из редактора).
          </p>
        )}
        {loadTotal === 0 ? (
          <p className="text-xs text-(--color_text_muted)">Нет распределения.</p>
        ) : (
          <div className="space-y-2">
            {LOAD_ORDER.map((key) => {
              const c = loadLevels[key] ?? 0;
              if (!c) return null;
              const pct = Math.round((c / loadTotal) * 100);
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-(--color_text_muted)">{LOAD_LEVEL_LABELS[key]}</span>
                    <span className="text-white/90">
                      {c} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-(--color_primary_light) opacity-70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Разнообразие типов">
        <Row label="Разных типов тренировок" value={`${diversity.distinctTypes}`} />
        {diversity.dominantType != null && diversity.dominantPct != null && (
          <Row
            label="Чаще всего"
            value={`${workoutTypeLabel(diversity.dominantType)} · ${diversity.dominantPct}%`}
          />
        )}
      </Section>

      {zoneShift && (
        <Section title="Сдвиг акцента по зонам">
          <p className="text-[11px] text-(--color_text_muted) leading-snug -mt-0.5">
            Вторая половина выбранного периода по датам сравнивается с первой: как изменилась доля
            нагрузки по группам мышц (по сумме по сессиям в каждой половине).
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <div
              className="rounded-xl p-3 border min-h-[5.25rem] flex flex-col"
              style={{
                borderColor: 'rgba(52,211,153,0.28)',
                background: 'linear-gradient(160deg, rgba(52,211,153,0.10) 0%, rgba(0,0,0,0) 100%)',
              }}
            >
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90">
                <ArrowTrendingUpIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                Больше
              </div>
              <div className="text-base font-bold text-white mt-1.5 leading-tight">
                {zoneShift.upLabel}
              </div>
              <div className="text-lg font-bold tabular-nums text-emerald-400 mt-auto pt-2">
                +{zoneShift.upDeltaPct} п.п.
              </div>
            </div>
            <div
              className="rounded-xl p-3 border min-h-[5.25rem] flex flex-col"
              style={{
                borderColor: 'rgba(251,113,133,0.28)',
                background:
                  'linear-gradient(160deg, rgba(251,113,133,0.08) 0%, rgba(0,0,0,0) 100%)',
              }}
            >
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-rose-300/90">
                <ArrowTrendingDownIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                Меньше
              </div>
              <div className="text-base font-bold text-white mt-1.5 leading-tight">
                {zoneShift.downLabel}
              </div>
              <div className="text-lg font-bold tabular-nums text-rose-300 mt-auto pt-2">
                −{zoneShift.downDeltaPct} п.п.
              </div>
            </div>
          </div>
          <p className="text-[10px] text-(--color_text_muted) leading-snug pt-0.5">
            п.п. — процентные пункты: изменение доли, а не «процент от тела».
          </p>
        </Section>
      )}

      {coach && (
        <Section title="План тренера">
          <Row label="Назначено тренером" value={`${coach.scheduled}`} />
          <Row label="Самостоятельно" value={`${coach.self}`} />
        </Section>
      )}

      {pace && (
        <Section title="Ориентир по темпу">
          <div className="grid grid-cols-2 gap-2.5 -mt-0.5">
            <div
              className="rounded-xl p-3 border flex flex-col min-h-[5.5rem] justify-between"
              style={{
                borderColor: 'rgb(var(--color_primary_light_ch) / 0.22)',
                background: 'rgb(var(--color_primary_ch) / 0.06)',
              }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-(--color_text_muted)">
                Сейчас
              </span>
              <div>
                <div className="text-[26px] font-bold text-white leading-none tabular-nums">
                  {pace.perWeek}
                </div>
                <div className="text-[11px] text-(--color_text_muted) mt-1 leading-snug">
                  трен./нед. в среднем
                </div>
              </div>
            </div>
            <div
              className="rounded-xl p-3 border flex flex-col min-h-[5.5rem] justify-between"
              style={{
                borderColor: 'rgb(var(--color_primary_light_ch) / 0.35)',
                background:
                  'linear-gradient(145deg, rgb(var(--color_primary_light_ch) / 0.14) 0%, rgb(var(--color_primary_ch) / 0.08) 100%)',
              }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-(--color_text_muted)">
                Около месяца
              </span>
              <div>
                <div className="text-[26px] font-bold text-white leading-none tabular-nums">
                  ~{pace.projectedPerMonth}
                </div>
                <div className="text-[11px] text-(--color_text_muted) mt-1 leading-snug">
                  {trainingsNoun(pace.projectedPerMonth)} (~30 дн. при том же темпе)
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-(--color_text_muted) leading-relaxed pt-1 border-t border-(--color_border) mt-2">
            Если сохранить текущий ритм, за период около 30 дней выйдет примерно столько же сессий.
            Расчёт упрощённый: отпуска, болезни и срывы не учитываются. Источник данных —{' '}
            <span className="text-white/80">{paceScope}</span>.
          </p>
        </Section>
      )}
    </div>
  );
}
