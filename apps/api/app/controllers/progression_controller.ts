import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { ProgressionService } from '#services/ProgressionService'
import db from '@adonisjs/lucid/services/db'

const strengthLogPinsValidator = vine.compile(
  vine.object({
    exerciseIds: vine.array(vine.string().trim().minLength(1).maxLength(512)).maxLength(40),
  })
)

const createStandardValidator = vine.compile(
  vine.object({
    displayLabel: vine.string().trim().minLength(1).maxLength(255),
    catalogExerciseId: vine.string().trim().maxLength(512).optional(),
  })
)

const updateStandardValidator = vine.compile(
  vine.object({
    displayLabel: vine.string().trim().minLength(1).maxLength(255),
  })
)

const setAliasValidator = vine.compile(
  vine.object({
    sourceExerciseId: vine.string().trim().minLength(1).maxLength(512),
    standardId: vine.number(),
  })
)

const removeAliasValidator = vine.compile(
  vine.object({
    sourceExerciseId: vine.string().trim().minLength(1).maxLength(512),
  })
)

export default class ProgressionController {
  /**
   * GET /progression
   * Прогрессия по упражнениям для текущего пользователя (текущий vs предыдущий месяц)
   */
  async getUserProgression({ auth, response }: HttpContext) {
    const user = auth.user!
    const progression = await ProgressionService.getUserProgression(user.id)
    return response.ok({ success: true, data: progression })
  }

  /**
   * GET /progression/strength-log
   * Силовой журнал: история подходов по каждому упражнению (+ эталоны, метрики 30+30 дн.)
   */
  async getStrengthLog({ auth, response }: HttpContext) {
    const user = auth.user!
    const log = await ProgressionService.getStrengthLog(user.id)
    return response.ok({ success: true, data: log })
  }

  /**
   * PUT /progression/strength-log/pins
   * Полностью заменяет список закреплённых упражнений силового журнала.
   */
  async putStrengthLogPins({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { exerciseIds } = await request.validateUsing(strengthLogPinsValidator)
    await ProgressionService.replaceStrengthLogPins(user.id, exerciseIds)
    const data = await ProgressionService.getStrengthLog(user.id)
    return response.ok({ success: true, data })
  }

  /**
   * GET /progression/exercise-standards
   */
  async getExerciseStandards({ auth, response }: HttpContext) {
    const user = auth.user!
    const data = await ProgressionService.listExerciseStandards(user.id)
    return response.ok({ success: true, data })
  }

  /**
   * POST /progression/exercise-standards
   */
  async postExerciseStandard({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const body = await request.validateUsing(createStandardValidator)
    const catRaw = body.catalogExerciseId?.trim()
    try {
      const data = await ProgressionService.createExerciseStandard(
        user.id,
        body.displayLabel,
        catRaw && catRaw.length > 0 ? catRaw : null
      )
      return response.ok({ success: true, data })
    } catch (e: any) {
      return response.badRequest({ success: false, message: e?.message ?? 'Ошибка' })
    }
  }

  /**
   * PATCH /progression/exercise-standards/:id
   */
  async patchExerciseStandard({ auth, request, response, params }: HttpContext) {
    const user = auth.user!
    const id = Number(params.id)
    if (!Number.isFinite(id)) {
      return response.badRequest({ success: false, message: 'Некорректный id' })
    }
    const body = await request.validateUsing(updateStandardValidator)
    try {
      await ProgressionService.updateExerciseStandard(user.id, id, body.displayLabel)
      return response.ok({ success: true })
    } catch (e: any) {
      return response.badRequest({ success: false, message: e?.message ?? 'Ошибка' })
    }
  }

  /**
   * DELETE /progression/exercise-standards/:id
   */
  async deleteExerciseStandard({ auth, response, params }: HttpContext) {
    const user = auth.user!
    const id = Number(params.id)
    if (!Number.isFinite(id)) {
      return response.badRequest({ success: false, message: 'Некорректный id' })
    }
    try {
      await ProgressionService.deleteExerciseStandard(user.id, id)
      return response.ok({ success: true })
    } catch (e: any) {
      return response.badRequest({ success: false, message: e?.message ?? 'Ошибка' })
    }
  }

  /**
   * POST /progression/exercise-standard-aliases
   */
  async postExerciseStandardAlias({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const body = await request.validateUsing(setAliasValidator)
    try {
      await ProgressionService.setExerciseStandardAlias(
        user.id,
        body.sourceExerciseId,
        body.standardId
      )
      return response.ok({ success: true })
    } catch (e: any) {
      return response.badRequest({ success: false, message: e?.message ?? 'Ошибка' })
    }
  }

  /**
   * DELETE /progression/exercise-standard-aliases (body: { sourceExerciseId })
   */
  async deleteExerciseStandardAlias({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const body = await request.validateUsing(removeAliasValidator)
    await ProgressionService.removeExerciseStandardAlias(user.id, body.sourceExerciseId)
    return response.ok({ success: true })
  }

  async getGroupLeaderboard({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const groupId = Number(params.id)
    const period = [7, 30].includes(Number(request.input('period', 30)))
      ? (Number(request.input('period', 30)) as 7 | 30)
      : 30

    // Проверяем членство в группе
    const membership = await db
      .from('group_athletes')
      .where('group_id', groupId)
      .where('athlete_id', user.id)
      .first()

    if (!membership) {
      return response.forbidden({ success: false, message: 'Нет доступа к этой группе' })
    }

    // Загружаем группу и атлетов
    const [groupRow, rows] = await Promise.all([
      db.from('trainer_groups').where('id', groupId).select('name', 'trainer_id').first(),
      db.from('group_athletes').where('group_id', groupId).select('athlete_id'),
    ])

    const trainerRow = groupRow
      ? await db.from('users').where('id', groupRow.trainer_id).select('full_name').first()
      : null

    const athleteIds = rows.map((r: any) => r.athlete_id as number)
    const entries = await ProgressionService.getGroupLeaderboard(athleteIds, period)

    return response.ok({
      success: true,
      data: {
        groupName: groupRow?.name ?? '',
        trainerName: trainerRow?.full_name ?? null,
        entries,
      },
    })
  }
}
