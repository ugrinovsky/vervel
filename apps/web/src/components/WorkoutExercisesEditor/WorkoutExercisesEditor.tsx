/**
 * WorkoutExercisesEditor — inline list editor for a workout's exercises.
 * Used by WorkoutInlineForm (scheduling) and TrainerTemplatesScreen (templates).
 *
 * Single-exercise params are rendered via ExerciseParamsEditor (shared with ExerciseDrawer).
 */
import ExerciseParamsEditor from '@/components/ExerciseParamsEditor/ExerciseParamsEditor';
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton';
import ExercisePicker from '@/components/ExercisePicker/ExercisePicker';
import type { ExerciseData } from '@/api/trainer';
import type { ExerciseWithSets } from '@/types/Exercise';
import type { WorkoutType } from '@/components/WorkoutTypeTabs';
import { useState } from 'react';
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

interface Props {
  workoutType: WorkoutType;
  exercises: ExerciseData[];
  onChange: (exercises: ExerciseData[]) => void;
  /** Show superset link buttons between exercises (bodybuilding only). Default: true */
  superset?: boolean;
  /** Extra content above the exercise list (e.g. AI tools) */
  toolbar?: React.ReactNode;
  profileWeight?: number;
}

// ── Normalisation helpers (exported for type-switch handlers) ──────────

export function normalizeExerciseForType(type: WorkoutType, ex: ExerciseData): ExerciseData {
  if (type === 'cardio') return ex;
  if (type === 'crossfit') {
    const { setsDetail: _s, sets: _c, blockId: _b, ...rest } = ex;
    return { ...rest, reps: ex.reps ?? ex.setsDetail?.[0]?.reps ?? 10 };
  }
  // bodybuilding
  if (ex.duration != null) return ex;
  return {
    ...ex,
    setsDetail: ex.setsDetail?.length
      ? ex.setsDetail
      : Array.from({ length: ex.sets ?? 3 }, () => ({ reps: ex.reps ?? 10, weight: ex.weight })),
  };
}

export function normalizeExercisesForType(type: WorkoutType, exs: ExerciseData[]): ExerciseData[] {
  return exs.map((ex) => normalizeExerciseForType(type, ex));
}

// ── Component ─────────────────────────────────────────────────────────

