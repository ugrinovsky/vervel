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

      // Параметры запроса
      const period = request.input('period', 'week'); // day, week, month, year, all
      const from = request.input('from');
      const to = request.input('to');

      // Вычисляем даты
      let startDate: Date;
      let endDate = new Date();

      if (from && to) {
        // Если указаны конкретные даты
        startDate = new Date(from);
        endDate = new Date(to);
      } else {
        // Иначе вычисляем на основе периода
        startDate = this.calculateStartDate(period);
      }

      // Получаем тренировки за период
      const workouts = await Workout.query()
        .where('userId', user.id)
        .whereBetween('date', [startDate, endDate])
        .orderBy('date', 'asc');

      // Используем калькулятор для агрегации данных
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
