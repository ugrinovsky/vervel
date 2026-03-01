import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import Avatar from '@/components/Avatar/Avatar';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import { avatarApi, ZoneState } from '@/api/avatar';
import { athleteApi } from '@/api/athlete';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

const WORKOUT_LABELS: Record<string, string> = {
  crossfit: 'CrossFit',
  bodybuilding: 'Бодибилдинг',
  cardio: 'Кардио',
};

const WORKOUT_COLORS: Record<string, string> = {
  crossfit: 'from-orange-500 to-red-500',
  bodybuilding: 'from-violet-500 to-purple-500',
  cardio: 'from-blue-500 to-cyan-500',
};

const ZONE_LABELS: Record<string, string> = {
  chests: 'Грудь',
  shoulders: 'Плечи',
  trapezoids: 'Трапеции',
  abdominalPress: 'Пресс',
  obliquePress: 'Косые мышцы',
  backMuscles: 'Спина',
  legMuscles: 'Ноги',
  biceps: 'Бицепс',
  triceps: 'Трицепс',
  forearms: 'Предплечья',
  calfMuscles: 'Икры',
  // ExerciseCatalog zone IDs (mapped from backend)
  back: 'Спина',
  legs: 'Ноги',
  core: 'Пресс',
  glutes: 'Ягодицы',
};

/**
 * Maps ExerciseCatalog zone IDs → SVG zone names used in Avatar.
 * The backend stores zones as 'back', 'legs', 'core', 'glutes',
 * but the SVG avatar uses 'backMuscles', 'legMuscles', 'abdominalPress'.
 */
const CATALOG_TO_SVG_ZONE: Record<string, string> = {
  back: 'backMuscles',
  legs: 'legMuscles',
  core: 'abdominalPress',
  // glutes: SVG glutealMuscles is commented out — map to legMuscles as closest
  glutes: 'legMuscles',
};

/**
 * Фаза восстановления мышцы, определяется комбинацией:
 * - intensity (текущая нагрузка с decay)
 * - lastTrainedDaysAgo (когда последний раз тренировали)
 * - peakLoad (насколько сильно нагрузили)
 */
type Phase = 'destroyed' | 'recovering' | 'almost_ready' | 'recovered' | 'untrained';

function getPhase(zone: ZoneState): Phase {
  // Не тренировалась в окне 14 дней
  if (zone.intensity === 0 && zone.peakLoad === 0) return 'untrained';

  // Тренировали сегодня/вчера — свежая нагрузка
  if (zone.lastTrainedDaysAgo <= 1 && zone.peakLoad >= 0.3) return 'destroyed';

  // Высокая остаточная нагрузка — ещё не восстановилась
  if (zone.intensity >= 0.4) return 'recovering';

  // Лёгкая остаточная нагрузка — почти готова
  if (zone.intensity >= 0.1) return 'almost_ready';

  return 'recovered';
}

const PHASE_CONFIG: Record<Phase, { label: string; color: string; barColor: string; tip: string }> =
  {
    destroyed: {
      label: 'Убита',
      color: 'text-red-400',
      barColor: 'from-red-600 to-red-400',
      tip: 'Мышца получила серьёзную нагрузку. Не тренируйте её минимум 48 часов.',
    },
    recovering: {
      label: 'Восстанавливается',
      color: 'text-orange-400',
      barColor: 'from-orange-500 to-yellow-400',
      tip: 'Мышца ещё восстанавливается. Лучше поработать с другими группами.',
    },
    almost_ready: {
      label: 'Почти готова',
      color: 'text-yellow-300',
      barColor: 'from-yellow-500 to-green-400',
      tip: 'Почти восстановилась. Лёгкая нагрузка допустима.',
    },
    recovered: {
      label: 'Отдохнула',
      color: 'text-green-400',
      barColor: 'from-green-500 to-green-400',
      tip: 'Мышца полностью восстановилась. Можно нагружать.',
    },
    untrained: {
      label: 'Не тренировалась',
      color: 'text-[var(--color_text_muted)]',
      barColor: 'from-gray-600 to-gray-500',
      tip: 'Эта группа мышц не получала нагрузки. Обратите на неё внимание.',
    },
  };

function getDaysAgoText(days: number | null): string {
  if (days === null) return 'Нет тренировок';
  if (days === 0) return 'Сегодня';
  if (days === 1) return 'Вчера';
  if (days <= 4) return `${days} дня назад`;
  return `${days} дней назад`;
}

function getBarColorByIntensity(intensity: number): string {
  if (intensity >= 0.6) return 'from-red-500 to-red-400';
  if (intensity >= 0.3) return 'from-orange-500 to-yellow-400';
  if (intensity > 0) return 'from-green-500 to-green-400';
  return 'from-gray-600 to-gray-500';
}

interface TodayWorkout {
  id: number;
  workoutType: string;
  exerciseCount: number;
  notes: string | null;
}

