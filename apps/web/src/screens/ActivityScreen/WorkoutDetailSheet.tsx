import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import WorkoutDateTimeRow from '@/components/WorkoutDateTimeRow';
import { getLocalDateISOString } from '@/util/exercise';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { workoutsApi, type WorkoutSet } from '@/api/workouts';
import { aiApi } from '@/api/ai';
import { parseApiDateTime } from '@/utils/date';
import { exercisesApi } from '@/api/exercises';
import type { WorkoutTimelineEntry } from '@/types/Analytics';
import type { Exercise } from '@/types/Exercise';
import { getWorkoutTypeLabel } from './utils';
import { WOD_CONFIG, type WodType } from '@/constants/workoutTypes';
import { getZoneLabel } from '@/util/zones';
import toast from 'react-hot-toast';
import GhostButton from '@/components/ui/GhostButton';
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ExerciseDrawer from '@/screens/WorkoutForm/ExerciseDrawer';
import type { ExerciseWithSets } from '@/types/Exercise';

/* ─── Типы ──────────────────────────────────────────────────────────── */

interface FullWorkout {
  id: number;
  workoutType: string;
  exercises: Array<{
    exerciseId: string;
    type: 'strength' | 'cardio' | 'wod';
    sets?: WorkoutSet[];
    rounds?: number;
    duration?: number;
    timeCap?: number;
    wodType?: string;
    distance?: number;
    blockId?: string;
  }>;
  zonesLoad: Record<string, number>;
  totalIntensity: number;
  totalVolume: number;
  notes?: string;
  rpe?: number;
}

interface Props {
  workout: WorkoutTimelineEntry | null;
  onClose: () => void;
  onUpdate?: (workoutId: number, intensity: number) => void;
}

/* ─── Константы ─────────────────────────────────────────────────────── */

const ZONE_COLORS = [
  'var(--color-emerald-400)', 'var(--color-emerald-600)', 'var(--color-emerald-300)',
  'var(--color-emerald-700)', 'var(--color-emerald-500)', 'var(--color-emerald-200)',
];

/* ─── RPE шкала ─────────────────────────────────────────────────────── */

