import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import AccentButton from '@/components/ui/AccentButton';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { ExerciseDetailContent } from '@/components/ExerciseDetailSheet/ExerciseDetailSheet';
import ExerciseFilterBar, { CATEGORY_LABELS_SHORT } from '@/components/ExerciseFilterBar/ExerciseFilterBar';
import type { Exercise, ExerciseFull, ExerciseWithSets } from '@/types/Exercise';
import { exercisesApi } from '@/api/exercises';
import { useExerciseFilters } from '@/hooks/useExerciseFilters';
import { getZoneLabel } from '@/util/zones';

/* ------------------------------------------------------------------ */
/* ExerciseCard                                                         */
/* ------------------------------------------------------------------ */

function ExerciseCard({
  exercise,
  onClick,
  onQuickAdd,
}: {
  exercise: Exercise;
  onClick: () => void;
  onQuickAdd: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left relative">
      <button onClick={onClick} className="w-full aspect-video bg-black/30 overflow-hidden focus:outline-none">
        {exercise.imageUrl && !imgError ? (
          <img
            src={exercise.imageUrl}
            alt={exercise.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-indigo-900/60 to-purple-900/60">
            <span className="text-2xl font-bold text-white/20">{exercise.title[0]}</span>
          </div>
        )}
      </button>

      <div className="p-2 flex-1 flex items-start gap-1.5">
        <div className="flex-1 min-w-0" onClick={onClick}>
          <p className="text-xs font-medium text-white leading-snug line-clamp-2 mb-1.5 cursor-pointer">
            {exercise.title}
          </p>
          <div className="flex flex-wrap gap-1">
            {exercise.zones.slice(0, 2).map((zone) => (
              <span
                key={zone}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-(--color_primary_light)/15 text-(--color_primary_light)"
              >
                {getZoneLabel(zone)}
              </span>
            ))}
          </div>
        </div>
        <AccentButton
          size="sm"
          onClick={(e) => { e.stopPropagation(); onQuickAdd(); }}
          className="shrink-0 w-6 h-6 p-0 rounded-lg hover:opacity-80 active:scale-90"
          title="Добавить"
        >
          <PlusIcon className="w-3.5 h-3.5" />
        </AccentButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ExercisePicker                                                       */
/* ------------------------------------------------------------------ */

interface Props {
  onSelect: (exercise: ExerciseWithSets) => void;
  workoutType: string;
  open?: boolean;
  onClose?: () => void;
}

export default function ExercisePicker({ onSelect, workoutType, open: controlledOpen, onClose: onControlledClose }: Props) {
  const [open, setOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : open;
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [selectedFull, setSelectedFull] = useState<ExerciseFull | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);

  const {
    search, setSearch,
    categoryFilter, setCategoryFilter,
    zoneFilter, setZoneFilter,
    availableCategories,
    availableZones,
    filtered,
  } = useExerciseFilters(exercises);

  useEffect(() => {
    exercisesApi.list().then((res) => setExercises(res ?? []));
  }, []);

  const visibleExercises = filtered.slice(0, 60);

  const openDetail = (ex: Exercise) => {
    setSelected(ex);
    setSelectedFull(null);
    setView('detail');
    setLoadingFull(true);
    exercisesApi
      .get(ex.id)
      .then(setSelectedFull)
      .catch(() => setSelectedFull(null))
      .finally(() => setLoadingFull(false));
  };

  const goBack = () => {
    setView('list');
    setSelected(null);
    setSelectedFull(null);
  };

  const handleClose = () => {
    if (onControlledClose) {
      onControlledClose();
    } else {
      setOpen(false);
    }
    setView('list');
    setSearch('');
    setCategoryFilter(null);
    setZoneFilter(null);
    setSelected(null);
    setSelectedFull(null);
  };

  const handleAdd = (exercise: ExerciseWithSets) => {
    onSelect(exercise);
    handleClose();
  };

  const handleQuickAdd = (ex: Exercise) => {
    const isCardio = workoutType === 'cardio';
    const quick: ExerciseWithSets = {
      exerciseId: ex.id,
      title: ex.title,
      sets: isCardio
        ? [{ id: crypto.randomUUID(), reps: 1, weight: 0 }]
        : [
            { id: crypto.randomUUID(), reps: 10, weight: 0 },
            { id: crypto.randomUUID(), reps: 10, weight: 0 },
            { id: crypto.randomUUID(), reps: 10, weight: 0 },
          ],
      duration: isCardio ? 20 : undefined,
    };
    onSelect(quick);
    handleClose();
  };

  const headerContent =
    view === 'detail' && selected ? (
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={goBack}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4 text-white" />
        </button>
        <span className="text-base font-bold text-white truncate">{selected.title}</span>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <span className="text-xl">💪</span>
        <span className="text-lg font-bold text-white">Упражнения</span>
      </div>
    );

  return (
    <>
      {controlledOpen === undefined && (
        <button
          onClick={() => setOpen(true)}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          <span className="text-sm">Добавить упражнение</span>
        </button>
      )}

      <BottomSheet open={isOpen} onClose={handleClose} header={headerContent}>
        <AnimatePresence mode="wait" initial={false}>
          {view === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col"
              style={{ height: 'calc(90dvh - 140px)' }}
            >
              {/* Scrollable grid */}
              <div className="flex-1 overflow-y-auto min-h-0 pb-4">
                {/* Count */}
                <p className="text-xs text-(--color_text_muted) mb-3">
                  {filtered.length > 60
                    ? `Показано 60 из ${filtered.length} — уточните поиск`
                    : `${filtered.length} упражнений`}
                </p>

                {visibleExercises.length === 0 ? (
                  <div className="py-10 text-center text-(--color_text_muted) text-sm">
                    Ничего не найдено
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {visibleExercises.map((ex) => (
                      <ExerciseCard key={ex.id} exercise={ex} onClick={() => openDetail(ex)} onQuickAdd={() => handleQuickAdd(ex)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Filter bar at bottom */}
              <div className="shrink-0 border-t border-(--color_border) pt-3">
                <ExerciseFilterBar
                  exerciseCount={exercises.length}
                  search={search}
                  onSearchChange={setSearch}
                  categoryFilter={categoryFilter}
                  onCategoryChange={setCategoryFilter}
                  availableCategories={availableCategories}
                  zoneFilter={zoneFilter}
                  onZoneChange={setZoneFilter}
                  availableZones={availableZones}
                  categoryLabels={CATEGORY_LABELS_SHORT}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.18 }}
            >
              {selected && (
                <ExerciseDetailContent
                  exercise={selected}
                  full={selectedFull}
                  loading={loadingFull}
                  workoutType={workoutType}
                  onAdd={handleAdd}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </BottomSheet>
    </>
  );
}