export default function AvatarScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [zones, setZones] = useState<Record<string, ZoneState>>({});
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [lastWorkoutDaysAgo, setLastWorkoutDaysAgo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [todayWorkout, setTodayWorkout] = useState<TodayWorkout | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [avatarRes, workoutsRes] = await Promise.all([
        avatarApi.getRecoveryState(),
        athleteApi.getUpcomingWorkouts(),
      ]);
      if (avatarRes.data.success) {
        setZones(avatarRes.data.data.zones);
        setTotalWorkouts(avatarRes.data.data.totalWorkouts);
        setLastWorkoutDaysAgo(avatarRes.data.data.lastWorkoutDaysAgo);
      }
      if (workoutsRes.data.success) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const found = workoutsRes.data.data.find(
          (w) => (w.date as string).slice(0, 10) === todayStr
        );
        setTodayWorkout(found ?? null);
      }
    } catch (error) {
      console.error('Failed to load avatar stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Для Avatar компонента — плоская карта intensity.
  // Ремапим зоны ExerciseCatalog (back/legs/core/glutes) → имена SVG-зон аватара.
  const zoneIntensities = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [name, state] of Object.entries(zones)) {
      const svgName = CATALOG_TO_SVG_ZONE[name] ?? name;
      result[svgName] = Math.max(result[svgName] ?? 0, state.intensity);
    }
    return result;
  }, [zones]);

  const summary = useMemo(() => {
    const entries = Object.entries(zones);
    const loaded = entries.filter(([, z]) => z.intensity > 0);
    const total = entries.length;

    if (loaded.length === 0) {
      return { loadedCount: 0, totalCount: total, avgIntensity: 0, max: null, min: null };
    }

    const avg = loaded.reduce((sum, [, z]) => sum + z.intensity, 0) / loaded.length;
    const sorted = [...loaded].sort((a, b) => b[1].intensity - a[1].intensity);

    return {
      loadedCount: loaded.length,
      totalCount: total,
      avgIntensity: avg,
      max: sorted[0] ? { name: sorted[0][0], zone: sorted[0][1] } : null,
      min: sorted[sorted.length - 1]
        ? { name: sorted[sorted.length - 1][0], zone: sorted[sorted.length - 1][1] }
        : null,
    };
  }, [zones]);

  const handleZoneClick = (zoneName: string) => {
    setSelectedZone((prev) => (prev === zoneName ? null : zoneName));
  };

  return (
    <Screen>
      <div className="p-4 w-full">
        <ScreenHeader
          icon="🏋️"
          title="Карта нагрузки"
          description="Текущее состояние мышц с учётом восстановления"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row gap-6"
        >
          {/* Аватар */}
          <div className="flex-shrink-0 lg:w-[360px] relative">
            {loading && (
              <div className="absolute inset-0 bg-black/30 rounded-2xl z-10 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
            <Avatar
              zoneIntensities={zoneIntensities}
              selectedZone={selectedZone}
              onZoneClick={handleZoneClick}
              gender={user?.gender ?? 'male'}
            />

            {/* Легенда */}
            <div className="flex items-center justify-center gap-3 mt-3 text-xs text-[var(--color_text_muted)] flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-red-500/70" />
                <span>Убита</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-orange-500/70" />
                <span>Восстан.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-yellow-400/70" />
                <span>Почти</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-green-500/70" />
                <span>Отдохнула</span>
              </div>
            </div>
          </div>

          {/* Правая колонка */}
          <div className="flex-1 space-y-4">
            {/* Тренировка от тренера сегодня */}
            <AnimatePresence>
              {todayWorkout && (
                <motion.button
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => navigate('/activity')}
                  className={`w-full text-left rounded-2xl p-4 bg-gradient-to-r ${WORKOUT_COLORS[todayWorkout.workoutType] ?? 'from-violet-500 to-purple-500'} relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="relative flex items-center gap-3">
                    <div className="text-2xl">📋</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white/70 uppercase tracking-wider mb-0.5">
                        Тренировка от тренера · Сегодня
                      </div>
                      <div className="text-base font-bold text-white truncate">
                        {WORKOUT_LABELS[todayWorkout.workoutType] ?? todayWorkout.workoutType}
                        {' · '}
                        {todayWorkout.exerciseCount} упр.
                      </div>
                      {todayWorkout.notes && (
                        <div className="text-xs text-white/70 mt-0.5 truncate">{todayWorkout.notes}</div>
                      )}
                    </div>
                    <div className="text-white/60 text-sm shrink-0">→</div>
                  </div>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Сводка */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--color_text_secondary)] uppercase tracking-wider">
                  Состояние сейчас
                </h3>
                <span className="text-xs text-[var(--color_text_muted)]">
                  Последняя тренировка: {getDaysAgoText(lastWorkoutDaysAgo)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[var(--color_bg_card)] rounded-xl p-3">
                  <div className="text-2xl font-bold text-white">{totalWorkouts}</div>
                  <div className="text-xs text-[var(--color_text_muted)]">
                    Тренировок за 14 дней
                  </div>
                </div>
                <div className="bg-[var(--color_bg_card)] rounded-xl p-3">
                  <div className="text-2xl font-bold text-white">
                    {summary.loadedCount}/{summary.totalCount}
                  </div>
                  <div className="text-xs text-[var(--color_text_muted)]">Зон нагружено</div>
                </div>
                <div className="bg-[var(--color_bg_card)] rounded-xl p-3">
                  <div className="text-2xl font-bold text-white">
                    {Math.round(summary.avgIntensity * 100)}%
                  </div>
                  <div className="text-xs text-[var(--color_text_muted)]">Средняя усталость</div>
                </div>
              </div>

              {summary.max && (
                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color_text_muted)]">Самая уставшая</span>
                    <span
                      className={`font-medium ${PHASE_CONFIG[getPhase(summary.max.zone)].color}`}
                    >
                      {ZONE_LABELS[summary.max.name] || summary.max.name} —{' '}
                      {PHASE_CONFIG[getPhase(summary.max.zone)].label}
                    </span>
                  </div>
                  {summary.min && summary.min.name !== summary.max.name && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--color_text_muted)]">Самая отдохнувшая</span>
                      <span
                        className={`font-medium ${PHASE_CONFIG[getPhase(summary.min.zone)].color}`}
                      >
                        {ZONE_LABELS[summary.min.name] || summary.min.name} —{' '}
                        {PHASE_CONFIG[getPhase(summary.min.zone)].label}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Детали выбранной зоны */}
            <AnimatePresence mode="wait">
              {selectedZone && zones[selectedZone] && (
                <motion.div
                  key={selectedZone}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="glass rounded-2xl p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">
                      {ZONE_LABELS[selectedZone] || selectedZone}
                    </h3>
                    <button
                      onClick={() => setSelectedZone(null)}
                      className="text-[var(--color_text_muted)] hover:text-white transition-colors text-sm"
                    >
                      Закрыть
                    </button>
                  </div>
                  <ZoneDetail zone={zones[selectedZone]} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Все зоны */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-[var(--color_text_secondary)] uppercase tracking-wider mb-4">
                Все зоны
              </h3>
              <div className="space-y-2">
                {Object.entries(zones)
                  .sort((a, b) => b[1].intensity - a[1].intensity)
                  .map(([name, zoneState]) => {
                    const phase = getPhase(zoneState);
                    const cfg = PHASE_CONFIG[phase];
                    return (
                      <button
                        key={name}
                        onClick={() => handleZoneClick(name)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left ${
                          selectedZone === name
                            ? 'bg-[var(--color_primary_light)]/15 ring-1 ring-[var(--color_primary_light)]/30'
                            : 'hover:bg-[var(--color_bg_card_hover)]'
                        }`}
                      >
                        <span className="text-sm text-white flex-1">
                          {ZONE_LABELS[name] || name}
                        </span>
                        <div className="w-24 h-1.5 bg-[var(--color_border)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${getBarColorByIntensity(zoneState.intensity)}`}
                            style={{
                              width: `${Math.max(Math.round(zoneState.intensity * 100), 2)}%`,
                            }}
                          />
                        </div>
                        <span className={`text-xs w-28 text-right font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Screen>
  );
}

function ZoneDetail({ zone }: { zone: ZoneState }) {
  const phase = getPhase(zone);
  const cfg = PHASE_CONFIG[phase];
  const pct = Math.round(zone.intensity * 100);

  return (
    <div className="space-y-4">
      {/* Фаза */}
      <div className="flex items-center gap-3">
        <span className={`text-lg font-bold ${cfg.color}`}>{cfg.label}</span>
        {zone.lastTrainedDaysAgo !== undefined && (
          <span className="text-xs text-[var(--color_text_muted)]">
            {getDaysAgoText(zone.lastTrainedDaysAgo)}
          </span>
        )}
      </div>

      {/* Прогресс-бар усталости */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--color_text_muted)]">Усталость</span>
          <span className={`text-sm font-semibold ${cfg.color}`}>{pct}%</span>
        </div>
        <div className="h-2 bg-[var(--color_border)] rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${cfg.barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Пиковая нагрузка */}
      {zone.peakLoad > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--color_text_muted)]">Пиковая нагрузка</span>
            <span className="text-sm font-semibold text-white">
              {Math.round(zone.peakLoad * 100)}%
            </span>
          </div>
          <div className="h-2 bg-[var(--color_border)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-white/30 to-white/20"
              style={{ width: `${Math.round(zone.peakLoad * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Подсказка */}
      <p className="text-sm text-[var(--color_text_muted)]">{cfg.tip}</p>
    </div>
  );
}
