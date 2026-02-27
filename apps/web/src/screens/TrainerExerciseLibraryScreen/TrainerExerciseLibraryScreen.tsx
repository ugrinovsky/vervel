import { useState, useMemo } from 'react';
import { MagnifyingGlassIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import ExerciseDetailSheet from '@/components/ExerciseDetailSheet/ExerciseDetailSheet';
import { useExercises } from '@/hooks/useExercises';
import type { Exercise, ExerciseCategory, MuscleZone } from '@/types/Exercise';

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
  olympic: 'Олимпийские',
  gymnastics: 'Гимнастика',
  functional: 'Функциональные',
  cardio: 'Кардио',
};

const CATEGORY_COLORS: Record<ExerciseCategory, string> = {
  strength: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  olympic: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  gymnastics: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  functional: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  cardio: 'bg-green-500/20 text-green-300 border-green-500/30',
};

/* ------------------------------------------------------------------ */
/* Filter chip                                                          */
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
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
        active
          ? 'bg-(--color_primary_light) text-white border-transparent'
          : 'bg-white/5 text-white/60 border-white/10 hover:text-white hover:border-white/30'
      }`}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Exercise card                                                        */
/* ------------------------------------------------------------------ */

function ExerciseCard({ exercise, onClick }: { exercise: Exercise; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all text-left w-full"
    >
      {/* Image */}
      <div className="w-full aspect-video bg-black/20 overflow-hidden relative">
        {exercise.imageUrl && !imgError ? (
          <img
            src={exercise.imageUrl}
            alt={exercise.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/50 to-purple-900/50">
            <span className="text-3xl font-black text-white/15">{exercise.title[0]}</span>
          </div>
        )}
        {/* Category badge */}
        <div className="absolute top-1.5 left-1.5">
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
              CATEGORY_COLORS[exercise.category] ?? 'bg-white/10 text-white/50 border-white/10'
            }`}
          >
            {CATEGORY_LABELS[exercise.category] ?? exercise.category}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 flex-1">
        <p className="text-sm font-medium text-white leading-snug mb-1.5 line-clamp-2">
          {exercise.title}
        </p>
        <div className="flex flex-wrap gap-1">
          {exercise.zones.slice(0, 3).map((zone) => (
            <span
              key={zone}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-(--color_primary_light)/15 text-(--color_primary_light)"
            >
              {ZONE_LABELS[zone as MuscleZone] ?? zone}
            </span>
          ))}
        </div>
        {/* Intensity bar */}
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex-1 h-1 rounded-full bg-white/10">
            <div
              className="h-1 rounded-full bg-(--color_primary_light)"
              style={{ width: `${exercise.intensity * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-white/30 shrink-0">
            {Math.round(exercise.intensity * 100)}%
          </span>
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                               */
/* ------------------------------------------------------------------ */

export default function TrainerExerciseLibraryScreen() {
  const { data: exercises, loading } = useExercises();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | null>(null);
  const [zoneFilter, setZoneFilter] = useState<MuscleZone | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  /* Available categories (present in data) */
  const availableCategories = useMemo<ExerciseCategory[]>(() => {
    const set = new Set(exercises.map((e) => e.category));
    return (
      ['strength', 'functional', 'olympic', 'cardio', 'gymnastics'] as ExerciseCategory[]
    ).filter((c) => set.has(c));
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

  const visible = filtered.slice(0, 80);

  return (
    <Screen>
      <ScreenHeader
        icon={<BookOpenIcon className="w-6 h-6 text-(--color_primary_light)" />}
        title="Библиотека упражнений"
      />

      {/* Sticky filter area */}
      <div className="px-4 pt-2 pb-3 space-y-2.5 sticky top-0 z-10" style={{ backgroundColor: 'var(--color_bg_screen)' }}>
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Поиск среди ${exercises.length} упражнений...`}
            className="w-full bg-(--color_bg_card) border border-(--color_border) rounded-xl pl-9 pr-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-white/30"
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
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
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
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
      </div>

      {/* Results count */}
      <div className="px-4 mb-3">
        <p className="text-xs text-(--color_text_muted)">
          {loading
            ? 'Загрузка...'
            : filtered.length > 80
            ? `Показано 80 из ${filtered.length} — уточните поиск`
            : `${filtered.length} упражнений`}
        </p>
      </div>

      {/* Grid */}
      <div className="px-4 pb-24">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                <div className="aspect-video bg-white/10 animate-pulse" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-3 bg-white/10 rounded animate-pulse w-3/4" />
                  <div className="h-2.5 bg-white/10 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-4xl mb-3">🔍</span>
            <p className="text-white/50 text-sm">Ничего не найдено</p>
            <p className="text-white/30 text-xs mt-1">Попробуйте другой запрос</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visible.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                onClick={() => setSelectedExercise(ex)}
              />
            ))}
          </div>
        )}

        {filtered.length > 80 && !loading && (
          <p className="text-center text-xs text-(--color_text_muted) mt-4">
            Уточните поиск или выберите категорию / зону мышц
          </p>
        )}
      </div>

      {/* Detail sheet (read-only, no "add to workout" button) */}
      <ExerciseDetailSheet
        exercise={selectedExercise}
        open={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
      />
    </Screen>
  );
}
