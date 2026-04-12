import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Workout from '#models/workout'
import { WorkoutCalculator } from '#services/WorkoutCalculator'

function hasMeaningfulZonesLoad(zonesLoad: Record<string, number> | null | undefined): boolean {
  if (!zonesLoad || typeof zonesLoad !== 'object') return false
  return Object.values(zonesLoad).some((v) => Number(v) > 0)
}

/**
 * One-off backfill: recompute zones_load_abs (and aligned zones_load / total_intensity / total_volume)
 * using the same logic as POST/PUT workouts. Run after migration that adds zones_load_abs.
 *
 *   node ace workouts:backfill-zones-load-abs
 *   node ace workouts:backfill-zones-load-abs --force
 *   node ace workouts:backfill-zones-load-abs --dry-run
 */
export default class BackfillWorkoutsZonesLoadAbs extends BaseCommand {
  static commandName = 'workouts:backfill-zones-load-abs'
  static description = 'Пересчитать zones_load_abs и согласованные поля для существующих тренировок'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Пересчитать все строки, даже если zones_load_abs уже заполнен' })
  declare force: boolean

  @flags.boolean({ description: 'Только показать сколько строк затронуто, без записи в БД' })
  declare dryRun: boolean

  @flags.number({ description: 'Размер батча', default: 200 })
  declare batch: number

  async run() {
    const batchSize = Math.max(1, Math.min(Number(this.batch) || 200, 2000))
    const force = !!this.force
    const dryRun = !!this.dryRun

    let lastId = 0
    let examined = 0
    let updated = 0
    let skipped = 0
    let errors = 0

    for (;;) {
      const batch = await Workout.query()
        .where('id', '>', lastId)
        .orderBy('id', 'asc')
        .limit(batchSize)

      if (batch.length === 0) break

      for (const w of batch) {
        examined++
        lastId = w.id

        if (!force && hasMeaningfulZonesLoad(w.zonesLoadAbs as any)) {
          skipped++
          continue
        }

        const exercises = Array.isArray(w.exercises) ? w.exercises : []
        if (exercises.length === 0) {
          skipped++
          continue
        }

        try {
          const calc = await WorkoutCalculator.calculateZoneLoads(
            exercises,
            w.workoutType,
            w.rpe,
            w.userId
          )

          if (dryRun) {
            updated++
            continue
          }

          w.merge({
            zonesLoad: calc.zonesLoad,
            zonesLoadAbs: calc.zonesLoadAbs,
            totalIntensity: calc.totalIntensity,
            totalVolume: calc.totalVolume,
          })
          await w.save()
          updated++
        } catch {
          errors++
        }
      }
    }

    this.logger.info(
      `workouts:backfill-zones-load-abs done examined=${examined} updated=${
        dryRun ? `${updated} (dry-run)` : updated
      } skipped=${skipped} errors=${errors} force=${force} dryRun=${dryRun} batch=${batchSize}`
    )

    if (errors > 0) {
      this.exitCode = 1
    }

    await this.terminate()
  }
}
