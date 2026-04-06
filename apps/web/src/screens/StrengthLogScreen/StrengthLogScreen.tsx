import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
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
import GhostButton from '@/components/ui/GhostButton';
import {
  BookmarkIcon,
  BookmarkSlashIcon,
  ChartBarIcon,
  PresentationChartLineIcon,
  StarIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import {
  athleteApi,
  type ExerciseStandardAliasDTO,
  type ExerciseStandardDTO,
  type StrengthLogDashboardMetric,
  type StrengthLogEntry,
  type StrengthLogPayload,
  type WeightedExerciseOption,
} from '@/api/athlete';
import ExercisePicker from '@/components/ExercisePicker/ExercisePicker';
import type { ExerciseWithSets } from '@/types/Exercise';
import { buildStrengthLogChartPoints, strengthLogProgressPercent } from './strengthLogChart';

const GROUP_STD_PREFIX = 'std:';

function resolveStandardIdForStrengthEntry(
  entry: StrengthLogEntry,
  standards: ExerciseStandardDTO[],
  aliases: ExerciseStandardAliasDTO[],
): number | null {
  if (entry.standardId != null) {
    const n = Number(entry.standardId);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const viaAlias = aliases.find((x) => x.sourceExerciseId === entry.exerciseId);
  if (viaAlias != null) {
    const n = Number(viaAlias.standardId);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const viaCatalog = standards.find((x) => x.catalogExerciseId === entry.exerciseId);
  return viaCatalog != null ? Number(viaCatalog.id) : null;
}

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
  linkedToStandard,
  pinnedOnly,
  pinsBusy,
  onPin,
  onUnpin,
  onOpenStandards,
}: {
  entry: StrengthLogEntry;
  /** Учёт эталона по standardId, алиасу или привязке к каталогу (важно для закреплённых «сырых» id) */
  linkedToStandard: boolean;
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
            {linkedToStandard && (
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
            className="flex items-center justify-center p-1.5 rounded-lg text-(--color_text_muted) hover:text-(--color_primary_light) hover:bg-(--color_primary_light)/10"
            title="Объединить варианты одного упражнения"
            aria-label="Эталон: объединить варианты упражнения"
          >
            <StarIcon className="w-5 h-5 shrink-0" />
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
        <div className="w-full overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-xs">
            <colgroup>
              <col style={{ width: '3.5rem', maxWidth: '3.5rem' }} />
              {sessions.map((s) => (
                <col
                  key={s.workoutId}
                  style={{
                    width:
                      sessions.length > 0
                        ? `min(7.5rem, calc((100% - 3.5rem) / ${sessions.length}))`
                        : undefined,
                    maxWidth: '7.5rem',
                  }}
                />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-(--color_border)">
                <th
                  scope="col"
                  className="px-2 py-2 text-left text-(--color_text_muted) font-medium min-w-0"
                >
                  Подход
                </th>
                {sessions.map((s) => (
                  <th
                    scope="col"
                    key={s.workoutId}
                    className="px-2 py-2 text-(--color_text_muted) font-medium text-center min-w-0 max-w-[7.5rem]"
                    title={new Date(s.date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  >
                    <span className="block truncate">{formatDate(s.date)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxSets }).map((_, setIdx) => (
                <tr key={setIdx} className="border-b border-(--color_border)/50 last:border-0">
                  <td className="px-2 py-2 text-(--color_text_muted) font-medium min-w-0">
                    {setIdx + 1}
                  </td>
                  {sessions.map((s) => {
                    const set = s.sets[setIdx];
                    return (
                      <td
                        key={s.workoutId}
                        className="px-2 py-2 text-center align-middle min-w-0 max-w-[7.5rem]"
                      >
                        {set?.weight && set?.reps ? (
                          <div className="flex flex-col items-center gap-0.5 min-w-0">
                            <span className="text-white font-semibold tabular-nums truncate max-w-full">
                              {set.weight} кг
                            </span>
                            <span className="text-(--color_text_muted) tabular-nums truncate max-w-full">
                              {set.reps} повт
                            </span>
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
                <td className="px-2 py-2 text-(--color_text_muted) font-medium min-w-0">1RM</td>
                {sessions.map((s) => (
                  <td
                    key={s.workoutId}
                    className="px-2 py-2 text-center min-w-0 max-w-[7.5rem]"
                  >
                    {s.best1RM !== null ? (
                      <span className="text-(--color_primary_light) font-bold tabular-nums">
                        {s.best1RM}
                      </span>
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
      const resolved = resolveStandardIdForStrengthEntry(entry, standards, aliases);
      const std = resolved != null ? standards.find((s) => s.id === resolved) : null;
      setStandardsEntry(entry);
      setStandardsLabelDraft((std?.displayLabel ?? entry.exerciseName).trim() || entry.exerciseName);
      setStandardsCatalogId(std?.catalogExerciseId ?? null);
      setStandardsAliasSearch('');
      setStandardsPickerOpen(false);
      setStandardsOpen(true);
    },
    [standards, aliases],
  );

  const closeStandardsSheet = () => {
    setStandardsOpen(false);
    setStandardsEntry(null);
    setStandardsAliasSearch('');
    setStandardsPickerOpen(false);
  };

  const effectiveStandardIdForSheet = useMemo(
    () =>
      standardsEntry ? resolveStandardIdForStrengthEntry(standardsEntry, standards, aliases) : null,
    [standardsEntry, standards, aliases],
  );

  const saveStandardLabel = async () => {
    if (!standardsEntry || effectiveStandardIdForSheet == null || standardsBusy) return;
    const label = standardsLabelDraft.trim();
    if (!label) {
      toast.error('Введите название');
      return;
    }
    setStandardsBusy(true);
    try {
      const res = await athleteApi.patchExerciseStandard(effectiveStandardIdForSheet, {
        displayLabel: label,
      });
      if (res.data?.success === false) {
        toast.error(
          typeof (res.data as { message?: string }).message === 'string'
            ? (res.data as { message: string }).message
            : 'Не удалось сохранить',
        );
        return;
      }
      toast.success('Сохранено');
      await load();
    } catch (e) {
      const msg = isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(typeof msg === 'string' && msg.trim() ? msg : 'Не удалось сохранить');
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

  const standardsSid = effectiveStandardIdForSheet;
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
                <GhostButton
                  variant="link"
                  disabled={pinsBusy}
                  onClick={() => applyPins([])}
                  className="text-(--color_primary_light) hover:text-(--color_primary_light)"
                >
                  Снять закрепления
                </GhostButton>
              </div>
            ) : (
              <>
                <p>
                  Сейчас отображаются все упражнения, где был указан вес. Закрепите частые — журнал
                  станет короче.
                </p>
                {suggestedPins.length > 0 && (
                  <GhostButton
                    variant="accent-soft"
                    disabled={pinsBusy}
                    onClick={() => applyPins(suggestedPins)}
                    className="bg-(--color_primary)/20 border-(--color_primary_light)/30"
                  >
                    Закрепить топ‑{suggestedPins.length} по частоте
                  </GhostButton>
                )}
                {weightedExerciseOptions.length > 0 && (
                  <GhostButton
                    variant="solid"
                    disabled={pinsBusy}
                    onClick={() => setHistoryOpen(true)}
                    className="w-full py-2.5 text-(--color_text_secondary) hover:text-white"
                  >
                    Выбрать из истории (в т.ч. после ИИ)
                  </GhostButton>
                )}
              </>
            )}
            {pinnedExerciseIds.length > 0 && weightedExerciseOptions.length > 0 && (
              <GhostButton
                variant="outline-accent"
                disabled={pinsBusy}
                onClick={() => setHistoryOpen(true)}
                className="w-full py-2 rounded-xl"
              >
                + Добавить из истории (кастомные и любые id)
              </GhostButton>
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
            Все движения за год, где был указан вес — в том числе занесённые по фото через ИИ.
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
          emoji="⭐"
          title={standardsEntry ? `Эталон: ${standardsEntry.exerciseName}` : 'Эталон'}
        >
          {standardsEntry && (
            <div className="space-y-4 pb-4 text-sm">
              <div className="text-xs text-(--color_text_muted) leading-relaxed space-y-2">
                <p className="text-(--color_text_secondary)">
                  Одно и то же упражнение в приложении может называться по-разному: из каталога, своим
                  именем, после ИИ-распознавания по фото и т.д.
                </p>
                <p>
                  <span className="text-white font-medium">Эталон</span> — это общее «имя группы»:
                  вы связываете все нужные варианты с одним эталоном, и журнал показывает{' '}
                  <span className="text-white font-medium">одну карточку</span> с полной историей,
                  графиком и <span className="text-white font-medium">сводкой за 30 дней</span> по всему
                  движению целиком.
                </p>
              </div>

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
                    <GhostButton
                      variant="outline-accent"
                      disabled={standardsBusy}
                      onClick={() => setStandardsPickerOpen(true)}
                    >
                      {standardsCatalogId ? 'Сменить из каталога' : 'Привязать к каталогу (необязательно)'}
                    </GhostButton>
                    {standardsCatalogId && (
                      <GhostButton
                        variant="link"
                        disabled={standardsBusy}
                        onClick={() => setStandardsCatalogId(null)}
                      >
                        Сбросить каталог
                      </GhostButton>
                    )}
                  </div>
                  {standardsCatalogId && (
                    <p className="text-[11px] text-(--color_text_muted)">
                      Выбрано упражнение из каталога — так проще сопоставлять с базой движений.
                    </p>
                  )}
                  <GhostButton
                    variant="accent-soft"
                    disabled={standardsBusy}
                    onClick={() => void createStandardForEntry()}
                  >
                    Создать эталон и привязать эту карточку
                  </GhostButton>
                </div>
              )}

              {standardsSid != null && (
                <>
                  <GhostButton
                    variant="solid"
                    disabled={standardsBusy}
                    onClick={() => void saveStandardLabel()}
                    className="w-full py-2 text-(--color_text_secondary)"
                  >
                    Сохранить название
                  </GhostButton>

                  {standardsLinkedSources.length > 0 && (
                    <div>
                      <div className="text-[11px] text-(--color_text_muted) mb-2">
                        Варианты, которые уже входят в эту группу
                      </div>
                      <ul className="space-y-1 max-h-28 overflow-y-auto text-xs">
                        {standardsLinkedSources.map((a) => (
                          <li key={a.sourceExerciseId} className="text-white/90">
                            {exerciseNameById(a.sourceExerciseId)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <div className="text-[11px] text-(--color_text_muted) mb-2">
                      Добавить ещё вариант из вашей истории (то же движение под другим названием)
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
                linkedToStandard={resolveStandardIdForStrengthEntry(entry, standards, aliases) !== null}
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
