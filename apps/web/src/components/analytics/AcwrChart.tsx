import { useMemo } from 'react';
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
import { AnalyticsSheetIntro } from './AnalyticsSheetIntro';
import type { RechartsTooltipContentProps } from './rechartsTooltip';

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

function zoneLabel(
  zone: PeriodizationData['acwr']['current']['zone']
): { title: string; detail: string; color: string } {
  switch (zone) {
    case 'insufficient_data':
      return {
        title: 'Мало данных',
        detail:
          'Когда тренировок мало или они нерегулярны, эту шкалу лучше не трактовать — накопите несколько недель в журнале.',
        color: 'var(--color_text_muted)',
      };
    case 'low':
      return {
        title: 'Легче обычного',
        detail:
          'Последняя неделя заметно спокойнее вашего обычного месячного ритма. Так бывает после отдыха или лёгких недель.',
        color: '#60a5fa',
      };
    case 'optimal':
      return {
        title: 'Около привычного',
        detail:
          'Неделя по нагрузке близка к тому, к чему организм уже привык за последние недели — привычный ритм.',
        color: 'var(--color_primary_icon)',
      };
    case 'elevated':
      return {
        title: 'Жёстче обычного',
        detail:
          'Неделя заметно плотнее, чем ваш средний ритм. Следите за сном и самочувствием.',
        color: '#fbbf24',
      };
    case 'high':
      return {
        title: 'Резко жёстче обычного',
        detail:
          'Скачок относительно привычного объёма большой. Имеет смысл не наращивать спеша и при необходимости смягчить неделю.',
        color: '#f87171',
      };
  }
}

type AcwrTooltipPayload = {
  date?: string;
  label?: string;
  ratio?: number | null;
  acute?: number;
  chronic?: number;
};

function CustomTooltip({ active, payload }: RechartsTooltipContentProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const pl = row?.payload as AcwrTooltipPayload | undefined;
  if (!pl) return null;

  let dateHeading = '—';
  if (pl.date && /^\d{4}-\d{2}-\d{2}/.test(pl.date)) {
    const [y, m, d] = pl.date.split('-').map(Number);
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      dateHeading = formatTooltipDate(pl.date);
    } else if (pl.label) {
      dateHeading = pl.label;
    }
  } else if (pl.label) {
    dateHeading = pl.label;
  }

  const ratioText =
    pl.ratio === null || pl.ratio === undefined ? '—' : Number(pl.ratio).toFixed(2);

  const acuteText = typeof pl.acute === 'number' && !Number.isNaN(pl.acute) ? pl.acute : '—';
  const chronicText =
    typeof pl.chronic === 'number' && !Number.isNaN(pl.chronic) ? pl.chronic : '—';

  return (
    <div className="bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <p className="text-white/50 mb-1">{dateHeading}</p>
      <p className="font-semibold text-white">Соотношение недели к базе: {ratioText}</p>
      <p className="text-white/60 mt-1">
        Нагрузка 7 дней: {acuteText} · средняя «база» (из 28 дней): {chronicText}
      </p>
    </div>
  );
}

export default function AcwrChart({ data }: Props) {
  const { acwr } = data;
  const z = zoneLabel(acwr.current.zone);

  const chartData = useMemo(() => {
    const raw = acwr.series ?? [];
    const step = Math.max(1, Math.floor(raw.length / 48));
    const sampled = raw.filter((_, i) => i % step === 0 || i === raw.length - 1);
    return sampled.map((p) => ({
      date: p.date,
      label: formatAxisDate(p.date),
      ratio: p.ratio,
      acute: p.acute,
      chronic: p.chronic,
    }));
  }, [acwr.series]);

  const ratioStr =
    acwr.current.ratio === null ? '—' : acwr.current.ratio.toFixed(2);

  return (
    <div className="space-y-3">
      <AnalyticsSheetIntro>
        Сравниваем последнюю неделю с вашим обычным ритмом за ~месяц. Условно: <strong>1</strong> — как
        обычно, <strong>ниже</strong> — полегче, <strong>выше</strong> — плотнее, чем к чему вы
        привыкли. Считаем из журнала тренировок; это не диагноз, а ориентир.
      </AnalyticsSheetIntro>

      <div
        className="rounded-xl border border-(--color_border) p-4"
        style={{ backgroundColor: 'var(--color_bg_card)' }}
      >
        <div className="flex items-start gap-3">
          <div className="text-2xl leading-none">⚖️</div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-bold text-white">
                Сейчас: {ratioStr}
                {ratioStr !== '—' && (
                  <span className="font-normal text-(--color_text_muted)"> (≈ «неделя к базе»)</span>
                )}
              </span>
              <span className="text-xs font-semibold" style={{ color: z.color }}>
                {z.title}
              </span>
            </div>
            <p className="text-xs text-(--color_text_muted) leading-relaxed mt-1">{z.detail}</p>
          </div>
        </div>
      </div>

      {chartData.length > 0 && chartData.some((d) => d.ratio !== null) ? (
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tickFormatter={formatAxisDate}
                tick={{ fill: 'var(--color_text_muted)', fontSize: 10 }}
                interval="preserveStartEnd"
                tickLine={false}
                axisLine={{ stroke: 'var(--color_border)' }}
              />
              <YAxis
                domain={[0, 'auto']}
                tick={{ fill: 'var(--color_text_muted)', fontSize: 10 }}
                width={32}
                tickLine={false}
                axisLine={{ stroke: 'var(--color_border)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0.8} stroke="#60a5fa" strokeDasharray="4 4" />
              <ReferenceLine y={1.3} stroke="#4ade80" strokeDasharray="4 4" />
              <ReferenceLine y={1.5} stroke="#f87171" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="ratio"
                name="ACWR"
                stroke="var(--color_primary_icon)"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center h-32 text-sm text-(--color_text_muted)">
          Недостаточно тренировок для кривой
        </div>
      )}

      <p className="text-[11px] text-(--color_text_muted) leading-relaxed">
        Пунктиры — ориентиры из исследований: <strong>0,8</strong> легче базы, <strong>1,3</strong> и{' '}
        <strong>1,5</strong> — всё плотнее относительно привычного месяца.
      </p>
    </div>
  );
}
