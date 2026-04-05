import { DateTime } from 'luxon';
import Workout from '#models/workout';
import UserPinnedExercise from '#models/user_pinned_exercise';
import UserDashboardExercise from '#models/user_dashboard_exercise';
import db from '@adonisjs/lucid/services/db';
import type { WorkoutExercise, WorkoutSet } from '#models/workout';
import { ExerciseCatalog } from '#services/ExerciseCatalog';
import {
  capitalizeFirstForDisplay,
  displayNameMatchesCatalogTitle,
} from '#services/exercise_match_helpers';
import {
  normalizePinnedExerciseIdList,
  pickTopExerciseIdsBySessionCount,
} from '#services/strength_log_support';

/**
 * Формула Эпли: расчёт условного 1RM
 * 1RM = weight × (1 + reps/30)
 * Используется для нормализации нагрузки по разным схемам подходов.
 */
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Максимальный 1RM среди всех сетов упражнения
 */
export function maxEpley(sets: WorkoutSet[]): number {
  let best = 0;
  for (const s of sets) {
    if (s.weight && s.reps) {
      const rm = epley1RM(s.weight, s.reps);
      if (rm > best) best = rm;
    }
  }
  return best;
}

export interface ExerciseProgression {
  exerciseId: string;
  exerciseName: string;
  currentBest: number; // максимальный 1RM за текущий период
  previousBest: number; // максимальный 1RM за предыдущий период
  progressionPct: number | null; // % прироста, null если нет данных за прошлый период
  isPersonalRecord: boolean;
}

export interface WeekPoint {
  date: string; // ISO дата начала периода (день или неделя)
  workouts: number;
  volume: number;
}

export interface GroupLeaderboardEntry {
  userId: number;
  fullName: string | null;
  photoUrl: string | null;
  workouts: number;
  volume: number;
  relativeVolume: number | null;
  progressionCoeff: number | null;
  streakWeeks: number;
  xp: number;
  level: number;
  weeklySeries: WeekPoint[]; // временной ряд за период
}

export class ProgressionService {
  /**
   * Прогрессия по упражнениям для одного пользователя.
   * Сравниваем текущий месяц с предыдущим.
   */
  static async getUserProgression(userId: number): Promise<ExerciseProgression[]> {
    const now = DateTime.now();
    const currentStart = now.startOf('month').toJSDate();
    const previousStart = now.minus({ months: 1 }).startOf('month').toJSDate();
    const previousEnd = now.startOf('month').toJSDate();

    const [currentWorkouts, previousWorkouts] = await Promise.all([
      Workout.query()
        .where('userId', userId)
        .where('date', '>=', currentStart)
        .whereNull('deleted_at'),
      Workout.query()
        .where('userId', userId)
        .where('date', '>=', previousStart)
        .where('date', '<', previousEnd)
        .whereNull('deleted_at'),
    ]);

    // exerciseId → best 1RM
    const currentBestMap = new Map<string, number>();
    const previousBestMap = new Map<string, number>();

    for (const w of currentWorkouts) {
      for (const ex of w.exercises ?? []) {
        if (ex.type !== 'strength' || !ex.sets?.length) continue;
        const rm = maxEpley(ex.sets);
        if (rm > (currentBestMap.get(ex.exerciseId) ?? 0)) {
          currentBestMap.set(ex.exerciseId, rm);
        }
      }
    }

    for (const w of previousWorkouts) {
      for (const ex of w.exercises ?? []) {
        if (ex.type !== 'strength' || !ex.sets?.length) continue;
        const rm = maxEpley(ex.sets);
        if (rm > (previousBestMap.get(ex.exerciseId) ?? 0)) {
          previousBestMap.set(ex.exerciseId, rm);
        }
      }
    }

    if (currentBestMap.size === 0) return [];

    // Загружаем названия упражнений
    const exerciseIds = [...currentBestMap.keys()];
    const exercises = await db.from('exercises').whereIn('id', exerciseIds).select('id', 'title');

    const nameMap = new Map<string, string>(exercises.map((e: any) => [e.id, e.title]));

    const result: ExerciseProgression[] = [];

    for (const [exId, currentBest] of currentBestMap.entries()) {
      const previousBest = previousBestMap.get(exId) ?? 0;
      const progressionPct =
        previousBest > 0
          ? Math.round(((currentBest - previousBest) / previousBest) * 100 * 10) / 10
          : null;

      result.push({
        exerciseId: exId,
        exerciseName: nameMap.get(exId) ?? exId,
        currentBest: Math.round(currentBest * 10) / 10,
        previousBest: Math.round(previousBest * 10) / 10,
        progressionPct,
        isPersonalRecord: currentBest > previousBest && previousBest > 0,
      });
    }

    // Сортируем: сначала с прогрессом, потом остальные
    return result.sort((a, b) => {
      const ap = a.progressionPct ?? -Infinity;
      const bp = b.progressionPct ?? -Infinity;
      return bp - ap;
    });
  }

