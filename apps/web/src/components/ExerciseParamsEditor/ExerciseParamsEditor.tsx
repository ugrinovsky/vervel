/**
 * ExerciseParamsEditor — renders editable fields for ONE exercise.
 * Handles all 3 workout types: cardio | crossfit | bodybuilding.
 *
 * Used by:
 *   - WorkoutExercisesEditor (inline list in trainer forms)
 *   - ExerciseDrawer (BottomSheet per-exercise in athlete/trainer workout form)
 */
import { WOD_CONFIG, type WodType } from '@/constants/workoutTypes';
import { DocumentDuplicateIcon, TrashIcon, UserIcon } from '@heroicons/react/24/outline';
import type { WorkoutType } from '@/components/WorkoutTypeTabs';
import NumberInput from '@/components/ui/NumberInput';
import { useNavigate } from 'react-router';

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

  bodyweight?: boolean;
  profileWeight?: number;

  /** Назначение тренером: только объём (повторы/подходы), веса задаёт атлет */
  hideWeights?: boolean;

  // Callbacks — simple field changes (cardio duration, crossfit fields)
  onPatch: (patch: Record<string, number | string | boolean | undefined>) => void;

  // Bodybuilding set management
  onAddSet?: () => void;
  onRemoveSet?: (idx: number) => void;
  onDupSet?: (idx: number) => void;
  onUpdateSet?: (idx: number, field: 'reps' | 'weight', raw: string) => void;
}

function BodyweightToggle({
  bodyweight,
  profileWeight,
  onToggle,
}: {
  bodyweight?: boolean;
  profileWeight?: number;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={
        bodyweight && profileWeight
          ? `Вес тела · ${profileWeight} кг`
          : 'Вес тела (собственный)'
      }
      className={`h-6 flex items-center gap-1 px-1.5 rounded-md transition-colors text-[10px] font-medium whitespace-nowrap ${
        bodyweight
          ? profileWeight
            ? 'text-emerald-400 bg-emerald-500/15'
            : 'text-amber-400 bg-amber-500/15'
          : 'text-white/30 hover:text-emerald-400 hover:bg-emerald-500/15'
      }`}
    >
      <UserIcon className="w-3 h-3 shrink-0" />
      {bodyweight && profileWeight ? `${profileWeight} кг` : 'вес тела'}
    </button>
  );
}

function BodyweightWarning() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/profile')}
      className="text-[10px] text-amber-400/80 hover:text-amber-300 transition-colors text-left"
    >
      ⚠ Укажите вес тела в профиле — нужен для расчёта интенсивности →
    </button>
  );
}

