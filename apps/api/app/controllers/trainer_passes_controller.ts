import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import TrainerAthlete from '#models/trainer_athlete'
import TrainerAthletePass, { type PassStatus } from '#models/trainer_athlete_pass'
import TrainerAthletePassUsage from '#models/trainer_athlete_pass_usage'
import Workout from '#models/workout'

// ─── helpers ──────────────────────────────────────────────────────────────────

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

function parsePositiveDecimal(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

function parsePositiveInt(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) return null
  return n
}

function parseDate(value: unknown): DateTime | null {
  if (typeof value !== 'string') return null
  const dt = DateTime.fromISO(value, { zone: 'UTC' })
  return dt.isValid ? dt : null
}

/** Вычислить статус пасса на основе БД-данных */
function resolveStatus(pass: TrainerAthletePass, sessionsUsed: number): PassStatus {
  if (pass.status === 'cancelled') return 'cancelled'
  const today = DateTime.now().startOf('day')
  if (pass.validUntil && pass.validUntil < today) return 'expired'
  if (sessionsUsed >= pass.sessionsTotal) return 'depleted'
  return 'active'
}

async function serializePass(pass: TrainerAthletePass) {
  const sessionsUsed = await TrainerAthletePassUsage.query()
    .where('passId', pass.id)
    .count('* as total')
    .then((r) => Number(r[0].$extras.total))

  const status = resolveStatus(pass, sessionsUsed)

  return {
    id: pass.id,
    trainerAthleteId: pass.trainerAthleteId,
    title: pass.title,
    priceAmount: pass.priceAmount,
    sessionsTotal: pass.sessionsTotal,
    sessionsUsed,
    sessionsLeft: Math.max(0, pass.sessionsTotal - sessionsUsed),
    validFrom: pass.validFrom,
    validUntil: pass.validUntil,
    status,
    notes: pass.notes,
    createdAt: pass.createdAt,
  }
}

/** Получить активную связь тренер–атлет (или выбросить ответ) */
async function resolveTrainerAthlete(
  ctx: HttpContext,
  athleteId: number
): Promise<TrainerAthlete | null> {
  const trainer = ctx.auth.user!
  const ta = await TrainerAthlete.query()
    .where('trainerId', trainer.id)
    .where('athleteId', athleteId)
    .where('status', 'active')
    .first()

  if (!ta) {
    ctx.response.notFound({ message: 'Атлет не найден или не привязан к вам' })
    return null
  }
  return ta
}

// ─── controller ───────────────────────────────────────────────────────────────

export default class TrainerPassesController {
  /**
   * GET /trainer/passes
   * Все абонементы тренера по всем атлетам — для CRM-вкладки.
   * Возвращает массив атлетов с их активным (и последним) пассом.
   */
  async listAll({ auth, response }: HttpContext) {
    const trainer = auth.user!

    // Все активные связи тренер–атлет
    const trainerAthletes = await TrainerAthlete.query()
      .where('trainerId', trainer.id)
      .where('status', 'active')
      .preload('athlete')

    // Все пассы этих связей одним запросом
    const taIds = trainerAthletes.map((ta) => ta.id)
    if (taIds.length === 0) return response.ok({ success: true, data: [] })

    const passes = await TrainerAthletePass.query()
      .whereIn('trainerAthleteId', taIds)
      .orderBy('createdAt', 'desc')

    // Количество использований для каждого пасса
    const passIds = passes.map((p) => p.id)
    const usageCounts: Record<number, number> =
      passIds.length > 0
        ? await db
            .from('trainer_athlete_pass_usages')
            .whereIn('pass_id', passIds)
            .groupBy('pass_id')
            .select('pass_id')
            .count('* as total')
            .then((rows) =>
              Object.fromEntries(rows.map((r) => [Number(r.pass_id), Number(r.total)]))
            )
        : {}

    // Сгруппировать пассы по trainerAthleteId
    const passesByTa: Record<number, TrainerAthletePass[]> = {}
    for (const p of passes) {
      if (!passesByTa[p.trainerAthleteId]) passesByTa[p.trainerAthleteId] = []
      passesByTa[p.trainerAthleteId].push(p)
    }

    const today = DateTime.now().startOf('day')

    const data = trainerAthletes.map((ta) => {
      const taPasses = passesByTa[ta.id] ?? []

      const enriched = taPasses.map((p) => {
        const used = usageCounts[p.id] ?? 0
        const left = Math.max(0, p.sessionsTotal - used)
        let status: PassStatus = p.status
        if (status !== 'cancelled') {
          if (p.validUntil && p.validUntil < today) status = 'expired'
          else if (used >= p.sessionsTotal) status = 'depleted'
          else status = 'active'
        }
        return {
          id: p.id,
          title: p.title,
          priceAmount: p.priceAmount,
          sessionsTotal: p.sessionsTotal,
          sessionsUsed: used,
          sessionsLeft: left,
          validFrom: p.validFrom,
          validUntil: p.validUntil,
          status,
          notes: p.notes,
          createdAt: p.createdAt,
        }
      })

      const activePass = enriched.find((p) => p.status === 'active') ?? null

      return {
        athleteId: ta.athleteId,
        athleteName: ta.athlete?.fullName ?? null,
        athleteEmail: ta.athlete?.email ?? null,
        athletePhotoUrl: ta.athlete?.photoUrl ?? null,
        trainerAthleteId: ta.id,
        activePass,
        allPasses: enriched,
      }
    })

    return response.ok({ success: true, data })
  }

