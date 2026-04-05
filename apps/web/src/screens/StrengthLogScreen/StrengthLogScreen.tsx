import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
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
  LinkIcon,
  PresentationChartLineIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import {
  athleteApi,
  type StrengthLogDashboardMetric,
  type StrengthLogEntry,
  type StrengthLogPayload,
  type WeightedExerciseOption,
} from '@/api/athlete';
import ExercisePicker from '@/components/ExercisePicker/ExercisePicker';
import type { ExerciseWithSets } from '@/types/Exercise';
import { buildStrengthLogChartPoints, strengthLogProgressPercent } from './strengthLogChart';

const GROUP_STD_PREFIX = 'std:';

function formatShortDashDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

type CardViewMode = 'table' | 'chart' | 'dashboard';

function DashboardMetricBlock({ m }: { m: StrengthLogDashboardMetric }) {
  const delta =
    m.changePct !== null ? (
      <span
        className={
          m.changePct > 0
            ? 'text-emerald-400'
            : m.changePct < 0
              ? 'text-rose-400'
              : 'text-(--color_text_muted)'
        }
      >
        {m.changePct > 0 ? '+' : ''}
        {m.changePct}%
      </span>
    ) : (
      <span className="text-(--color_text_muted)">—</span>
    );

  return (
    <div className="px-4 py-4 space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-(--color_text_muted) mb-0.5">Лучший 1RM (30 дн)</div>
          <div className="text-lg font-bold text-(--color_primary_light)">
            {m.best1RMLast30d !== null ? `${m.best1RMLast30d} кг` : '—'}
          </div>
        </div>
        <div>
          <div className="text-(--color_text_muted) mb-0.5 leading-snug">
            <span className="block">Изменение 1RM в %</span>
            <span className="block">к предыдущим 30 дням</span>
          </div>
          <div className="text-lg font-semibold text-white">{delta}</div>
        </div>
        <div>
          <div className="text-(--color_text_muted) mb-0.5">Сессий (30 дн)</div>
          <div className="text-white font-medium">{m.sessionsLast30d}</div>
        </div>
        <div>
          <div className="text-(--color_text_muted) mb-0.5">Последний раз</div>
          <div className="text-white font-medium">{formatShortDashDate(m.lastWorkedAt)}</div>
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-(--color_text_muted)">
        1RM — оценка по Эпли по лучшему подходу в дне; учитываются подходы с весом из всех строк,
        попавших в эталон.
      </p>
    </div>
  );
}

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
  onOpenStandards,
}: {
  entry: StrengthLogEntry;
  pinnedOnly: boolean;
  pinsBusy: boolean;
  onPin: (exerciseId: string) => void;
  onUnpin: (exerciseId: string) => void;
  onOpenStandards: (entry: StrengthLogEntry) => void;
}) {
  const [viewMode, setViewMode] = useState<CardViewMode>('table');
  const sessions = [...entry.sessions].reverse(); // oldest → newest
  const maxSets = Math.max(...sessions.map((s) => s.sets.length), 0);
  const chartData = useMemo(
    () => buildStrengthLogChartPoints(entry).map((p) => ({ name: p.label, kg: p.value })),
    [entry],
  );
  const progressPct = useMemo(() => strengthLogProgressPercent(entry), [entry]);

  const modeBtn = (mode: CardViewMode, icon: ReactNode, title: string) => (
    <button
      type="button"
      onClick={() => setViewMode(mode)}
      className={`flex items-center justify-center p-1.5 rounded-lg transition-colors ${
        viewMode === mode
          ? 'bg-(--color_primary_light)/20 text-(--color_primary_light)'
          : 'text-(--color_text_muted) hover:text-white hover:bg-white/5'
      }`}
      title={title}
      aria-label={title}
    >
      {icon}
    </button>
  );

  return (
    <AnimatedBlock className={`${cardClass} rounded-2xl overflow-hidden`}>
      <div className="px-4 pt-3 pb-2 border-b border-(--color_border) flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-white min-w-0 flex-1 leading-snug">
          <div className="flex items-center gap-2 flex-wrap">
            <span>{entry.exerciseName}</span>
            {entry.standardId !== null && (
              <span className="text-[10px] font-medium text-(--color_primary_light)/80 px-1.5 py-0.5 rounded bg-(--color_primary_light)/10">
                эталон
              </span>
            )}
          </div>
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
          {modeBtn(
            'table',
            <TableCellsIcon className="w-5 h-5 shrink-0" />,
            'Таблица подходов',
          )}
          {modeBtn('chart', <ChartBarIcon className="w-5 h-5 shrink-0" />, 'График')}
          {modeBtn(
            'dashboard',
            <PresentationChartLineIcon className="w-5 h-5 shrink-0" />,
            'Сводка 30 дней',
          )}
          <button
            type="button"
            onClick={() => onOpenStandards(entry)}
            className="flex items-center justify-center p-1.5 rounded-lg text-(--color_text_muted) hover:text-white hover:bg-white/5"
            title="Эталоны: объединить разные названия"
            aria-label="Эталоны"
          >
            <LinkIcon className="w-5 h-5 shrink-0" />
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

      {viewMode === 'dashboard' ? (
        entry.dashboardMetric ? (
          <DashboardMetricBlock m={entry.dashboardMetric} />
        ) : (
          <div className="px-4 py-8 text-center text-xs text-(--color_text_muted)">
            Нет данных для сводки (нужны сессии в последних 30 днях)
          </div>
        )
      ) : viewMode === 'chart' ? (
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
  const [standardsOpen, setStandardsOpen] = useState(false);
  const [standardsEntry, setStandardsEntry] = useState<StrengthLogEntry | null>(null);
  const [standardsLabelDraft, setStandardsLabelDraft] = useState('');
  const [standardsCatalogId, setStandardsCatalogId] = useState<string | null>(null);
  const [standardsPickerOpen, setStandardsPickerOpen] = useState(false);
  const [standardsBusy, setStandardsBusy] = useState(false);
  const [standardsAliasSearch, setStandardsAliasSearch] = useState('');

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
  const standards = payload?.standards ?? [];
  const aliases = payload?.aliases ?? [];

  const exerciseNameById = (id: string) =>
    entries.find((e) => e.exerciseId === id)?.exerciseName ?? id.replace(/_/g, ' ');

  const openStandardsFor = useCallback(
    (entry: StrengthLogEntry) => {
      const std = entry.standardId != null ? standards.find((s) => s.id === entry.standardId) : null;
      setStandardsEntry(entry);
      setStandardsLabelDraft((std?.displayLabel ?? entry.exerciseName).trim() || entry.exerciseName);
      setStandardsCatalogId(std?.catalogExerciseId ?? null);
      setStandardsAliasSearch('');
      setStandardsPickerOpen(false);
      setStandardsOpen(true);
    },
    [standards],
  );

  const closeStandardsSheet = () => {
    setStandardsOpen(false);
    setStandardsEntry(null);
    setStandardsAliasSearch('');
    setStandardsPickerOpen(false);
  };

  const saveStandardLabel = async () => {
    if (!standardsEntry?.standardId || standardsBusy) return;
    const label = standardsLabelDraft.trim();
    if (!label) {
      toast.error('Введите название');
      return;
    }
    setStandardsBusy(true);
    try {
      const res = await athleteApi.patchExerciseStandard(standardsEntry.standardId, { displayLabel: label });
      if (res.data.success) {
        toast.success('Сохранено');
        await load();
      }
    } catch {
      toast.error('Не удалось сохранить');
    } finally {
      setStandardsBusy(false);
    }
  };

  const createStandardForEntry = async () => {
    if (!standardsEntry || standardsBusy) return;
    if (standardsEntry.exerciseId.startsWith(GROUP_STD_PREFIX)) {
      toast.error('Эта карточка уже сгруппирована по эталону');
      return;
    }
    const label = standardsLabelDraft.trim();
    if (!label) {
      toast.error('Введите название эталона');
      return;
    }
    setStandardsBusy(true);
    try {
      const res = await athleteApi.postExerciseStandard({
        displayLabel: label,
        catalogExerciseId: standardsCatalogId ?? undefined,
      });
      if (!res.data.success) {
        toast.error('Не удалось создать');
        return;
      }
      const newId = res.data.data.id;
      const aliasRes = await athleteApi.postExerciseStandardAlias({
        sourceExerciseId: standardsEntry.exerciseId,
        standardId: newId,
      });
      if (!aliasRes.data.success) {
        toast.error('Эталон создан, но привязка не удалась');
        return;
      }
      toast.success('Эталон создан');
      closeStandardsSheet();
      await load();
    } catch {
      toast.error('Не удалось создать эталон');
    } finally {
      setStandardsBusy(false);
    }
  };

  const addAliasToCurrentStandard = async (sourceExerciseId: string, standardId: number) => {
    if (standardsBusy) return;
    setStandardsBusy(true);
    try {
      const res = await athleteApi.postExerciseStandardAlias({ sourceExerciseId, standardId });
      if (res.data.success) {
        toast.success('Привязано');
        await load();
      }
    } catch {
      toast.error('Уже привязано к другому эталону или ошибка');
    } finally {
      setStandardsBusy(false);
    }
  };

  const onCatalogPickedForStandard = (ex: ExerciseWithSets) => {
    setStandardsCatalogId(String(ex.exerciseId));
    setStandardsPickerOpen(false);
  };

  const standardsSid = standardsEntry?.standardId ?? null;
  const standardsAliasCandidates =
    standardsSid != null
      ? weightedExerciseOptions.filter((o) => !aliases.some((a) => a.sourceExerciseId === o.exerciseId))
      : [];
  const standardsAliasFiltered = standardsAliasSearch.trim()
    ? standardsAliasCandidates.filter((o) =>
        o.exerciseName.toLowerCase().includes(standardsAliasSearch.trim().toLowerCase()),
      )
    : standardsAliasCandidates;
  const standardsLinkedSources =
    standardsSid != null ? aliases.filter((a) => a.standardId === standardsSid) : [];

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

        <BottomSheet
          id="strength-log-standards"
          open={standardsOpen && standardsEntry != null}
          onClose={closeStandardsSheet}
          emoji="🔗"
          title={standardsEntry ? `Эталон: ${standardsEntry.exerciseName}` : 'Эталон'}
        >
          {standardsEntry && (
            <div className="space-y-4 pb-4 text-sm">
              <p className="text-xs text-(--color_text_muted) leading-relaxed">
                Объединяйте разные id одного движения (каталог, кастом, ИИ) в одну карточку журнала и
                сводку 30 дней.
              </p>

              <div>
                <label className="block text-[11px] text-(--color_text_muted) mb-1">Название эталона</label>
                <input
                  type="text"
                  value={standardsLabelDraft}
                  onChange={(e) => setStandardsLabelDraft(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-(--color_bg_card) border border-(--color_border) text-white text-sm outline-none"
                />
              </div>

              {standardsSid == null && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={standardsBusy}
                      onClick={() => setStandardsPickerOpen(true)}
                      className="px-3 py-2 rounded-lg border border-(--color_border) text-xs text-(--color_primary_light) disabled:opacity-50"
                    >
                      {standardsCatalogId ? 'Сменить из каталога' : 'Привязать к каталогу (необязательно)'}
                    </button>
                    {standardsCatalogId && (
                      <button
                        type="button"
                        disabled={standardsBusy}
                        onClick={() => setStandardsCatalogId(null)}
                        className="text-xs text-(--color_text_muted) underline-offset-2 hover:underline"
                      >
                        Сбросить каталог
                      </button>
                    )}
                  </div>
                  {standardsCatalogId && (
                    <p className="text-[11px] text-(--color_text_muted)">Каталог: {standardsCatalogId}</p>
                  )}
                  <button
                    type="button"
                    disabled={standardsBusy}
                    onClick={() => void createStandardForEntry()}
                    className="w-full py-2.5 rounded-xl bg-(--color_primary)/25 border border-(--color_primary_light)/40 text-(--color_primary_light) text-sm font-semibold disabled:opacity-50"
                  >
                    Создать эталон и привязать эту карточку
                  </button>
                </div>
              )}

              {standardsSid != null && (
                <>
                  <button
                    type="button"
                    disabled={standardsBusy}
                    onClick={() => void saveStandardLabel()}
                    className="w-full py-2 rounded-xl border border-(--color_border) text-(--color_text_secondary) text-sm font-medium disabled:opacity-50"
                  >
                    Сохранить название
                  </button>

                  {standardsLinkedSources.length > 0 && (
                    <div>
                      <div className="text-[11px] text-(--color_text_muted) mb-2">Привязанные id</div>
                      <ul className="space-y-1 max-h-28 overflow-y-auto text-xs">
                        {standardsLinkedSources.map((a) => (
                          <li key={a.sourceExerciseId} className="text-white/90">
                            {exerciseNameById(a.sourceExerciseId)}
                            <span className="text-(--color_text_muted) ml-1 font-mono text-[10px]">
                              ({a.sourceExerciseId})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <div className="text-[11px] text-(--color_text_muted) mb-2">
                      Добавить синоним из истории (ещё не привязан ни к одному эталону)
                    </div>
                    <input
                      type="text"
                      value={standardsAliasSearch}
                      onChange={(e) => setStandardsAliasSearch(e.target.value)}
                      placeholder="Поиск…"
                      className="w-full px-3 py-2 rounded-lg bg-(--color_bg_card) border border-(--color_border) text-sm text-white mb-2 outline-none"
                    />
                    <div className="max-h-[40dvh] overflow-y-auto space-y-1">
                      {standardsAliasFiltered.length === 0 ? (
                        <p className="text-xs text-(--color_text_muted) py-4 text-center">
                          Нет доступных вариантов
                        </p>
                      ) : (
                        standardsAliasFiltered.map((o) => (
                          <button
                            key={o.exerciseId}
                            type="button"
                            disabled={standardsBusy}
                            onClick={() => void addAliasToCurrentStandard(o.exerciseId, standardsSid)}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 disabled:opacity-40"
                          >
                            <div className="text-sm text-white">{o.exerciseName}</div>
                            {o.isCustom && (
                              <div className="text-[10px] text-(--color_text_muted)">Не из каталога</div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </BottomSheet>

        <ExercisePicker
          open={standardsPickerOpen}
          onClose={() => setStandardsPickerOpen(false)}
          workoutType="strength"
          onSelect={onCatalogPickedForStandard}
        />

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
                onOpenStandards={openStandardsFor}
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
