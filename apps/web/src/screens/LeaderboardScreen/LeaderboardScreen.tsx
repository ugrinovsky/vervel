import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import BackButton from '@/components/BackButton/BackButton';
import ToggleGroup from '@/components/ui/ToggleGroup';
import AnimatedBlock from '@/components/ui/AnimatedBlock';
import LineChart from '@/components/ui/LineChart';
import { cardClass } from '@/components/ui/Card';
import { trainerApi, type LeaderboardEntry } from '@/api/trainer';
import { athleteApi } from '@/api/athlete';
import { useActiveMode } from '@/contexts/AuthContext';
import { drawLeaderboardCard, shareCanvas } from '@/utils/shareCard';
import IconButton from '@/components/ui/IconButton';
import CardHeader from '@/components/ui/CardHeader';
import { ArrowUpOnSquareIcon } from '@heroicons/react/24/outline';

type Metric = 'progressionCoeff' | 'relativeVolume' | 'streakWeeks' | 'xp';

const METRICS: {
  key: Metric;
  label: string;
  hint: string;
  format: (v: number | null) => string;
}[] = [
  {
    key: 'progressionCoeff',
    label: '📈 Прогресс',
    hint: 'Средний % прироста максимального рабочего веса по всем упражнениям за период. Считается по формуле Эпли (1RM). Отражает реальный силовой прогресс, а не абсолютные цифры.',
    format: (v) => (v !== null ? `${v >= 0 ? '+' : ''}${v}%` : '—'),
  },
  {
    key: 'relativeVolume',
    label: '🏋️ Объём',
    hint: 'Суммарный тоннаж за период, делённый на вес тела атлета. Позволяет честно сравнивать людей разной комплекции: 100 кг атлет и 70 кг атлет поднимают разные веса, но относительный объём уравнивает.',
    format: (v) => (v !== null ? `${v}` : '—'),
  },
  {
    key: 'streakWeeks',
    label: '🔥 Серия',
    hint: 'Количество недель подряд, в которых атлет выполнил план тренировок (3 или 5 занятий в неделю в зависимости от режима). Серия сбрасывается при пропуске недели.',
    format: (v) => (v !== null ? `${v} нед` : '—'),
  },
  {
    key: 'xp',
    label: '⭐ XP',
    hint: 'Очки опыта, накопленные за всё время: каждая тренировка даёт XP, бонусы за серии, личные рекорды и достижения. XP копятся и не сбрасываются — отражают общую активность.',
    format: (v) => (v !== null ? `${v} XP` : '—'),
  },
];

const MEDALS = ['🥇', '🥈', '🥉'];

function getLevelRange(level: number): string {
  if (level >= 76) return 'Легенда';
  if (level >= 51) return 'Элита';
  if (level >= 31) return 'Профи';
  if (level >= 16) return 'Атлет';
  if (level >= 6) return 'Любитель';
  return 'Новичок';
}