const RPE_LEVELS = [
  { value: 1, label: 'Очень легко', emoji: '😴', color: 'bg-blue-500/20 border-blue-500/40 text-blue-300' },
  { value: 2, label: 'Легко',       emoji: '😊', color: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' },
  { value: 3, label: 'Норм',        emoji: '💪', color: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' },
  { value: 4, label: 'Тяжело',      emoji: '🔥', color: 'bg-orange-500/20 border-orange-500/40 text-orange-300' },
  { value: 5, label: 'Максимум',    emoji: '💀', color: 'bg-red-500/20 border-red-500/40 text-red-300' },
] as const;

/* ─── Утилиты ───────────────────────────────────────────────────────── */

function formatSet(set: WorkoutSet, type: string): string {
  if (type === 'cardio') {
    if (set.time) {
      const min = Math.floor(set.time / 60);
      const sec = set.time % 60;
      return min > 0 ? `${min} мин ${sec > 0 ? `${sec} с` : ''}`.trim() : `${sec} с`;
    }
    if (set.distance) return `${set.distance} м`;
    return '—';
  }
  if (set.reps && set.weight) return `${set.reps} × ${set.weight} кг`;
  if (set.reps) return `${set.reps} повт.`;
  return '—';
}

function exerciseVolume(sets?: WorkoutSet[]): number {
  return (sets ?? []).reduce((acc, s) => acc + (s.reps ?? 0) * (s.weight ?? 0), 0);
}
function formatVolume(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)} т` : `${v} кг`;
}
function extractTime(dateStr?: string): string | null {
  if (!dateStr) return null;
  try {
    const d = parseApiDateTime(dateStr);
    const h = d.getHours();
    const m = d.getMinutes();
    if (h === 0 && m === 0) return null;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  } catch { return null; }
}

// Есть ли подходы с повторами без веса (атлет должен дополнить)
function hasSetsNeedingWeight(ex: FullWorkout['exercises'][number]): boolean {
  return (ex.sets ?? []).some((s) => (s.reps ?? 0) > 0 && s.weight == null);
}

/* ─── Секции ─────────────────────────────────────────────────────────  */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide mb-3">
      {children}
    </p>
  );
}

function IntensityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-(--color_bg_card_hover) overflow-hidden">
        <div className="h-full rounded-full bg-linear-to-r from-emerald-600 to-emerald-400 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-(--color_text_muted) tabular-nums w-8 text-right">{pct}%</span>
    </div>
  );
}

/* ─── Карточка упражнения ─────────────────────────────────────────── */

function ExerciseCard({
  ex, exerciseName, isEditing, onEditClick, onDelete,
}: {
  ex: FullWorkout['exercises'][number];
  exerciseName: string;
  isEditing: boolean;
  onEditClick?: () => void;
  onDelete?: () => void;
}) {
  const isInSuperset = !!ex.blockId;
  const isWod = ex.type === 'wod';
  const hasSets = (ex.sets ?? []).length > 0;
  const vol = isWod ? 0 : exerciseVolume(ex.sets);

  return (
    <div className={`relative rounded-xl p-3 border space-y-2 ${isInSuperset ? 'bg-amber-500/10 border-amber-500/40' : 'bg-(--color_bg_card) border-(--color_border)'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isInSuperset && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold shrink-0">СС</span>}
          <span className="text-sm font-semibold text-white leading-tight truncate">{exerciseName}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {vol > 0 && (
            <span className="text-xs text-emerald-400 font-semibold">{formatVolume(vol)}</span>
          )}
          {isEditing && (
            <button
              onClick={onEditClick}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
              title="Редактировать упражнение"
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
          )}
          {isEditing && onDelete && (
            <ConfirmDeleteButton icon="trash" variant="overlay" onConfirm={onDelete} className="p-1" />
          )}
        </div>
      </div>

      {isWod ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {ex.wodType && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 font-semibold">
                {WOD_CONFIG[ex.wodType as WodType]?.label ?? ex.wodType.toUpperCase()}
              </span>
            )}
            {ex.timeCap && <span className="text-xs text-(--color_text_muted)">{ex.timeCap} мин</span>}
            {ex.rounds && <span className="text-xs text-(--color_text_muted)">{ex.rounds} раундов</span>}
          </div>
          <div className="flex items-center gap-3 text-xs">
            {ex.sets?.[0]?.reps != null && (
              <span className="text-(--color_text_secondary)">{ex.sets[0].reps} повт./раунд</span>
            )}
            {ex.sets?.[0]?.weight ? (
              <span className="text-(--color_text_secondary)">{ex.sets[0].weight} кг</span>
            ) : (
              <span className="text-white/30 italic">вес не указан</span>
            )}
            {ex.distance != null && <span className="text-(--color_text_muted)">{ex.distance} м</span>}
          </div>
        </div>
      ) : ex.type === 'cardio' || !hasSets ? (
        <div className="text-xs text-(--color_text_muted)">
          {ex.duration ? `${Math.round(ex.duration / 60)} мин` : 'Кардио'}
        </div>
      ) : (
        <div className="space-y-1.5">
          {(ex.sets ?? []).map((s, si) => (
            <div key={s.id ?? si} className="flex items-center gap-2">
              <span className="text-xs text-(--color_text_muted) w-10 shrink-0">Сет {si + 1}</span>
              <span className={`text-xs ${s.weight ? 'text-(--color_text_secondary)' : 'text-white/30 italic'}`}>
                {formatSet(s, ex.type)}
              </span>
              {s.weight == null && (s.reps ?? 0) > 0 && (
                <span className="text-[10px] text-amber-400/70 ml-auto">вес не указан</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ZonesSection({ zonesLoad }: { zonesLoad: Record<string, number> }) {
  const sorted = Object.entries(zonesLoad).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);
  if (!sorted.length) return null;
  const chartData = sorted.map(([zone, val]) => ({ name: getZoneLabel(zone), value: Math.round(val * 100) }));
  return (
    <div>
      <SectionTitle>Нагрузка по мышцам</SectionTitle>
      <ResponsiveContainer width="100%" height={sorted.length * 34 + 8}>
        <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 44, left: 0, bottom: 0 }}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 12, fill: 'var(--color_text_muted)' }} axisLine={false} tickLine={false} />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            label={{ position: 'right', fontSize: 11, fill: 'var(--color_text_muted)', formatter: (v: unknown) => `${v}%` }}
            fill={ZONE_COLORS[0]}
            fillOpacity={0.85}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Основной компонент ────────────────────────────────────────────── */

export default function WorkoutDetailSheet({ workout, onClose, onUpdate }: Props) {
  const [fullWorkout, setFullWorkout] = useState<FullWorkout | null>(null);
  const [exerciseMap, setExerciseMap] = useState<Map<string, Exercise>>(new Map());
  const [loading, setLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editExercises, setEditExercises] = useState<FullWorkout['exercises']>([]);
  const [editingExIdx, setEditingExIdx] = useState<number | null>(null);
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [editTime, setEditTime] = useState<Date>(new Date());
  const [rpe, setRpe] = useState<number | null>(null);
  const [savingWeights, setSavingWeights] = useState(false);
  const [savingRpe, setSavingRpe] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [parsePreview, setParsePreview] = useState<{
    workoutType: 'crossfit' | 'bodybuilding' | 'cardio';
    previewItems: Array<{ exerciseId: string; name: string; sets: number; reps?: number; weight?: number }>;
    exercises: Array<{ exerciseId: string; type: string; sets?: Array<{ id: string; reps?: number; weight?: number; time?: number }>; blockId?: string }>;
    warning: string | null;
  } | null>(null);

  useEffect(() => {
    if (!workout?.id) return;
    setFullWorkout(null);
    setIsEditing(false);
    setParsePreview(null);
    setLoading(true);

    Promise.all([workoutsApi.get(workout.id), exercisesApi.list()])
      .then(([res, list]) => {
        const fw = res.data as FullWorkout;
        setFullWorkout(fw);
        setEditExercises(fw.exercises.map((ex) => ({ ...ex, sets: (ex.sets ?? []).map((s) => ({ ...s })) })));
        setRpe(fw.rpe ?? null);
        setExerciseMap(new Map(list.map((e) => [e.id, e])));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workout?.id]);

  // Строит полный payload для PUT /workouts/:id (backend требует все поля)
  const buildUpdatePayload = (overrides: { exercises?: FullWorkout['exercises']; rpe?: number | null }) => {
    const exercises = (overrides.exercises ?? editExercises).map((ex) => ({
      exerciseId: ex.exerciseId,
      type: ex.type,
      sets: ex.sets,
      rounds: ex.rounds,
      duration: ex.duration,
      wodType: ex.wodType as 'amrap' | 'fortime' | 'emom' | 'tabata' | undefined,
      blockId: ex.blockId,
    }));
    const rpeVal = 'rpe' in overrides
      ? (overrides.rpe ?? undefined)
      : (fullWorkout!.rpe ?? undefined);
    return {
      date: `${getLocalDateISOString(editDate)}T${format(editTime, 'HH:mm')}:00`,
      workoutType: fullWorkout!.workoutType as 'crossfit' | 'bodybuilding' | 'cardio',
      exercises,
      notes: fullWorkout!.notes,
      rpe: rpeVal,
    };
  };

  // Сохранение весов
  const handleSaveWeights = async () => {
    if (!fullWorkout || !workout) return;
    setSavingWeights(true);
    try {
      await workoutsApi.update(fullWorkout.id, buildUpdatePayload({ exercises: editExercises }));
      setFullWorkout((prev) => prev ? { ...prev, exercises: editExercises } : prev);
      setIsEditing(false);
      toast.success('Веса сохранены');
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSavingWeights(false);
    }
  };

  const handleCancelEdit = () => {
    if (fullWorkout) {
      setEditExercises(fullWorkout.exercises.map((ex) => ({ ...ex, sets: (ex.sets ?? []).map((s) => ({ ...s })) })));
    }
    setIsEditing(false);
  };

  const handleParseNotes = async () => {
    if (!fullWorkout || !workout?.id) return;
    setIsParsing(true);
    try {
      const res = await aiApi.parseWorkoutNotes(fullWorkout.id);
      setParsePreview(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(msg ?? 'Не удалось разобрать программу');
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplyParsed = async () => {
    if (!fullWorkout || !parsePreview) return;
    setIsApplying(true);
    try {
      const res = await aiApi.applyParsedWorkout(
        fullWorkout.id,
        parsePreview.workoutType,
        parsePreview.exercises
      );
      const updated = res.data.data as FullWorkout;
      setFullWorkout(updated);
      setEditExercises(updated.exercises.map((ex) => ({ ...ex, sets: (ex.sets ?? []).map((s) => ({ ...s })) })));
      setParsePreview(null);
      toast.success('Программа сохранена');
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setIsApplying(false);
    }
  };

  // Конвертирует FullWorkout exercise → ExerciseWithSets для ExerciseDrawer
  const toExerciseWithSets = (ex: FullWorkout['exercises'][number], title: string): ExerciseWithSets => ({
    exerciseId: ex.exerciseId,
    title,
    sets: (ex.sets ?? []).map((s) => ({ id: s.id ?? crypto.randomUUID(), reps: s.reps ?? 0, weight: s.weight ?? 0 })),
    duration: ex.duration ? Math.round(ex.duration / 60) : undefined,
  });

  // Сохраняет результат ExerciseDrawer обратно в editExercises
  const handleExerciseDrawerSave = (saved: ExerciseWithSets) => {
    if (editingExIdx === null) return;
    setEditExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== editingExIdx) return ex;
        return {
          ...ex,
          exerciseId: String(saved.exerciseId),
          sets: saved.sets.map((s) => ({ id: s.id, reps: s.reps, weight: s.weight })),
          duration: saved.duration != null ? saved.duration * 60 : ex.duration,
        };
      })
    );
    setExerciseMap((prev) => {
      const next = new Map(prev);
      next.set(String(saved.exerciseId), { id: String(saved.exerciseId), title: saved.title } as any);
      return next;
    });
    setEditingExIdx(null);
  };

  // Сохранение оценки тренировки (RPE) — мгновенно при тапе
  const handleRpeTap = async (value: number) => {
    if (!fullWorkout || !workout) return;
    const newRpe = rpe === value ? null : value;
    setRpe(newRpe);
    setSavingRpe(true);
    try {
      const res = await workoutsApi.update(fullWorkout.id, buildUpdatePayload({ rpe: newRpe }));
      const updated = res.data as FullWorkout;
      setFullWorkout(updated);
      onUpdate?.(fullWorkout.id, updated.totalIntensity);
    } catch {
      setRpe(fullWorkout.rpe ?? null); // откат
      toast.error('Не удалось сохранить оценку');
    } finally {
      setSavingRpe(false);
    }
  };

  const timeLabel = extractTime(workout?.date);
  const dateLabel = workout?.date
    ? format(new Date(workout.date.slice(0, 10) + 'T12:00:00'), 'd MMMM yyyy', { locale: ru })
    : '';

  const hasMissingWeights = fullWorkout?.exercises.some(hasSetsNeedingWeight) ?? false;
  const canParseNotes =
    workout?.scheduledWorkoutId != null &&
    (fullWorkout?.exercises.length ?? 0) === 0 &&
    !!fullWorkout?.notes?.trim();
  const currentRpeLevel = RPE_LEVELS.find((r) => r.value === rpe);
  // Прошлая тренировка — можно оценивать и редактировать
  const isPast = workout?.date ? new Date(workout.date) <= new Date() : false;

  return (
    <BottomSheet
      open={workout !== null}
      onClose={onClose}
      header={
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg font-bold text-white shrink-0">
            {getWorkoutTypeLabel(workout?.type ?? 'unknown')}
          </span>
          <span className="text-sm text-(--color_text_muted) truncate">{dateLabel}</span>
          {timeLabel && (
            <span className="text-sm font-semibold text-white/70 tabular-nums shrink-0">{timeLabel}</span>
          )}
        </div>
      }
    >
      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && fullWorkout && (
        <div className="space-y-5 pt-1">

          {/* ── Бейджи ───────────────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap">
            {workout?.scheduledWorkoutId != null && (
              <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 font-medium">
                📋 От тренера
              </span>
            )}
            {!isPast && (
              <span className="text-xs px-2 py-1 bg-white/5 text-white/40 rounded-full border border-white/10">
                предстоящая
              </span>
            )}
            {isPast && hasMissingWeights && !isEditing && (
              <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                ⚠ нет весов
              </span>
            )}
            {isPast && !isEditing && (
              <button
                onClick={() => {
              const raw = workout?.date ?? '';
              const [y, m, d] = raw.slice(0, 10).split('-').map(Number);
              setEditDate(new Date(y, m - 1, d));
              const t = new Date();
              const timeStr = extractTime(raw);
              if (timeStr) { const [h, min] = timeStr.split(':').map(Number); t.setHours(h, min, 0, 0); }
              else t.setHours(9, 0, 0, 0);
              setEditTime(t);
              setIsEditing(true);
            }}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-(--color_bg_card_hover) text-(--color_text_muted) border border-(--color_border) hover:text-white transition-colors"
              >
                <PencilIcon className="w-3.5 h-3.5" />
                Редактировать
              </button>
            )}
          </div>

          {/* ── Режим редактирования ──────────────────────────────── */}
          {isEditing && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <GhostButton variant="solid" onClick={handleCancelEdit} className="flex-1">
                  <XMarkIcon className="w-4 h-4" />
                  Отмена
                </GhostButton>
                <button
                  onClick={handleSaveWeights}
                  disabled={savingWeights}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 text-black hover:bg-emerald-400 transition-colors disabled:opacity-50"
                >
                  <CheckIcon className="w-4 h-4" />
                  {savingWeights ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                <PencilIcon className="w-4 h-4 shrink-0" />
                Редактируйте дату, время, веса или замените упражнение
              </div>
              <WorkoutDateTimeRow
                date={editDate}
                time={editTime}
                onDateChange={setEditDate}
                onTimeChange={setEditTime}
              />
            </div>
          )}

          {/* ── Интенсивность ──────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-(--color_text_muted)">Интенсивность</span>
              <span className="text-xs text-(--color_text_muted) tabular-nums">{Math.round(fullWorkout.totalIntensity * 100)}%</span>
            </div>
            <IntensityBar value={fullWorkout.totalIntensity} />
          </div>

          {/* ── RPE — оценка (только прошедшая, вне режима редактирования) ── */}
          {isPast && !isEditing && (
            <div className="bg-(--color_bg_card_hover) rounded-xl p-3 border border-(--color_border)">
              <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide mb-2.5">
                Как прошла тренировка?
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {RPE_LEVELS.map((level) => {
                  const selected = rpe === level.value;
                  return (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => handleRpeTap(level.value)}
                      disabled={savingRpe}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all disabled:opacity-50 ${
                        selected
                          ? `${level.color} scale-105`
                          : 'bg-(--color_bg_card) border-(--color_border) hover:border-white/20 active:scale-95'
                      }`}
                    >
                      <span className="text-xl">{level.emoji}</span>
                      <span className={`text-[10px] font-medium leading-tight text-center ${selected ? '' : 'text-(--color_text_muted)'}`}>
                        {level.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}


          {/* ── Упражнения ─────────────────────────────────────────── */}
          {fullWorkout.exercises.length > 0 && (
            <div>
              <SectionTitle>Упражнения · {fullWorkout.exercises.length}</SectionTitle>
              <div className="space-y-0">
                {(isEditing ? editExercises : fullWorkout.exercises).map((ex, i, arr) => {
                  const name = exerciseMap.get(ex.exerciseId)?.title ?? ex.exerciseId.replace(/_/g, ' ');
                  const isLinkedToNext = isEditing && i < arr.length - 1 && !!ex.blockId && ex.blockId === arr[i + 1].blockId;
                  const showSupersetBtn = isEditing && i < arr.length - 1;
                  return (
                    <div key={i} className={showSupersetBtn ? '' : 'mb-2'}>
                      <ExerciseCard
                        ex={ex}
                        exerciseName={name}
                        isEditing={isEditing}
                        onEditClick={() => setEditingExIdx(i)}
                        onDelete={isEditing ? () => setEditExercises((prev) => prev.filter((_, idx) => idx !== i)) : undefined}
                      />
                      {isEditing && i < arr.length - 1 && (
                        <div className="relative flex items-center h-7 pl-4 mb-2">
                          {isLinkedToNext && <div className="absolute left-4.5 top-0 bottom-0 w-0.5 bg-amber-500/60" />}
                          <button
                            onClick={() => {
                              setEditExercises((prev) => {
                                const next = prev.map((e) => ({ ...e }));
                                const a = next[i], b = next[i + 1];
                                if (a.blockId && a.blockId === b.blockId) {
                                  const bid = a.blockId;
                                  for (let j = i + 1; j < next.length; j++) {
                                    if (next[j].blockId === bid) delete next[j].blockId; else break;
                                  }
                                  delete a.blockId;
                                } else {
                                  const id = a.blockId ?? crypto.randomUUID();
                                  a.blockId = id; b.blockId = id;
                                }
                                return next;
                              });
                            }}
                            className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md transition-colors ${isLinkedToNext ? 'text-amber-400 bg-amber-500/10' : 'text-white/35 hover:text-amber-400 hover:bg-amber-500/10'}`}
                          >
                            <span>⚡</span>
                            <span>{isLinkedToNext ? 'суперсет' : 'суперсет?'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Нагрузка по зонам ──────────────────────────────────── */}
          {!isEditing && <ZonesSection zonesLoad={fullWorkout.zonesLoad ?? {}} />}

          {/* ── Итого ──────────────────────────────────────────────── */}
          {!isEditing && fullWorkout.totalVolume > 0 && (
            <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border)">
              <SectionTitle>Итого</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {fullWorkout.totalVolume > 0 && (
                  <div>
                    <div className="text-lg font-bold text-emerald-400">{formatVolume(fullWorkout.totalVolume)}</div>
                    <div className="text-xs text-(--color_text_muted)">Объём</div>
                  </div>
                )}
                <div>
                  <div className="text-lg font-bold text-white">{fullWorkout.exercises.length}</div>
                  <div className="text-xs text-(--color_text_muted)">Упражнений</div>
                </div>
                {fullWorkout.totalVolume > 0 && (
                  <div>
                    <div className="text-lg font-bold text-amber-400">{Math.round(fullWorkout.totalVolume * 0.05).toLocaleString()}</div>
                    <div className="text-xs text-(--color_text_muted)">Калорий ~</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Заметки ────────────────────────────────────────────── */}
          {!isEditing && fullWorkout.notes && !parsePreview && (
            <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border)">
              <SectionTitle>Заметки</SectionTitle>
              <p className="text-sm text-(--color_text_secondary) leading-relaxed whitespace-pre-line">{fullWorkout.notes}</p>
              {canParseNotes && (
                <GhostButton onClick={handleParseNotes} disabled={isParsing} className="mt-4">
                  {isParsing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                      Разбираю программу...
                    </>
                  ) : (
                    <>✨ Разобрать программу через AI</>
                  )}
                </GhostButton>
              )}
            </div>
          )}

          {/* ── Превью AI-парсинга ──────────────────────────────────── */}
          {!isEditing && parsePreview && (
            <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) space-y-3">
              <SectionTitle>Программа от AI · проверьте</SectionTitle>

              {parsePreview.warning && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  <span className="shrink-0">⚠</span>
                  <span>{parsePreview.warning}</span>
                </div>
              )}

              <div className="space-y-1.5">
                {parsePreview.previewItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-1.5 border-b border-(--color_border) last:border-0">
                    <span className="text-sm text-white leading-tight">{item.name}</span>
                    <span className="text-xs text-(--color_text_muted) shrink-0 tabular-nums">
                      {item.sets > 0 ? `${item.sets} × ` : ''}
                      {item.reps ? `${item.reps} повт.` : ''}
                      {item.weight ? ` · ${item.weight} кг` : ''}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <GhostButton variant="solid" onClick={() => setParsePreview(null)} className="flex-1">
                  Отмена
                </GhostButton>
                <button
                  onClick={handleApplyParsed}
                  disabled={isApplying || !!parsePreview.warning}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 text-black hover:bg-emerald-400 transition-colors disabled:opacity-50"
                >
                  {isApplying ? (
                    <div className="w-4 h-4 border-2 border-black/40 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Сохранить'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && !fullWorkout && workout?.id && (
        <div className="text-center py-10 text-(--color_text_muted) text-sm">Не удалось загрузить детали</div>
      )}

      {/* ExerciseDrawer для редактирования упражнения */}
      {editingExIdx !== null && editExercises[editingExIdx] && (
        <ExerciseDrawer
          open={true}
          exercise={toExerciseWithSets(
            editExercises[editingExIdx],
            exerciseMap.get(editExercises[editingExIdx].exerciseId)?.title
              ?? editExercises[editingExIdx].exerciseId.replace(/_/g, ' ')
          )}
          workoutType={(fullWorkout?.workoutType ?? 'bodybuilding') as any}
          onClose={() => setEditingExIdx(null)}
          onSave={handleExerciseDrawerSave}
          allowReplace
        />
      )}

      {!loading && !workout?.id && (
        <div className="space-y-4 pt-2">
          <div>
            <span className="text-xs text-(--color_text_muted) mb-1 block">Интенсивность</span>
            <IntensityBar value={workout?.intensity ?? 0} />
          </div>
          {(workout?.volume ?? 0) > 0 && (
            <div>
              <span className="text-xs text-(--color_text_muted)">Объём</span>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">{formatVolume(workout?.volume ?? 0)}</p>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
