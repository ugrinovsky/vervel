import Workout from '#models/workout';
import { WorkoutCalculator } from '#services/WorkoutCalculator';
import { HttpContext } from '@adonisjs/core/http';

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
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 14);

        const workouts = await Workout.query()
          .where('userId', user.id)
          .where('date', '>=', startDate)
          .orderBy('date', 'asc');

        const stats = WorkoutCalculator.calculateRecoveryState(workouts);

        return response.json({
          success: true,
          data: stats,
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

      const stats = WorkoutCalculator.calculatePeriodStats(workouts, period);

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
