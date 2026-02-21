import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import User from '#models/user'
import Workout from '#models/workout'

/**
 * Засевает тренировки атлетов за последние 14 дней
 * с пред-рассчитанными zonesLoad — чтобы MiniAvatar показывал цвета.
 *
 * Профили:
 *  Иван   — грудь / трицепс (бодибилдинг)
 *  Мария  — спина / бицепс  (бодибилдинг)
 *  Дмитрий — CrossFit, всё тело
 *  Анна   — плечи / кардио
 */
export default class extends BaseSeeder {
  async run() {
    const emails = ['ivan@example.com', 'maria@example.com', 'dmitry@example.com', 'anna@example.com']
    const users = await User.query().whereIn('email', emails)
    const byEmail = Object.fromEntries(users.map((u) => [u.email, u]))

    const ivan   = byEmail['ivan@example.com']
    const maria  = byEmail['maria@example.com']
    const dmitry = byEmail['dmitry@example.com']
    const anna   = byEmail['anna@example.com']

    // Удаляем старые тренировки этих атлетов (идемпотентность)
    await Workout.query()
      .whereIn('userId', users.map((u) => u.id))
      .delete()

    const now = DateTime.now()
    const day = (n: number) => now.minus({ days: n }).set({ hour: 10, minute: 0, second: 0, millisecond: 0 })

    await Workout.createMany([
      // ── Иван: грудь/трицепс ──────────────────────────────────────────
      {
        userId: ivan.id,
        date: day(1),
        workoutType: 'bodybuilding',
        exercises: [],
        zonesLoad: { chests: 0.9, triceps: 0.8, shoulders: 0.4, core: 0.2 },
        totalIntensity: 0.75,
        totalVolume: 6400,
        notes: 'День груди',
      },
      {
        userId: ivan.id,
        date: day(4),
        workoutType: 'bodybuilding',
        exercises: [],
        zonesLoad: { back: 0.85, biceps: 0.75, core: 0.3 },
        totalIntensity: 0.7,
        totalVolume: 5800,
        notes: 'День спины',
      },
      {
        userId: ivan.id,
        date: day(8),
        workoutType: 'bodybuilding',
        exercises: [],
        zonesLoad: { legs: 0.9, glutes: 0.7, core: 0.5 },
        totalIntensity: 0.72,
        totalVolume: 7200,
        notes: 'День ног',
      },
      {
        userId: ivan.id,
        date: day(12),
        workoutType: 'bodybuilding',
        exercises: [],
        zonesLoad: { shoulders: 0.85, triceps: 0.65, chests: 0.3 },
        totalIntensity: 0.65,
        totalVolume: 4200,
        notes: 'День плеч',
      },

      // ── Мария: спина/бицепс ──────────────────────────────────────────
      {
        userId: maria.id,
        date: day(0),
        workoutType: 'bodybuilding',
        exercises: [],
        zonesLoad: { back: 0.95, biceps: 0.85, core: 0.45 },
        totalIntensity: 0.78,
        totalVolume: 5600,
        notes: 'День спины и бицепса',
      },
      {
        userId: maria.id,
        date: day(3),
        workoutType: 'bodybuilding',
        exercises: [],
        zonesLoad: { legs: 0.8, glutes: 0.75, core: 0.4 },
        totalIntensity: 0.68,
        totalVolume: 6000,
        notes: 'День ног',
      },
      {
        userId: maria.id,
        date: day(7),
        workoutType: 'bodybuilding',
        exercises: [],
        zonesLoad: { chests: 0.7, triceps: 0.6, shoulders: 0.5 },
        totalIntensity: 0.62,
        totalVolume: 4400,
        notes: 'День груди',
      },
      {
        userId: maria.id,
        date: day(11),
        workoutType: 'cardio',
        exercises: [],
        zonesLoad: { legs: 0.5, core: 0.35 },
        totalIntensity: 0.45,
        totalVolume: 0,
        notes: 'Кардио',
      },

      // ── Дмитрий: CrossFit, всё тело ──────────────────────────────────
      {
        userId: dmitry.id,
        date: day(1),
        workoutType: 'crossfit',
        exercises: [],
        zonesLoad: { chests: 0.7, back: 0.65, legs: 0.8, core: 0.9, shoulders: 0.6 },
        totalIntensity: 0.82,
        totalVolume: 0,
        notes: 'WOD AMRAP',
      },
      {
        userId: dmitry.id,
        date: day(3),
        workoutType: 'crossfit',
        exercises: [],
        zonesLoad: { shoulders: 0.85, triceps: 0.7, core: 0.75, legs: 0.55, back: 0.5 },
        totalIntensity: 0.79,
        totalVolume: 0,
        notes: 'WOD Filthy Fifty',
      },
      {
        userId: dmitry.id,
        date: day(6),
        workoutType: 'crossfit',
        exercises: [],
        zonesLoad: { back: 0.75, biceps: 0.55, core: 0.65, legs: 0.7 },
        totalIntensity: 0.74,
        totalVolume: 0,
        notes: 'WOD For Time',
      },
      {
        userId: dmitry.id,
        date: day(9),
        workoutType: 'crossfit',
        exercises: [],
        zonesLoad: { chests: 0.8, triceps: 0.65, shoulders: 0.7, core: 0.6, legs: 0.45 },
        totalIntensity: 0.77,
        totalVolume: 0,
        notes: 'WOD EMOM',
      },
      {
        userId: dmitry.id,
        date: day(13),
        workoutType: 'crossfit',
        exercises: [],
        zonesLoad: { legs: 0.85, glutes: 0.6, core: 0.5, back: 0.4 },
        totalIntensity: 0.7,
        totalVolume: 0,
        notes: 'Thrusters + Deadlift',
      },

      // ── Анна: плечи / кардио ─────────────────────────────────────────
      {
        userId: anna.id,
        date: day(2),
        workoutType: 'bodybuilding',
        exercises: [],
        zonesLoad: { shoulders: 0.9, triceps: 0.55, chests: 0.3, core: 0.4 },
        totalIntensity: 0.65,
        totalVolume: 3800,
        notes: 'День плеч',
      },
      {
        userId: anna.id,
        date: day(5),
        workoutType: 'cardio',
        exercises: [],
        zonesLoad: { legs: 0.65, core: 0.5 },
        totalIntensity: 0.5,
        totalVolume: 0,
        notes: 'Бег 5 км + велосипед',
      },
      {
        userId: anna.id,
        date: day(9),
        workoutType: 'bodybuilding',
        exercises: [],
        zonesLoad: { back: 0.7, biceps: 0.6, core: 0.45 },
        totalIntensity: 0.6,
        totalVolume: 3200,
        notes: 'День спины',
      },
      {
        userId: anna.id,
        date: day(12),
        workoutType: 'cardio',
        exercises: [],
        zonesLoad: { legs: 0.55, core: 0.4, shoulders: 0.25 },
        totalIntensity: 0.42,
        totalVolume: 0,
        notes: 'Кардио + растяжка',
      },
    ])

    console.log('✅ Athlete workouts seeder done')
    console.log(`   Иван: 4 тренировки (грудь/трицепс, спина, ноги, плечи)`)
    console.log(`   Мария: 4 тренировки (спина/бицепс, ноги, грудь, кардио)`)
    console.log(`   Дмитрий: 5 CrossFit тренировок (всё тело)`)
    console.log(`   Анна: 4 тренировки (плечи, кардио, спина)`)
  }
}
