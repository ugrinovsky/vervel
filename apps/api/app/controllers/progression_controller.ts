import { HttpContext } from '@adonisjs/core/http'
import { ProgressionService } from '#services/ProgressionService'
import db from '@adonisjs/lucid/services/db'

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
   * GET /athlete/groups/:id/leaderboard?period=7|30
   * Лидерборд группы для атлета — проверяем, что он является участником группы
   */
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
