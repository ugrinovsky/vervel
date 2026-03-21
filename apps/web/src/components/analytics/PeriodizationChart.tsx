import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { PeriodizationData } from '@/api/trainer';

interface Props {
  data: PeriodizationData;
}

const RU_MONTHS_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'май',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

function parseUTCDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatAxisDate(iso: string) {
  const d = parseUTCDate(iso);
  return `${d.getUTCDate()} ${RU_MONTHS_SHORT[d.getUTCMonth()]}`;
}

function formatTooltipDate(iso: string) {
  const d = parseUTCDate(iso);
  return `${d.getUTCDate()} ${RU_MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** TSB → процент готовности 0–100 */
function tsbToReadiness(tsb: number): number {
  if (tsb >= 15) return 95;
  if (tsb >= 0) return 50 + (tsb / 15) * 45;
  if (tsb >= -20) return 10 + ((tsb + 20) / 20) * 40;
  return Math.max(0, 10 + (tsb + 20) * 0.5);
}

/** Цвет и метка готовности (по теме приложения) */
function readinessLevel(tsb: number): { label: string; color: string } {
  if (tsb > 5) return { label: 'Готов к полной нагрузке', color: 'var(--color_primary_light)' };
  if (tsb > -20) return { label: 'Умеренная нагрузка', color: '#fbbf24' };
  return { label: 'Нужен отдых', color: '#f87171' };
}

/** Цвет бара по относительной нагрузке */
function barColor(ratio: number) {
  if (ratio > 0.75) return '#f87171';
  if (ratio > 0.45) return '#fbbf24';
  return 'var(--color_primary_light)';
}

/** Мезоциклы по провалам нагрузки */
function detectMesoCycles(weeks: Array<{ load: number }>): number[] {
  if (weeks.length < 4) return [];
  const boundaries: number[] = [0];
  for (let i = 2; i < weeks.length - 1; i++) {
    const prev3avg = (weeks[i - 1].load + weeks[i - 2].load + (weeks[i - 3]?.load ?? 0)) / 3;
    if (prev3avg > 10 && weeks[i].load < prev3avg * 0.55) {
      boundaries.push(i + 1);
    }
  }
  return boundaries;
}

// ── Компоненты ──────────────────────────────────────────────────────────────

/**
 * 240° спидометр готовности.
 * r=72 — крупная дуга на всю ширину карточки.
 */
function ReadinessGauge({ pct, color }: { pct: number; color: string }) {
  const r = 72,
    cx = 90,
    cy = 90,
    fullDeg = 240,
    startDeg = 150;

  function toXY(deg: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const s = toXY(startDeg);
  const e = toXY(startDeg + fullDeg);
  const f = toXY(startDeg + (pct / 100) * fullDeg);
  const largeFill = (pct / 100) * fullDeg > 180 ? 1 : 0;

  const trackD = `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 1 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  const fillD =
    pct > 0
      ? `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${largeFill} 1 ${f.x.toFixed(2)} ${f.y.toFixed(2)}`
      : '';

  return (
    <svg viewBox="0 0 180 152" className="w-full" style={{ maxHeight: 152 }}>
      <defs>
        <filter id="pg-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Track: двойной слой для глубины */}
      <path
        d={trackD}
        fill="none"
        className="stroke-white/6"
        strokeWidth="20"
        strokeLinecap="round"
      />
      <path
        d={trackD}
        fill="none"
        className="stroke-white/3"
        strokeWidth="11"
        strokeLinecap="round"
      />

      {/* Fill: glow-слой + основной */}
      {fillD && (
        <path
          d={fillD}
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          opacity="0.4"
          filter="url(#pg-glow)"
        />
      )}
      {fillD && (
        <path d={fillD} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" />
      )}

      {/* Dot-указатель текущей позиции */}
      {pct > 0 && (
        <>
          <circle
            cx={f.x.toFixed(2)}
            cy={f.y.toFixed(2)}
            r="11"
            fill={color}
            opacity="0.3"
            filter="url(#pg-glow)"
          />
          <circle cx={f.x.toFixed(2)} cy={f.y.toFixed(2)} r="6" className="fill-white" />
          <circle cx={f.x.toFixed(2)} cy={f.y.toFixed(2)} r="3" fill={color} />
        </>
      )}

      {/* Числа внутри — тот же размер, что раньше */}
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        className="fill-white"
        fontSize="30"
        fontWeight="bold"
        fontFamily="system-ui"
      >
        {Math.round(pct)}%
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        className="fill-white/40"
        fontSize="11"
        fontFamily="system-ui"
      >
        готовность
      </text>

      {/* Метки 0 / 100 у концов дуги */}
      <text
        x={(s.x - 8).toFixed(1)}
        y={(s.y + 14).toFixed(1)}
        textAnchor="end"
        className="fill-white/20"
        fontSize="9"
        fontFamily="system-ui"
      >
        0
      </text>
      <text
        x={(e.x + 8).toFixed(1)}
        y={(e.y + 14).toFixed(1)}
        textAnchor="start"
        className="fill-white/20"
        fontSize="9"
        fontFamily="system-ui"
      >
        100
      </text>
    </svg>
  );
}

