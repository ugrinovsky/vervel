import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { ProgressionService } from '#services/ProgressionService'
import { YandexAiService } from '#services/YandexAiService'
import { AiBalanceService, InsufficientBalanceError } from '#services/AiBalanceService'
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

const applyAliasBatchValidator = vine.compile(
  vine.object({
    links: vine
      .array(
        vine.object({
          sourceExerciseId: vine.string().trim().minLength(1).maxLength(512),
          standardId: vine.number(),
        })
      )
      .minLength(1)
      .maxLength(40),
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

  /**
   * POST /progression/ai-suggest-standard-links
   * ИИ предлагает связи упражнений из истории с эталонами (списание баланса, если есть кандидаты).
   */
  async postAiSuggestStandardLinks({ auth, response }: HttpContext) {
    if (!YandexAiService.isEnabled()) {
      return response.forbidden({ success: false, message: 'AI временно недоступен' })
    }

    const userId = auth.user!.id
    const standards = await ProgressionService.listExerciseStandards(userId)
    if (standards.length === 0) {
      return response.badRequest({
        success: false,
        message: 'Сначала создайте хотя бы один эталон',
      })
    }

    const candidates = await ProgressionService.listUnlinkedStrengthExerciseCandidates(userId)
    if (candidates.length === 0) {
      const balance = await AiBalanceService.getBalance(userId)
      return response.ok({ success: true, data: { suggestions: [], balance } })
    }

    const cost = AiBalanceService.COST_SUGGEST_STANDARD_LINKS
    try {
      await AiBalanceService.charge(userId, cost, 'ИИ: подсказки связей с эталонами')
    } catch (e) {
      if (e instanceof InsufficientBalanceError) {
        return response.paymentRequired({
          success: false,
          message: `Недостаточно средств. Баланс: ${e.balance}₽, требуется: ${e.required}₽`,
          balance: e.balance,
          required: e.required,
        })
      }
      throw e
    }

    try {
      const suggestions = await ProgressionService.suggestStandardAliasLinksWithAi(userId)
      const balance = await AiBalanceService.getBalance(userId)
      return response.ok({ success: true, data: { suggestions, balance } })
    } catch (e: any) {
      return response.internalServerError({
        success: false,
        message: e?.message ?? 'Не удалось получить подсказки',
      })
    }
  }

  /**
   * POST /progression/apply-standard-alias-batch
   * Применить выбранные связи; возвращает revertId для отката.
   */
  async postApplyStandardAliasBatch({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const body = await request.validateUsing(applyAliasBatchValidator)
    try {
      const { revertId, applied } = await ProgressionService.applyStandardAliasBatch(
        user.id,
        body.links
      )
      return response.ok({ success: true, data: { revertId, applied } })
    } catch (e: any) {
      return response.badRequest({ success: false, message: e?.message ?? 'Ошибка' })
    }
  }

  /**
   * POST /progression/revert-standard-alias-batch/:id
   * Откатить последний пакет по id снимка.
   */
  async postRevertStandardAliasBatch({ auth, response, params }: HttpContext) {
    const user = auth.user!
    const id = Number(params.id)
    if (!Number.isFinite(id) || id <= 0) {
      return response.badRequest({ success: false, message: 'Некорректный id' })
    }
    try {
      await ProgressionService.revertStandardAliasBatch(user.id, id)
      return response.ok({ success: true })
    } catch (e: any) {
      return response.badRequest({ success: false, message: e?.message ?? 'Ошибка отката' })
    }
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