export default function ExerciseParamsEditor({
  workoutType,
  duration,
  wodType,
  timeCap,
  rounds,
  reps,
  weight,
  distance,
  setsDetail,
  bodyweight,
  profileWeight,
  hideWeights = false,
  onPatch,
  onAddSet,
  onRemoveSet,
  onDupSet,
  onUpdateSet,
}: Props) {
  /* ── Cardio ─────────────────────────────────────────────────────── */
  if (workoutType === 'cardio') {
    return (
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-white/35 shrink-0">мин</label>
        <NumberInput
          min={1}
          value={duration ?? ''}
          onChange={(e) => onPatch({ duration: e.target.value ? +e.target.value : undefined })}
          className="w-16"
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
          {(Object.entries(WOD_CONFIG) as [WodType, { label: string; hint: string }][]).map(
            ([value, cfg]) => (
              <button
                key={value}
                type="button"
                onClick={() => onPatch({ wodType: value === wodType ? undefined : value })}
                title={cfg.hint}
                className={`py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  wodType === value
                    ? 'bg-(--color_primary_light) text-white'
                    : 'bg-black/20 border border-white/10 text-white/40 hover:text-white/70'
                }`}
              >
                {cfg.label}
              </button>
            )
          )}
        </div>

        {/* Context fields: timeCap / rounds */}
        {wodType && (
          <div className="flex items-center gap-2">
            {(wodType === 'amrap' || wodType === 'emom' || wodType === 'fortime') && (
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-white/35 shrink-0 whitespace-nowrap">
                  {wodType === 'fortime' ? 'cap мин' : 'мин'}
                </label>
                <NumberInput
                  min={1}
                  value={timeCap ?? ''}
                  onChange={(e) =>
                    onPatch({ timeCap: e.target.value ? +e.target.value : undefined })
                  }
                  placeholder="20"
                  className="w-14"
                />
              </div>
            )}
            {(wodType === 'fortime' || wodType === 'tabata') && (
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-white/35 shrink-0">раунды</label>
                <NumberInput
                  min={1}
                  value={rounds ?? (wodType === 'tabata' ? 8 : '')}
                  onChange={(e) =>
                    onPatch({ rounds: e.target.value ? +e.target.value : undefined })
                  }
                  placeholder={wodType === 'tabata' ? '8' : '3'}
                  className="w-14"
                />
              </div>
            )}
          </div>
        )}

        {/* Reps / Weight / Distance */}
        <div className="flex items-center gap-2 text-[10px] text-white/40 font-medium">
          <span className="flex-1 text-center">повт/раунд</span>
          {!hideWeights && <span className="flex-1 text-center">кг</span>}
          <span className="flex-1 text-center">м</span>
        </div>
        <div className={`grid gap-1 ${hideWeights ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <NumberInput
            min={1}
            value={reps ?? ''}
            onChange={(e) => onPatch({ reps: e.target.value ? +e.target.value : undefined })}
            placeholder="10"
            className="flex-1"
          />
          {!hideWeights && (
            <NumberInput
              min={0}
              step={2.5}
              value={weight ?? ''}
              onChange={(e) => onPatch({ weight: e.target.value ? +e.target.value : undefined })}
              placeholder={bodyweight ? String(profileWeight ?? '—') : '—'}
              className={`flex-1 ${bodyweight ? 'text-emerald-300' : 'text-white/80'}`}
            />
          )}
          <NumberInput
            min={0}
            value={distance ?? ''}
            onChange={(e) => onPatch({ distance: e.target.value ? +e.target.value : undefined })}
            placeholder="—"
            className="flex-1 text-white/80"
          />
        </div>

        {!hideWeights && (
          <>
            <BodyweightToggle
              bodyweight={bodyweight}
              profileWeight={profileWeight}
              onToggle={() => onPatch({ bodyweight: !bodyweight })}
            />
            {bodyweight && !profileWeight && <BodyweightWarning />}
          </>
        )}
      </div>
    );
  }

  /* ── Bodybuilding ────────────────────────────────────────────────── */
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-[10px] text-white/40 font-medium">
        <span className="w-5" />
        <span className="flex-1 text-center">повт</span>
        {!hideWeights && (
          <>
            <span className="text-white/20">×</span>
            <span className={`flex-1 text-center ${bodyweight ? 'text-emerald-400/60' : ''}`}>кг</span>
          </>
        )}
        {!hideWeights && (
          <div className="w-14 shrink-0 flex justify-end">
            <BodyweightToggle
              bodyweight={bodyweight}
              profileWeight={profileWeight}
              onToggle={() => onPatch({ bodyweight: !bodyweight })}
            />
          </div>
        )}
        {hideWeights && <div className="w-14 shrink-0" aria-hidden />}
      </div>
      {(setsDetail ?? []).map((set, si) => (
        <div key={si} className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold text-white/50 w-5 text-right shrink-0">
            {si + 1}
          </span>
          <NumberInput
            min={1}
            value={set.reps ?? ''}
            onChange={(e) => onUpdateSet?.(si, 'reps', e.target.value)}
            placeholder="10"
            className="flex-1"
          />
          {!hideWeights && (
            <>
              <span className="text-[10px] text-white/20 shrink-0">×</span>
              <NumberInput
                min={0}
                step={2.5}
                value={set.weight ?? ''}
                onChange={(e) => onUpdateSet?.(si, 'weight', e.target.value)}
                placeholder={bodyweight ? String(profileWeight ?? 'вес тела') : '— кг'}
                className={`flex-1 ${bodyweight ? 'text-emerald-300' : 'text-white/80'}`}
              />
            </>
          )}
          <div className="flex gap-1 shrink-0 w-14 justify-end">
            <button
              type="button"
              onClick={() => onDupSet?.(si)}
              className="w-6 h-6 flex items-center justify-center rounded-md text-white/30 hover:text-blue-400 hover:bg-blue-500/15 transition-colors"
              title="Дублировать"
            >
              <DocumentDuplicateIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onRemoveSet?.(si)}
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
        type="button"
        onClick={onAddSet}
        className="mt-0.5 text-[11px] text-white/35 hover:text-emerald-400 transition-colors flex items-center gap-1 font-medium"
      >
        <span className="text-sm leading-none">+</span> подход
      </button>
      {!hideWeights && bodyweight && !profileWeight && <BodyweightWarning />}
    </div>
  );
}
