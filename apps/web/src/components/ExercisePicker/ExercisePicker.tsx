import { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeftIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { ExerciseDetailContent } from '@/components/ExerciseDetailSheet/ExerciseDetailSheet';
import type { Exercise, ExerciseFull, ExerciseCategory, MuscleZone, ExerciseWithSets } from '@/types/Exercise';
import { exercisesApi } from '@/api/exercises';

/* ------------------------------------------------------------------ */
/* Labels                                                               */
/* ------------------------------------------------------------------ */

const ZONE_LABELS: Record<MuscleZone, string> = {
  chests: 'Грудь',
  back: 'Спина',
  legs: 'Ноги',
  shoulders: 'Плечи',
  biceps: 'Бицепс',
  triceps: 'Трицепс',
  core: 'Кор',
  glutes: 'Ягодицы',
  forearms: 'Предплечья',
};

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  strength: 'Силовые',
  olympic: 'Олимп.',
  gymnastics: 'Гимнастика',
  functional: 'Функц.',
  cardio: 'Кардио',
};

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
      {/* Image — click to open detail */}
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/60 to-purple-900/60">
            <span className="text-2xl font-bold text-white/20">{exercise.title[0]}</span>
          </div>
        )}
      </button>

      {/* Info + quick-add */}
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
                {ZONE_LABELS[zone as MuscleZone] ?? zone}
              </span>
            ))}
          </div>
        </div>
        {/* Quick-add button */}
        <button
          onClick={(e) => { e.stopPropagation(); onQuickAdd(); }}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg bg-(--color_primary_light) hover:opacity-80 active:scale-90 transition-all"
          title="Добавить"
        >
          <PlusIcon className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FilterChip                                                           */
/* ------------------------------------------------------------------ */

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-(--color_primary_light) text-white'
          : 'bg-white/10 text-white/60 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* ExercisePicker                                                       */
/* ------------------------------------------------------------------ */

interface Props {
  onSelect: (exercise: ExerciseWithSets) => void;
  workoutType: string;
}

export default function ExercisePicker({ onSelect, workoutType }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | null>(null);
  const [zoneFilter, setZoneFilter] = useState<MuscleZone | null>(null);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [selectedFull, setSelectedFull] = useState<ExerciseFull | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);

  useEffect(() => {
    exercisesApi.list().then((res) => setExercises(res ?? []));
  }, []);

  /* Available categories (only those present in data) */
  const availableCategories = useMemo<ExerciseCategory[]>(() => {
    const set = new Set(exercises.map((e) => e.category));
    return (['strength', 'functional', 'olympic', 'cardio', 'gymnastics'] as ExerciseCategory[]).filter(
      (c) => set.has(c)
    );
  }, [exercises]);

  /* Available zones */
  const availableZones = useMemo<MuscleZone[]>(() => {
    const set = new Set(exercises.flatMap((e) => e.zones));
    return (Object.keys(ZONE_LABELS) as MuscleZone[]).filter((z) => set.has(z));
  }, [exercises]);

  /* Filtered exercises */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return exercises.filter((ex) => {
      if (categoryFilter && ex.category !== categoryFilter) return false;
      if (zoneFilter && !ex.zones.includes(zoneFilter)) return false;
      if (q) return ex.title.toLowerCase().includes(q);
      return true;
    });
  }, [exercises, search, categoryFilter, zoneFilter]);

  const visibleExercises = filtered.slice(0, 60);

  /* Open detail view */
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
    setOpen(false);
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

  /* Header content changes based on view */
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
      <button
        onClick={() => setOpen(true)}
        className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors"
      >
        <PlusIcon className="w-4 h-4" />
        <span className="text-sm">Добавить упражнение</span>
      </button>

      <BottomSheet open={open} onClose={handleClose} header={headerContent}>
        <AnimatePresence mode="wait" initial={false}>
          {view === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
            >
              {/* Search */}
              <div className="relative mb-3">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск упражнения..."
                  className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl pl-9 pr-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-white/30"
                />
              </div>

              {/* Category filters */}
              <div className="flex gap-2 overflow-x-auto pb-1 mb-2 no-scrollbar">
                <FilterChip label="Все" active={!categoryFilter} onClick={() => setCategoryFilter(null)} />
                {availableCategories.map((cat) => (
                  <FilterChip
                    key={cat}
                    label={CATEGORY_LABELS[cat]}
                    active={categoryFilter === cat}
                    onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                  />
                ))}
              </div>

              {/* Zone filters */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
                <FilterChip label="Все зоны" active={!zoneFilter} onClick={() => setZoneFilter(null)} />
                {availableZones.map((zone) => (
                  <FilterChip
                    key={zone}
                    label={ZONE_LABELS[zone]}
                    active={zoneFilter === zone}
                    onClick={() => setZoneFilter(zoneFilter === zone ? null : zone)}
                  />
                ))}
              </div>

              {/* Count */}
              <p className="text-xs text-(--color_text_muted) mb-3">
                {filtered.length > 60
                  ? `Показано 60 из ${filtered.length} — уточните поиск`
                  : `${filtered.length} упражнений`}
              </p>

              {/* Grid */}
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
