import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import BackButton from '@/components/BackButton/BackButton';
import AnimatedBlock from '@/components/ui/AnimatedBlock';
import { cardClass } from '@/components/ui/Card';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import {
  BookmarkIcon,
  BookmarkSlashIcon,
  ChartBarIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import {
  athleteApi,
  type StrengthLogEntry,
  type StrengthLogPayload,
  type WeightedExerciseOption,
} from '@/api/athlete';
import { buildStrengthLogChartPoints, strengthLogProgressPercent } from './strengthLogChart';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function StrengthLogChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  return (
    <div
      className="rounded-lg border border-white/12 bg-[#111] px-2.5 py-2 text-xs text-white shadow-xl"
      style={{ minWidth: 'max-content' }}
    >
      {label != null && label !== '' && (
        <div className="mb-1 text-white/50 whitespace-nowrap">{label}</div>
      )}
      <div className="font-medium tabular-nums whitespace-nowrap text-(--color_primary_light)">
        {v != null && Number.isFinite(Number(v)) ? `${v} кг` : '—'}
      </div>
    </div>
  );
}

function ExerciseCard({
  entry,
  pinnedOnly,
  pinsBusy,
  onPin,
  onUnpin,
}: {
  entry: StrengthLogEntry;
  pinnedOnly: boolean;
  pinsBusy: boolean;
  onPin: (exerciseId: string) => void;
  onUnpin: (exerciseId: string) => void;
}) {
  const [showChart, setShowChart] = useState(false);
  const sessions = [...entry.sessions].reverse(); // oldest → newest
  const maxSets = Math.max(...sessions.map((s) => s.sets.length), 0);
  const chartData = useMemo(
    () => buildStrengthLogChartPoints(entry).map((p) => ({ name: p.label, kg: p.value })),
    [entry],
  );
  const progressPct = useMemo(() => strengthLogProgressPercent(entry), [entry]);

  return (
    <AnimatedBlock className={`${cardClass} rounded-2xl overflow-hidden`}>
      <div className="px-4 pt-3 pb-2 border-b border-(--color_border) flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-white min-w-0 flex-1 leading-snug">
          <div>{entry.exerciseName}</div>
          {progressPct !== null && (
            <div
              className={`mt-0.5 text-[11px] font-semibold tabular-nums ${
                progressPct > 0.05
                  ? 'text-emerald-400'
                  : progressPct < -0.05
                    ? 'text-rose-400'
                    : 'text-(--color_text_muted)'
              }`}
              title="К самой ранней сессии в этом списке (1RM или макс. вес, как в графике)"
            >
              {progressPct > 0.05 ? '+' : ''}
              {progressPct % 1 === 0 ? progressPct : progressPct.toFixed(1)}% к первой сессии
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowChart((v) => !v)}
            className="flex items-center justify-center p-1.5 rounded-lg text-(--color_text_muted) hover:text-white hover:bg-white/5"
            title={showChart ? 'Таблица подходов' : 'График (1RM или макс. вес)'}
            aria-label={showChart ? 'Таблица подходов' : 'График'}
          >
            {showChart ? (
              <TableCellsIcon className="w-5 h-5 shrink-0" />
            ) : (
              <ChartBarIcon className="w-5 h-5 shrink-0" />
            )}
          </button>
          {pinnedOnly ? (
            <button
              type="button"
              disabled={pinsBusy}
              onClick={() => onUnpin(entry.exerciseId)}
              className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-(--color_text_muted) hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-40"
              title="Убрать из закреплённых"
            >
              <BookmarkSlashIcon className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Снять</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={pinsBusy}
              onClick={() => onPin(entry.exerciseId)}
              className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-(--color_primary_light) hover:bg-(--color_primary_light)/10 disabled:opacity-40"
              title="Закрепить — в журнале останутся только выбранные"
            >
              <BookmarkIcon className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Закрепить</span>
            </button>
          )}
        </div>
      </div>

      {showChart ? (
        chartData.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-(--color_text_muted)">
            Нет точек для графика (нужен вес в подходах или рассчитанный 1RM)
          </div>
        ) : (
          <div className="h-44 w-full px-2 pb-3 pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }}
                  width={36}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<StrengthLogChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.15)' }} />
                <Line
                  type="monotone"
                  dataKey="kg"
                  name="кг"
                  stroke="var(--color_primary_light)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'var(--color_primary_light)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-max">
            <thead>
              <tr className="border-b border-(--color_border)">
                <td className="px-3 py-2 text-(--color_text_muted) font-medium w-14">Подход</td>
                {sessions.map((s) => (
                  <td
                    key={s.workoutId}
                    className="px-3 py-2 text-(--color_text_muted) font-medium text-center whitespace-nowrap"
                  >
                    {formatDate(s.date)}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxSets }).map((_, setIdx) => (
                <tr key={setIdx} className="border-b border-(--color_border)/50 last:border-0">
                  <td className="px-3 py-2 text-(--color_text_muted) font-medium">{setIdx + 1}</td>
                  {sessions.map((s) => {
                    const set = s.sets[setIdx];
                    return (
                      <td key={s.workoutId} className="px-3 py-2 text-center">
                        {set?.weight && set?.reps ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-white font-semibold">{set.weight} кг</span>
                            <span className="text-(--color_text_muted)">{set.reps} повт</span>
                          </div>
                        ) : (
                          <span className="text-(--color_border)">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-(--color_bg_card_hover)/30">
                <td className="px-3 py-2 text-(--color_text_muted) font-medium">1RM</td>
                {sessions.map((s) => (
                  <td key={s.workoutId} className="px-3 py-2 text-center">
                    {s.best1RM !== null ? (
                      <span className="text-(--color_primary_light) font-bold">{s.best1RM}</span>
                    ) : (
                      <span className="text-(--color_border)">—</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </AnimatedBlock>
  );
}

export default function StrengthLogScreen({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const [payload, setPayload] = useState<StrengthLogPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinsBusy, setPinsBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const load = useCallback(() => {
    return athleteApi
      .getStrengthLog()
      .then((res) => {
        if (res.data.success) setPayload(res.data.data);
      })
      .catch(() => toast.error('Ошибка загрузки'));
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const entries = payload?.entries ?? [];
  const pinnedExerciseIds = payload?.pinnedExerciseIds ?? [];
  const suggestedPins = payload?.suggestedPins ?? [];
  const weightedExerciseOptions = payload?.weightedExerciseOptions ?? [];

  const exerciseNameById = (id: string) =>
    entries.find((e) => e.exerciseId === id)?.exerciseName ?? id.replace(/_/g, ' ');

  const applyPins = async (exerciseIds: string[], successToast?: string) => {
    setPinsBusy(true);
    try {
      const res = await athleteApi.putStrengthLogPins(exerciseIds);
      if (res.data.success) {
        setPayload(res.data.data);
        toast.success(
          successToast ??
            (exerciseIds.length === 0 ? 'Закрепления сняты' : 'Список закреплений обновлён'),
        );
      }
    } catch {
      toast.error('Не удалось сохранить закрепления');
    } finally {
      setPinsBusy(false);
    }
  };

  const pinExercise = (exerciseId: string) => {
    if (pinnedExerciseIds.includes(exerciseId)) {
      toast.error('Уже закреплено');
      return;
    }
    void applyPins([...pinnedExerciseIds, exerciseId], 'Закреплено');
  };

  const unpinExercise = (exerciseId: string) => {
    const next = pinnedExerciseIds.filter((id) => id !== exerciseId);
    void applyPins(
      next,
      next.length === 0 ? 'Закрепления сняты — показаны все упражнения' : 'Убрано из закреплённых',
    );
  };

  const addPinFromHistory = async (opt: WeightedExerciseOption) => {
    if (pinnedExerciseIds.includes(opt.exerciseId)) {
      toast.error('Уже в закреплённых');
      return;
    }
    setPinsBusy(true);
    try {
      const next = [...pinnedExerciseIds, opt.exerciseId];
      const res = await athleteApi.putStrengthLogPins(next);
      if (res.data.success) {
        setPayload(res.data.data);
        setHistoryOpen(false);
        setHistorySearch('');
        toast.success('Закреплено');
      }
    } catch {
      toast.error('Не удалось сохранить');
    } finally {
      setPinsBusy(false);
    }
  };

  const historyFiltered = historySearch.trim()
    ? weightedExerciseOptions.filter((o) =>
        o.exerciseName.toLowerCase().includes(historySearch.trim().toLowerCase()),
      )
    : weightedExerciseOptions;

  const filtered = search.trim()
    ? entries.filter((e) =>
        e.exerciseName.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : entries;

  const inner = (
    <div className={`w-full space-y-4 ${embedded ? '' : 'p-4 max-w-lg mx-auto'}`}>
        {!embedded && (
          <>
            <div className="flex items-center justify-between mb-2">
              <BackButton onClick={() => navigate(-1)} />
            </div>
            <ScreenHeader
              icon="📒"
              title="Силовой журнал"
              description="История подходов с весом — последние 6 сессий. WOD и силовые учитываются вместе."
            />
          </>
        )}

        {!loading && payload && (
          <div className="space-y-2 text-xs text-(--color_text_muted)">
            {pinnedExerciseIds.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span>Показаны только закреплённые упражнения.</span>
                <button
                  type="button"
                  disabled={pinsBusy}
                  onClick={() => applyPins([])}
                  className="text-(--color_primary_light) underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Снять закрепления
                </button>
              </div>
            ) : (
              <>
                <p>
                  Сейчас отображаются все упражнения, где был указан вес. Закрепите частые — журнал
                  станет короче.
                </p>
                {suggestedPins.length > 0 && (
                  <button
                    type="button"
                    disabled={pinsBusy}
                    onClick={() => applyPins(suggestedPins)}
                    className="w-full py-2.5 rounded-xl bg-(--color_primary)/20 border border-(--color_primary_light)/30 text-(--color_primary_light) text-sm font-semibold disabled:opacity-50"
                  >
                    Закрепить топ‑{suggestedPins.length} по частоте
                  </button>
                )}
                {weightedExerciseOptions.length > 0 && (
                  <button
                    type="button"
                    disabled={pinsBusy}
                    onClick={() => setHistoryOpen(true)}
                    className="w-full py-2.5 rounded-xl border border-(--color_border) text-(--color_text_secondary) text-sm font-medium disabled:opacity-50"
                  >
                    Выбрать из истории (в т.ч. после ИИ)
                  </button>
                )}
              </>
            )}
            {pinnedExerciseIds.length > 0 && weightedExerciseOptions.length > 0 && (
              <button
                type="button"
                disabled={pinsBusy}
                onClick={() => setHistoryOpen(true)}
                className="w-full py-2 rounded-xl border border-(--color_border) text-xs text-(--color_primary_light) disabled:opacity-50"
              >
                + Добавить из истории (кастомные и любые id)
              </button>
            )}
          </div>
        )}

        <BottomSheet
          id="strength-log-history-pins"
          open={historyOpen}
          onClose={() => {
            setHistoryOpen(false);
            setHistorySearch('');
          }}
          emoji="🏋️"
          title="Упражнения из ваших тренировок"
        >
          <p className="text-xs text-(--color_text_muted) mb-3">
            Все движения за год, где был указан вес — в том числе с распознавания фото, если ИИ
            назвал упражнение своими словами.
          </p>
          <input
            type="text"
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Поиск…"
            className="w-full px-3 py-2 rounded-lg bg-(--color_bg_card) border border-(--color_border) text-sm text-white mb-3 outline-none"
          />
          <div className="max-h-[50dvh] overflow-y-auto space-y-1 pb-4">
            {historyFiltered.length === 0 ? (
              <p className="text-sm text-(--color_text_muted) py-6 text-center">Ничего не найдено</p>
            ) : (
              historyFiltered.map((o) => (
                <button
                  key={o.exerciseId}
                  type="button"
                  disabled={pinsBusy || pinnedExerciseIds.includes(o.exerciseId)}
                  onClick={() => addPinFromHistory(o)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/5 disabled:opacity-40"
                >
                  <div className="text-sm text-white">{o.exerciseName}</div>
                  {o.isCustom && (
                    <div className="text-[10px] text-(--color_text_muted) mt-0.5">
                      Не из каталога
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </BottomSheet>

        {entries.length > 4 && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск упражнения..."
            className="w-full px-4 py-2.5 rounded-xl bg-(--color_bg_card) border border-(--color_border) text-sm text-white placeholder-text-(--color_text_muted) outline-none focus:border-(--color_primary_light)/50"
          />
        )}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-16 text-(--color_text_muted) text-sm">
            {search ? 'Упражнение не найдено' : 'Нет данных с указанным весом за год'}
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((entry, i) => (
            <AnimatedBlock key={entry.exerciseId} delay={i * 0.03}>
              <ExerciseCard
                entry={entry}
                pinnedOnly={pinnedExerciseIds.length > 0}
                pinsBusy={pinsBusy}
                onPin={pinExercise}
                onUnpin={unpinExercise}
              />
            </AnimatedBlock>
          ))}
        </div>

        {!loading && pinnedExerciseIds.length === 0 && suggestedPins.length > 0 && (
          <div className={`${cardClass} rounded-xl p-3 text-xs text-(--color_text_muted)`}>
            <div className="font-medium text-white/90 mb-2">Часто встречаются</div>
            <ul className="space-y-1">
              {suggestedPins.map((id) => (
                <li key={id}>{exerciseNameById(id)}</li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );

  if (embedded) {
    if (loading) {
      return (
        <div className="flex justify-center py-16 w-full">
          <div className="w-8 h-8 border-2 border-white/20 border-t-(--color_primary_light) rounded-full animate-spin" />
        </div>
      );
    }
    return inner;
  }

  return (
    <Screen loading={loading} className="strength-log-screen">
      {inner}
    </Screen>
  );
}
