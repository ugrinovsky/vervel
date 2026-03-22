import { useState } from 'react';
import type { Exercise, ExerciseCategory } from '@/types/Exercise';
import { getZoneLabel } from '@/util/zones';
import { CATEGORY_LABELS } from '@/components/ExerciseFilterBar/ExerciseFilterBar';

/* ------------------------------------------------------------------ */
/* Shared image block                                                   */
/* ------------------------------------------------------------------ */

const CATEGORY_TEXT_COLORS: Record<ExerciseCategory, string> = {
  strength:   'text-blue-400',
  olympic:    'text-yellow-400',
  gymnastics: 'text-purple-400',
  functional: 'text-orange-400',
  cardio:     'text-green-400',
};

function ExerciseImage({ exercise, aspectClass }: { exercise: Exercise; aspectClass: string }) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className={`w-full ${aspectClass} bg-black/20 overflow-hidden relative`}>
      {exercise.imageUrl && !imgError ? (
        <>
          {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-white/8" />}
          <img
            src={exercise.imageUrl}
            alt={exercise.title}
            loading="lazy"
            onError={() => setImgError(true)}
            onLoad={() => setImgLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/60 to-purple-900/60">
          <span className="text-2xl font-bold text-white/20">{exercise.title[0]}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ExercisePickerCard — used in ExercisePicker                         */
/* ------------------------------------------------------------------ */

export function ExercisePickerCard({
  exercise,
  onClick,
  onQuickAdd,
}: {
  exercise: Exercise;
  onClick: () => void;
  onQuickAdd: () => void;
}) {
  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-(--color_border) bg-(--color_bg_card) hover:bg-(--color_bg_card_hover) transition-all text-left">
      <button onClick={onClick} className="w-full focus:outline-none">
        <ExerciseImage exercise={exercise} aspectClass="aspect-video" />
      </button>

      <div className="px-2 pt-1.5 pb-1 cursor-pointer flex-1" onClick={onClick}>
        <p className="text-xs font-medium text-(--color_text_secondary) leading-snug line-clamp-2">
          {exercise.title}
        </p>
        {exercise.zones.length > 0 && (
          <span className="text-[9px] text-(--color_primary_light) opacity-80 mt-0.5 block">
            {getZoneLabel(exercise.zones[0])}
          </span>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onQuickAdd(); }}
        className="mx-2 mb-2 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95 bg-(--color_primary_light)/15 hover:bg-(--color_primary_light)/25 text-(--color_primary_light)"
      >
        + Добавить
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ExerciseLibraryCard — used in TrainerExerciseLibraryScreen          */
/* ------------------------------------------------------------------ */

export function ExerciseLibraryCard({
  exercise,
  onClick,
}: {
  exercise: Exercise;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all text-left w-full"
    >
      <ExerciseImage exercise={exercise} aspectClass="aspect-3/2" />

      <div className="px-2.5 py-2 flex flex-col gap-1 flex-1">
        <p className="text-sm font-medium text-(--color_text_secondary) leading-snug line-clamp-2">
          {exercise.title}
        </p>
        <div className="mt-auto flex items-end justify-between gap-1">
          <div className="flex flex-col gap-1 min-w-0">
            <p className={`text-[10px] leading-none truncate ${CATEGORY_TEXT_COLORS[exercise.category] ?? 'text-(--color_text_muted)'}`}>
              {CATEGORY_LABELS[exercise.category] ?? exercise.category}
            </p>
            {exercise.zones.length > 0 && (
              <p className="text-[10px] leading-none truncate text-(--color_text_muted)">
                {exercise.zones.slice(0, 2).map(getZoneLabel).join(' · ')}
              </p>
            )}
          </div>
          <div className="flex items-end gap-px shrink-0">
            {[1, 2, 3, 4, 5, 6].map((bar) => {
              const filled = bar <= Math.round(exercise.intensity * 6);
              return (
                <div
                  key={bar}
                  style={{ height: bar * 3 + 2 }}
                  className={`w-1 rounded-sm transition-colors ${filled ? 'bg-(--color_primary_light)' : 'bg-white/15'}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </button>
  );
}
