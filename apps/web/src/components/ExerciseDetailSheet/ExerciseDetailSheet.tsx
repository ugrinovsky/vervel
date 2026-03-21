import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import type { Exercise, ExerciseFull, ExerciseWithSets } from '@/types/Exercise';
import { exercisesApi } from '@/api/exercises';
import { getZoneLabel } from '@/util/zones';
import AccentButton from '@/components/ui/AccentButton';

const CATEGORY_LABELS: Record<string, string> = {
  strength: 'Силовые',
  olympic: 'Олимпийские',
  gymnastics: 'Гимнастика',
  functional: 'Функциональные',
  cardio: 'Кардио',
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

function ExerciseImage({ src, title }: { src: string; title: string }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/60 to-purple-900/60">
        <span className="text-5xl font-bold text-white/20">{title[0]}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={title}
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  );
}

function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [idx, setIdx] = useState(0);
  if (images.length === 0) {
    return (
      <div className="w-full aspect-video rounded-xl overflow-hidden bg-white/5 flex items-center justify-center mb-4">
        <span className="text-5xl font-bold text-white/20">{title[0]}</span>
      </div>
    );
  }
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-4 bg-black/30">
      <ExerciseImage src={images[idx]} title={title} />
      {images.length > 1 && (
        <>
          <button
            onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIdx((i) => (i + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ExerciseDetailContent — the actual content (reused by ExercisePicker) */
/* ------------------------------------------------------------------ */

interface ContentProps {
  exercise: Exercise;
  full: ExerciseFull | null;
  loading: boolean;
  workoutType?: string;
  onAdd?: (exercise: ExerciseWithSets) => void;
}

export function ExerciseDetailContent({
  exercise,
  full,
  loading,
  workoutType,
  onAdd,
}: ContentProps) {
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(0);
  const [duration, setDuration] = useState(20);

  const handleAdd = () => {
    if (!onAdd) return;
    if (workoutType === 'cardio') {
      onAdd({
        exerciseId: exercise.id,
        title: exercise.title,
        sets: [],
        duration,
      });
    } else {
      const initialSets = Array.from({ length: sets }, () => ({
        id: crypto.randomUUID(),
        reps,
        weight,
      }));
      onAdd({
        exerciseId: exercise.id,
        title: exercise.title,
        sets: initialSets,
      });
    }
  };

  const images = full?.allImages ?? (exercise.imageUrl ? [exercise.imageUrl] : []);

  return (
    <div>
      <ImageGallery images={images} title={exercise.title} />

      {/* Metadata */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white/70">
          {CATEGORY_LABELS[exercise.category] ?? exercise.category}
        </span>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white/70">
          Интенсивность: {Math.round(exercise.intensity * 100)}%
        </span>
      </div>

      {/* Zones */}
      {exercise.zones.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-(--color_text_muted) mb-1.5">Группы мышц</p>
          <div className="flex flex-wrap gap-1.5">
            {exercise.zones.map((zone) => (
              <span
                key={zone}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-(--color_primary_light)/20 text-(--color_primary_light)"
              >
                {getZoneLabel(zone)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {loading && (
        <div className="space-y-2 mb-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-4 rounded bg-white/10 animate-pulse"
              style={{ width: `${70 + i * 10}%` }}
            />
          ))}
        </div>
      )}
      {full && full.instructions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-(--color_text_muted) mb-2">Техника выполнения</p>
          <ol className="space-y-2">
            {full.instructions.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-white/80">
                <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/50">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Params + Add button */}
      {onAdd && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
          {workoutType === 'cardio' ? (
            <div>
              <label className="text-xs text-(--color_text_muted) mb-1 block">
                Длительность (мин)
              </label>
              <input
                type="number"
                value={duration}
                min={1}
                onChange={(e) => setDuration(+e.target.value)}
                onClick={(e) => e.currentTarget.select()}
                className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2 text-white text-sm outline-none"
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-(--color_text_muted) mb-1 block">Подходы</label>
                <input
                  type="number"
                  value={sets}
                  min={1}
                  onChange={(e) => setSets(+e.target.value)}
                  onClick={(e) => e.currentTarget.select()}
                  className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2 text-white text-sm outline-none text-center"
                />
              </div>
              <div>
                <label className="text-xs text-(--color_text_muted) mb-1 block">Подходы</label>
                <input
                  type="number"
                  value={reps}
                  min={1}
                  onChange={(e) => setReps(+e.target.value)}
                  onClick={(e) => e.currentTarget.select()}
                  className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2 text-white text-sm outline-none text-center"
                />
              </div>
              <div>
                <label className="text-xs text-(--color_text_muted) mb-1 block">Вес кг</label>
                <input
                  type="number"
                  value={weight}
                  min={0}
                  step={2.5}
                  onChange={(e) => setWeight(+e.target.value)}
                  onClick={(e) => e.currentTarget.select()}
                  className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2 text-white text-sm outline-none text-center"
                />
              </div>
            </div>
          )}
          <AccentButton onClick={handleAdd} className="font-semibold">
            Добавить в тренировку
          </AccentButton>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ExerciseDetailSheet — standalone bottom sheet (z-[60])               */
/* ------------------------------------------------------------------ */

interface Props {
  exercise: Exercise | null;
  open: boolean;
  onClose: () => void;
  workoutType?: string;
  onAdd?: (exercise: ExerciseWithSets) => void;
}

export default function ExerciseDetailSheet({
  exercise,
  open,
  onClose,
  workoutType,
  onAdd,
}: Props) {
  const [full, setFull] = useState<ExerciseFull | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !exercise) {
      setFull(null);
      return;
    }
    setLoading(true);
    exercisesApi
      .get(exercise.id)
      .then(setFull)
      .catch(() => setFull(null))
      .finally(() => setLoading(false));
  }, [open, exercise?.id]);

  const handleAdd = onAdd
    ? (ex: ExerciseWithSets) => {
        onAdd(ex);
        onClose();
      }
    : undefined;

  if (!exercise) return null;

  return (
    <div className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`}>
      <BottomSheet open={open} onClose={onClose} title={exercise.title}>
        <ExerciseDetailContent
          exercise={exercise}
          full={full}
          loading={loading}
          workoutType={workoutType}
          onAdd={handleAdd}
        />
      </BottomSheet>
    </div>
  );
}