  /** GET /trainer/athletes/:athleteId/passes */
  async list({ auth, params, response }: HttpContext) {
    const trainer = auth.user!
    const athleteId = Number(params.athleteId)

    const ta = await TrainerAthlete.query()
      .where('trainerId', trainer.id)
      .where('athleteId', athleteId)
      .where('status', 'active')
      .first()

    if (!ta) return response.notFound({ message: 'Атлет не найден или не привязан к вам' })

    const passes = await TrainerAthletePass.query()
      .where('trainerAthleteId', ta.id)
      .orderByRaw(`CASE status WHEN 'active' THEN 0 ELSE 1 END`)
      .orderBy('createdAt', 'desc')

    const data = await Promise.all(passes.map(serializePass))
    return response.ok({ success: true, data })
  }

  /** POST /trainer/athletes/:athleteId/passes */
  async create(ctx: HttpContext) {
    const { params, request, response } = ctx
    const athleteId = Number(params.athleteId)

    const ta = await resolveTrainerAthlete(ctx, athleteId)
    if (!ta) return

    const priceAmount = parsePositiveDecimal(request.input('priceAmount'))
    if (priceAmount === null) {
      return response.badRequest({ message: 'priceAmount обязателен и должен быть ≥ 0' })
    }

    const sessionsTotal = parsePositiveInt(request.input('sessionsTotal'))
    if (!sessionsTotal) {
      return response.badRequest({ message: 'sessionsTotal обязателен и должен быть ≥ 1' })
    }

    const validFrom = parseDate(request.input('validFrom')) ?? DateTime.now().startOf('day')
    const validUntil = request.input('validUntil') ? parseDate(request.input('validUntil')) : null
    if (request.input('validUntil') && !validUntil) {
      return response.badRequest({ message: 'Некорректная дата validUntil' })
    }

    const title =
      cleanString(request.input('title'), 255) || `Абонемент ${validFrom.toFormat('dd.MM.yyyy')}`

    const pass = await TrainerAthletePass.create({
      trainerAthleteId: ta.id,
      title,
      priceAmount,
      sessionsTotal,
      validFrom,
      validUntil,
      status: 'active',
      notes: cleanString(request.input('notes'), 2000),
    })

    return response.created({ success: true, data: await serializePass(pass) })
  }

  /** PATCH /trainer/passes/:id */
  async update({ auth, params, request, response }: HttpContext) {
    const trainer = auth.user!
    const pass = await TrainerAthletePass.query()
      .whereHas('trainerAthlete', (q) => q.where('trainerId', trainer.id))
      .where('id', params.id)
      .first()

    if (!pass) return response.notFound({ message: 'Абонемент не найден' })

    // Проверка: нельзя менять sessionsTotal если уже есть списания
    if (request.input('sessionsTotal') !== undefined) {
      const usagesCount = await TrainerAthletePassUsage.query()
        .where('passId', pass.id)
        .count('* as total')
        .then((r) => Number(r[0].$extras.total))

      if (usagesCount > 0) {
        return response.unprocessableEntity({
          message: 'Нельзя изменить количество занятий — уже есть списания',
        })
      }

      const sessionsTotal = parsePositiveInt(request.input('sessionsTotal'))
      if (!sessionsTotal) {
        return response.badRequest({ message: 'sessionsTotal должен быть ≥ 1' })
      }
      pass.sessionsTotal = sessionsTotal
    }

    if (request.input('title') !== undefined) {
      const title = cleanString(request.input('title'), 255)
      if (title) pass.title = title
    }
    if (request.input('notes') !== undefined) {
      pass.notes = cleanString(request.input('notes'), 2000)
    }
    if (request.input('validUntil') !== undefined) {
      const validUntil = request.input('validUntil') ? parseDate(request.input('validUntil')) : null
      if (request.input('validUntil') && !validUntil) {
        return response.badRequest({ message: 'Некорректная дата validUntil' })
      }
      pass.validUntil = validUntil
    }
    if (request.input('status') === 'cancelled') {
      if (pass.status === 'depleted' || pass.status === 'expired') {
        return response.unprocessableEntity({
          message: 'Нельзя отменить уже завершённый абонемент',
        })
      }
      pass.status = 'cancelled'
    }

    await pass.save()
    return response.ok({ success: true, data: await serializePass(pass) })
  }

