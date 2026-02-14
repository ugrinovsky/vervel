import type { HttpContext } from '@adonisjs/core/http';
import { DateTime } from 'luxon';
import Workout from '#models/workout';
import { WorkoutCalculator } from '#services/WorkoutCalculator';
import { createWorkoutValidator, updateWorkoutValidator } from '#validators/workout_validator';

export default class WorkoutsController {
  /**
   * Создать тренировку
   */
  async store({ request, auth, response }: HttpContext) {
    const user = auth.user!;
    const data = await request.validateUsing(createWorkoutValidator);

    const calculated = await WorkoutCalculator.calculateZoneLoads(data.exercises, data.workoutType);

    const workout = await Workout.create({
      userId: user.id,
      date: DateTime.fromISO(data.date),
      workoutType: data.workoutType,
      exercises: data.exercises,
      notes: data.notes || '',
      zonesLoad: calculated.zonesLoad,
      totalIntensity: calculated.totalIntensity,
      totalVolume: calculated.totalVolume,
    });

    return response.created(workout);
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

    const calculated = await WorkoutCalculator.calculateZoneLoads(data.exercises, data.workoutType);

    workout.merge({
      date: DateTime.fromISO(data.date),
      workoutType: data.workoutType,
      exercises: data.exercises,
      notes: data.notes || '',
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