function Initials({ name, size = 'md' }: { name: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const letters = (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const cls =
    size === 'lg'
      ? 'w-12 h-12 rounded-full text-sm font-bold'
      : size === 'sm'
        ? 'w-7 h-7 rounded-full text-[10px] font-bold'
        : 'w-9 h-9 rounded-full text-xs font-bold';
  return (
    <div
      className={`${cls} bg-(--color_primary_light)/20 flex items-center justify-center shrink-0 text-(--color_primary_light)`}
    >
      {letters}
    </div>
  );
}

const PODIUM_COLS = [
  { sortIdx: 1, medal: '🥈', platformH: 'h-14', platformColor: 'color-mix(in srgb, var(--color_chart_2) 40%, transparent)', valueColor: 'text-(--color_chart_2)' },
  { sortIdx: 0, medal: '🥇', platformH: 'h-20', platformColor: 'color-mix(in srgb, var(--color_chart_1) 65%, transparent)', valueColor: 'text-(--color_chart_1)' },
  { sortIdx: 2, medal: '🥉', platformH: 'h-9',  platformColor: 'color-mix(in srgb, var(--color_chart_3) 35%, transparent)', valueColor: 'text-(--color_chart_3)' },
];

function Podium({
  sorted,
  metric,
  format,
}: {
  sorted: LeaderboardEntry[];
  metric: Metric;
  format: (v: number | null) => string;
}) {
  return (
    <div className="flex items-end gap-1.5">
      {PODIUM_COLS.map(({ sortIdx, medal, platformH, platformColor, valueColor }) => {
        const candidate = sorted[sortIdx] ?? null;
        const entry = candidate && (candidate[metric] ?? 0) > 0 ? candidate : null;
        const rank = sortIdx + 1;
        return (
          <div key={sortIdx} className="flex-1 flex flex-col items-center">
            {entry ? (
              <>
                {/* Athlete above podium */}
                <div className="flex flex-col items-center gap-1 mb-2 px-1">
                  <span className="text-2xl leading-none">{medal}</span>
                  <Initials name={entry.fullName} size="lg" />
                  <div className="text-xs font-semibold text-white text-center leading-tight mt-0.5 w-full truncate">
                    {entry.fullName?.split(' ')[0] || 'Атлет'}
                  </div>
                  <div className={`text-sm font-bold ${valueColor}`}>
                    {format(entry[metric] ?? null)}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 mb-2 px-1 opacity-30">
                <span className="text-2xl leading-none">{medal}</span>
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <span className="text-base">?</span>
                </div>
                <div className="text-xs text-white mt-0.5">—</div>
                <div className="text-sm font-bold text-white">—</div>
              </div>
            )}
            {/* Platform block */}
            <div className={`w-full ${platformH} rounded-t-xl flex items-center justify-center`} style={{ backgroundColor: platformColor }}>
              <span className="text-lg font-black text-white/30">{rank}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}


export default function LeaderboardScreen() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { isTrainer } = useActiveMode();
  const id = Number(groupId);

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [groupName, setGroupName] = useState('');
  const [trainerName, setTrainerName] = useState<string | null>(null);
  const [period, setPeriod] = useState<7 | 30>(30);
  const [metric, setMetric] = useState<Metric>('progressionCoeff');
  const [loading, setLoading] = useState(true);

  const load = async (p: 7 | 30 = period) => {
    setLoading(true);
    try {
      const res = isTrainer
        ? await trainerApi.getGroupLeaderboard(id, p)
        : await athleteApi.getGroupLeaderboard(id, p);
      setEntries(res.data.data.entries);
      setGroupName(res.data.data.groupName);
      setTrainerName(res.data.data.trainerName);
    } catch {
      toast.error('Ошибка загрузки лидерборда');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const currentMetricDef = METRICS.find((m) => m.key === metric)!;
    const canvas = document.createElement('canvas');
    try {
      await drawLeaderboardCard(canvas, {
        groupName,
        trainerName,
        metricLabel: currentMetricDef.label,
        periodLabel: period === 7 ? '7 дней' : '30 дней',
        entries: sorted,
        format: currentMetricDef.format,
        metric,
        isTrainer,
      });
      await shareCanvas(canvas);
    } catch {
      toast.error('Не удалось создать карточку');
    }
  };

  useEffect(() => { load(); }, [id, isTrainer]);

  const currentMetric = METRICS.find((m) => m.key === metric)!;

  const sorted = [...entries].sort((a, b) => {
    const av = a[metric] ?? -Infinity;
    const bv = b[metric] ?? -Infinity;
    if (av !== bv) return bv - av;
    return b.workouts - a.workouts;
  });

  const topValue = sorted[0]?.[metric] ?? null;
  const hasResults = topValue !== null && topValue > 0;
  const metricEmpty = entries.every((e) => e[metric] === null || e[metric] === 0);

  return (
    <Screen loading={loading} className="leaderboard-screen">
      <div className="p-4 w-full max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between mb-5">
          <BackButton onClick={() => navigate(-1)} />
          {entries.length > 0 && (
            <IconButton onClick={handleShare}>
              <ArrowUpOnSquareIcon className="w-3.5 h-3.5" />
              Поделиться · {currentMetric.label}
            </IconButton>
          )}
        </div>

        <ScreenHeader icon="🏆" title="Лидерборд" description="Рейтинг атлетов группы" />

        {/* Period */}
        <ToggleGroup
          cols={2}
          value={String(period)}
          onChange={(v) => {
            const p = Number(v) as 7 | 30;
            setPeriod(p);
            load(p);
          }}
          options={[
            { value: '7', label: '7 дней' },
            { value: '30', label: '30 дней' },
          ]}
        />

        {/* Metric */}
        <ToggleGroup
          joined
          value={metric}
          onChange={(v) => setMetric(v as Metric)}
          options={METRICS.map((m) => ({ value: m.key, label: m.label }))}
          itemPy="py-1.5"
        />

        {/* Metric hint */}
        <div className="min-h-18 px-3 py-2.5 rounded-xl bg-(--color_bg_card) border border-(--color_border) text-xs text-(--color_text_muted) leading-relaxed">
          {currentMetric.hint}
          {metricEmpty && entries.length > 0 && (
            <div className="mt-1.5 text-(--color_text_muted)/70">
              Данных по этой метрике пока нет — атлеты отсортированы по количеству тренировок.
            </div>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-12 text-(--color_text_muted) text-sm">
            Нет данных за выбранный период
          </div>
        ) : (
          <>
            {/* Podium */}
            {sorted.length >= 2 && (
              <AnimatedBlock className={`${cardClass} rounded-2xl px-4 pt-3 pb-0 overflow-hidden`}>
                <CardHeader title="Топ-3" />
                <Podium sorted={hasResults ? sorted : []} metric={metric} format={currentMetric.format} />
              </AnimatedBlock>
            )}

            {/* Line chart */}
            <AnimatedBlock delay={0.08} className={`${cardClass} rounded-2xl p-4`}>
              <CardHeader
                title="Активность"
                description={`${metric === 'relativeVolume' ? 'объём (кг)' : 'тренировок'} по ${period === 7 ? 'дням' : 'неделям'}`}
              />
              <LineChart
                dates={sorted[0]?.weeklySeries?.map((p) => p.date) ?? []}
                valueKey={metric === 'relativeVolume' ? 'volume' : 'workouts'}
                series={sorted.map((e) => ({
                  id: e.userId,
                  label: e.fullName?.split(' ')[0] || 'Атлет',
                  points: e.weeklySeries,
                }))}
              />
            </AnimatedBlock>

            {/* Detail cards */}
            <CardHeader title="Атлеты" />
            <div className="space-y-2">
              {sorted.map((entry, i) => {
                const value = entry[metric];
                const hasValue = (value ?? 0) > 0;
                const medal = hasValue ? (MEDALS[i] ?? null) : null;
                const isTop3 = hasValue && i < 3;

                return (
                  <AnimatedBlock
                    key={entry.userId}
                    delay={0.12 + i * 0.04}
                    className={`${cardClass} rounded-2xl p-4 ${isTop3 ? 'border border-(--color_primary_light)/30' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 shrink-0 text-center">
                        {medal ? (
                          <span className="text-xl">{medal}</span>
                        ) : (
                          <span className="text-sm font-bold text-(--color_text_muted)">{i + 1}</span>
                        )}
                      </div>
                      <Initials name={entry.fullName} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {entry.fullName || 'Атлет'}
                        </div>
                        <div className="text-xs text-(--color_text_muted)">
                          Lv {entry.level} · {getLevelRange(entry.level)}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-white shrink-0">
                        {currentMetric.format(value ?? null)}
                      </div>
                    </div>

                    <div className="flex gap-3 mt-2.5 text-[10px] text-(--color_text_muted)">
                      <span>🏋️ {entry.workouts} трен.</span>
                      <span>⚖️ {entry.volume.toLocaleString()} кг</span>
                      <span>🔥 {entry.streakWeeks} нед</span>
                      <span>⭐ {entry.xp} XP</span>
                    </div>
                  </AnimatedBlock>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Screen>
  );
}
