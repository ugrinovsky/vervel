import { join } from 'node:path'
import { mkdir, unlink } from 'node:fs/promises'
import { cuid } from '@adonisjs/core/helpers'
import { DateTime } from 'luxon'
import Workout from '#models/workout'
import UserMeasurement from '#models/user_measurement'
import hash from '@adonisjs/core/services/hash'
import { HttpContext } from '@adonisjs/core/http'
import { StreakService } from '#services/StreakService'
import { computeLevel } from '#services/xp_logic'
import User from '#models/user'
import { isTrustedVkPhotoUrl } from '#utils/trusted_vk_photo_url'

export default class ProfileController {
  async getProfile({ auth, response }: HttpContext) {
    try {
      const user = auth.user!

      const workouts = await Workout.query().where('userId', user.id).orderBy('date', 'desc')

      const userStreak = await StreakService.getUserStreak(user.id)
      const streak = userStreak?.currentStreak || 0
      const longestStreak = userStreak?.longestStreak || 0
      const topZones = this.calculateTopZones(workouts)
      const levelInfo = computeLevel(user.xp ?? 0)

      const totalVolume = workouts.reduce((sum, w) => sum + (Number(w.totalVolume) || 0), 0)
      const workoutsWithIntensity = workouts.filter((w) => (w.totalIntensity ?? 0) > 0)
      const avgIntensity =
        workoutsWithIntensity.length > 0
          ? Math.round(
              workoutsWithIntensity.reduce((sum, w) => sum + (w.totalIntensity ?? 0), 0) /
                workoutsWithIntensity.length
            )
          : null

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
            xp: user.xp ?? 0,
            level: levelInfo.level,
            levelName: levelInfo.levelName,
            xpForNextLevel: levelInfo.xpForNextLevel,
            xpProgressPct: levelInfo.progressPct,
            totalVolume: Math.round(totalVolume),
            avgIntensity,
          },
        },
      })
    } catch (error) {
      console.error('Profile error:', error)
      return response.internalServerError({
        success: false,
        message: 'Ошибка при получении профиля',
      })
    }
  }

  async updateProfile({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const {
        fullName,
        email,
        bio,
        specializations,
        education,
        gender,
        themeHue,
        donatePhone,
        donateCard,
        donateYookassaLink,
        photoUrl,
      } = request.only([
        'fullName',
        'email',
        'bio',
        'specializations',
        'education',
        'gender',
        'themeHue',
        'donatePhone',
        'donateCard',
        'donateYookassaLink',
        'photoUrl',
      ])

      if (fullName !== undefined) user.fullName = fullName
      if (photoUrl !== undefined) {
        if (photoUrl === null || photoUrl === '') {
          user.photoUrl = null
        } else if (typeof photoUrl === 'string') {
          const trimmed = photoUrl.trim()
          if (trimmed.length === 0) {
            user.photoUrl = null
          } else if (isTrustedVkPhotoUrl(trimmed)) {
            user.photoUrl = trimmed
          }
        }
      }
      if (email !== undefined) user.email = email
      if (bio !== undefined) user.bio = bio || null
      if (specializations !== undefined)
        user.specializations = Array.isArray(specializations) ? specializations : null
      if (education !== undefined) user.education = education || null
      if (gender !== undefined)
        user.gender = gender === 'male' || gender === 'female' ? gender : null
      if (themeHue !== undefined) {
        const n = Number(themeHue)
        const isValidHue = Number.isInteger(n) && n >= 0 && n <= 359
        const isSpecial = n === -1 || n === -2 || n === -3 // dark / light / auto
        user.themeHue = isValidHue || isSpecial ? n : null
      }
      if (donatePhone !== undefined) user.donatePhone = donatePhone || null
      if (donateCard !== undefined) user.donateCard = donateCard || null
      if (donateYookassaLink !== undefined) user.donateYookassaLink = donateYookassaLink || null

      await user.save()

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
      })
    } catch (error) {
      console.error('Update profile error:', error)
      return response.internalServerError({
        success: false,
        message: 'Ошибка при обновлении профиля',
      })
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

  /**
   * POST /profile/measurements
   * Добавить замер (вес тела, % жира и т.д.)
   */
  async logMeasurement({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { type, value, loggedAt } = request.only(['type', 'value', 'loggedAt'])

    if (!type || typeof type !== 'string' || type.length > 64) {
      return response.badRequest({ success: false, message: 'Некорректный тип замера' })
    }

    const numValue = Number(value)
    if (!numValue || numValue <= 0) {
      return response.badRequest({ success: false, message: 'Некорректное значение' })
    }

    const date = loggedAt ? DateTime.fromISO(loggedAt) : DateTime.now()
    if (!date.isValid) {
      return response.badRequest({ success: false, message: 'Некорректная дата' })
    }

    const measurement = await UserMeasurement.create({
      userId: user.id,
      type,
      value: numValue,
      loggedAt: date,
    })

    return response.ok({
      success: true,
      data: {
        id: measurement.id,
        type: measurement.type,
        value: Number(measurement.value),
        loggedAt: measurement.loggedAt.toISO(),
      },
    })
  }

  /**
   * GET /profile/measurements?type=body_weight&limit=50
   * История замеров по типу
   */
  async getMeasurements({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const type = request.input('type', 'body_weight')
    const limit = Math.min(Number(request.input('limit', 50)), 200)

    const measurements = await UserMeasurement.query()
      .where('userId', user.id)
      .where('type', type)
      .orderBy('loggedAt', 'desc')
      .limit(limit)

    return response.ok({
      success: true,
      data: measurements.map((m) => ({
        id: m.id,
        type: m.type,
        value: Number(m.value),
        loggedAt: m.loggedAt.toISO(),
      })),
    })
  }

  /**
   * DELETE /profile/measurements/:id
   */
  async deleteMeasurement({ auth, params, response }: HttpContext) {
    const user = auth.user!

    const measurement = await UserMeasurement.query()
      .where('id', params.id)
      .where('userId', user.id)
      .firstOrFail()

    await measurement.delete()

    return response.ok({ success: true })
  }

  async changePassword({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const { currentPassword, newPassword } = request.only(['currentPassword', 'newPassword'])

      // OAuth users don't have password
      if (!user.password) {
        return response.badRequest({
          success: false,
          message: 'Этот аккаунт использует социальный вход. Пароль не установлен.',
        })
      }

      const isValid = await hash.verify(user.password, currentPassword)
      if (!isValid) {
        return response.badRequest({
          success: false,
          message: 'Неверный текущий пароль',
        })
      }

      user.password = newPassword
      await user.save()

      return response.json({
        success: true,
        message: 'Пароль успешно изменён',
      })
    } catch (error) {
      console.error('Change password error:', error)
      return response.internalServerError({
        success: false,
        message: 'Ошибка при смене пароля',
      })
    }
  }

  private calculateTopZones(workouts: Workout[]): Array<{ zone: string; total: number }> {
    const zoneAccum: Record<string, number> = {}

    for (const workout of workouts) {
      const zonesLoad = workout.zonesLoad || {}
      for (const [zone, load] of Object.entries(zonesLoad)) {
        zoneAccum[zone] = (zoneAccum[zone] || 0) + load
      }
    }

    return Object.entries(zoneAccum)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([zone, total]) => ({ zone, total: Math.round(total * 100) / 100 }))
  }
}
