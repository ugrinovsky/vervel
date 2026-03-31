import type { HttpContext } from '@adonisjs/core/http';
import { DateTime } from 'luxon';
import Workout from '#models/workout';
import WorkoutDraft from '#models/workout_draft';
import { WorkoutCalculator } from '#services/WorkoutCalculator';
import { StreakService } from '#services/StreakService';
import { createWorkoutValidator, updateWorkoutValidator } from '#validators/workout_validator';
import { ExerciseCatalog } from '#services/ExerciseCatalog';

export default class WorkoutsController {
  /**
   * Создать тренировку
   */
  async store({ request, auth, response }: HttpContext) {
    const user = auth.user!;
    const data = await request.validateUsing(createWorkoutValidator);

    const calculated = await WorkoutCalculator.calculateZoneLoads(data.exercises, data.workoutType, data.rpe);

    const workout = await Workout.create({
      userId: user.id,
      date: DateTime.fromISO(data.date),
      workoutType: data.workoutType,
      exercises: data.exercises,
      notes: data.notes || '',
      rpe: data.rpe ?? null,
      zonesLoad: calculated.zonesLoad,
      totalIntensity: calculated.totalIntensity,
      totalVolume: calculated.totalVolume,
    });

    // Обновить streak после создания тренировки
    const streakResult = await StreakService.updateStreakAfterWorkout(user.id, workout.date);

    return response.created({
      workout,
      streak: {
        currentStreak: streakResult.streak.currentStreak,
        status: streakResult.streakStatus,
        newAchievements: streakResult.newAchievements.map((a) => ({
          id: a.id,
          key: a.key,
          title: a.title,
          icon: a.icon,
        })),
      },
    });
  }

  /**
   * Получить список тренировок
   */
  async index({ auth, request }: HttpContext) {
    const user = auth.user!;
    const page = request.input('page', 1);
    const limit = request.input('limit', 20);

    const workouts = await Workout.query()
      .where('userId', user.id)
      .orderBy('date', 'desc')
      .paginate(page, limit);

    return workouts;
  }

  /**
   * Получить одну тренировку
   */
  async show({ auth, params }: HttpContext) {
    const user = auth.user!;
    const workout = await Workout.query()
      .where('id', params.id)
      .where('userId', user.id)
      .firstOrFail();

    return workout;
  }

  /**
   * Обновить тренировку
   */
  async update({ auth, params, request }: HttpContext) {
    const user = auth.user!;
    const workout = await Workout.query()
      .where('id', params.id)
      .where('userId', user.id)
      .firstOrFail();

    const data = await request.validateUsing(updateWorkoutValidator);

    const calculated = await WorkoutCalculator.calculateZoneLoads(data.exercises, data.workoutType, data.rpe);

    workout.merge({
      date: DateTime.fromISO(data.date),
      workoutType: data.workoutType,
      exercises: data.exercises,
      notes: data.notes || '',
      rpe: data.rpe ?? null,
      zonesLoad: calculated.zonesLoad,
      totalIntensity: calculated.totalIntensity,
      totalVolume: calculated.totalVolume,
    });

    await workout.save();

    return workout;
  }

  /**
   * Удалить тренировку
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!;
    const workout = await Workout.query()
      .where('id', params.id)
      .where('userId', user.id)
      .firstOrFail();

    await workout.delete();

    return response.noContent();
  }

  /**
   * Последние тренировки по зоне мышц
   * GET /workouts/by-zone?zone=chests&limit=5
   */
  async byZone({ auth, request, response }: HttpContext) {
    const user = auth.user!;
    const zone = request.input('zone');
    const limit = Math.min(Number(request.input('limit', 5)), 20);

    if (!zone) return response.badRequest({ message: 'zone is required' });

    const catalog = ExerciseCatalog.all();
    const catalogMap = new Map(catalog.map((e) => [e.id, e.title]));

    // Алиасы зон (как в AvatarView ZONE_NORMALIZE)
    const ZONE_ALIASES: Record<string, string[]> = {
      backMuscles: ['back', 'trapezoids', 'traps'],
      legMuscles: ['legs'],
      calfMuscles: ['calves'],
      glutealMuscles: ['glutes'],
      abdominalPress: ['core', 'abs'],
      obliquePress: ['obliques'],
      chests: ['chest'],
      biceps: ['arms'],
    };
    const aliases = [zone, ...(ZONE_ALIASES[zone] ?? [])];

    const workouts = await Workout.query()
      .where('userId', user.id)
      .orderBy('date', 'desc')
      .limit(50); // берём больше, фильтруем ниже

    const filtered = workouts
      .filter((w) => {
        const load = w.zonesLoad as Record<string, number> | null;
        if (!load) return false;
        return aliases.some((alias) => (load[alias] ?? 0) > 0);
      })
      .slice(0, limit)
      .map((w) => {
        const load = w.zonesLoad as Record<string, number>;
        const zoneLoad = aliases.reduce((max, alias) => Math.max(max, load[alias] ?? 0), 0);
        const exercises = ((w.exercises as any[]) ?? []).map((ex: any) => ({
          exerciseId: ex.exerciseId,
          name: catalogMap.get(ex.exerciseId) ?? ex.exerciseId?.replace(/_/g, ' ') ?? '—',
        }));
        return {
          id: w.id,
          date: w.date,
          workoutType: w.workoutType,
          zoneLoad,
          exercises,
        };
      });

    return response.ok(filtered);
  }

  /**
   * Получить черновик тренировки
   */
  async getDraft({ auth, response }: HttpContext) {
    const user = auth.user!;
    const draft = await WorkoutDraft.findBy('userId', user.id);
    return response.ok({ success: true, data: draft?.payload ?? null });
  }

  /**
   * Сохранить черновик тренировки
   */
  async saveDraft({ auth, request, response }: HttpContext) {
    const user = auth.user!;
    const payload = request.body();
    await WorkoutDraft.updateOrCreate({ userId: user.id }, { payload });
    return response.ok({ success: true });
  }

  /**
   * Удалить черновик тренировки
   */
  async getByScheduledId({ auth, params, response }: HttpContext) {
    const workout = await Workout.query()
      .where('scheduledWorkoutId', params.scheduledWorkoutId)
      .where('userId', auth.user!.id)
      .first();
    if (!workout) return response.notFound({ message: 'Тренировка не найдена' });
    return response.ok(workout);
  }

  async clearDraft({ auth, response }: HttpContext) {
    const user = auth.user!;
    await WorkoutDraft.query().where('userId', user.id).delete();
    return response.ok({ success: true });
  }

  /**
   * Статистика за период
   */
  async stats({ auth, request, response }: HttpContext) {
    const user = auth.user!;

    const from = request.input('from');
    const to = request.input('to');

    if (!from || !to) {
      return response.badRequest({
        message: 'Query parameters "from" and "to" are required',
      });
    }

    const workouts = await Workout.query()
      .where('userId', user.id)
      .whereBetween('date', [from, to])
      .orderBy('date', 'asc');

    const stats = WorkoutCalculator.calculatePeriodStats(workouts);

    return response.ok(stats);
  }
}
