import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import ExerciseDetailSheet from '@/components/ExerciseDetailSheet/ExerciseDetailSheet';
import ExerciseFilterBar, { CATEGORY_LABELS } from '@/components/ExerciseFilterBar/ExerciseFilterBar';
import { useExercises } from '@/hooks/useExercises';
import { useExerciseFilters } from '@/hooks/useExerciseFilters';
import type { Exercise, ExerciseCategory } from '@/types/Exercise';
import { getZoneLabel } from '@/util/zones';
import ScreenLinks from '@/components/ScreenLinks/ScreenLinks';

const CATEGORY_TEXT_COLORS: Record<ExerciseCategory, string> = {
  strength:   'text-blue-400',
  olympic:    'text-yellow-400',
  gymnastics: 'text-purple-400',
  functional: 'text-orange-400',
  cardio:     'text-green-400',
};

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
      <div className="w-full aspect-3/2 bg-black/20 overflow-hidden">
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
      </div>

      {/* Info */}
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

/* ------------------------------------------------------------------ */
/* Screen                                                               */
/* ------------------------------------------------------------------ */

export default function TrainerExerciseLibraryScreen() {
  const { data: exercises, loading } = useExercises();
  const {
    search, setSearch,
    categoryFilter, setCategoryFilter,
    zoneFilter, setZoneFilter,
    availableCategories,
    availableZones,
    filtered,
  } = useExerciseFilters(exercises);

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  // Scroll to top when filter chip changes
  useEffect(() => {
    document.querySelector('.trainer-exercise-library-screen')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [categoryFilter, zoneFilter]);

  const visible = filtered.slice(0, 80);

  return (
    <Screen className="trainer-exercise-library-screen">
      <div className="flex flex-col w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <ScreenHeader
            className="px-4 pt-4"
            icon={<BookOpenIcon className="w-6 h-6 text-(--color_primary_light)" />}
            title="Библиотека упражнений"
            description="Готовые упражнения по категориям — добавляйте в тренировки и шаблоны"
          />
        </motion.div>

        {/* Hint */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="px-4 pb-3">
          <ScreenHint>
            Фильтруйте по <span className="text-white font-medium">категории</span> или{' '}
            <span className="text-white font-medium">зоне мышц</span>, нажмите на карточку —
            увидите технику и описание. Упражнения доступны при создании шаблонов и тренировок.
          </ScreenHint>
        </motion.div>

        {/* Results count */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="px-4 mb-3">
          <p className="text-xs text-(--color_text_muted)">
            {loading
              ? '…'
              : filtered.length > 80
                ? `Показано 80 из ${filtered.length} — уточните поиск`
                : `${filtered.length} упражнений`}
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="px-4 pb-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden border border-white/10 bg-white/5"
                >
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
                <ExerciseCard key={ex.id} exercise={ex} onClick={() => setSelectedExercise(ex)} />
              ))}
            </div>
          )}

          {filtered.length > 80 && !loading && (
            <p className="text-center text-xs text-(--color_text_muted) mt-4">
              Уточните поиск или выберите категорию / зону мышц
            </p>
          )}
        </motion.div>

        {/* Filter bar — sticky above nav */}
        <div
          className="px-4 pt-4 pb-3 sticky z-10 border-t border-(--color_border)"
          style={{
            bottom: 0,
            background: 'linear-gradient(to top, rgb(var(--color_primary_ch) / 0.4) 0%, rgb(var(--color_primary_dark_ch) / 0.3) 50%, rgb(var(--color_primary_dark_ch) / 0.1) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
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


        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <ScreenLinks
            className="px-4 pb-4"
            links={[
              { emoji: '📋', bg: 'bg-violet-500/20', label: 'Шаблоны', sub: 'готовые тренировки', to: '/trainer/templates' },
              { emoji: '📅', bg: 'bg-blue-500/20', label: 'Календарь', sub: 'расписание тренировок', to: '/trainer/calendar' },
            ]}
          />
        </motion.div>

        {/* Detail sheet */}
        <ExerciseDetailSheet
          exercise={selectedExercise}
          open={!!selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      </div>
    </Screen>
  );
}
