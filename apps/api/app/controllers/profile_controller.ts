import { join } from 'node:path'
import { mkdir, unlink } from 'node:fs/promises'
import { cuid } from '@adonisjs/core/helpers'
import Workout from '#models/workout';
import hash from '@adonisjs/core/services/hash';
import { HttpContext } from '@adonisjs/core/http';
import { StreakService } from '#services/StreakService';
import User from '#models/user';

export default class ProfileController {
  async getProfile({ auth, response }: HttpContext) {
    try {
      const user = auth.user!;

      const workouts = await Workout.query()
        .where('userId', user.id)
        .orderBy('date', 'desc');

      const userStreak = await StreakService.getUserStreak(user.id);
      const streak = userStreak?.currentStreak || 0;
      const longestStreak = userStreak?.longestStreak || 0;
      const topZones = this.calculateTopZones(workouts);

      return response.json({
        success: true,
        data: {
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            gender: user.gender,
            bio: user.bio,
            specializations: user.specializations,
            education: user.education,
            photoUrl: user.photoUrl,
            createdAt: user.createdAt,
            balance: user.balance,
            themeHue: user.themeHue,
            donatePhone: user.donatePhone,
            donateCard: user.donateCard,
            donateYookassaLink: user.donateYookassaLink,
          },
          stats: {
            totalWorkouts: workouts.length,
            streak,
            longestStreak,
            topZones,
            streakMode: userStreak?.mode || 'simple',
            currentWeekWorkouts: userStreak?.currentWeekWorkouts || 0,
            weeklyRequired: userStreak?.mode === 'intensive' ? 5 : 3,
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
      const { fullName, email, bio, specializations, education, gender, themeHue, donatePhone, donateCard, donateYookassaLink } = request.only([
        'fullName', 'email', 'bio', 'specializations', 'education', 'gender', 'themeHue',
        'donatePhone', 'donateCard', 'donateYookassaLink',
      ]);

      if (fullName !== undefined) user.fullName = fullName;
      if (email !== undefined) user.email = email;
      if (bio !== undefined) user.bio = bio || null;
      if (specializations !== undefined) user.specializations = Array.isArray(specializations) ? specializations : null;
      if (education !== undefined) user.education = education || null;
      if (gender !== undefined) user.gender = gender === 'male' || gender === 'female' ? gender : null;
      if (themeHue !== undefined) {
        const n = Number(themeHue);
        const isValidHue = Number.isInteger(n) && n >= 0 && n <= 359;
        const isSpecial = n === -1 || n === -2 || n === -3; // dark / light / auto
        user.themeHue = isValidHue || isSpecial ? n : null;
      }
      if (donatePhone !== undefined) user.donatePhone = donatePhone || null;
      if (donateCard !== undefined) user.donateCard = donateCard || null;
      if (donateYookassaLink !== undefined) user.donateYookassaLink = donateYookassaLink || null;

      await user.save();

      return response.json({
        success: true,
        data: {
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            gender: user.gender,
            bio: user.bio,
            specializations: user.specializations,
            education: user.education,
            photoUrl: user.photoUrl,
            createdAt: user.createdAt,
            themeHue: user.themeHue,
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

  /**
   * POST /profile/photo
   * Загрузка фото профиля. Сохраняет в public/uploads/avatars/, возвращает URL.
   */
  async uploadPhoto({ auth, request, response }: HttpContext) {
    const user = auth.user!

    const photo = request.file('photo', {
      size: '5mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
    })

    if (!photo || !photo.isValid) {
      return response.badRequest({
        message: photo?.errors?.[0]?.message ?? 'Неверный файл',
      })
    }

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'avatars')
    await mkdir(uploadsDir, { recursive: true })

    // Удаляем старое фото
    if (user.photoUrl) {
      const oldPath = join(process.cwd(), 'public', user.photoUrl)
      await unlink(oldPath).catch(() => {})
    }

    const fileName = `${cuid()}.${photo.extname}`
    await photo.move(uploadsDir, { name: fileName, overwrite: true })

    const photoUrl = `/uploads/avatars/${fileName}`
    user.photoUrl = photoUrl
    await user.save()

    return response.ok({ success: true, data: { photoUrl } })
  }

  /**
   * GET /athlete/trainers/:trainerId/profile
   * Публичный профиль тренера для атлета.
   */
  async getTrainerPublicProfile({ params, response }: HttpContext) {
    const trainer = await User.find(params.trainerId)

    if (!trainer || !trainer.isTrainer) {
      return response.notFound({ message: 'Тренер не найден' })
    }

    return response.ok({
      success: true,
      data: {
        id: trainer.id,
        fullName: trainer.fullName,
        bio: trainer.bio,
        specializations: trainer.specializations ?? [],
        education: trainer.education,
        photoUrl: trainer.photoUrl,
        donatePhone: trainer.donatePhone,
        donateCard: trainer.donateCard,
        donateYookassaLink: trainer.donateYookassaLink,
      },
    })
  }

  async becomeAthlete({ auth, response }: HttpContext) {
    const user = auth.user!

    if (user.role === 'athlete' || user.role === 'both') {
      return response.badRequest({
        success: false,
        message: 'Режим атлета уже активирован',
      })
    }

    user.role = 'both'
    await user.save()

    return response.json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
    })
  }

  async becomeTrainer({ auth, response }: HttpContext) {
    const user = auth.user!

    if (user.role === 'trainer' || user.role === 'both') {
      return response.badRequest({
        success: false,
        message: 'Режим тренера уже активирован',
      })
    }

    user.role = 'both'
    await user.save()

    return response.json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
    })
  }

  async changePassword({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!;
      const { currentPassword, newPassword } = request.only(['currentPassword', 'newPassword']);

      // OAuth users don't have password
      if (!user.password) {
        return response.badRequest({
          success: false,
          message: 'Этот аккаунт использует социальный вход. Пароль не установлен.',
        });
      }

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
