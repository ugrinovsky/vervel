import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import type { PeriodizationData } from '@/api/trainer';

interface Props {
  data: PeriodizationData;
}

const RU_MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

/** Парсим ISO-дату без timezone-сдвига */
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

function MetricCard({
  label,
  abbr,
  value,
  color,
  description,
  fullDesc,
  status,
}: {
  label: string;
  abbr: string;
  value: number;
  color: string;
  description: string;
  fullDesc: string;
  status?: 'good' | 'warn' | 'bad';
}) {
  const statusColor =
    status === 'good'
      ? 'text-emerald-400'
      : status === 'warn'
        ? 'text-amber-400'
        : status === 'bad'
          ? 'text-red-400'
          : 'text-white';

  return (
    <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-mono font-bold" style={{ color }}>{abbr}</span>
        <span className="text-xs text-(--color_text_muted) uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${statusColor}`}>{value.toFixed(1)}</div>
      <div className="text-xs text-(--color_text_muted) leading-relaxed">{description}</div>
      <p className="text-xs text-(--color_text_muted)/70 leading-relaxed mt-0.5">{fullDesc}</p>
      <div className="w-full h-1 rounded-full mt-1" style={{ backgroundColor: color + '30' }}>
        <div
          className="h-1 rounded-full transition-all"
          style={{ width: `${Math.min(Math.abs(value), 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2.5 text-xs shadow-2xl ring-1 ring-black/30">
      <p className="text-white/50 mb-1.5">{formatTooltipDate(label)}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {Number(p.value).toFixed(1)}
        </p>
      ))}
    </div>
  );
}

export default function PeriodizationChart({ data }: Props) {
  const { current, phase, series, weeklyLoad } = data;

  // Прореживаем: каждый 4-й день + последний → ~22–23 точки из 90
  const chartSeries = useMemo(
    () => series.filter((_, i) => i % 4 === 0 || i === series.length - 1),
    [series]
  );

  const tsbStatus = useMemo(() => {
    if (current.tsb > 5) return 'good';
    if (current.tsb < -20) return 'bad';
    return 'warn';
  }, [current.tsb]);

  const maxWeekLoad = Math.max(...weeklyLoad.map((w) => w.load), 1);

  // Показываем ~7 меток по оси X
  const xTickInterval = Math.max(1, Math.floor(chartSeries.length / 7));

  return (
    <div className="space-y-4">
      {/* Метрики с расширенными описаниями */}
      <div className="grid grid-cols-1 gap-2">
        <MetricCard
          abbr="ATL"
          label="Усталость"
          value={current.atl}
          color="#f87171"
          description="Acute Training Load — средняя нагрузка за последние 7 дней"
          fullDesc="Показывает, как много вы тренировались в последнюю неделю. Высокое ATL = вы много работали, тело устало. Снижается примерно за неделю отдыха."
        />
        <MetricCard
          abbr="CTL"
          label="Форма (тренированность)"
          value={current.ctl}
          color="var(--color_primary_light)"
          description="Chronic Training Load — средняя нагрузка за 42 дня"
          fullDesc="Отражает накопленную тренированность за 6 недель. Высокое CTL = вы системно тренируетесь и ваш организм адаптировался к нагрузкам. Растёт медленно — нельзя «накачать» за один день."
        />
        <MetricCard
          abbr="TSB"
          label="Свежесть (готовность)"
          value={current.tsb}
          color="#60a5fa"
          description="Training Stress Balance = CTL − ATL"
          fullDesc="Разница между формой и усталостью. Положительный TSB — вы свежи и готовы к максимальным усилиям. Отрицательный — устали, но это нормально при наборе формы. Критически низкий (< −20) — сигнал перетренированности."
          status={tsbStatus}
        />
      </div>

      {/* Фаза */}
      <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border)">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xl">{phase.emoji}</span>
          <span className="text-sm font-semibold text-white">{phase.name}</span>
        </div>
        <p className="text-xs text-(--color_text_muted) leading-relaxed">{phase.advice}</p>
      </div>

      {/* График ATL/CTL/TSB */}
      <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border)">
        <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide mb-1">
          Динамика за 90 дней
        </p>
        <p className="text-xs text-(--color_text_muted) mb-3">
          Ось X — даты. Наведите на точку чтобы увидеть значения.
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartSeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--color_text_muted)' }}
              tickFormatter={formatAxisDate}
              interval={xTickInterval}
            />
            <YAxis tick={{ fontSize: 11, fill: 'var(--color_text_muted)' }} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="ctl" name="CTL (форма)" stroke="var(--color_primary_light)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="atl" name="ATL (усталость)" stroke="#f87171" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="tsb" name="TSB (свежесть)" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {[
            { color: 'var(--color_primary_light)', label: 'CTL — форма', dashed: false },
            { color: '#f87171', label: 'ATL — усталость', dashed: false },
            { color: '#60a5fa', label: 'TSB — свежесть', dashed: true },
          ].map(({ color, label, dashed }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-6 h-0.5"
                style={{
                  backgroundColor: color,
                  backgroundImage: dashed
                    ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 6px)`
                    : 'none',
                }}
              />
              <span className="text-xs text-(--color_text_muted)">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Недельная нагрузка */}
      {weeklyLoad.length > 0 && (
        <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border)">
          <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide mb-1">
            Нагрузка по неделям
          </p>
          <p className="text-xs text-(--color_text_muted) mb-3">
            Суммарный тренировочный стресс за каждую неделю (последние 12 недель)
          </p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={weeklyLoad} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--color_text_muted)' }} />
              <YAxis hide />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2.5 text-xs shadow-2xl ring-1 ring-black/30">
                      <p className="text-white font-semibold mb-1">Неделя с {d.week}</p>
                      <p className="text-white/50">Нагрузка: <span className="text-white/80">{d.load}</span></p>
                      <p className="text-white/50">Тренировок: <span className="text-white/80">{d.workouts}</span></p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="load" radius={[3, 3, 0, 0]}>
                {weeklyLoad.map((entry, i) => {
                  const ratio = entry.load / maxWeekLoad;
                  const color = ratio > 0.8 ? '#f87171' : ratio > 0.5 ? '#fbbf24' : 'var(--color_primary_light)';
                  return <Cell key={i} fill={color} fillOpacity={0.8} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-(--color_text_muted) mt-1">🟢 низкая · 🟡 средняя · 🔴 высокая нагрузка</p>
        </div>
      )}

      {/* Расшифровка TSB */}
      <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border)">
        <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide mb-3">
          Как читать TSB (свежесть)
        </p>
        <div className="space-y-2">
          {[
            { range: '> +15', label: 'Пик готовности', detail: 'Вы отдохнули и свежи. Хороший момент для рекорда или соревнований. Если нет цели — добавьте нагрузку, иначе форма начнёт снижаться.', color: 'text-emerald-400' },
            { range: '0 … +15', label: 'Оптимальная форма', detail: 'Баланс между усталостью и тренированностью. Вы в хорошей форме и достаточно свежи для качественных тренировок.', color: 'text-emerald-300' },
            { range: '−20 … 0', label: 'Продуктивная усталость', detail: 'Организм под нагрузкой адаптируется и становится сильнее. Это нормальное состояние при тренировочном блоке.', color: 'text-amber-400' },
            { range: '< −20', label: 'Перетренированность', detail: 'Усталость критическая. Риск травмы и падения иммунитета. Нужна разгрузочная неделя или полный отдых.', color: 'text-red-400' },
          ].map(({ range, label, detail, color }) => (
            <div key={range} className="flex gap-3">
              <span className={`text-xs font-mono font-bold w-16 shrink-0 mt-0.5 ${color}`}>{range}</span>
              <div>
                <p className={`text-xs font-semibold ${color}`}>{label}</p>
                <p className="text-xs text-(--color_text_muted) leading-relaxed">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
