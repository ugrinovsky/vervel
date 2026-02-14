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

export function generateRecommendations(stats: any): Recommendation[] {
  const recs: Recommendation[] = [];

  const zones: Record<string, number> = stats.zones || {};
  const timeline = stats.timeline || [];
  const totalVolume = stats.totalVolume || 0;
  const avgIntensity = stats.avgIntensity || 0;

  const zoneEntries = Object.entries(zones) as [string, number][];
  const coveredZones = new Set<string>();

  if (zoneEntries.length > 1) {
    const sorted = [...zoneEntries].sort((a, b) => b[1] - a[1]);

    const [maxZone, maxValue] = sorted[0];
    const [minZone, minValue] = sorted[sorted.length - 1];

    const diff = maxValue - minValue;

    if (diff > 0.3) {
      recs.push({
        id: 'muscle_imbalance',
        type: 'focus',
        title: `Дисбаланс нагрузки: ${getZoneLabel(minZone)}`,
        description: `${getZoneLabel(minZone)} получает ${Math.round(
          minValue * 100
        )}% нагрузки, тогда как ${getZoneLabel(maxZone)} — ${Math.round(
          maxValue * 100
        )}%. Рекомендуется выровнять распределение.`,
        priority: diff > 0.5 ? 'high' : 'medium',
        muscleGroups: [minZone],
      });
      coveredZones.add(minZone);
      coveredZones.add(maxZone);
    }
  }

  zoneEntries.forEach(([zoneId, value]) => {
    if (coveredZones.has(zoneId)) return;

    const label = getZoneLabel(zoneId);

    if (value < 0.3) {
      recs.push({
        id: `zone_low_${zoneId}`,
        type: 'focus',
        title: `Недостаточная нагрузка: ${label}`,
        description: `${label} получает только ${Math.round(
          value * 100
        )}% общей нагрузки. Можно увеличить объём тренировок для этой группы.`,
        priority: 'medium',
        muscleGroups: [zoneId],
      });
      coveredZones.add(zoneId);
    }

    if (value > 0.8) {
      recs.push({
        id: `zone_high_${zoneId}`,
        type: 'warning',
        title: `Повышенная нагрузка: ${label}`,
        description: `${label} получает ${Math.round(
          value * 100
        )}% общей нагрузки. Важно контролировать восстановление.`,
        priority: 'medium',
        muscleGroups: [zoneId],
      });
      coveredZones.add(zoneId);
    }
  });

  const INTENSITY_LOW = 0.5;
  const INTENSITY_HIGH = 0.8;

  if (avgIntensity < INTENSITY_LOW) {
    recs.push({
      id: 'intensity_low',
      type: 'improvement',
      title: 'Низкая средняя интенсивность',
      description: `Средняя интенсивность составляет ${Math.round(
        avgIntensity * 100
      )}%. Можно постепенно увеличивать рабочую нагрузку.`,
      priority: 'high',
    });
  }

  if (avgIntensity > INTENSITY_HIGH) {
    recs.push({
      id: 'intensity_high',
      type: 'achievement',
      title: 'Высокая интенсивность тренировок',
      description: `Средняя интенсивность составляет ${Math.round(
        avgIntensity * 100
      )}%. Продолжайте придерживаться текущего темпа.`,
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
