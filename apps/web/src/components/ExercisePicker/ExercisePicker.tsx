import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import GhostButton from '@/components/ui/GhostButton';
import { ExerciseDetailContent } from '@/components/ExerciseDetailSheet/ExerciseDetailSheet';
import ExerciseFilterBar from '@/components/ExerciseFilterBar/ExerciseFilterBar';
import type { Exercise, ExerciseFull, ExerciseWithSets } from '@/types/Exercise';
import { exercisesApi } from '@/api/exercises';
import { useExerciseFilters } from '@/hooks/useExerciseFilters';
import { useClientInfiniteScroll } from '@/hooks/useClientInfiniteScroll';
import { ExercisePickerCard } from '@/components/ExerciseCard/ExerciseCard';

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

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const filterKey = `${search}|${categoryFilter}|${zoneFilter}`;
  const { visible: visibleExercises, sentinelRef, hasMore } = useClientInfiniteScroll(filtered, filterKey, scrollContainerRef);

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
        <GhostButton onClick={() => setOpen(true)} className="mt-6">
          <PlusIcon className="w-4 h-4" />
          Добавить упражнение
        </GhostButton>
      )}

      <BottomSheet id="exercise-picker" open={isOpen} onClose={handleClose} header={headerContent}>
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
              <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 pb-4">
                {/* Count */}
                <p className="text-xs text-(--color_text_muted) mb-3">
                  {filtered.length} упражнений
                </p>

                {visibleExercises.length === 0 ? (
                  <div className="py-10 text-center text-(--color_text_muted) text-sm">
                    Ничего не найдено
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {visibleExercises.map((ex) => (
                        <ExercisePickerCard key={ex.id} exercise={ex} onClick={() => openDetail(ex)} onQuickAdd={() => handleQuickAdd(ex)} />
                      ))}
                    </div>
                    {hasMore && <div ref={sentinelRef} className="h-8" />}
                  </>
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
