import { DateTime } from 'luxon';
import Workout from '#models/workout';
import UserPinnedExercise from '#models/user_pinned_exercise';
import UserExerciseStandard from '#models/user_exercise_standard';
import UserExerciseStandardAlias from '#models/user_exercise_standard_alias';
import UserExerciseStandardLinkBatchSnapshot from '#models/user_exercise_standard_link_batch_snapshot';
import db from '@adonisjs/lucid/services/db';
import { YandexAiService } from '#services/YandexAiService';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';
import type { WorkoutExercise, WorkoutSet } from '#models/workout';
import { ExerciseCatalog } from '#services/ExerciseCatalog';
import {
  capitalizeFirstForDisplay,
  normalizeExerciseLabel,
  tokenizeForMatch,
  tokenSubsetOverlap,
} from '#services/exercise_match_helpers';
import {
  normalizePinnedExerciseIdList,
  pickTopExerciseIdsBySessionCount,
} from '#services/strength_log_support';
import env from '#start/env';

const STD_PREFIX = 'std:';

/** Разделение карточек журнала силы по типу тренировки (сила / кроссфит / кардио). */
const STRENGTH_LOG_WT_SEP = '|wt:' as const;

type StrengthLogWorkoutType = 'bodybuilding' | 'crossfit' | 'cardio';

function labelSimilarity(a: string, b: string): number {
  const aTokens = tokenizeForMatch(a);
  const bTokens = tokenizeForMatch(b);
  if (aTokens.length < 2 || bTokens.length < 2) return 0;
  const forward = tokenSubsetOverlap(aTokens, bTokens);
  const backward = tokenSubsetOverlap(bTokens, aTokens);
  return Math.max(forward, backward);
}

function parseStrengthLogCompositeKey(composite: string): {
  baseGroupKey: string;
  workoutType: StrengthLogWorkoutType | null;
} {
  const idx = composite.indexOf(STRENGTH_LOG_WT_SEP);
  if (idx < 0) {
    return { baseGroupKey: composite, workoutType: null };
  }
  const baseGroupKey = composite.slice(0, idx);
  const wt = composite.slice(idx + STRENGTH_LOG_WT_SEP.length);
  if (wt === 'bodybuilding' || wt === 'crossfit' || wt === 'cardio') {
    return { baseGroupKey, workoutType: wt };
  }
  return { baseGroupKey: composite, workoutType: null };
}

function strengthLogCompositeKey(
  baseGk: string,
  workoutType: StrengthLogWorkoutType
): string {
  return `${baseGk}${STRENGTH_LOG_WT_SEP}${workoutType}`;
}

function strengthLogNameWithWorkoutSuffix(
  baseName: string,
  workoutType: StrengthLogWorkoutType | null | undefined
): string {
  // Тип тренировки показываем вкладками на фронте, а не дописываем в имя упражнения.
  return baseName;
}

function ensureCompositePinnedKey(pinKey: string): string {
  // Backward compatibility: old pins were stored as base ids (no |wt:…).
  // Treat them as bodybuilding pins by default.
  const parsed = parseStrengthLogCompositeKey(pinKey);
  if (parsed.workoutType) return pinKey;
  return strengthLogCompositeKey(pinKey, 'bodybuilding');
}

type StandardRow = { id: number; catalogExerciseId: string | null; displayLabel: string };

