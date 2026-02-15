import Workout from '#models/workout';
import hash from '@adonisjs/core/services/hash';
import { HttpContext } from '@adonisjs/core/http';

export default class ProfileController {
  async getProfile({ auth, response }: HttpContext) {
    try {
      const user = auth.user!;

      const workouts = await Workout.query()
        .where('userId', user.id)
        .orderBy('date', 'desc');

      const streak = this.calculateStreak(workouts);
      const topZones = this.calculateTopZones(workouts);

      return response.json({
        success: true,
        data: {
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            createdAt: user.createdAt,
          },
          stats: {
            totalWorkouts: workouts.length,
            streak,
            topZones,
          },
        },
      });
    } catch (error) {
      console.error('Profile error:', error);
      return response.internalServerError({
        success: false,
        message: 'Ошибка при получении профиля',
      });
    }
  }

  async updateProfile({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!;
      const { fullName, email } = request.only(['fullName', 'email']);

      if (fullName !== undefined) user.fullName = fullName;
      if (email !== undefined) user.email = email;

      await user.save();

      return response.json({
        success: true,
        data: {
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return response.internalServerError({
        success: false,
        message: 'Ошибка при обновлении профиля',
      });
    }
  }

  async changePassword({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!;
      const { currentPassword, newPassword } = request.only(['currentPassword', 'newPassword']);

      const isValid = await hash.verify(user.password, currentPassword);
      if (!isValid) {
        return response.badRequest({
          success: false,
          message: 'Неверный текущий пароль',
        });
      }

      user.password = newPassword;
      await user.save();

      return response.json({
        success: true,
        message: 'Пароль успешно изменён',
      });
    } catch (error) {
      console.error('Change password error:', error);
      return response.internalServerError({
        success: false,
        message: 'Ошибка при смене пароля',
      });
    }
  }

  private calculateStreak(workouts: Workout[]): number {
    if (workouts.length === 0) return 0;

    const uniqueDates = [
      ...new Set(
        workouts.map((w) => {
          const d = w.date.toJSDate ? w.date.toJSDate() : new Date(w.date.toString());
          return d.toISOString().slice(0, 10);
        })
      ),
    ].sort().reverse();

    const today = new Date().toISOString().slice(0, 10);
    let streak = 0;
    const expectedDate = new Date(today);

    if (uniqueDates[0] !== today) {
      expectedDate.setDate(expectedDate.getDate() - 1);
      if (uniqueDates[0] !== expectedDate.toISOString().slice(0, 10)) {
        return 0;
      }
    }

    for (const dateStr of uniqueDates) {
      if (dateStr === expectedDate.toISOString().slice(0, 10)) {
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else if (dateStr < expectedDate.toISOString().slice(0, 10)) {
        break;
      }
    }

    return streak;
  }

  private calculateTopZones(workouts: Workout[]): Array<{ zone: string; total: number }> {
    const zoneAccum: Record<string, number> = {};

    for (const workout of workouts) {
      const zonesLoad = workout.zonesLoad || {};
      for (const [zone, load] of Object.entries(zonesLoad)) {
        zoneAccum[zone] = (zoneAccum[zone] || 0) + load;
      }
    }

    return Object.entries(zoneAccum)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([zone, total]) => ({ zone, total: Math.round(total * 100) / 100 }));
  }
}
