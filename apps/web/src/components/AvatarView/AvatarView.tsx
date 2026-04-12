import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import Avatar from '@/components/Avatar/Avatar';
import type { ZoneState } from '@/api/avatar';
import type { BodyGender } from '@/components/Avatar/bodyZones';
import { getZoneLabel } from '@/util/zones';
import { workoutsApi, type ZoneWorkout } from '@/api/workouts';
import { WORKOUT_TYPE_CONFIG } from '@/constants/workoutTypes';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { exerciseIdForDisplay } from '@/utils/exerciseIdForDisplay';
import WorkoutDetailSheet from '@/screens/ActivityScreen/WorkoutDetailSheet';
import type { WorkoutTimelineEntry } from '@/types/Analytics';

/**
 * Normalizes short API zone keys (from ExerciseCatalog) and legacy seeder keys
 * to the canonical camelCase keys that match BODY_ZONE_TO_API.
 * Zones that map to the same canonical key are merged (highest intensity wins).
 */
export const ZONE_NORMALIZE: Record<string, string> = {
  back: 'backMuscles',
  trapezoids: 'backMuscles', // seeder stores 'trapezoids' directly
  traps: 'backMuscles',
  legs: 'legMuscles',
  calves: 'calfMuscles',
  glutes: 'glutealMuscles',
  core: 'abdominalPress',
  abs: 'abdominalPress',
  obliques: 'obliquePress',
  chest: 'chests',
  arms: 'biceps',
};


type Phase = 'destroyed' | 'recovering' | 'almost_ready' | 'recovered' | 'untrained';

function getPhase(zone: ZoneState): Phase {
  if (zone.intensity === 0 && zone.peakLoad === 0) return 'untrained';
  // "Перегружено" должно зависеть от текущей усталости (intensity), а не от пика в окне.
  // Иначе даже слегка нагруженные зоны в свежей тренировке могут выглядеть как "перегружены".
  if ((zone.lastTrainedDaysAgo ?? 999) <= 1 && zone.intensity >= 0.3) return 'destroyed';
  if (zone.intensity >= 0.4) return 'recovering';
  if (zone.intensity >= 0.1) return 'almost_ready';
  return 'recovered';
}

const PHASE_CONFIG: Record<Phase, { label: string; color: string; barColor: string; dotBg: string | null; tip: string }> =
  {
    destroyed: {
      label: 'Перегружено',
      color: 'text-red-400',
      barColor: 'from-red-600 to-red-400',
      dotBg: 'bg-red-500/70',
      tip: 'Мышца получила серьёзную нагрузку. Не тренируйте её минимум 48 часов.',
    },
    recovering: {
      label: 'Отдых',
      color: 'text-emerald-400',
      barColor: 'from-emerald-600 to-emerald-400',
      dotBg: 'bg-emerald-500/80',
      tip: 'Мышца ещё восстанавливается. Лучше поработать с другими группами.',
    },
    almost_ready: {
      label: 'Почти готово',
      color: 'text-amber-300',
      barColor: 'from-amber-500 to-yellow-300',
      dotBg: 'bg-amber-400/85',
      tip: 'Почти восстановилась. Лёгкая нагрузка допустима.',
    },
    recovered: {
      label: 'Готово',
      color: 'text-cyan-400',
      barColor: 'from-cyan-500 to-green-400',
      dotBg: 'bg-cyan-500/70',
      tip: 'Мышца полностью восстановилась. Можно нагружать.',
    },
    untrained: {
      label: 'Без нагрузки',
      color: 'text-(--color_text_muted)',
      barColor: 'from-gray-600 to-gray-500',
      dotBg: null,
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
  if (intensity >= 0.4) return 'from-emerald-600 to-emerald-400';
  if (intensity >= 0.1) return 'from-amber-500 to-yellow-300';
  if (intensity > 0) return 'from-cyan-500 to-emerald-400';
  return 'from-gray-600 to-gray-500';
}

function ZoneDetail({ zone }: { zone: ZoneState }) {
  const phase = getPhase(zone);
  const cfg = PHASE_CONFIG[phase];
  const pct = Math.round(zone.intensity * 100);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-0.5">
        <span className={`text-lg font-bold ${cfg.color}`}>{cfg.label}</span>
        {zone.lastTrainedDaysAgo !== undefined && (
          <span className="text-xs text-(--color_text_muted)">
            Последняя нагрузка: {getDaysAgoText(zone.lastTrainedDaysAgo).toLowerCase()}
          </span>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-(--color_text_muted)">Усталость</span>
          <span className={`text-sm font-semibold ${cfg.color}`}>{pct}%</span>
        </div>
        <div className="h-2 bg-(--color_border) rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${cfg.barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {zone.peakLoad > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-(--color_text_muted)">Пиковая нагрузка</span>
            <span className="text-sm font-semibold text-white">
              {Math.round(zone.peakLoad * 100)}%
            </span>
          </div>
          <div className="h-2 bg-(--color_border) rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-white/30 to-white/20"
              style={{ width: `${Math.round(zone.peakLoad * 100)}%` }}
            />
          </div>
        </div>
      )}

      <p className="text-sm text-(--color_text_muted)">{cfg.tip}</p>
    </div>
  );
}

