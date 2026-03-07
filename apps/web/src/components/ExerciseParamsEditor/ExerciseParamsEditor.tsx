/**
 * ExerciseParamsEditor — renders editable fields for ONE exercise.
 * Handles all 3 workout types: cardio | crossfit | bodybuilding.
 *
 * Used by:
 *   - WorkoutExercisesEditor (inline list in trainer forms)
 *   - ExerciseDrawer (BottomSheet per-exercise in athlete/trainer workout form)
 */
import { WOD_TYPES } from '@/constants/workoutTypes';
import { DocumentDuplicateIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { WorkoutType } from '@/components/WorkoutTypeTabs';

export interface SetDetail {
  reps?: number;
  weight?: number;
}

interface Props {
  workoutType: WorkoutType;

  // Cardio
  duration?: number;

  // CrossFit
  wodType?: string;
  timeCap?: number;
  rounds?: number;
  reps?: number;
  weight?: number;
  distance?: number;

  // Bodybuilding
  setsDetail?: SetDetail[];

  // Callbacks — simple field changes (cardio duration, crossfit fields)
  onPatch: (patch: Record<string, number | string | undefined>) => void;

  // Bodybuilding set management
  onAddSet?: () => void;
  onRemoveSet?: (idx: number) => void;
  onDupSet?: (idx: number) => void;
  onUpdateSet?: (idx: number, field: 'reps' | 'weight', raw: string) => void;
}

export default function ExerciseParamsEditor({
  workoutType,
  duration,
  wodType, timeCap, rounds, reps, weight, distance,
  setsDetail,
  onPatch,
  onAddSet, onRemoveSet, onDupSet, onUpdateSet,
}: Props) {

  /* ── Cardio ─────────────────────────────────────────────────────── */
  if (workoutType === 'cardio') {
    return (
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-white/35 shrink-0">мин</label>
        <input
          type="number"
          min={1}
          value={duration ?? ''}
          onChange={(e) => onPatch({ duration: e.target.value ? +e.target.value : undefined })}
          onClick={(e) => e.currentTarget.select()}
          className="w-16 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm text-center outline-none focus:border-white/25 transition-colors"
        />
      </div>
    );
  }

  /* ── CrossFit ───────────────────────────────────────────────────── */
  if (workoutType === 'crossfit') {
    return (
      <div className="space-y-2">
        {/* WOD type selector */}
        <div className="grid grid-cols-4 gap-1">
          {WOD_TYPES.map((wod) => (
            <button
              key={wod.value}
              type="button"
              onClick={() => onPatch({ wodType: wod.value === wodType ? undefined : wod.value })}
              title={wod.hint}
              className={`py-1 rounded-lg text-[11px] font-medium transition-colors ${
                wodType === wod.value
                  ? 'bg-(--color_primary_light) text-white'
                  : 'bg-black/20 border border-white/10 text-white/40 hover:text-white/70'
              }`}
            >
              {wod.label}
            </button>
          ))}
        </div>

        {/* Context fields: timeCap / rounds */}
        {wodType && (
          <div className="flex items-center gap-2">
            {(wodType === 'amrap' || wodType === 'emom' || wodType === 'fortime') && (
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-white/35 shrink-0 whitespace-nowrap">
                  {wodType === 'fortime' ? 'cap мин' : 'мин'}
                </label>
                <input
                  type="number"
                  min={1}
                  value={timeCap ?? ''}
                  onChange={(e) => onPatch({ timeCap: e.target.value ? +e.target.value : undefined })}
                  onClick={(e) => e.currentTarget.select()}
                  placeholder="20"
                  className="w-14 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm text-center outline-none focus:border-white/25 transition-colors"
                />
              </div>
            )}
            {(wodType === 'fortime' || wodType === 'tabata') && (
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-white/35 shrink-0">раунды</label>
                <input
                  type="number"
                  min={1}
                  value={rounds ?? (wodType === 'tabata' ? 8 : '')}
                  onChange={(e) => onPatch({ rounds: e.target.value ? +e.target.value : undefined })}
                  onClick={(e) => e.currentTarget.select()}
                  placeholder={wodType === 'tabata' ? '8' : '3'}
                  className="w-14 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm text-center outline-none focus:border-white/25 transition-colors"
                />
              </div>
            )}
          </div>
        )}

        {/* Reps / Weight / Distance */}
        <div className="flex items-center gap-2 text-[10px] text-white/40 font-medium">
          <span className="flex-1 text-center">повт/раунд</span>
          <span className="flex-1 text-center">кг</span>
          <span className="flex-1 text-center">м</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number" min={1} value={reps ?? ''}
            onChange={(e) => onPatch({ reps: e.target.value ? +e.target.value : undefined })}
            onClick={(e) => e.currentTarget.select()}
            placeholder="10"
            className="flex-1 min-w-0 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm text-center outline-none focus:border-white/30 transition-colors"
          />
          <input
            type="number" min={0} step={2.5} value={weight ?? ''}
            onChange={(e) => onPatch({ weight: e.target.value ? +e.target.value : undefined })}
            onClick={(e) => e.currentTarget.select()}
            placeholder="—"
            className="flex-1 min-w-0 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-white/80 text-sm text-center outline-none focus:border-white/30 transition-colors placeholder:text-white/20"
          />
          <input
            type="number" min={0} value={distance ?? ''}
            onChange={(e) => onPatch({ distance: e.target.value ? +e.target.value : undefined })}
            onClick={(e) => e.currentTarget.select()}
            placeholder="—"
            className="flex-1 min-w-0 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-white/80 text-sm text-center outline-none focus:border-white/30 transition-colors placeholder:text-white/20"
          />
        </div>
      </div>
    );
  }

  /* ── Bodybuilding ────────────────────────────────────────────────── */
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-[10px] text-white/40 font-medium">
        <span className="w-5" />
        <span className="flex-1 text-center">повт</span>
        <span className="text-white/20">×</span>
        <span className="flex-1 text-center">кг</span>
        <span className="w-14" />
      </div>
      {(setsDetail ?? []).map((set, si) => (
        <div key={si} className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold text-white/50 w-5 text-right shrink-0">
            {si + 1}
          </span>
          <input
            type="number" min={1} value={set.reps ?? ''}
            onChange={(e) => onUpdateSet?.(si, 'reps', e.target.value)}
            onClick={(e) => e.currentTarget.select()}
            placeholder="10"
            className="flex-1 min-w-0 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm text-center outline-none focus:border-white/30 transition-colors"
          />
          <span className="text-[10px] text-white/20 shrink-0">×</span>
          <input
            type="number" min={0} step={2.5} value={set.weight ?? ''}
            onChange={(e) => onUpdateSet?.(si, 'weight', e.target.value)}
            onClick={(e) => e.currentTarget.select()}
            placeholder="— кг"
            className="flex-1 min-w-0 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-white/80 text-sm text-center outline-none focus:border-white/30 transition-colors placeholder:text-white/20"
          />
          <div className="flex gap-1 shrink-0 w-14 justify-end">
            <button
              type="button" onClick={() => onDupSet?.(si)}
              className="w-6 h-6 flex items-center justify-center rounded-md text-white/30 hover:text-blue-400 hover:bg-blue-500/15 transition-colors"
              title="Дублировать"
            >
              <DocumentDuplicateIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button" onClick={() => onRemoveSet?.(si)}
              disabled={(setsDetail ?? []).length <= 1}
              className="w-6 h-6 flex items-center justify-center rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
              title="Удалить"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button" onClick={onAddSet}
        className="mt-0.5 text-[11px] text-white/35 hover:text-emerald-400 transition-colors flex items-center gap-1 font-medium"
      >
        <span className="text-sm leading-none">+</span> подход
      </button>
    </div>
  );
}