export default function WorkoutExercisesEditor({
  workoutType,
  exercises,
  onChange,
  superset = true,
  toolbar,
  profileWeight,
}: Props) {
  const [replacingIdx, setReplacingIdx] = useState<number | null>(null);

  const handleReplace = (ex: ExerciseWithSets) => {
    if (replacingIdx === null) return;
    onChange(
      exercises.map((old, i) => {
        if (i !== replacingIdx) return old;
        return { ...old, exerciseId: String(ex.exerciseId), name: ex.title };
      })
    );
    setReplacingIdx(null);
  };

  // ── Helpers ─────────────────────────────────────────────────────────

  const update = (index: number, patch: Partial<ExerciseData>) => {
    if ('bodyweight' in patch && patch.bodyweight && profileWeight) {
      onChange(exercises.map((ex, i) => {
        if (i !== index) return ex;
        return {
          ...ex,
          ...patch,
          setsDetail: (ex.setsDetail ?? []).map((s) => ({ ...s, weight: s.weight ?? profileWeight })),
        };
      }));
    } else {
      onChange(exercises.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));
    }
  };

  const removeExercise = (index: number) => {
    onChange(exercises.filter((_, i) => i !== index));
  };

  const addSet = (exIdx: number) => {
    onChange(
      exercises.map((ex, i) => {
        if (i !== exIdx || ex.duration != null) return ex;
        const detail = ex.setsDetail ?? [];
        const last = detail[detail.length - 1];
        return { ...ex, setsDetail: [...detail, { reps: last?.reps ?? 10, weight: last?.weight }] };
      })
    );
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    onChange(
      exercises.map((ex, i) => {
        if (i !== exIdx || ex.duration != null) return ex;
        const detail = ex.setsDetail ?? [];
        if (detail.length <= 1) return ex;
        return { ...ex, setsDetail: detail.filter((_, si) => si !== setIdx) };
      })
    );
  };

  const dupSet = (exIdx: number, setIdx: number) => {
    onChange(
      exercises.map((ex, i) => {
        if (i !== exIdx || ex.duration != null) return ex;
        const detail = [...(ex.setsDetail ?? [])];
        detail.splice(setIdx + 1, 0, { ...detail[setIdx] });
        return { ...ex, setsDetail: detail };
      })
    );
  };

  const updateSet = (exIdx: number, setIdx: number, field: 'reps' | 'weight', raw: string) => {
    onChange(
      exercises.map((ex, i) => {
        if (i !== exIdx || ex.duration != null) return ex;
        const detail = [...(ex.setsDetail ?? [])];
        const val = field === 'weight' ? parseFloat(raw) : parseInt(raw, 10);
        detail[setIdx] = { ...detail[setIdx], [field]: raw === '' || isNaN(val) ? undefined : val };
        return { ...ex, setsDetail: detail };
      })
    );
  };

  const toggleLink = (i: number) => {
    const next = exercises.map((ex) => ({ ...ex }));
    const a = next[i];
    const b = next[i + 1];
    if (!a || !b) return;
    if (a.blockId && a.blockId === b.blockId) {
      const bid = a.blockId;
      for (let j = i + 1; j < next.length; j++) {
        if (next[j].blockId === bid) delete next[j].blockId;
        else break;
      }
    } else {
      const newBlockId = a.blockId ?? crypto.randomUUID();
      a.blockId = newBlockId;
      b.blockId = newBlockId;
    }
    onChange(next);
  };

  const handleExercisePicked = (ex: ExerciseWithSets) => {
    let data: ExerciseData;
    if (workoutType === 'cardio') {
      data = { exerciseId: String(ex.exerciseId), name: ex.title, duration: ex.duration ?? 20 };
    } else if (workoutType === 'crossfit') {
      data = { exerciseId: String(ex.exerciseId), name: ex.title, reps: ex.sets?.[0]?.reps ?? 10 };
    } else {
      const setsDetail = ex.sets?.length
        ? ex.sets.map((s) => ({ reps: s.reps, weight: s.weight || undefined }))
        : [{ reps: 10 }, { reps: 10 }, { reps: 10 }];
      data = {
        exerciseId: String(ex.exerciseId),
        name: ex.title,
        sets: setsDetail.length,
        reps: setsDetail[0]?.reps ?? 10,
        setsDetail,
      };
    }
    onChange([...exercises, data]);
  };

  /* ─── Render ─────────────────────────────────────────────────────── */

  return (
    <div>
      {toolbar}

      {exercises.length > 0 && (
        <div className={toolbar ? 'mt-3' : ''}>
          {exercises.map((ex, i) => {
            const isInBlock = !!ex.blockId;
            const isLast = i === exercises.length - 1;
            const isLinkedToNext =
              superset &&
              workoutType !== 'crossfit' &&
              !isLast &&
              ex.blockId != null &&
              ex.blockId === exercises[i + 1].blockId;

            return (
              <div key={i}>
                <div
                  className={`relative p-3 rounded-xl min-w-0 border transition-colors ${
                    isInBlock
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-white/[0.07] border-white/10'
                  }`}
                >
                  {/* Index + name + replace + remove */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="shrink-0 mt-0.5 text-[10px] font-mono text-white/30 w-4 text-right leading-snug">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="flex-1 text-sm font-medium text-white leading-snug min-w-0 truncate">
                      {ex.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => setReplacingIdx(i)}
                      className="text-white/30 hover:text-emerald-400 transition-colors shrink-0 mt-0.5"
                      title="Заменить упражнение"
                    >
                      <ArrowsRightLeftIcon className="w-4 h-4" />
                    </button>
                    <ConfirmDeleteButton
                      icon="x"
                      variant="overlay"
                      onConfirm={() => removeExercise(i)}
                      className="shrink-0 mt-0.5"
                    />
                  </div>

                  {/* Params */}
                  <div className="mt-2">
                    <ExerciseParamsEditor
                      workoutType={workoutType}
                      duration={ex.duration}
                      reps={ex.reps}
                      weight={ex.weight}
                      distance={ex.distance}
                      wodType={ex.wodType}
                      timeCap={ex.timeCap}
                      rounds={ex.rounds}
                      setsDetail={ex.setsDetail}
                      bodyweight={ex.bodyweight}
                      profileWeight={profileWeight}
                      onPatch={(patch) => update(i, patch as Partial<ExerciseData>)}
                      onAddSet={() => addSet(i)}
                      onRemoveSet={(si) => removeSet(i, si)}
                      onDupSet={(si) => dupSet(i, si)}
                      onUpdateSet={(si, field, raw) => updateSet(i, si, field, raw)}
                    />
                  </div>

                  {/* Notes textarea */}
                  <textarea
                    value={ex.notes ?? ''}
                    onChange={(e) => update(i, { notes: e.target.value })}
                    placeholder="Комментарий тренера: техника, темп..."
                    rows={2}
                    className="mt-2 w-full text-xs bg-black/20 border border-white/10 rounded-lg px-2.5 py-1.5 text-white/70 placeholder:text-white/25 outline-none focus:border-white/30 resize-none transition-colors leading-relaxed"
                  />
                </div>

                {!isLast && (
                  superset && workoutType !== 'crossfit' ? (
                    <div className="relative flex items-center h-6 pl-4.5 my-1.5">
                      {isLinkedToNext && (
                        <div className="absolute left-4.75 top-0 bottom-0 w-0.5 bg-amber-500/60" />
                      )}
                      {!isLinkedToNext && (
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-(--color_border)" />
                      )}
                      <button
                        onClick={() => toggleLink(i)}
                        className={`relative flex items-center gap-1.5 text-xs font-medium transition-colors px-2 py-0.5 rounded-md ${
                          isLinkedToNext
                            ? 'text-amber-400 bg-amber-500/10'
                            : 'text-white/25 hover:text-amber-400 hover:bg-amber-500/10 bg-(--color_bg_card)'
                        }`}
                        title={isLinkedToNext ? 'Разъединить суперсет' : 'Связать в суперсет'}
                      >
                        <span>⚡</span>
                        <span>{isLinkedToNext ? 'суперсет' : 'суперсет?'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="my-3 border-t border-(--color_border)" />
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      <ExercisePicker onSelect={handleExercisePicked} workoutType={workoutType} />

      {replacingIdx !== null && (
        <ExercisePicker
          open={true}
          onClose={() => setReplacingIdx(null)}
          onSelect={handleReplace}
          workoutType={workoutType}
        />
      )}
    </div>
  );
}
