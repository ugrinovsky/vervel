import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import Workout from '#models/workout'
import type { WorkoutExercise } from '#models/workout'
import { YandexAiService, type AiExercise } from '#services/YandexAiService'
import { AiZonesService } from '#services/AiZonesService'
import { WorkoutCalculator } from '#services/WorkoutCalculator'

function humanizeExerciseLabel(ex: WorkoutExercise): string {
  if (ex.name?.trim()) return ex.name.trim()
  return String(ex.exerciseId ?? '').replace(/^custom:/i, '').replace(/_/g, ' ').trim()
}

/**
 * Backfill for last N days:
 * - refine exercises[].zones via zones-only AI (with validation+retry)
 * - recompute zones_load_abs (+ aligned zones_load/total_intensity/total_volume)
 *
 *   node ace workouts:backfill-exercise-zones --days 30
 *   node ace workouts:backfill-exercise-zones --days 30 --dry-run
 *   node ace workouts:backfill-exercise-zones --days 30 --force
 */
export default class BackfillWorkoutsExerciseZones extends BaseCommand {
  static commandName = 'workouts:backfill-exercise-zones'
  static description = 'Пересчитать exercises[].zones и зоны нагрузки для тренировок за период'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.number({ description: 'Период в днях', default: 30 })
  declare days: number

  @flags.boolean({ description: 'Пересчитать даже если zones уже заполнены' })
  declare force: boolean

  @flags.boolean({ description: 'Только показать сколько строк затронуто, без записи в БД' })
  declare dryRun: boolean

  @flags.number({ description: 'Размер батча', default: 100 })
  declare batch: number

  async run() {
    if (!YandexAiService.isEnabled()) {
      this.logger.error('AI отключён (FEATURE_AI_WORKOUT=false) — backfill остановлен')
      this.exitCode = 1
      await this.terminate()
      return
    }

    const days = Math.max(1, Math.min(Number(this.days) || 30, 365))
    const since = DateTime.now().minus({ days }).toJSDate()
    const batchSize = Math.max(1, Math.min(Number(this.batch) || 100, 500))
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
        .where('date', '>=', since)
        .whereNull('deleted_at')
        .orderBy('id', 'asc')
        .limit(batchSize)

      if (batch.length === 0) break

      for (const w of batch) {
        examined++
        lastId = w.id

        const exercises = Array.isArray(w.exercises) ? (w.exercises as WorkoutExercise[]) : []
        if (exercises.length === 0) {
          skipped++
          continue
        }

        const hasAnyZones = exercises.some((e) => Array.isArray(e?.zones) && e.zones.length > 0)
        if (!force && hasAnyZones) {
          // We assume zones were already curated; don’t overwrite without --force.
          skipped++
          continue
        }

        try {
          const aiExercises: AiExercise[] = exercises.map((ex) => {
            const label = humanizeExerciseLabel(ex)
            return {
              name: label || '—',
              displayName: label || '—',
              sets: Array.isArray(ex.sets) ? ex.sets.length : 0,
              reps: null as any,
              weight: null as any,
              duration: null as any,
              notes: null,
              supersetGroup: ex.supersetGroup ?? null,
              setData: undefined,
              exerciseId: undefined,
              zones: Array.isArray(ex.zones) ? ex.zones : undefined,
            }
          })

          const refined = await AiZonesService.refineZonesForExercises(aiExercises)
          const nextExercises: WorkoutExercise[] = exercises.map((ex, i) => {
            const rz = refined[i]?.zones
            if (!Array.isArray(rz) || rz.length === 0) return ex
            return { ...ex, zones: rz }
          })

          const calc = await WorkoutCalculator.calculateZoneLoads(
            nextExercises,
            w.workoutType,
            w.rpe,
            w.userId
          )

          if (dryRun) {
            updated++
            continue
          }

          w.merge({
            exercises: nextExercises as any,
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
      `workouts:backfill-exercise-zones done days=${days} examined=${examined} updated=${
        dryRun ? `${updated} (dry-run)` : updated
      } skipped=${skipped} errors=${errors} force=${force} dryRun=${dryRun} batch=${batchSize}`
    )

    if (errors > 0) {
      this.exitCode = 1
    }

    await this.terminate()
  }
}