  /**
   * Средний коэффициент прогресса по всем упражнениям пользователя за текущий месяц.
   * Возвращает null если нет данных.
   */
  static async getProgressionCoeff(userId: number): Promise<number | null> {
    const progression = await this.getUserProgression(userId);
    const withData = progression.filter((p) => p.progressionPct !== null);
    if (withData.length === 0) return null;
    const avg = withData.reduce((sum, p) => sum + (p.progressionPct ?? 0), 0) / withData.length;
    return Math.round(avg * 10) / 10;
  }

  /**
   * Количество личных рекордов пользователя за текущий месяц.
   */
  static async countPersonalRecords(userId: number): Promise<number> {
    const progression = await this.getUserProgression(userId);
    return progression.filter((p) => p.isPersonalRecord).length;
  }

  /**
   * Данные для лидерборда группы.
   * period: 7 или 30 дней
   */
  static async getGroupLeaderboard(
    athleteIds: number[],
    period: 7 | 30
  ): Promise<GroupLeaderboardEntry[]> {
    if (athleteIds.length === 0) return [];

    const since = DateTime.now().minus({ days: period }).toJSDate();

    // Загружаем всё за один батч
    const [workouts, users, streaks, latestWeights] = await Promise.all([
      Workout.query()
        .whereIn('userId', athleteIds)
        .where('date', '>=', since)
        .whereNull('deleted_at'),

      db.from('users').whereIn('id', athleteIds).select('id', 'full_name', 'photo_url', 'xp'),

      db.from('user_streaks').whereIn('user_id', athleteIds).select('user_id', 'current_streak'),

      // Последний вес каждого атлета
      db
        .from('user_measurements as um')
        .whereIn('um.user_id', athleteIds)
        .where('um.type', 'body_weight')
        .whereRaw(
          `um.logged_at = (
            SELECT MAX(logged_at) FROM user_measurements
            WHERE user_id = um.user_id AND type = 'body_weight'
          )`
        )
        .select('um.user_id', 'um.value as weight_kg'),
    ]);

    const weightMap = new Map<number, number>(
      latestWeights.map((r: any) => [r.user_id, Number(r.weight_kg)])
    );
    const streakMap = new Map<number, number>(
      streaks.map((r: any) => [r.user_id, r.current_streak])
    );
    const userMap = new Map<number, any>(users.map((u: any) => [u.id, u]));

    // Генерируем все бакеты периода (день для 7 дн, неделя для 30 дн)
    const granularity = period === 7 ? 'day' : 'week';
    const buckets: string[] = [];
    let cursor = DateTime.now().minus({ days: period }).startOf(granularity);
    const endBucket = DateTime.now().startOf(granularity);
    while (cursor <= endBucket) {
      buckets.push(cursor.toISODate()!);
      cursor = cursor.plus(granularity === 'day' ? { days: 1 } : { weeks: 1 });
    }

    // Временные ряды и агрегаты по userId
    const statsMap = new Map<number, { workouts: number; volume: number }>();
    const seriesMap = new Map<number, Map<string, { workouts: number; volume: number }>>();
    for (const id of athleteIds) {
      statsMap.set(id, { workouts: 0, volume: 0 });
      seriesMap.set(id, new Map(buckets.map((b) => [b, { workouts: 0, volume: 0 }])));
    }

    for (const w of workouts) {
      const s = statsMap.get(w.userId)!;
      s.workouts += 1;
      s.volume += Number(w.totalVolume) || 0;

      const bucket = DateTime.fromISO(String(w.date)).startOf(granularity).toISODate()!;
      const athleteSeries = seriesMap.get(w.userId);
      if (athleteSeries?.has(bucket)) {
        const sp = athleteSeries.get(bucket)!;
        sp.workouts += 1;
        sp.volume += Number(w.totalVolume) || 0;
      }
    }

    // Прогресс считаем только за месяц (независимо от period)
    const progressionMap = new Map<number, number | null>();
    await Promise.all(
      athleteIds.map(async (id) => {
        const coeff = await this.getProgressionCoeff(id);
        progressionMap.set(id, coeff);
      })
    );

    const { computeLevel } = await import('./xpLogic.js');

    return athleteIds.map((id) => {
      const s = statsMap.get(id)!;
      const u = userMap.get(id);
      const bodyWeight = weightMap.get(id) ?? null;
      const xp = Number(u?.xp ?? 0);

      return {
        userId: id,
        fullName: u?.full_name ?? null,
        photoUrl: u?.photo_url ?? null,
        workouts: s.workouts,
        volume: Math.round(s.volume),
        relativeVolume: bodyWeight ? Math.round((s.volume / bodyWeight) * 10) / 10 : null,
        progressionCoeff: progressionMap.get(id) ?? null,
        streakWeeks: streakMap.get(id) ?? 0,
        xp,
        level: computeLevel(xp).level,
        weeklySeries: buckets.map((date) => {
          const sp = seriesMap.get(id)?.get(date) ?? { workouts: 0, volume: 0 };
          return { date, workouts: sp.workouts, volume: Math.round(sp.volume) };
        }),
      };
    });
  }

