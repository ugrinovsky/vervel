import Workout from '#models/workout';
import { WorkoutCalculator } from '#services/WorkoutCalculator';
import { getWeekStart } from '#utils/date';
import { HttpContext } from '@adonisjs/core/http';
import logger from '@adonisjs/core/services/logger'

export default class AvatarsController {
  /**
   * Получить данные для закраски аватара
   */
  async getZoneIntensities({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!;

      const mode = request.input('mode', 'recovery'); // recovery | period
      const period = request.input('period', 'week');
      const from = request.input('from');
      const to = request.input('to');

      if (mode === 'recovery') {
        // Режим «текущее состояние» — берём тренировки за 14 дней, применяем decay
        const now = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 14);
        const weekStart = getWeekStart(now);

        const [workouts, allTimeRows, thisWeekRows] = await Promise.all([
          Workout.query()
            .where('userId', user.id)
            .where('date', '>=', startDate)
            .orderBy('date', 'asc'),
          Workout.query().where('userId', user.id).where('date', '<=', now).count('* as total'),
          Workout.query().where('userId', user.id).where('date', '>=', weekStart).where('date', '<=', now).count('* as total'),
        ]);

        const stats = await WorkoutCalculator.calculateRecoveryState(workouts);

        logger.info(
          {
            userId: user.id,
            rangeStart: startDate.toISOString(),
            workoutCount: workouts.length,
            workoutDates: workouts.map((w) => String((w as any).date)),
            zonesKeys: Object.keys(stats.zones ?? {}),
            zones: stats.zones,
          },
          'avatar:recovery debug'
        )

        return response.json({
          success: true,
          data: {
            ...stats,
            allTimeWorkouts: Number((allTimeRows[0] as any).$extras.total ?? 0),
            thisWeekWorkouts: Number((thisWeekRows[0] as any).$extras.total ?? 0),
          },
        });
      }

      // Режим «за период» — старое поведение
      let startDate: Date;
      let endDate = new Date();

      if (from && to) {
        startDate = new Date(from);
        endDate = new Date(to);
      } else {
        startDate = this.calculateStartDate(period);
      }

      const workouts = await Workout.query()
        .where('userId', user.id)
        .whereBetween('date', [startDate, endDate])
        .orderBy('date', 'asc');

      const stats = await WorkoutCalculator.calculatePeriodStats(workouts, period);

      return response.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Avatar stats error:', error);
      return response.internalServerError({
        success: false,
        message: 'Ошибка при получении данных для аватара',
      });
    }
  }

  /**
   * Рассчитать дату начала на основе периода
   */
  private calculateStartDate(period: string): Date {
    const now = new Date();
    const startDate = new Date(now);

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        // За все время - очень старая дата
        startDate.setFullYear(2000);
        break;
      default:
        startDate.setDate(now.getDate() - 7); // неделя по умолчанию
    }

    return startDate;
  }
}
