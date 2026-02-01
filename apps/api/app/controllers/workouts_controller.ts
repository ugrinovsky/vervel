import type { HttpContext } from '@adonisjs/core/http';
import Workout from '#models/workout';
import { WorkoutCalculator } from '#services/WorkoutCalculator';

export default class WorkoutsController {
  /**
   * Создать тренировку
   */
  async store({ request, auth, response }: HttpContext) {
    const user = auth.user!;
    const data = request.only(['date', 'workoutType', 'exercises', 'notes']);

    const calculated = await WorkoutCalculator.calculateZoneLoads(data.exercises, data.workoutType);

    const workout = await Workout.create({
      userId: user.id,
      date: data.date,
      workoutType: data.workoutType,
      exercises: data.exercises,
      notes: data.notes,
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

    const data = request.only(['date', 'workoutType', 'exercises', 'notes']);

    const calculated = await WorkoutCalculator.calculateZoneLoads(data.exercises, data.workoutType);

    workout.merge({
      ...data,
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

    return workouts.map((w) => ({
      date: w.date,
      intensity: w.totalIntensity,
      zones: w.zonesLoad,
      workoutType: w.workoutType,
    }));
  }
}