  /**
   * Силовой журнал: последние 6 сессий по упражнениям с весом (в т.ч. WOD).
   * weightedExerciseOptions — все id из года (включая custom: от ИИ) для закрепления вручную.
   */
  static async getStrengthLog(userId: number): Promise<StrengthLogPayload> {
    const since = DateTime.now().minus({ days: 365 }).toJSDate();

    const [workouts, pinnedRows] = await Promise.all([
      Workout.query()
        .where('userId', userId)
        .where('date', '>=', since)
        .whereNull('deleted_at')
        .orderBy('date', 'desc'),
      UserPinnedExercise.query().where('userId', userId).orderBy('createdAt', 'asc'),
    ]);

    const pinnedExerciseIds = pinnedRows.map((r) => r.exerciseId);

    const { entries: allEntries, sessionCounts } = this.buildAllStrengthLog(workouts);
    await this.enrichStrengthLogNamesFromDb(allEntries);

    const weightedExerciseOptions: WeightedExerciseOption[] = allEntries
      .map((e) => ({
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        isCustom: e.exerciseId.startsWith('custom:'),
      }))
      .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, 'ru'));

    if (pinnedExerciseIds.length > 0) {
      const entries = this.buildPinnedStrengthLog(workouts, pinnedExerciseIds);
      await this.enrichStrengthLogNamesFromDb(entries);
      const pinOrder = new Map(pinnedExerciseIds.map((id, i) => [id, i]));
      entries.sort((a, b) => (pinOrder.get(a.exerciseId) ?? 999) - (pinOrder.get(b.exerciseId) ?? 999));
      return {
        entries,
        pinnedExerciseIds,
        suggestedPins: [],
        weightedExerciseOptions,
      };
    }

    allEntries.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, 'ru'));
    const suggestedPins = pickTopExerciseIdsBySessionCount(sessionCounts, 5);

    return {
      entries: allEntries,
      pinnedExerciseIds,
      suggestedPins,
      weightedExerciseOptions,
    };
  }

  static async replaceStrengthLogPins(userId: number, exerciseIds: string[]): Promise<void> {
    const unique = normalizePinnedExerciseIdList(exerciseIds);

    await db.transaction(async (trx) => {
      await UserPinnedExercise.query({ client: trx }).where('userId', userId).delete();
      if (unique.length === 0) return;
      await UserPinnedExercise.createMany(
        unique.map((exerciseId) => ({ userId, exerciseId })),
        { client: trx }
      );
    });
  }

  static async getExerciseDashboard(userId: number): Promise<ExerciseDashboardPayload> {
    const rows = await UserDashboardExercise.query()
      .where('userId', userId)
      .orderBy('sortOrder', 'asc');

    const trackedExerciseIds = rows.map((r) => r.exerciseId);

    const weightedExerciseOptions = await this.buildWeightedExerciseOptionsForUser(userId);

    if (trackedExerciseIds.length === 0) {
      return { metrics: [], trackedExerciseIds: [], weightedExerciseOptions };
    }

    const since = DateTime.now().minus({ days: 400 }).startOf('day').toJSDate();
    const workouts = await Workout.query()
      .where('userId', userId)
      .where('date', '>=', since)
      .whereNull('deleted_at')
      .orderBy('date', 'asc');

    const now = DateTime.now();
    const curStart = now.minus({ days: 30 }).startOf('day');
    const prevStart = curStart.minus({ days: 30 }).startOf('day');

    const metrics: ExerciseDashboardMetric[] = [];

    for (const trackId of trackedExerciseIds) {
      let bestCur = 0;
      let bestPrev = 0;
      let sessionsCur = 0;
      let lastWorked: DateTime | null = null;

      for (const w of workouts) {
        const rm = this.oneRmForTrackedExercise(w, trackId);
        if (rm <= 0) continue;

        const d = this.workoutDay(w);
        if (!d.isValid) continue;

        if (!lastWorked || d > lastWorked) {
          lastWorked = d;
        }

        if (d >= curStart) {
          if (rm > bestCur) bestCur = rm;
          sessionsCur += 1;
        } else if (d >= prevStart && d < curStart) {
          if (rm > bestPrev) bestPrev = rm;
        }
      }

      const best1RMLast30d = bestCur > 0 ? Math.round(bestCur * 10) / 10 : null;
      const best1RMPrev30d = bestPrev > 0 ? Math.round(bestPrev * 10) / 10 : null;
      let changePct: number | null = null;
      if (best1RMLast30d !== null && best1RMPrev30d !== null && best1RMPrev30d > 0) {
        changePct =
          Math.round(((best1RMLast30d - best1RMPrev30d) / best1RMPrev30d) * 100 * 10) / 10;
      }

      metrics.push({
        exerciseId: trackId,
        exerciseName: this.fallbackStrengthLogName(trackId),
        best1RMLast30d,
        best1RMPrev30d,
        changePct,
        sessionsLast30d: sessionsCur,
        lastWorkedAt: lastWorked?.toISODate() ?? null,
      });
    }

    await this.enrichDashboardMetricNames(metrics);

    return { metrics, trackedExerciseIds, weightedExerciseOptions };
  }

  private static async buildWeightedExerciseOptionsForUser(
    userId: number
  ): Promise<WeightedExerciseOption[]> {
    const since = DateTime.now().minus({ days: 365 }).toJSDate();
    const workouts = await Workout.query()
      .where('userId', userId)
      .where('date', '>=', since)
      .whereNull('deleted_at')
      .orderBy('date', 'desc');
    const { entries } = this.buildAllStrengthLog(workouts);
    await this.enrichStrengthLogNamesFromDb(entries);
    return entries
      .map((e) => ({
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        isCustom: e.exerciseId.startsWith('custom:'),
      }))
      .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, 'ru'));
  }

  static async replaceExerciseDashboard(userId: number, exerciseIds: string[]): Promise<void> {
    const unique = normalizePinnedExerciseIdList(exerciseIds);

    await db.transaction(async (trx) => {
      await UserDashboardExercise.query({ client: trx }).where('userId', userId).delete();
      if (unique.length === 0) return;
      await UserDashboardExercise.createMany(
        unique.map((exerciseId, sortOrder) => ({ userId, exerciseId, sortOrder })),
        { client: trx }
      );
    });
  }

  private static workoutExerciseHasPositiveWeight(ex: WorkoutExercise): boolean {
    return Boolean(ex.sets?.some((s) => Number(s.weight) > 0));
  }

  private static exerciseMatchesPinnedEntry(ex: WorkoutExercise, pinId: string): boolean {
    if (!this.workoutExerciseHasPositiveWeight(ex)) return false;
    if (ex.exerciseId === pinId) return true;
    const catalogEx = ExerciseCatalog.find(pinId);
    if (!catalogEx || !ex.exerciseId.startsWith('custom:')) return false;
    const rawName = ex.name?.trim();
    if (!rawName) return false;
    return displayNameMatchesCatalogTitle(rawName, catalogEx.title);
  }

  private static mergeSetsForPin(exercises: WorkoutExercise[], pinId: string): WorkoutSet[] | null {
    const matches = exercises.filter((ex) => this.exerciseMatchesPinnedEntry(ex, pinId));
    if (matches.length === 0) return null;
    const sets = matches.flatMap((ex) => ex.sets ?? []);
    if (!sets.some((s) => Number(s.weight) > 0)) return null;
    return sets;
  }

  private static sessionDto(w: Workout, sets: WorkoutSet[]): StrengthLogSession {
    const rm = maxEpley(sets);
    return {
      date: String(w.date),
      workoutId: w.id,
      sets: sets.map((s) => ({ reps: s.reps, weight: s.weight })),
      best1RM: rm > 0 ? Math.round(rm * 10) / 10 : null,
    };
  }

  private static buildPinnedStrengthLog(
    workouts: Workout[],
    pinnedExerciseIds: string[]
  ): StrengthLogEntry[] {
    const entries: StrengthLogEntry[] = [];

    for (const pinId of pinnedExerciseIds) {
      const sessions: StrengthLogSession[] = [];
      for (const w of workouts) {
        const merged = this.mergeSetsForPin(w.exercises ?? [], pinId);
        if (!merged) continue;
        sessions.push(this.sessionDto(w, merged));
        if (sessions.length >= 6) break;
      }
      if (sessions.length === 0) continue;
      entries.push({
        exerciseId: pinId,
        exerciseName: this.fallbackStrengthLogName(pinId),
        sessions,
      });
    }

    return entries;
  }

  private static async enrichStrengthLogNamesFromDb(entries: StrengthLogEntry[]): Promise<void> {
    const ids = entries.map((e) => e.exerciseId).filter((id) => !id.startsWith('custom:'));
    const titleMap = new Map<string, string>();
    if (ids.length > 0) {
      const rows = await db.from('exercises').whereIn('id', ids).select('id', 'title');
      for (const r of rows as { id: string; title: string }[]) {
        titleMap.set(r.id, r.title);
      }
    }
    for (const e of entries) {
      if (e.exerciseId.startsWith('custom:')) continue;
      const dbTitle = titleMap.get(e.exerciseId);
      const cat = ExerciseCatalog.find(e.exerciseId);
      if (dbTitle) {
        e.exerciseName = dbTitle;
      } else if (cat) {
        e.exerciseName = cat.title;
      }
    }
    for (const e of entries) {
      if (e.exerciseName.includes('_') && !e.exerciseName.includes(' ')) {
        e.exerciseName = e.exerciseName.replace(/_/g, ' ');
      }
      e.exerciseName = capitalizeFirstForDisplay(e.exerciseName);
    }
  }

  private static fallbackStrengthLogName(exerciseId: string): string {
    const fromCatalog = ExerciseCatalog.find(exerciseId);
    if (fromCatalog) return fromCatalog.title;
    if (exerciseId.startsWith('custom:')) {
      const raw = exerciseId.slice('custom:'.length).trim() || exerciseId;
      return capitalizeFirstForDisplay(raw);
    }
    if (exerciseId.includes('_') && !exerciseId.includes(' ')) {
      return capitalizeFirstForDisplay(exerciseId.replace(/_/g, ' '));
    }
    return exerciseId;
  }

  private static buildAllStrengthLog(workouts: Workout[]): {
    entries: StrengthLogEntry[];
    sessionCounts: Map<string, number>;
  } {
    const exerciseSessionsMap = new Map<string, { name: string; sessions: StrengthLogSession[] }>();
    const sessionCounts = new Map<string, number>();

    for (const w of workouts) {
      const countedForWorkout = new Set<string>();
      for (const ex of w.exercises ?? []) {
        if (!this.workoutExerciseHasPositiveWeight(ex) || !ex.sets?.length) continue;

        if (!countedForWorkout.has(ex.exerciseId)) {
          countedForWorkout.add(ex.exerciseId);
          sessionCounts.set(ex.exerciseId, (sessionCounts.get(ex.exerciseId) ?? 0) + 1);
        }

        if (!exerciseSessionsMap.has(ex.exerciseId)) {
          let initialName: string;
          if (ex.exerciseId.startsWith('custom:')) {
            initialName = ex.name?.trim()
              ? capitalizeFirstForDisplay(ex.name.trim())
              : capitalizeFirstForDisplay(
                  ex.exerciseId.slice('custom:'.length).trim() || ex.exerciseId
                );
          } else {
            initialName = ex.name?.trim() || ex.exerciseId;
          }
          exerciseSessionsMap.set(ex.exerciseId, {
            name: initialName,
            sessions: [],
          });
        }
        const entry = exerciseSessionsMap.get(ex.exerciseId)!;
        if (entry.sessions.length < 6 && !entry.sessions.some((s) => s.workoutId === w.id)) {
          entry.sessions.push(this.sessionDto(w, ex.sets));
        }
      }
    }

    const entries: StrengthLogEntry[] = [...exerciseSessionsMap.entries()]
      .filter(([, v]) => v.sessions.length > 0)
      .map(([exerciseId, { name, sessions }]) => ({
        exerciseId,
        exerciseName: name,
        sessions,
      }));

    return { entries, sessionCounts };
  }

  private static workoutDay(w: Workout): DateTime {
    const d = w.date;
    if (d instanceof DateTime) {
      return d.startOf('day');
    }
    return DateTime.fromISO(String(d)).startOf('day');
  }

  private static oneRmForTrackedExercise(w: Workout, trackId: string): number {
    const merged = this.mergeSetsForPin(w.exercises ?? [], trackId);
    if (!merged?.length) return 0;
    return maxEpley(merged);
  }

  private static async enrichDashboardMetricNames(metrics: ExerciseDashboardMetric[]): Promise<void> {
    const ids = metrics.map((m) => m.exerciseId).filter((id) => !id.startsWith('custom:'));
    const titleMap = new Map<string, string>();
    if (ids.length > 0) {
      const rows = await db.from('exercises').whereIn('id', ids).select('id', 'title');
      for (const r of rows as { id: string; title: string }[]) {
        titleMap.set(r.id, r.title);
      }
    }
    for (const m of metrics) {
      if (m.exerciseId.startsWith('custom:')) continue;
      const dbTitle = titleMap.get(m.exerciseId);
      const cat = ExerciseCatalog.find(m.exerciseId);
      if (dbTitle) {
        m.exerciseName = dbTitle;
      } else if (cat) {
        m.exerciseName = cat.title;
      }
    }
    for (const m of metrics) {
      if (m.exerciseName.includes('_') && !m.exerciseName.includes(' ')) {
        m.exerciseName = m.exerciseName.replace(/_/g, ' ');
      }
      m.exerciseName = capitalizeFirstForDisplay(m.exerciseName);
    }
  }
}

export interface StrengthLogSession {
  date: string;
  workoutId: number;
  sets: { reps?: number; weight?: number }[];
  best1RM: number | null;
}

export interface StrengthLogEntry {
  exerciseId: string;
  exerciseName: string;
  sessions: StrengthLogSession[];
}

export interface WeightedExerciseOption {
  exerciseId: string;
  exerciseName: string;
  /** Упражнение из ИИ / не из каталога */
  isCustom: boolean;
}

export interface StrengthLogPayload {
  entries: StrengthLogEntry[];
  pinnedExerciseIds: string[];
  suggestedPins: string[];
  /** Все упражнения с весом за год — для закрепления custom: и редких id */
  weightedExerciseOptions: WeightedExerciseOption[];
}

export interface ExerciseDashboardMetric {
  exerciseId: string;
  exerciseName: string;
  best1RMLast30d: number | null;
  best1RMPrev30d: number | null;
  changePct: number | null;
  sessionsLast30d: number;
  lastWorkedAt: string | null;
}

export interface ExerciseDashboardPayload {
  metrics: ExerciseDashboardMetric[];
  trackedExerciseIds: string[];
  weightedExerciseOptions: WeightedExerciseOption[];
}