/** Карточка метрики ATL / CTL / TSB */
function MetricCard({
  abbr,
  label,
  value,
  color,
  hint,
  hintColor,
  progress,
  zeroAt,
  staticDesc,
}: {
  abbr: string;
  label: string;
  value: number;
  color: string;
  hint: string;
  hintColor: string;
  progress: number;
  zeroAt?: number;
  staticDesc: string;
}) {
  return (
    <div
      className="rounded-xl border p-3 flex flex-col gap-0.5"
      style={{ borderColor: 'var(--color_border)', backgroundColor: 'var(--color_bg_card)' }}
    >
      <div className="text-xs font-mono font-bold" style={{ color }}>
        {abbr}
      </div>
      <div className="text-xl font-bold text-white leading-none">
        {abbr === 'TSB' && value >= 0 ? '+' : ''}
        {value.toFixed(1)}
      </div>
      <div className="text-[10px] text-(--color_text_muted)">{label}</div>
      <div className="relative h-1.5 rounded-full my-1 bg-white/8">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(100, Math.max(0, progress * 100))}%`,
            backgroundColor: color,
          }}
        />
        {zeroAt !== undefined && (
          <div
            className="absolute top-0 bottom-0 w-px"
            className="bg-white/35"
            style={{ left: `${zeroAt * 100}%` }}
          />
        )}
      </div>
      <div className="text-[10px] font-semibold leading-tight" style={{ color: hintColor }}>
        {hint}
      </div>
      <div className="text-[9px] leading-tight text-white/30">
        {staticDesc}
      </div>
    </div>
  );
}

function metricStatus(
  abbr: 'ATL' | 'CTL' | 'TSB',
  value: number
): { hint: string; hintColor: string } {
  if (abbr === 'ATL') {
    if (value > 50) return { hint: 'Высокая усталость', hintColor: '#f87171' };
    if (value > 25) return { hint: 'Умеренная усталость', hintColor: '#fbbf24' };
    return { hint: 'Хорошее восстановление', hintColor: 'var(--color_primary_light)' };
  }
  if (abbr === 'CTL') {
    if (value < 10) return { hint: 'Низкая тренированность', hintColor: '#f87171' };
    if (value < 25) return { hint: 'Форма развивается', hintColor: '#fbbf24' };
    return { hint: 'Хорошая база', hintColor: 'var(--color_primary_light)' };
  }
  // TSB
  if (value < -20) return { hint: 'Нужен отдых', hintColor: '#f87171' };
  if (value < 5) return { hint: 'Умеренная нагрузка', hintColor: '#fbbf24' };
  return { hint: 'Готов к нагрузкам', hintColor: 'var(--color_primary_light)' };
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-white/50 mb-1">{formatTooltipDate(label)}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {Number(p.value).toFixed(1)}
        </p>
      ))}
    </div>
  );
}

// ── Главный компонент ────────────────────────────────────────────────────────

const TSB_ZONES = [
  {
    range: '> +15',
    label: 'Пик готовности',
    detail:
      'Вы отдохнули и свежи. Хороший момент для рекорда или соревнований. Если нет цели — добавьте нагрузку, иначе форма начнёт снижаться.',
    color: 'var(--color_primary_light)',
  },
  {
    range: '0 … +15',
    label: 'Оптимальная форма',
    detail:
      'Баланс между усталостью и тренированностью. Вы в хорошей форме и достаточно свежи для качественных тренировок.',
    color: 'var(--color_primary_light)',
  },
  {
    range: '−20 … 0',
    label: 'Продуктивная усталость',
    detail:
      'Организм под нагрузкой адаптируется и становится сильнее. Это нормальное состояние при тренировочном блоке.',
    color: '#fbbf24',
  },
  {
    range: '< −20',
    label: 'Перетренированность',
    detail:
      'Усталость критическая. Риск травмы и падения иммунитета. Нужна разгрузочная неделя или полный отдых.',
    color: '#f87171',
  },
];

export default function PeriodizationChart({ data }: Props) {
  const { current, phase, series, weeklyLoad } = data;
  const [showChart, setShowChart] = useState(false);

  const readiness = tsbToReadiness(current.tsb);
  const rl = readinessLevel(current.tsb);

  const activeZone = current.tsb > 15 ? 0 : current.tsb >= 0 ? 1 : current.tsb >= -20 ? 2 : 3;

  const ctlTrend = useMemo(() => {
    const twoWeeksAgo = series[series.length - 15];
    const diff = twoWeeksAgo ? current.ctl - twoWeeksAgo.ctl : 0;
    if (diff > 1.5)
      return { label: '▲ тренированность растёт', color: 'var(--color_primary_light)' };
    if (diff < -1.5) return { label: '▼ меньше тренировок', color: '#fbbf24' };
    return { label: '→ тренированность стабильна', color: '#fbbf24' };
  }, [series, current.ctl]);

  const weeks12 = weeklyLoad.slice(-12);
  const maxLoad = Math.max(...weeks12.map((w) => w.load), 1);
  const mesoBoundaries = useMemo(() => detectMesoCycles(weeks12), [weeks12]);

  const currentWeekLoad = weeks12[weeks12.length - 1]?.load ?? 0;
  const recentAvg = weeks12.slice(-5, -1).reduce((s, w) => s + w.load, 0) / 4;
  const weekVsAvg = recentAvg > 0 ? Math.round((currentWeekLoad / recentAvg - 1) * 100) : 0;

  const chartSeries = useMemo(
    () => series.filter((_, i) => i % 4 === 0 || i === series.length - 1),
    [series]
  );
  const xTickInterval = Math.max(1, Math.floor(chartSeries.length / 6));

  const atlStatus = metricStatus('ATL', current.atl);
  const ctlStatus = metricStatus('CTL', current.ctl);
  const tsbStatus = metricStatus('TSB', current.tsb);

  return (
    <div className="space-y-3">
      {/* ── HERO: Спидометр готовности ── */}
      <div
        className="rounded-xl border border-(--color_border) p-4"
        style={{ backgroundColor: 'var(--color_bg_card)' }}
      >
        <ReadinessGauge pct={readiness} color={rl.color} />

        <div className="flex items-start gap-3 mt-1">
          <div className="text-2xl leading-none mt-0.5">{phase.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-sm font-bold text-white">{phase.name}</span>
              <span className="text-xs font-semibold" style={{ color: rl.color }}>
                {rl.label}
              </span>
            </div>
            <p className="text-xs text-(--color_text_muted) leading-relaxed">{phase.advice}</p>
          </div>
          <span className="text-xs font-semibold shrink-0 mt-0.5" style={{ color: ctlTrend.color }}>
            {ctlTrend.label}
          </span>
        </div>
      </div>

      {/* ── МЕТРИКИ: ATL / CTL / TSB ── */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCard
          abbr="ATL"
          label="Усталость"
          value={current.atl}
          color="#f87171"
          progress={current.atl / 80}
          hint={atlStatus.hint}
          hintColor={atlStatus.hintColor}
          staticDesc="Острая нагрузка за 7 дней"
        />
        <MetricCard
          abbr="CTL"
          label="Форма"
          value={current.ctl}
          color="var(--color_primary_light)"
          progress={current.ctl / 80}
          hint={ctlStatus.hint}
          hintColor={ctlStatus.hintColor}
          staticDesc="Накопленная форма за 42 дня"
        />
        <MetricCard
          abbr="TSB"
          label="Свежесть"
          value={current.tsb}
          color="var(--color_primary_icon)"
          progress={(current.tsb + 30) / 55}
          zeroAt={30 / 55}
          hint={tsbStatus.hint}
          hintColor={tsbStatus.hintColor}
          staticDesc="CTL − ATL = баланс"
        />
      </div>

      {/* ── ЗОНЫ TSB: пояснения ── */}
      <div
        className="rounded-xl border border-(--color_border) overflow-hidden"
        style={{ backgroundColor: 'var(--color_bg_card)' }}
      >
        <div className="px-4 pt-3 pb-2">
          <p className="text-xs font-semibold text-white">Что означает ваш TSB</p>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--color_border)' }}>
          {TSB_ZONES.map(({ range, label, detail, color }, idx) => {
            const isActive = idx === activeZone;
            return (
              <div
                key={range}
                className={`flex gap-3 px-4 py-2.5 transition-colors ${isActive ? 'bg-white/4' : ''}`}
              >
                {/* Active indicator bar */}
                <div
                  className="w-0.5 rounded-full shrink-0 self-stretch"
                  style={{ backgroundColor: isActive ? color : 'transparent' }}
                />
                <div className="min-w-13 shrink-0">
                  <span className="text-[10px] font-mono font-semibold" style={{ color }}>
                    {range}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-xs font-semibold leading-tight mb-0.5 ${!isActive ? 'text-white/70' : ''}`}
                    style={isActive ? { color } : {}}
                  >
                    {label}
                    {isActive && ' ←'}
                  </div>
                  <div className="text-[10px] text-(--color_text_muted) leading-relaxed">
                    {detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── НАГРУЗКА ПО НЕДЕЛЯМ ── */}
      <div
        className="rounded-xl border border-(--color_border) p-4"
        style={{ backgroundColor: 'var(--color_bg_card)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold text-white">Нагрузка по неделям</p>
            <p className="text-xs text-(--color_text_muted)">последние 12 недель</p>
          </div>
          {recentAvg > 0 && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-lg"
              style={{
                color:
                  weekVsAvg > 10
                    ? '#f87171'
                    : weekVsAvg < -10
                      ? 'var(--color_primary_light)'
                      : '#fbbf24',
                backgroundColor:
                  weekVsAvg > 10
                    ? 'rgba(248,113,113,0.12)'
                    : weekVsAvg < -10
                      ? 'rgb(var(--color_primary_light_ch) / 0.12)'
                      : 'rgba(251,191,36,0.12)',
              }}
            >
              Эта нед.: {weekVsAvg > 0 ? '+' : ''}
              {weekVsAvg}%
            </span>
          )}
        </div>

        {/* Бары: обёртка с отступом снизу для лейбла "сейчас" */}
        <div className="relative mb-5">
          <div className="flex items-end gap-1" style={{ height: 64 }}>
            {weeks12.map((w, i) => {
              const ratio = w.load / maxLoad;
              const isNow = i === weeks12.length - 1;
              const isMesoBoundary = mesoBoundaries.includes(i) && i > 0;
              return (
                <div key={i} className="relative flex-1 h-full">
                  {isMesoBoundary && (
                    <div className="absolute -left-0.5 top-0 bottom-0 w-px bg-white/15 z-10" />
                  )}
                  <div className="w-full h-full flex items-end">
                    <div
                      className="w-full rounded-sm transition-all"
                      style={{
                        height: `${Math.max(ratio * 100, 4)}%`,
                        backgroundColor: barColor(ratio),
                        opacity: w.load === 0 ? 0.3 : 0.85,
                        outline: isNow ? '2px solid var(--color_primary_light)' : 'none',
                        outlineOffset: '1px',
                      }}
                    />
                  </div>
                  {isNow && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 text-[8px] font-bold whitespace-nowrap"
                      style={{ top: '100%', marginTop: '4px', color: 'var(--color_primary_light)' }}
                    >
                      ▲ сейчас
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {mesoBoundaries.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-3">
            {mesoBoundaries.map((start, idx) => {
              const end = mesoBoundaries[idx + 1] ?? weeks12.length;
              const isActive = end === weeks12.length;
              return (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 rounded-md border"
                  style={{
                    borderColor: isActive ? 'var(--color_primary_light)' : 'var(--color_border)',
                    color: isActive ? 'var(--color_primary_light)' : 'var(--color_text_muted)',
                    backgroundColor: isActive
                      ? 'rgb(var(--color_primary_light_ch) / 0.1)'
                      : 'transparent',
                  }}
                >
                  {isActive ? '→ ' : ''}Цикл {idx + 1} ({end - start} нед.)
                </span>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3">
          {[
            { color: 'var(--color_primary_light)', label: 'восстановление' },
            { color: '#fbbf24', label: 'средняя' },
            { color: '#f87171', label: 'высокая' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-(--color_text_muted)">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── ДИНАМИКА 90 дней (свёрнуто) ── */}
      <button
        onClick={() => setShowChart((v) => !v)}
        className="w-full text-xs text-(--color_text_muted) hover:text-white transition-colors py-1"
      >
        {showChart ? '▲ Скрыть динамику' : '▼ Динамика ATL / CTL / TSB за 90 дней'}
      </button>

      {showChart && (
        <div
          className="rounded-xl border border-(--color_border) p-4"
          style={{ backgroundColor: 'var(--color_bg_card)' }}
        >
          <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide mb-3">
            Динамика за 90 дней
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartSeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--color_text_muted)' }}
                tickFormatter={formatAxisDate}
                interval={xTickInterval}
              />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color_text_muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="var(--color_border)" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="ctl"
                name="CTL (форма)"
                stroke="var(--color_primary_light)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="atl"
                name="ATL (усталость)"
                stroke="#f87171"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="tsb"
                name="TSB (свежесть)"
                stroke="var(--color_primary_icon)"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