  /** POST /trainer/passes/:id/usages — списать занятие (S1: workoutId) */
  async consume(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const trainer = auth.user!

    const pass = await TrainerAthletePass.query()
      .whereHas('trainerAthlete', (q) => q.where('trainerId', trainer.id))
      .where('id', params.id)
      .first()

    if (!pass) return response.notFound({ message: 'Абонемент не найден' })

    const workoutId = request.input('workoutId') ? Number(request.input('workoutId')) : null

    let scheduledWorkoutId: number | null = null

    if (workoutId) {
      // Проверить что тренировка принадлежит атлету этого пасса
      const workout = await Workout.query().where('id', workoutId).whereNull('deleted_at').first()

      if (!workout) return response.notFound({ message: 'Тренировка не найдена' })

      const ta = await TrainerAthlete.findOrFail(pass.trainerAthleteId)
      if (workout.userId !== ta.athleteId) {
        return response.forbidden({ message: 'Тренировка не принадлежит атлету' })
      }

      scheduledWorkoutId = workout.scheduledWorkoutId ?? null
    }

    let consumeError: string | null = null

    await db.transaction(async (trx) => {
      // FOR UPDATE — защита от гонки
      const lockedPass = await TrainerAthletePass.query({ client: trx })
        .where('id', pass.id)
        .forUpdate()
        .firstOrFail()

      const sessionsUsed = await TrainerAthletePassUsage.query({ client: trx })
        .where('passId', pass.id)
        .count('* as total')
        .then((r) => Number(r[0].$extras.total))

      if (lockedPass.status === 'cancelled') {
        consumeError = 'Абонемент отменён'
        return
      }
      if (lockedPass.status === 'expired') {
        consumeError = 'Срок абонемента истёк'
        return
      }
      if (sessionsUsed >= lockedPass.sessionsTotal) {
        consumeError = 'Занятия в абонементе закончились'
        return
      }

      await TrainerAthletePassUsage.create(
        {
          passId: pass.id,
          workoutId,
          scheduledWorkoutId,
          consumedAt: DateTime.now(),
        },
        { client: trx }
      )

      const newUsed = sessionsUsed + 1
      if (newUsed >= lockedPass.sessionsTotal) {
        lockedPass.status = 'depleted'
        lockedPass.useTransaction(trx)
        await lockedPass.save()
      }
    })

    if (consumeError) {
      return response.unprocessableEntity({ message: consumeError })
    }

    return response.ok({ success: true, data: await serializePass(pass) })
  }

  /** DELETE /trainer/pass-usages/:usageId — отменить списание */
  async deleteUsage({ auth, params, response }: HttpContext) {
    const trainer = auth.user!

    const usage = await TrainerAthletePassUsage.query().where('id', params.usageId).first()
    if (!usage) return response.notFound({ message: 'Списание не найдено' })

    const passOwned = await TrainerAthletePass.query()
      .where('id', usage.passId)
      .whereHas('trainerAthlete', (q) => q.where('trainerId', trainer.id))
      .first()

    if (!passOwned) {
      return response.notFound({ message: 'Списание не найдено' })
    }

    await db.transaction(async (trx) => {
      const pass = await TrainerAthletePass.query({ client: trx })
        .where('id', usage.passId)
        .forUpdate()
        .firstOrFail()

      await usage.useTransaction(trx).delete()

      // Если пасс был depleted — вернуть в active
      if (pass.status === 'depleted') {
        pass.status = 'active'
        pass.useTransaction(trx)
        await pass.save()
      }
    })

    return response.ok({ success: true, message: 'Списание отменено' })
  }
}