interface AvatarViewProps {
  zones: Record<string, ZoneState>;
  totalWorkouts: number;
  lastWorkoutDaysAgo: number | null;
  loading?: boolean;
  gender?: BodyGender;
  /** После правок тренировки в шите — обновить карту восстановления */
  onWorkoutsMutated?: () => void;
  /**
   * athlete_self — список тренировок по зоне и шит как у атлета в календаре.
   * trainer_view — только сводка по зоне (список привязан к сессии атлета на API).
   */
  avatarContext?: 'athlete_self' | 'trainer_view';
}

export default function AvatarView({
  zones,
  totalWorkouts,
  lastWorkoutDaysAgo,
  loading = false,
  gender = 'male',
  onWorkoutsMutated,
  avatarContext = 'athlete_self',
}: AvatarViewProps) {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zoneWorkouts, setZoneWorkouts] = useState<ZoneWorkout[] | null>(null);
  const [zoneWorkoutsLoading, setZoneWorkoutsLoading] = useState(false);
  const [detailWorkout, setDetailWorkout] = useState<WorkoutTimelineEntry | null>(null);

  const openWorkoutFromZone = (w: ZoneWorkout) => {
    setDetailWorkout({
      id: w.id,
      date: typeof w.date === 'string' ? w.date : String(w.date),
      type: w.workoutType,
    });
  };

  const normalizedZones = useMemo(() => {
    const result: Record<string, ZoneState> = {};
    for (const [key, state] of Object.entries(zones)) {
      const canonical = ZONE_NORMALIZE[key] ?? key;
      const existing = result[canonical];
      if (!existing || state.intensity > existing.intensity) {
        result[canonical] = state;
      }
    }
    return result;
  }, [zones]);

  const zoneIntensities = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [name, state] of Object.entries(normalizedZones)) {
      result[name] = state.intensity;
    }
    return result;
  }, [normalizedZones]);


  const summary = useMemo(() => {
    const entries = Object.entries(normalizedZones);
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

  useEffect(() => {
    if (!selectedZone || avatarContext !== 'athlete_self') {
      setZoneWorkouts(null);
      return;
    }
    let cancelled = false;
    setZoneWorkoutsLoading(true);
    setZoneWorkouts(null);
    workoutsApi
      .byZone(selectedZone, 5)
      .then((res) => {
        if (!cancelled) {
          setZoneWorkouts(res.data ?? []);
          setZoneWorkoutsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setZoneWorkouts([]);
          setZoneWorkoutsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedZone, avatarContext]);

  const handleZoneClick = (zoneName: string) => {
    setSelectedZone((prev) => (prev === zoneName ? null : zoneName));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col lg:flex-row gap-6"
    >
      {/* Avatar */}
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
          gender={gender}
        />

        <div className="flex items-center justify-center gap-3 mt-3 text-xs text-(--color_text_muted) flex-wrap">
          {(Object.entries(PHASE_CONFIG) as [Phase, (typeof PHASE_CONFIG)[Phase]][])
            .filter(([, cfg]) => cfg.dotBg !== null)
            .map(([phase, cfg]) => (
              <div key={phase} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${cfg.dotBg}`} />
                <span>{cfg.label}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Right column */}
      <div className="flex-1 space-y-4">
        {/* Summary */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-(--color_text_secondary) uppercase tracking-wider">
              Состояние сейчас
            </h3>
            <span className="text-xs text-(--color_text_muted)">
              Последняя: {getDaysAgoText(lastWorkoutDaysAgo)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-(--color_bg_card) rounded-xl p-3">
              <div className="text-lg font-bold text-white">{totalWorkouts}</div>
              <div className="text-xs text-(--color_text_muted)">За 14 дней</div>
            </div>
            <div className="bg-(--color_bg_card) rounded-xl p-3">
              <div className="text-lg font-bold text-white">
                {summary.loadedCount}/{summary.totalCount}
              </div>
              <div className="text-xs text-(--color_text_muted)">Зон нагружено</div>
            </div>
            <div className="bg-(--color_bg_card) rounded-xl p-3">
              <div className="text-lg font-bold text-white">
                {Math.round(summary.avgIntensity * 100)}%
              </div>
              <div className="text-xs text-(--color_text_muted)">Ср. усталость</div>
            </div>
          </div>

          {summary.max && (
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-(--color_text_muted)">Самая уставшая</span>
                <span className={`font-medium ${PHASE_CONFIG[getPhase(summary.max.zone)].color}`}>
                  {getZoneLabel(summary.max.name)} —{' '}
                  {PHASE_CONFIG[getPhase(summary.max.zone)].label}
                </span>
              </div>
              {summary.min && summary.min.name !== summary.max.name && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-(--color_text_muted)">Самая отдохнувшая</span>
                  <span className={`font-medium ${PHASE_CONFIG[getPhase(summary.min.zone)].color}`}>
                    {getZoneLabel(summary.min.name)} —{' '}
                    {PHASE_CONFIG[getPhase(summary.min.zone)].label}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* All zones */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-(--color_text_secondary) uppercase tracking-wider mb-4">
            Все зоны
          </h3>
          {Object.keys(zones).length === 0 ? (
            <div className="space-y-5 py-2">
              <p className="text-sm text-(--color_text_muted) leading-relaxed">
                Здесь появится карта восстановления мышц после первых тренировок. Вот как работать с системой:
              </p>

              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <span className="text-base leading-snug">1️⃣</span>
                  <div className="flex flex-col">
                    <Link to="/workouts/new" className="text-sm font-medium text-white underline underline-offset-2 decoration-(--color_primary) inline-flex items-center gap-1 mb-1 after:content-['→']">
                      Залогируй тренировку
                    </Link>
                    <p className="text-xs text-(--color_text_muted) mt-0.5">
                      После каждой тренировки добавляй упражнения, веса и повторения. Система рассчитает нагрузку по зонам.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="text-base leading-snug">2️⃣</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white mb-1">Смотри карту восстановления</span>
                    <p className="text-xs text-(--color_text_muted) mt-0.5">
                      Кликай на мышцы на аватаре — увидишь усталость и когда можно снова нагружать. Красный = отдыхай, зелёный = готово.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="text-base leading-snug">3️⃣</span>
                  <div className="flex flex-col">
                    <Link to="/calendar" className="text-sm font-medium text-white underline underline-offset-2 decoration-(--color_primary) inline-flex items-center gap-1 mb-1 after:content-['→']">
                      Планируй по календарю
                    </Link>
                    <p className="text-xs text-(--color_text_muted) mt-0.5">
                      Тренируйся 3–4 раза в неделю, чередуй группы мышц. Система сама покажет что уже готово к нагрузке.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="text-base leading-snug">4️⃣</span>
                  <div className="flex flex-col">
                    <Link to="/analytics" className="text-sm font-medium text-white underline underline-offset-2 decoration-(--color_primary) inline-flex items-center gap-1 mb-1 after:content-['→']">
                      Следи за прогрессом
                    </Link>
                    <p className="text-xs text-(--color_text_muted) mt-0.5">
                      В аналитике виден прогресс по весам, объёму и частоте. Раз в месяц сверяй — есть ли рост.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
          <div className="space-y-2">
            {Object.entries(zones)
              .sort((a, b) => b[1].intensity - a[1].intensity)
              .map(([name, zoneState]) => {
                const phase = getPhase(zoneState);
                const cfg = PHASE_CONFIG[phase];
                return (
                  <button
                    key={name}
                    onClick={() => handleZoneClick(ZONE_NORMALIZE[name] ?? name)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left ${
                      selectedZone === (ZONE_NORMALIZE[name] ?? name)
                        ? 'bg-(--color_primary_light)/15 ring-1 ring-(--color_primary_light)/30'
                        : 'hover:bg-(--color_bg_card_hover)'
                    }`}
                  >
                    <span className="text-sm text-white flex-1 min-w-0 truncate">{getZoneLabel(name)}</span>
                    <div className="w-24 h-1.5 bg-(--color_border) rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${getBarColorByIntensity(zoneState.intensity)}`}
                        style={{ width: `${Math.max(Math.round(zoneState.intensity * 100), 2)}%` }}
                      />
                    </div>
                    <span className={`text-xs w-20 text-right font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
          </div>
          )}
        </div>

        {/* Zone detail BottomSheet */}
        <BottomSheet
          id="avatar-zone-detail"
          open={!!(selectedZone && normalizedZones[selectedZone])}
          onClose={() => setSelectedZone(null)}
          title={selectedZone ? getZoneLabel(selectedZone) : ''}
        >
          {selectedZone && normalizedZones[selectedZone] && (
            <>
              <ZoneDetail zone={normalizedZones[selectedZone]} />
              <div className="mt-4 pt-4 border-t border-white/10">
                {avatarContext === 'trainer_view' ? (
                  <p className="text-[11px] text-(--color_text_muted) leading-relaxed">
                    Список упражнений по зоне и открытие карточки тренировки доступны атлету в разделе «Карта нагрузки» в его приложении.
                  </p>
                ) : (
                  <>
                    <h4 className="text-xs font-semibold text-(--color_text_secondary) uppercase tracking-wider mb-1">
                      Недавние тренировки
                    </h4>
                    <p className="text-[11px] text-(--color_text_muted) mb-3">
                      Только упражнения, которые нагрузили эту зону. Нажмите строку — откроется карточка, как в календаре.
                    </p>
                    {zoneWorkoutsLoading && (
                      <div className="flex items-center gap-2 text-xs text-(--color_text_muted)">
                        <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                        Загрузка...
                      </div>
                    )}
                    {!zoneWorkoutsLoading && zoneWorkouts?.length === 0 && (
                      <p className="text-xs text-(--color_text_muted)">Нет тренировок для этой зоны</p>
                    )}
                    {!zoneWorkoutsLoading && zoneWorkouts && zoneWorkouts.length > 0 && (
                      <div className="flex flex-col gap-2 items-start max-w-full">
                        {zoneWorkouts.map((w) => (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => openWorkoutFromZone(w)}
                            className="w-fit max-w-full min-w-0 rounded-xl bg-(--color_bg_card) px-3 py-2.5 text-left transition-colors hover:bg-(--color_bg_card_hover) border border-white/5"
                          >
                            <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                              <span className="text-xs font-semibold text-white shrink-0 tabular-nums">
                                {new Date(w.date).toLocaleDateString('ru-RU', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="text-(--color_text_muted) text-xs shrink-0" aria-hidden>
                                ·
                              </span>
                              <span className="text-[10px] text-(--color_text_muted) min-w-0 truncate">
                                {WORKOUT_TYPE_CONFIG[w.workoutType] ?? w.workoutType}
                              </span>
                              <ChevronRightIcon
                                className="w-4 h-4 text-(--color_text_muted) shrink-0"
                                aria-hidden
                              />
                            </div>
                            {w.exercises.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-full">
                                {w.exercises.map((ex) => (
                                  <span
                                    key={ex.exerciseId}
                                    className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.07] text-white/80"
                                  >
                                    {exerciseIdForDisplay(ex.name?.trim() ? ex.name : ex.exerciseId)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-(--color_text_muted) leading-snug max-w-full">
                                В упражнениях нет сохранённой разметки этой зоны — откройте тренировку, чтобы увидеть полный состав.
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </BottomSheet>

        {avatarContext === 'athlete_self' && (
          <WorkoutDetailSheet
            workout={detailWorkout}
            onClose={() => setDetailWorkout(null)}
            onRefresh={onWorkoutsMutated}
          />
        )}
      </div>
    </motion.div>
  );
}