type StandardContext = {
  standardsById: Map<number, StandardRow>;
  aliasToStandardId: Map<string, number>;
  catalogToStandardId: Map<string, number>;
  /**
   * custom:… суффикс после normalizeExerciseLabel совпадает с нормализованным русским title
   * каталожного упражнения эталона (тот же смысл, что и каталог, без строки в aliases).
   */
  normalizedCustomLabelToStandardId: Map<string, number>;
};

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
   * Текст custom:id совпадает с title каталожного упражнения эталона (после normalizeExerciseLabel).
   * Короткие односложные названия не матчим — меньше ложных слияний («жим», «тяга»).
   */
  private static implicitCustomMatchesCatalogTitle(
    customNormalized: string,
    catalogTitle: string
  ): boolean {
    const titleNorm = normalizeExerciseLabel(catalogTitle);
    if (!customNormalized || customNormalized !== titleNorm) return false;
    const toks = tokenizeForMatch(catalogTitle);
    return toks.length >= 2 || titleNorm.length >= 10;
  }

  /**
   * Сколько несвязанных упражнений максимум уходит в один платный запрос ИИ (связи с эталонами).
   * Env: AI_STANDARD_LINK_SUGGEST_MAX_CANDIDATES
   */
  static get AI_STANDARD_LINK_SUGGEST_MAX_CANDIDATES(): number {
    const n = Number(env.get('AI_STANDARD_LINK_SUGGEST_MAX_CANDIDATES', '60'));
    if (!Number.isFinite(n)) return 60;
    return Math.min(200, Math.max(1, Math.floor(n)));
  }

  private static parseStandardGroupKey(groupKey: string): number | null {
    if (!groupKey.startsWith(STD_PREFIX)) return null;
    const n = Number(groupKey.slice(STD_PREFIX.length));
    return Number.isFinite(n) ? n : null;
  }

  /** id эталона по ключу карточки: std:N, алиас или catalog_exercise_id эталона */
  private static resolveStandardIdForExerciseId(exerciseId: string, ctx: StandardContext): number | null {
    const fromKey = this.parseStandardGroupKey(exerciseId);
    if (fromKey !== null) return fromKey;
    const viaAlias = ctx.aliasToStandardId.get(exerciseId);
    if (viaAlias !== undefined) return viaAlias;
    const viaCatalog = ctx.catalogToStandardId.get(exerciseId);
    if (viaCatalog !== undefined) return viaCatalog;
    if (exerciseId.startsWith('custom:')) {
      const raw = exerciseId.slice('custom:'.length).trim();
      const n = normalizeExerciseLabel(raw);
      const sid = ctx.normalizedCustomLabelToStandardId.get(n);
      if (sid !== undefined) return sid;
    }
    return null;
  }

  private static async loadStandardContext(userId: number): Promise<StandardContext> {
    const [standards, aliases] = await Promise.all([
      UserExerciseStandard.query().where('userId', userId).orderBy('id', 'asc'),
      UserExerciseStandardAlias.query().where('userId', userId),
    ]);
    const standardsById = new Map<number, StandardRow>();
    const catalogToStandardId = new Map<string, number>();
    const normalizedCustomLabelToStandardId = new Map<string, number>();
    for (const s of standards) {
      standardsById.set(s.id, {
        id: s.id,
        catalogExerciseId: s.catalogExerciseId,
        displayLabel: s.displayLabel,
      });
      if (s.catalogExerciseId) {
        catalogToStandardId.set(s.catalogExerciseId, s.id);
        const cat = ExerciseCatalog.find(s.catalogExerciseId);
        if (cat) {
          const n = normalizeExerciseLabel(cat.title);
          if (
            n &&
            this.implicitCustomMatchesCatalogTitle(n, cat.title) &&
            !normalizedCustomLabelToStandardId.has(n)
          ) {
            normalizedCustomLabelToStandardId.set(n, s.id);
          }
        }
      }
    }
    const aliasToStandardId = new Map<string, number>();
    for (const a of aliases) {
      aliasToStandardId.set(a.sourceExerciseId, a.standardId);
    }
    return {
      standardsById,
      aliasToStandardId,
      catalogToStandardId,
      normalizedCustomLabelToStandardId,
    };
  }

  private static resolveGroupKey(exerciseId: string, ctx: StandardContext): string {
    const viaAlias = ctx.aliasToStandardId.get(exerciseId);
    if (viaAlias !== undefined) {
      return `${STD_PREFIX}${viaAlias}`;
    }
    const viaCatalog = ctx.catalogToStandardId.get(exerciseId);
    if (viaCatalog !== undefined) {
      return `${STD_PREFIX}${viaCatalog}`;
    }
    if (exerciseId.startsWith('custom:')) {
      const raw = exerciseId.slice('custom:'.length).trim();
      const n = normalizeExerciseLabel(raw);
      const sid = ctx.normalizedCustomLabelToStandardId.get(n);
      if (sid !== undefined) {
        return `${STD_PREFIX}${sid}`;
      }
    }
    return exerciseId;
  }

  private static exerciseMatchesStandard(
    ex: WorkoutExercise,
    standard: StandardRow,
    ctx: StandardContext
  ): boolean {
    if (!ProgressionService.workoutExerciseHasPositiveWeight(ex)) return false;
    if (ctx.aliasToStandardId.get(ex.exerciseId) === standard.id) return true;
    if (standard.catalogExerciseId && ex.exerciseId === standard.catalogExerciseId) return true;
    if (standard.catalogExerciseId && ex.exerciseId.startsWith('custom:')) {
      const cat = ExerciseCatalog.find(standard.catalogExerciseId);
      if (!cat) return false;
      const raw = ex.exerciseId.slice('custom:'.length).trim();
      const n = normalizeExerciseLabel(raw);
      return this.implicitCustomMatchesCatalogTitle(n, cat.title);
    }
    return false;
  }

  private static mergeSetsForGroupKey(
    exercises: WorkoutExercise[],
    compositeGroupKey: string,
    ctx: StandardContext
  ): WorkoutSet[] | null {
    const { baseGroupKey } = parseStrengthLogCompositeKey(compositeGroupKey);
    const stdId = ProgressionService.parseStandardGroupKey(baseGroupKey);
    if (stdId !== null) {
      const standard = ctx.standardsById.get(stdId);
      if (!standard) return null;
      const matches = exercises.filter((ex) =>
        ProgressionService.exerciseMatchesStandard(ex, standard, ctx)
      );
      if (matches.length === 0) return null;
      const sets = matches.flatMap((ex) => ex.sets ?? []);
      if (!sets.some((s) => Number(s.weight) > 0)) return null;
      return sets;
    }
    const matches = exercises.filter(
      (ex) =>
        ProgressionService.workoutExerciseHasPositiveWeight(ex) && ex.exerciseId === baseGroupKey
    );
    if (matches.length === 0) return null;
    const sets = matches.flatMap((ex) => ex.sets ?? []);
    if (!sets.some((s) => Number(s.weight) > 0)) return null;
    return sets;
  }

  private static oneRmForGroupKey(w: Workout, compositeGroupKey: string, ctx: StandardContext): number {
    const { workoutType } = parseStrengthLogCompositeKey(compositeGroupKey);
    if (workoutType && w.workoutType !== workoutType) return 0;
    const merged = ProgressionService.mergeSetsForGroupKey(
      w.exercises ?? [],
      compositeGroupKey,
      ctx
    );
    if (!merged?.length) return 0;
    return maxEpley(merged);
  }

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
    const since400 = DateTime.now().minus({ days: 400 }).startOf('day').toJSDate();
    const ctx = await this.loadStandardContext(userId);

    const [workoutsDesc, pinnedRows, workoutsAsc400] = await Promise.all([
      Workout.query()
        .where('userId', userId)
        .where('date', '>=', since)
        .whereNull('deleted_at')
        .orderBy('date', 'desc'),
      UserPinnedExercise.query().where('userId', userId).orderBy('createdAt', 'asc'),
      Workout.query()
        .where('userId', userId)
        .where('date', '>=', since400)
        .whereNull('deleted_at')
        .orderBy('date', 'asc'),
    ]);

    const pinnedExerciseIds = pinnedRows.map((r) => ensureCompositePinnedKey(r.exerciseId));

    const { entries: allEntries, sessionCountsByBaseKey } = this.buildGroupedStrengthLog(
      workoutsDesc,
      ctx
    );
    await this.enrichStrengthLogNamesFromDb(allEntries, ctx);

    const weightedExerciseOptions = await this.buildWeightedExerciseOptionsForUser(userId);

    const standards = [...ctx.standardsById.values()].map((s) => {
      const cat = s.catalogExerciseId ? ExerciseCatalog.find(s.catalogExerciseId) : undefined;
      const catalogTitleNormalized =
        cat && this.implicitCustomMatchesCatalogTitle(normalizeExerciseLabel(cat.title), cat.title)
          ? normalizeExerciseLabel(cat.title)
          : null;
      return {
        id: s.id,
        catalogExerciseId: s.catalogExerciseId,
        displayLabel: s.displayLabel,
        catalogTitleNormalized,
      };
    });
    const aliases = [...ctx.aliasToStandardId.entries()].map(([sourceExerciseId, standardId]) => ({
      sourceExerciseId,
      standardId,
    }));

    for (const e of allEntries) {
      e.dashboardMetric = this.computeDashboardMetricForGroup(e.exerciseId, workoutsAsc400, ctx);
    }

    if (pinnedExerciseIds.length > 0) {
      const entries = this.buildPinnedGroupedStrengthLog(workoutsDesc, pinnedExerciseIds, ctx);
      await this.enrichStrengthLogNamesFromDb(entries, ctx);
      const pinOrder = new Map(pinnedExerciseIds.map((id, i) => [id, i]));
      const wtOrder: Record<StrengthLogWorkoutType, number> = {
        bodybuilding: 0,
        crossfit: 1,
        cardio: 2,
      };
      entries.sort((a, b) => {
        const pa = pinOrder.get(a.exerciseId) ?? 999;
        const pb = pinOrder.get(b.exerciseId) ?? 999;
        if (pa !== pb) return pa - pb;
        return (
          (a.workoutType ? wtOrder[a.workoutType] : 9) - (b.workoutType ? wtOrder[b.workoutType] : 9)
        );
      });
      for (const e of entries) {
        e.dashboardMetric = this.computeDashboardMetricForGroup(e.exerciseId, workoutsAsc400, ctx);
      }
      return {
        entries,
        pinnedExerciseIds,
        suggestedPins: [],
        weightedExerciseOptions,
        standards,
        aliases,
        aiStandardLinkSuggestMaxCandidates: this.AI_STANDARD_LINK_SUGGEST_MAX_CANDIDATES,
      };
    }

    allEntries.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, 'ru'));
    const suggestedPins = pickTopExerciseIdsBySessionCount(sessionCountsByBaseKey, 5);

    return {
      entries: allEntries,
      pinnedExerciseIds,
      suggestedPins,
      weightedExerciseOptions,
      standards,
      aliases,
      aiStandardLinkSuggestMaxCandidates: this.AI_STANDARD_LINK_SUGGEST_MAX_CANDIDATES,
    };
  }

  static async replaceStrengthLogPins(userId: number, exerciseIds: string[]): Promise<void> {
    const unique = normalizePinnedExerciseIdList(exerciseIds).map((id) => ensureCompositePinnedKey(id));

    await db.transaction(async (trx) => {
      await UserPinnedExercise.query({ client: trx }).where('userId', userId).delete();
      if (unique.length === 0) return;
      await UserPinnedExercise.createMany(
        unique.map((exerciseId) => ({ userId, exerciseId })),
        { client: trx }
      );
    });
  }

  private static computeDashboardMetricForGroup(
    groupKey: string,
    workoutsAsc: Workout[],
    ctx: StandardContext
  ): StrengthLogDashboardMetric {
    const now = DateTime.now();
    const curStart = now.minus({ days: 30 }).startOf('day');
    const prevStart = curStart.minus({ days: 30 }).startOf('day');

    let bestCur = 0;
    let bestPrev = 0;
    let sessionsCur = 0;
    let lastWorked: DateTime | null = null;

    for (const w of workoutsAsc) {
      const rm = this.oneRmForGroupKey(w, groupKey, ctx);
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

    return {
      best1RMLast30d,
      best1RMPrev30d,
      changePct,
      sessionsLast30d: sessionsCur,
      lastWorkedAt: lastWorked?.toISODate() ?? null,
    };
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

    const rawIds = new Set<string>();
    const nameHint = new Map<string, string>();
    for (const w of workouts) {
      for (const ex of w.exercises ?? []) {
        if (!this.workoutExerciseHasPositiveWeight(ex) || !ex.sets?.length) continue;
        rawIds.add(ex.exerciseId);
        if (!nameHint.has(ex.exerciseId) && ex.name?.trim()) {
          nameHint.set(ex.exerciseId, ex.name.trim());
        }
      }
    }

    const pseudoEntries: StrengthLogEntry[] = [...rawIds].map((exerciseId) => ({
      exerciseId,
      exerciseName:
        exerciseId.startsWith('custom:')
          ? nameHint.get(exerciseId)
            ? capitalizeFirstForDisplay(nameHint.get(exerciseId)!)
            : capitalizeFirstForDisplay(
                exerciseId.slice('custom:'.length).trim() || exerciseId
              )
          : nameHint.get(exerciseId) || exerciseId,
      sessions: [],
      standardId: null,
      dashboardMetric: null,
    }));

    const ctx = await this.loadStandardContext(userId);
    await this.enrichStrengthLogNamesFromDb(pseudoEntries, ctx);

    return pseudoEntries
      .map((e) => ({
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        isCustom: e.exerciseId.startsWith('custom:'),
      }))
      .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, 'ru'));
  }

  static async listExerciseStandards(userId: number): Promise<ExerciseStandardDTO[]> {
    const rows = await UserExerciseStandard.query().where('userId', userId).orderBy('id', 'asc');
    return rows.map((r) => {
      const cat = r.catalogExerciseId ? ExerciseCatalog.find(r.catalogExerciseId) : undefined;
      const catalogTitleNormalized =
        cat && this.implicitCustomMatchesCatalogTitle(normalizeExerciseLabel(cat.title), cat.title)
          ? normalizeExerciseLabel(cat.title)
          : null;
      return {
        id: r.id,
        catalogExerciseId: r.catalogExerciseId,
        displayLabel: r.displayLabel,
        catalogTitleNormalized,
      };
    });
  }

  static async createExerciseStandard(
    userId: number,
    displayLabel: string,
    catalogExerciseId: string | null
  ): Promise<ExerciseStandardDTO> {
    const label = displayLabel.trim();
    if (!label) {
      throw new Error('displayLabel required');
    }
    const cat = catalogExerciseId?.trim() || null;
    if (cat) {
      const dup = await UserExerciseStandard.query()
        .where('userId', userId)
        .where('catalogExerciseId', cat)
        .first();
      if (dup) {
        throw new Error('Эталон для этого упражнения из каталога уже есть');
      }
    }
    const row = await UserExerciseStandard.create({
      userId,
      catalogExerciseId: cat,
      displayLabel: label,
    });
    const catEx = row.catalogExerciseId ? ExerciseCatalog.find(row.catalogExerciseId) : undefined;
    const catalogTitleNormalized =
      catEx &&
      this.implicitCustomMatchesCatalogTitle(normalizeExerciseLabel(catEx.title), catEx.title)
        ? normalizeExerciseLabel(catEx.title)
        : null;
    return {
      id: row.id,
      catalogExerciseId: row.catalogExerciseId,
      displayLabel: row.displayLabel,
      catalogTitleNormalized,
    };
  }

  static async updateExerciseStandard(
    userId: number,
    standardId: number,
    displayLabel: string
  ): Promise<void> {
    const label = displayLabel.trim();
    if (!label) {
      throw new Error('displayLabel required');
    }
    const row = await UserExerciseStandard.query()
      .where('id', standardId)
      .where('userId', userId)
      .first();
    if (!row) {
      throw new Error('Эталон не найден');
    }
    row.displayLabel = label;
    await row.save();
  }

  static async deleteExerciseStandard(userId: number, standardId: number): Promise<void> {
    const row = await UserExerciseStandard.query()
      .where('id', standardId)
      .where('userId', userId)
      .first();
    if (!row) {
      throw new Error('Эталон не найден');
    }
    await row.delete();
  }

  static async setExerciseStandardAlias(
    userId: number,
    sourceExerciseId: string,
    standardId: number,
    trx?: TransactionClientContract
  ): Promise<void> {
    const src = sourceExerciseId.trim();
    if (!src) {
      throw new Error('sourceExerciseId required');
    }
    if (src.startsWith(STD_PREFIX)) {
      throw new Error('Некорректный id');
    }
    const client = trx ? { client: trx } : {};
    const std = await UserExerciseStandard.query(client)
      .where('id', standardId)
      .where('userId', userId)
      .first();
    if (!std) {
      throw new Error('Эталон не найден');
    }
    const existing = await UserExerciseStandardAlias.query(client)
      .where('userId', userId)
      .where('sourceExerciseId', src)
      .first();
    if (existing) {
      existing.standardId = standardId;
      if (trx) {
        existing.useTransaction(trx);
      }
      await existing.save();
    } else if (trx) {
      await UserExerciseStandardAlias.create(
        {
          userId,
          sourceExerciseId: src,
          standardId,
        },
        { client: trx }
      );
    } else {
      await UserExerciseStandardAlias.create({
        userId,
        sourceExerciseId: src,
        standardId,
      });
    }
  }

  static async removeExerciseStandardAlias(
    userId: number,
    sourceExerciseId: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    const src = sourceExerciseId.trim();
    const client = trx ? { client: trx } : {};
    await UserExerciseStandardAlias.query(client)
      .where('userId', userId)
      .where('sourceExerciseId', src)
      .delete();
  }

  /**
   * Упражнения с весом за год, ещё не попавшие под эталон:
   * нет алиаса, нет прямого catalog id, нет неявного совпадения custom:… с title каталога эталона.
   */
  static async listUnlinkedStrengthExerciseCandidates(
    userId: number,
    max?: number
  ): Promise<WeightedExerciseOption[]> {
    const cap = max ?? this.AI_STANDARD_LINK_SUGGEST_MAX_CANDIDATES;
    const ctx = await this.loadStandardContext(userId);
    const options = await this.buildWeightedExerciseOptionsForUser(userId);
    const unlinked = options.filter(
      (o) => this.resolveStandardIdForExerciseId(o.exerciseId, ctx) === null
    );
    unlinked.sort((a, b) => Number(b.isCustom) - Number(a.isCustom));
    return unlinked.slice(0, cap);
  }

  /**
   * Применить связи sourceExerciseId → эталон; сохраняет снимок для отката.
   */
  static async applyStandardAliasBatch(
    userId: number,
    links: Array<{ sourceExerciseId: string; standardId: number }>
  ): Promise<{ revertId: number; applied: number }> {
    if (links.length === 0) {
      throw new Error('Пустой список связей');
    }
    const ctx = await this.loadStandardContext(userId);
    const validStd = new Set(ctx.standardsById.keys());

    return await db.transaction(async (trx) => {
      const touches: Array<{ source: string; beforeStandardId: number | null }> = [];

      for (const raw of links) {
        const standardId = Number(raw.standardId);
        const src = raw.sourceExerciseId.trim();
        if (!Number.isFinite(standardId) || !validStd.has(standardId)) {
          throw new Error('Неизвестный эталон');
        }
        if (!src || src.startsWith(STD_PREFIX)) {
          throw new Error('Некорректный sourceExerciseId');
        }

        const existing = await UserExerciseStandardAlias.query({ client: trx })
          .where('userId', userId)
          .where('sourceExerciseId', src)
          .first();

        if (existing && existing.standardId === standardId) {
          continue;
        }

        touches.push({
          source: src,
          beforeStandardId: existing?.standardId ?? null,
        });

        await this.setExerciseStandardAlias(userId, src, standardId, trx);
      }

      if (touches.length === 0) {
        return { revertId: 0, applied: 0 };
      }

      const snap = await UserExerciseStandardLinkBatchSnapshot.create(
        {
          userId,
          touchesJson: touches,
        },
        { client: trx }
      );

      return { revertId: snap.id, applied: touches.length };
    });
  }

  /**
   * Откатить пакетное применение связей по id снимка (один раз).
   */
  static async revertStandardAliasBatch(userId: number, revertId: number): Promise<void> {
    await db.transaction(async (trx) => {
      const snap = await UserExerciseStandardLinkBatchSnapshot.query({ client: trx })
        .where('id', revertId)
        .where('userId', userId)
        .forUpdate()
        .first();

      if (!snap) {
        throw new Error('Снимок не найден или уже откатили');
      }

      const touches = snap.touchesJson;
      if (!Array.isArray(touches)) {
        throw new Error('Повреждённые данные снимка');
      }

      for (const t of touches) {
        const src = t.source?.trim();
        if (!src) continue;
        if (t.beforeStandardId === null) {
          await this.removeExerciseStandardAlias(userId, src, trx);
        } else {
          await this.setExerciseStandardAlias(userId, src, t.beforeStandardId, trx);
        }
      }

      snap.useTransaction(trx);
      await snap.delete();
    });
  }

  /**
   * ИИ: предложить связи «упражнение из истории → эталон» (только из уже известных id).
   */
  static async suggestStandardAliasLinksWithAi(userId: number): Promise<StandardLinkSuggestionDTO[]> {
    const standards = await this.listExerciseStandards(userId);
    if (standards.length === 0) {
      throw new Error('Сначала создайте хотя бы один эталон');
    }

    const candidates = await this.listUnlinkedStrengthExerciseCandidates(userId);
    if (candidates.length === 0) {
      return [];
    }

    const rawLinks = await YandexAiService.suggestStrengthLogStandardLinks(
      standards.map((s) => ({ id: s.id, displayLabel: s.displayLabel })),
      candidates.map((c) => ({ exerciseId: c.exerciseId, exerciseName: c.exerciseName }))
    );

    const candidateIds = new Set(candidates.map((c) => c.exerciseId));
    const stdIds = new Set(standards.map((s) => s.id));
    const nameById = new Map(candidates.map((c) => [c.exerciseId, c.exerciseName] as const));
    const labelById = new Map(standards.map((s) => [s.id, s.displayLabel] as const));

    const seen = new Set<string>();
    const out: StandardLinkSuggestionDTO[] = [];
    const MIN_SIMILARITY_FOR_AI_STANDARD_LINK = 0.75;

    for (const link of rawLinks) {
      const src = link.sourceExerciseId?.trim();
      if (!src || !candidateIds.has(src) || !stdIds.has(link.standardId)) {
        continue;
      }
      if (seen.has(src)) {
        continue;
      }

      const exName = nameById.get(src) ?? src;
      const stdLabel = labelById.get(link.standardId) ?? String(link.standardId);
      const sim = labelSimilarity(exName, stdLabel);
      if (sim < MIN_SIMILARITY_FOR_AI_STANDARD_LINK) {
        continue;
      }

      seen.add(src);
      out.push({
        sourceExerciseId: src,
        standardId: link.standardId,
        exerciseName: exName,
        standardLabel: stdLabel,
      });
    }

    return out;
  }

  private static workoutExerciseHasPositiveWeight(ex: WorkoutExercise): boolean {
    return Boolean(ex.sets?.some((s) => Number(s.weight) > 0));
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

  private static buildPinnedGroupedStrengthLog(
    workouts: Workout[],
    pinnedGroupKeys: string[],
    ctx: StandardContext
  ): StrengthLogEntry[] {
    const entries: StrengthLogEntry[] = [];
    for (const rawPinKey of pinnedGroupKeys) {
      const composite = ensureCompositePinnedKey(rawPinKey);
      const { baseGroupKey, workoutType } = parseStrengthLogCompositeKey(composite);
      if (!workoutType) continue;

      const sessions: StrengthLogSession[] = [];
      for (const w of workouts) {
        if (w.workoutType !== workoutType) continue;
        const merged = this.mergeSetsForGroupKey(w.exercises ?? [], composite, ctx);
        if (!merged?.length) continue;
        sessions.push(this.sessionDto(w, merged));
        if (sessions.length >= 6) break;
      }
      if (sessions.length === 0) continue;
      const stdId = this.resolveStandardIdForExerciseId(baseGroupKey, ctx);
      const baseName =
        stdId !== null
          ? ctx.standardsById.get(stdId)?.displayLabel ?? baseGroupKey
          : this.fallbackStrengthLogName(baseGroupKey);
      entries.push({
        exerciseId: composite,
        exerciseName: strengthLogNameWithWorkoutSuffix(baseName, workoutType),
        workoutType,
        sessions,
        standardId: stdId,
        dashboardMetric: null,
      });
    }

    return entries;
  }

  private static buildGroupedStrengthLog(
    workouts: Workout[],
    ctx: StandardContext
  ): {
    entries: StrengthLogEntry[];
    /** Для «Часто встречаются» — без суффикса типа тренировки. */
    sessionCountsByBaseKey: Map<string, number>;
  } {
    const groupSessionsMap = new Map<
      string,
      {
        name: string;
        standardId: number | null;
        sessions: StrengthLogSession[];
        workoutType: StrengthLogWorkoutType;
      }
    >();
    const sessionCountsByBaseKey = new Map<string, number>();

    for (const w of workouts) {
      const countedForWorkout = new Set<string>();
      for (const ex of w.exercises ?? []) {
        if (!this.workoutExerciseHasPositiveWeight(ex) || !ex.sets?.length) continue;

        const baseGk = this.resolveGroupKey(ex.exerciseId, ctx);
        const compositeGk = strengthLogCompositeKey(baseGk, w.workoutType);

        if (!countedForWorkout.has(compositeGk)) {
          countedForWorkout.add(compositeGk);
          sessionCountsByBaseKey.set(baseGk, (sessionCountsByBaseKey.get(baseGk) ?? 0) + 1);
        }

        if (!groupSessionsMap.has(compositeGk)) {
          const stdId = this.parseStandardGroupKey(baseGk);
          let initialName: string;
          if (stdId !== null) {
            const row = ctx.standardsById.get(stdId);
            initialName = row?.displayLabel ?? baseGk;
          } else if (ex.exerciseId.startsWith('custom:')) {
            initialName = ex.name?.trim()
              ? capitalizeFirstForDisplay(ex.name.trim())
              : capitalizeFirstForDisplay(
                  ex.exerciseId.slice('custom:'.length).trim() || ex.exerciseId
                );
          } else {
            initialName = ex.name?.trim() || ex.exerciseId;
          }
          groupSessionsMap.set(compositeGk, {
            name: strengthLogNameWithWorkoutSuffix(initialName, w.workoutType),
            standardId: stdId,
            sessions: [],
            workoutType: w.workoutType,
          });
        }
        const entry = groupSessionsMap.get(compositeGk)!;
        if (entry.sessions.length < 6 && !entry.sessions.some((s) => s.workoutId === w.id)) {
          const merged = this.mergeSetsForGroupKey(w.exercises ?? [], compositeGk, ctx);
          if (merged?.length) {
            entry.sessions.push(this.sessionDto(w, merged));
          }
        }
      }
    }

    const entries: StrengthLogEntry[] = [...groupSessionsMap.entries()]
      .filter(([, v]) => v.sessions.length > 0)
      .map(([exerciseId, { name, sessions, standardId, workoutType }]) => ({
        exerciseId,
        exerciseName: name,
        workoutType,
        sessions,
        standardId,
        dashboardMetric: null,
      }));

    return { entries, sessionCountsByBaseKey };
  }

  private static async enrichStrengthLogNamesFromDb(
    entries: StrengthLogEntry[],
    ctx: StandardContext
  ): Promise<void> {
    for (const e of entries) {
      const { baseGroupKey } = parseStrengthLogCompositeKey(e.exerciseId);
      const stdIdFromKey = this.parseStandardGroupKey(baseGroupKey);
      const stdId = stdIdFromKey !== null ? stdIdFromKey : e.standardId;
      if (stdId !== null) {
        const row = ctx.standardsById.get(stdId);
        if (row) {
          e.exerciseName = strengthLogNameWithWorkoutSuffix(
            capitalizeFirstForDisplay(row.displayLabel),
            e.workoutType
          );
        }
        continue;
      }
    }

    const ids = entries
      .map((e) => parseStrengthLogCompositeKey(e.exerciseId).baseGroupKey)
      .filter((id) => !id.startsWith('custom:') && !id.startsWith(STD_PREFIX));
    const titleMap = new Map<string, string>();
    if (ids.length > 0) {
      const rows = await db.from('exercises').whereIn('id', ids).select('id', 'title');
      for (const r of rows as { id: string; title: string }[]) {
        titleMap.set(r.id, r.title);
      }
    }
    for (const e of entries) {
      const { baseGroupKey } = parseStrengthLogCompositeKey(e.exerciseId);
      if (baseGroupKey.startsWith('custom:')) continue;
      if (baseGroupKey.startsWith(STD_PREFIX)) continue;
      const linkedStd = this.parseStandardGroupKey(baseGroupKey) ?? e.standardId;
      if (linkedStd !== null) continue;
      const dbTitle = titleMap.get(baseGroupKey);
      const cat = ExerciseCatalog.find(baseGroupKey);
      if (dbTitle) {
        e.exerciseName = strengthLogNameWithWorkoutSuffix(dbTitle, e.workoutType);
      } else if (cat) {
        e.exerciseName = strengthLogNameWithWorkoutSuffix(cat.title, e.workoutType);
      }
    }
    for (const e of entries) {
      const { baseGroupKey } = parseStrengthLogCompositeKey(e.exerciseId);
      if (baseGroupKey.startsWith(STD_PREFIX)) continue;
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

  private static workoutDay(w: Workout): DateTime {
    const d = w.date;
    if (d instanceof DateTime) {
      return d.startOf('day');
    }
    return DateTime.fromISO(String(d)).startOf('day');
  }

}

export interface StrengthLogSession {
  date: string;
  workoutId: number;
  sets: { reps?: number; weight?: number }[];
  best1RM: number | null;
}

export interface StrengthLogDashboardMetric {
  best1RMLast30d: number | null;
  best1RMPrev30d: number | null;
  changePct: number | null;
  sessionsLast30d: number;
  lastWorkedAt: string | null;
}

export interface StrengthLogEntry {
  exerciseId: string;
  exerciseName: string;
  /** Тип тренировки для этой карточки (суффикс в exerciseId: |wt:…) */
  workoutType?: StrengthLogWorkoutType;
  sessions: StrengthLogSession[];
  standardId: number | null;
  dashboardMetric: StrengthLogDashboardMetric | null;
}

export interface WeightedExerciseOption {
  exerciseId: string;
  exerciseName: string;
  /** Упражнение из ИИ / не из каталога */
  isCustom: boolean;
}

export interface ExerciseStandardDTO {
  id: number;
  catalogExerciseId: string | null;
  displayLabel: string;
  /** normalizeExerciseLabel(title каталога) для неявного слияния с custom:…; null если нет каталога или слишком короткое имя */
  catalogTitleNormalized: string | null;
}

export interface ExerciseStandardAliasDTO {
  sourceExerciseId: string;
  standardId: number;
}

export interface StandardLinkSuggestionDTO {
  sourceExerciseId: string;
  standardId: number;
  exerciseName: string;
  standardLabel: string;
}

export interface StrengthLogPayload {
  entries: StrengthLogEntry[];
  pinnedExerciseIds: string[];
  suggestedPins: string[];
  /** Все упражнения с весом за год — для закрепления custom: и редких id */
  weightedExerciseOptions: WeightedExerciseOption[];
  standards: ExerciseStandardDTO[];
  aliases: ExerciseStandardAliasDTO[];
  /** Макс. несвязанных упражнений в одном платном запросе ИИ к эталонам */
  aiStandardLinkSuggestMaxCandidates: number;
}
