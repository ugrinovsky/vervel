import { normalizeIntensity } from '@/constants/AnalyticsConstants';
import { getZoneLabel } from './zones';

export type RecommendationType = 'focus' | 'improvement' | 'achievement' | 'warning';
export type Priority = 'high' | 'medium' | 'low';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  priority: Priority;
  action?: string;
  estimatedTime?: string;
  muscleGroups?: string[];
}

/** Сумма вкладов по зонам по таймлайну (без нормализации к max) — для долей «от суммы по зонам». */
export function sumZoneLoadsFromTimeline(
  timeline: ReadonlyArray<{ zones?: Record<string, number> }>
): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const t of timeline) {
    const z = t.zones ?? {};
    for (const [k, v] of Object.entries(z)) {
      acc[k] = (acc[k] ?? 0) + (Number(v) || 0);
    }
  }
  return acc;
}

const IMBALANCE_DIFF_FOCUS = 0.3;
const IMBALANCE_DIFF_HIGH = 0.5;
/** Доля от суммы вкладов по зонам за период — ниже считаем «мало в общем пироге» */
const LOW_ZONE_SHARE = 0.06;
const MIN_DISTINCT_ZONES_FOR_SHARE_HINT = 4;
const MAX_ZONES_IN_SHARE_HINT = 3;
const INTENSITY_LOW_PCT = 40;
const INTENSITY_HIGH_PCT = 78;

export function generateRecommendations(stats: any): Recommendation[] {
  const recs: Recommendation[] = [];

  const zones: Record<string, number> = stats.zones || {};
  const timeline = stats.timeline || [];
  const totalVolume = stats.totalVolume || 0;
  const avgIntensityRaw = Number(stats.avgIntensity) || 0;
  const avgIntensityPct = Math.round(normalizeIntensity(avgIntensityRaw));

  const zoneEntries = Object.entries(zones) as [string, number][];
  const coveredZones = new Set<string>();

  /**
   * stats.zones с API — нормализованы к пику периода (лидер = 1.0), не «% от суммы всех зон».
   * Старый порог value < 0.3 на каждую зону давал лавину ложных «0% общей нагрузки».
   */
  if (zoneEntries.length > 1) {
    const sorted = [...zoneEntries].sort((a, b) => b[1] - a[1]);

    const [maxZone, maxValue] = sorted[0];
    const [minZone, minValue] = sorted[sorted.length - 1];

    const diff = maxValue - minValue;

    if (diff > IMBALANCE_DIFF_FOCUS) {
      const maxL = getZoneLabel(maxZone);
      const minL = getZoneLabel(minZone);
      recs.push({
        id: 'muscle_imbalance',
        type: 'focus',
        title: `Дисбаланс нагрузки: ${minL}`,
        description: `За период лидирует «${maxL}» (шкала до 100% относительно неё), а «${minL}» — около ${Math.round(
          minValue * 100
        )}% от этого уровня. При желании добавьте объёма на «${minL}».`,
        priority: diff > IMBALANCE_DIFF_HIGH ? 'high' : 'medium',
        muscleGroups: [minZone],
      });
      coveredZones.add(minZone);
      coveredZones.add(maxZone);
    }
  }

  const zoneSums = sumZoneLoadsFromTimeline(timeline);
  const sumTotal = Object.values(zoneSums).reduce((s, v) => s + v, 0);
  const distinctZones = Object.keys(zoneSums).length;

  if (sumTotal > 0 && distinctZones >= MIN_DISTINCT_ZONES_FOR_SHARE_HINT) {
    const lowShareZones = Object.entries(zoneSums)
      .map(([id, load]) => ({ id, share: load / sumTotal }))
      .filter(({ id, share }) => share < LOW_ZONE_SHARE && !coveredZones.has(id))
      .sort((a, b) => a.share - b.share)
      .slice(0, MAX_ZONES_IN_SHARE_HINT);

    if (lowShareZones.length > 0) {
      const labels = lowShareZones.map((z) => getZoneLabel(z.id)).join(', ');
      const ids = lowShareZones.map((z) => z.id);
      recs.push({
        id: 'zones_low_share',
        type: 'focus',
        title: 'Малый вклад нескольких зон',
        description: `По сумме нагрузок за период у «${labels}» доля меньше ~${Math.round(
          LOW_ZONE_SHARE * 100
        )}% каждая. Это нормально для узкой специализации; если хотите разнообразие — чаще включайте эти группы.`,
        priority: 'low',
        muscleGroups: ids,
      });
    }
  }

  if (avgIntensityPct < INTENSITY_LOW_PCT) {
    recs.push({
      id: 'intensity_low',
      type: 'improvement',
      title: 'Низкая средняя интенсивность',
      description: `Средняя интенсивность за период — около ${avgIntensityPct}% (оценка приложения). При необходимости можно постепенно добавлять рабочий вес или усиливать сеты.`,
      priority: 'high',
    });
  }

  if (avgIntensityPct > INTENSITY_HIGH_PCT) {
    recs.push({
      id: 'intensity_high',
      type: 'achievement',
      title: 'Высокая интенсивность тренировок',
      description: `Средняя интенсивность — около ${avgIntensityPct}%. Следите за восстановлением между сессиями.`,
      priority: 'low',
    });
  }

  if (timeline.length > 0) {
    const last = timeline[timeline.length - 1];

    const avgVolume = timeline.length > 0 ? totalVolume / timeline.length : 0;

    if (last?.volume && avgVolume && last.volume < avgVolume * 0.6) {
      recs.push({
        id: 'last_workout_low',
        type: 'improvement',
        title: 'Снижение объёма последней тренировки',
        description:
          'Объём последней тренировки заметно ниже среднего значения за период. Возможно, стоит скорректировать нагрузку.',
        priority: 'medium',
      });
    }
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };

  return recs
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 5);
}
