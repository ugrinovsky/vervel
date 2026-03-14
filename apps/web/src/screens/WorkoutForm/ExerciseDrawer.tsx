import BottomSheet from '@/components/BottomSheet/BottomSheet';
import ExerciseParamsEditor, { type SetDetail } from '@/components/ExerciseParamsEditor/ExerciseParamsEditor';
import ExercisePicker from '@/components/ExercisePicker/ExercisePicker';
import type { ExerciseWithSets } from '@/types/Exercise';
import { useEffect, useState } from 'react';
import { ArrowUpIcon, ArrowDownIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import type { WorkoutType } from '@/components/WorkoutTypeTabs';

interface Props {
  open: boolean;
  exercise: ExerciseWithSets;
  workoutType?: WorkoutType;
  onClose: () => void;
  onSave: (exercise: ExerciseWithSets) => void;
  /** Если передан — показывает кнопку "Сменить упражнение" */
  allowReplace?: boolean;
}

export default function ExerciseDrawer({ open, exercise, workoutType = 'bodybuilding', onClose, onSave, allowReplace }: Props) {
  const [currentExercise, setCurrentExercise] = useState<ExerciseWithSets>(exercise);
  const [replacerOpen, setReplacerOpen] = useState(false);
  // ── State ──────────────────────────────────────────────────────────

  // Bodybuilding
  const [setsDetail, setSetsDetail] = useState<SetDetail[]>([]);

  // CrossFit
  const [wodType, setWodType] = useState<string | undefined>();
  const [timeCap, setTimeCap] = useState<number | undefined>();
  const [rounds, setRounds] = useState<number | undefined>();
  const [reps, setReps] = useState<number>(10);
  const [weight, setWeight] = useState<number | undefined>();
  const [distance, setDistance] = useState<number | undefined>();

  // Cardio
  const [duration, setDuration] = useState<number>(20);

  // ── Init on open / exercise change ────────────────────────────────

  const initFromExercise = (ex: ExerciseWithSets) => {
    if (workoutType === 'crossfit') {
      const first = ex.sets?.[0];
      setReps(first?.reps ?? 10);
      setWeight(first?.weight || undefined);
      setWodType(undefined);
      setTimeCap(undefined);
      setRounds(undefined);
      setDistance(undefined);
    } else if (workoutType === 'cardio') {
      setDuration(ex.duration ?? 20);
    } else {
      setSetsDetail(
        ex.sets?.length
          ? ex.sets.map((s) => ({ reps: s.reps, weight: s.weight || undefined }))
          : [{ reps: 10 }, { reps: 10 }, { reps: 10 }]
      );
    }
  };

  useEffect(() => {
    if (!open) return;
    setCurrentExercise(exercise);
    initFromExercise(exercise);
  }, [open, exercise, workoutType]);

  // ── Bodybuilding set helpers ───────────────────────────────────────

  const addSet = () => {
    setSetsDetail((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, { reps: last?.reps ?? 10, weight: last?.weight }];
    });
  };

  const removeSet = (idx: number) => {
    if (setsDetail.length <= 1) return;
    setSetsDetail((prev) => prev.filter((_, i) => i !== idx));
  };

  const dupSet = (idx: number) => {
    setSetsDetail((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, { ...prev[idx] });
      return next;
    });
  };

  const updateSet = (idx: number, field: 'reps' | 'weight', raw: string) => {
    setSetsDetail((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        const val = field === 'weight' ? parseFloat(raw) : parseInt(raw, 10);
        return { ...s, [field]: raw === '' || isNaN(val) ? undefined : val };
      })
    );
  };

  const generatePyramid = (direction: 'up' | 'down') => {
    if (!setsDetail.length) return;
    const base = setsDetail[0];
    const steps: SetDetail[] = [
      { reps: base.reps,                          weight: base.weight },
      { reps: Math.max((base.reps ?? 10) - 2, 1), weight: (base.weight ?? 0) + 5 },
      { reps: Math.max((base.reps ?? 10) - 4, 1), weight: (base.weight ?? 0) + 10 },
      { reps: Math.max((base.reps ?? 10) - 6, 1), weight: (base.weight ?? 0) + 15 },
      { reps: Math.max((base.reps ?? 10) - 8, 1), weight: (base.weight ?? 0) + 20 },
    ];
    setSetsDetail(direction === 'up' ? steps : [...steps].reverse());
  };

  // ── Patch handler for ExerciseParamsEditor ─────────────────────────

  const handlePatch = (patch: Record<string, number | string | undefined>) => {
    if ('duration' in patch) setDuration((patch.duration as number) ?? 20);
    if ('wodType'  in patch) setWodType(patch.wodType as string | undefined);
    if ('timeCap'  in patch) setTimeCap(patch.timeCap as number | undefined);
    if ('rounds'   in patch) setRounds(patch.rounds as number | undefined);
    if ('reps'     in patch) setReps((patch.reps as number) ?? 10);
    if ('weight'   in patch) setWeight(patch.weight as number | undefined);
    if ('distance' in patch) setDistance(patch.distance as number | undefined);
  };

  // ── Replace exercise ──────────────────────────────────────────────

  const handleReplace = (selected: ExerciseWithSets) => {
    const replaced = { ...selected, sets: currentExercise.sets, duration: currentExercise.duration };
    setCurrentExercise(replaced);
    initFromExercise(replaced);
    setReplacerOpen(false);
  };

  // ── Save ───────────────────────────────────────────────────────────

  const handleSave = () => {
    if (workoutType === 'crossfit') {
      onSave({
        ...currentExercise,
        sets: [{ id: crypto.randomUUID(), reps, weight: weight ?? 0 }],
      });
    } else if (workoutType === 'cardio') {
      onSave({ ...currentExercise, duration });
    } else {
      onSave({
        ...currentExercise,
        sets: setsDetail.map((s) => ({
          id: crypto.randomUUID(),
          reps: s.reps ?? 10,
          weight: s.weight ?? 0,
        })),
      });
    }
  };

  /* ─── Render ─────────────────────────────────────────────────────── */

  return (
    <BottomSheet open={open} onClose={onClose} title={currentExercise.title}>
      <div className="space-y-4">

        {/* Replace exercise */}
        {allowReplace && (
          <>
            <button
              onClick={() => setReplacerOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/40 text-sm transition-colors"
            >
              <ArrowsRightLeftIcon className="w-4 h-4" />
              Сменить упражнение
            </button>
            <ExercisePicker
              open={replacerOpen}
              onClose={() => setReplacerOpen(false)}
              workoutType={workoutType}
              onSelect={handleReplace}
            />
          </>
        )}

        {/* Pyramid buttons — bodybuilding only */}
        {workoutType === 'bodybuilding' && (
          <div className="flex gap-2">
            <button
              onClick={() => generatePyramid('up')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-sm font-medium hover:bg-blue-500/25 transition-colors"
            >
              <ArrowUpIcon className="w-3.5 h-3.5" />
              Пирамида вверх
            </button>
            <button
              onClick={() => generatePyramid('down')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-sm font-medium hover:bg-purple-500/25 transition-colors"
            >
              <ArrowDownIcon className="w-3.5 h-3.5" />
              Пирамида вниз
            </button>
          </div>
        )}

        {/* Params — shared component handles cardio / crossfit / bodybuilding */}
        <ExerciseParamsEditor
          workoutType={workoutType}
          duration={duration}
          reps={reps}
          weight={weight}
          distance={distance}
          wodType={wodType}
          timeCap={timeCap}
          rounds={rounds}
          setsDetail={setsDetail}
          onPatch={handlePatch}
          onAddSet={addSet}
          onRemoveSet={removeSet}
          onDupSet={dupSet}
          onUpdateSet={updateSet}
        />

      </div>

      {/* Save / Cancel */}
      <div className="flex gap-2 pt-4 border-t border-white/10 mt-4">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl bg-(--color_bg_card_hover) border border-(--color_border) text-(--color_text_muted) hover:text-white text-sm transition-colors"
        >
          Отмена
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-3 rounded-xl bg-(--color_primary_light) text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {workoutType === 'bodybuilding'
            ? `Сохранить${setsDetail.length > 0 ? ` (${setsDetail.length})` : ''}`
            : 'Сохранить'}
        </button>
      </div>
    </BottomSheet>
  );
}
