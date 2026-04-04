import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router';
import { PlusIcon } from '@heroicons/react/24/outline';
import { getWorkoutTypeLabel } from './utils';
import WorkoutDetailSheet from './WorkoutDetailSheet';
import type { WorkoutTimelineEntry } from '@/types/Analytics';
import { workoutsApi } from '@/api/workouts';
import { parseApiDateTime } from '@/utils/date';
import WorkoutIntensityBar from '@/components/WorkoutIntensityBar/WorkoutIntensityBar';
import ConfirmDeleteWrapper from '@/components/ui/ConfirmDeleteWrapper';
import toast from 'react-hot-toast';
import AccentButton from '@/components/ui/AccentButton';

interface DraftData {
  workoutType: string;
  exercises: any[];
  notes: string;
  date: string;
}

interface DayDetailsProps {
  date: Date;
  workouts: WorkoutTimelineEntry[];
  onDeleted: () => void;
  onRefresh?: () => void;
  readOnly?: boolean;
  draft?: DraftData | null;
}

function pluralWorkouts(n: number): string {
  if (n === 1) return '1 тренировка';
  if (n >= 2 && n <= 4) return `${n} тренировки`;
  return `${n} тренировок`;
}

function extractTime(dateStr: string): string | null {
  try {
    const d = parseApiDateTime(dateStr);
    const h = d.getHours();
    const m = d.getMinutes();
    if (h === 0 && m === 0) return null;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

function WorkoutTile({
  workout,
  isUpcoming,
  onClick,
  onDelete,
}: {
  workout: WorkoutTimelineEntry;
  isUpcoming: boolean;
  onClick: () => void;
  onDelete?: () => Promise<void>;
}) {
  const hasVolume = (workout.volume ?? 0) > 0;
  const volumeKg = workout.volume ?? 0;
  const volumeLabel = volumeKg >= 1000 ? `${(volumeKg / 1000).toFixed(1)} т` : `${volumeKg} кг`;
const timeLabel = extractTime(workout.date);
  const fromTrainer = workout.scheduledWorkoutId != null;

  const body = (
    <div onClick={onClick} className="w-full text-left p-4 cursor-pointer active:scale-[0.98]">
      {/* Заголовок */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-white truncate">
            {getWorkoutTypeLabel(workout.type ?? 'unknown')}
          </span>
          {timeLabel && (
            <span className="text-xs text-(--color_text_muted) tabular-nums shrink-0">{timeLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isUpcoming ? (
            <span className="text-xs px-1.5 py-0.5 bg-(--color_primary_light)/15 text-(--color_primary_icon) rounded-full border border-(--color_primary_light)/30 font-medium">
              Предстоящая
            </span>
          ) : (
            <span className="text-xs px-1.5 py-0.5 bg-white/5 text-(--color_text_muted) rounded-full border border-white/10 font-medium">
              Прошедшая
            </span>
          )}
          {fromTrainer && (
            <span className="text-xs px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 font-medium">
              от тренера
            </span>
          )}
          {onDelete
            ? <ConfirmDeleteWrapper.Trigger />
            : <span className="text-xs text-(--color_text_muted)">→</span>
          }
        </div>
      </div>

      {/* Интенсивность */}
      <WorkoutIntensityBar
        intensity={workout.intensity ?? 0}
        hasMissingWeights={workout.hasMissingWeights}
        className="mb-2"
      />

      {/* Объём (только для силовых) */}
      {hasVolume && (
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-xs text-(--color_text_muted)">Объём:</span>
          <span className="text-sm font-semibold text-emerald-400">{volumeLabel}</span>
        </div>
      )}
    </div>
  );

  if (onDelete) {
    return (
      <ConfirmDeleteWrapper
        onConfirm={onDelete}

        normalBorder={isUpcoming ? 'border-(--color_primary_light)/40' : 'border-(--color_border)'}
        className={`w-full transition-colors bg-(--color_bg_card) ${
          isUpcoming
            ? 'ring-1 ring-inset ring-(--color_primary_light)/20 hover:border-(--color_primary_light)/60'
            : 'hover:border-(--color_primary_light)/30'
        }`}
      >
        {body}
      </ConfirmDeleteWrapper>
    );
  }

  return (
    <div className={`relative w-full rounded-xl border transition-colors bg-(--color_bg_card) ${
      isUpcoming
        ? 'border-(--color_primary_light)/40 ring-1 ring-inset ring-(--color_primary_light)/20'
        : 'border-(--color_border) hover:border-(--color_primary_light)/30'
    }`}>
      {body}
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 my-1">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-[11px] text-(--color_text_muted) uppercase tracking-wide font-medium shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

export default function DayDetails({ date, workouts, onDeleted, onRefresh, readOnly = false, draft }: DayDetailsProps) {
  const [activeWorkout, setActiveWorkout] = useState<WorkoutTimelineEntry | null>(null);
  const [localIntensities, setLocalIntensities] = useState<Record<number, number>>({});
  const navigate = useNavigate();
  const hasWorkouts = workouts.length > 0;

  const draftForThisDay = draft && draft.date
    ? format(new Date(draft.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    : false;

  const now = new Date();
  const past = workouts.filter((w) => parseApiDateTime(w.date) < now);
  const upcoming = workouts.filter((w) => parseApiDateTime(w.date) >= now);
  const hasBothGroups = past.length > 0 && upcoming.length > 0;

  const handleAddWorkout = () => {
    navigate('/workouts/new', { state: { date: format(date, 'yyyy-MM-dd') } });
  };

  const handleDelete = async (workout: WorkoutTimelineEntry) => {
    if (!workout.id) return;
    try {
      await workoutsApi.delete(workout.id);
      toast.success('Тренировка удалена');
      onDeleted();
    } catch {
      toast.error('Ошибка при удалении');
    }
  };

  const renderTile = (w: WorkoutTimelineEntry, i: number, isUpcoming: boolean) => {
    const canDelete = !w.scheduledWorkoutId && !!w.id;
    return (
      <WorkoutTile
        key={i}
        workout={w.id && localIntensities[w.id] !== undefined ? { ...w, intensity: localIntensities[w.id] } : w}
        isUpcoming={isUpcoming}
        onClick={() => setActiveWorkout(w)}
        onDelete={canDelete ? () => handleDelete(w) : undefined}
      />
    );
  };

  return (
    <>
      <div className="animate-fade-in">
        <div className="bg-white/5 p-5 rounded-xl border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">
                {format(date, 'd MMMM yyyy', { locale: ru })}
              </h2>
              {hasWorkouts && (
                <p className="text-sm text-(--color_text_muted) mt-0.5">
                  {pluralWorkouts(workouts.length)}
                </p>
              )}
            </div>
            {!readOnly && (
              <AccentButton size="sm" onClick={handleAddWorkout} className="shrink-0">
                <PlusIcon className="w-4 h-4" />
                Добавить
              </AccentButton>
            )}
          </div>

          {draftForThisDay && draft && (
            <div
              onClick={() => navigate('/workouts/new')}
              className="w-full text-left p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 cursor-pointer hover:border-amber-500/60 transition-colors mb-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium shrink-0">
                    Черновик
                  </span>
                  <span className="text-sm font-semibold text-white truncate">
                    {draft.workoutType === 'bodybuilding' ? 'Силовая' : draft.workoutType === 'crossfit' ? 'CrossFit' : 'Кардио'}
                  </span>
                </div>
                <span className="text-xs text-amber-400/70 shrink-0">
                  {draft.exercises.length} упр. →
                </span>
              </div>
              {draft.notes && (
                <p className="text-xs text-(--color_text_muted) mt-1.5 truncate">{draft.notes}</p>
              )}
            </div>
          )}

          {hasWorkouts ? (
            <div className="space-y-3">
              {/* Прошедшие */}
              {past.length > 0 && (
                <>
                  {hasBothGroups && <SectionDivider label="Прошедшие" />}
                  {past.map((w, i) => renderTile(w, i, false))}
                </>
              )}

              {/* Разделитель */}
              {hasBothGroups && <SectionDivider label="Предстоящие" />}

              {/* Предстоящие */}
              {upcoming.length > 0 && (
                <>
                  {!hasBothGroups && <SectionDivider label="Предстоящие" />}
                  {upcoming.map((w, i) => renderTile(w, past.length + i, true))}
                </>
              )}
            </div>
          ) : !draftForThisDay ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">😴</div>
              <p className="text-(--color_text_muted) text-sm">В этот день тренировок не было</p>
              <p className="text-(--color_text_muted)/50 text-xs mt-1">
                Выберите другой день на календаре
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <WorkoutDetailSheet
        workout={activeWorkout}
        onClose={() => setActiveWorkout(null)}
        onUpdate={(id, intensity) => setLocalIntensities((prev) => ({ ...prev, [id]: intensity }))}
        onRefresh={onRefresh}
      />
    </>
  );
}
