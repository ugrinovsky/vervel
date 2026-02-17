import type { HttpContext } from '@adonisjs/core/http'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import User from '#models/user'
import Workout from '#models/workout'
import TrainerAthlete from '#models/trainer_athlete'
import TrainerGroup from '#models/trainer_group'
import ScheduledWorkout from '#models/scheduled_workout'
import { WorkoutCalculator } from '#services/WorkoutCalculator'
import {
  createGroupValidator,
  addAthleteByEmailValidator,
  addAthleteToGroupValidator,
} from '#validators/trainer_validator'

export default class TrainerController {
  /**
   * Get today overview for trainer
   * GET /trainer/today
   */
  async getTodayOverview({ auth, response }: HttpContext) {
    const trainer = auth.user!
    const today = DateTime.now().startOf('day')
    const tomorrow = today.plus({ days: 1 })

    // Today's scheduled workouts
    const todayWorkouts = await ScheduledWorkout.query()
      .where('trainerId', trainer.id)
      .whereBetween('scheduledDate', [today.toJSDate(), tomorrow.toJSDate()])
      .where('status', 'scheduled')
      .orderBy('scheduledDate', 'asc')

    // Total stats
    const athleteCount = await TrainerAthlete.query()
      .where('trainerId', trainer.id)
      .whereNotNull('athleteId')
      .where('status', 'active')
      .count('* as total')

    const groupCount = await TrainerGroup.query().where('trainerId', trainer.id).count('* as total')

    return response.ok({
      success: true,
      data: {
        todayWorkouts: todayWorkouts.map((w) => ({
          id: w.id,
          scheduledDate: w.scheduledDate,
          workoutData: w.workoutData,
          assignedTo: w.assignedTo,
        })),
        stats: {
          athleteCount: Number(athleteCount[0].$extras.total),
          groupCount: Number(groupCount[0].$extras.total),
          todayWorkoutsCount: todayWorkouts.length,
        },
      },
    })
  }

  // ─── Athlete management ───

  async listAthletes({ auth, response }: HttpContext) {
    const trainer = auth.user!

    const bindings = await TrainerAthlete.query()
      .where('trainerId', trainer.id)
      .whereNotNull('athleteId')
      .preload('athlete')

    const athletes = bindings.map((b) => ({
      id: b.athlete.id,
      fullName: b.athlete.fullName,
      email: b.athlete.email,
      status: b.status,
      linkedAt: b.createdAt,
    }))

    return response.ok({ success: true, data: athletes })
  }

  async addAthleteByEmail({ auth, request, response }: HttpContext) {
    const trainer = auth.user!
    const { email } = await request.validateUsing(addAthleteByEmailValidator)

    const athlete = await User.findBy('email', email)
    if (!athlete) {
      return response.notFound({ message: 'Пользователь с таким email не найден' })
    }

    if (athlete.id === trainer.id) {
      return response.badRequest({ message: 'Нельзя добавить самого себя' })
    }

    const existing = await TrainerAthlete.query()
      .where('trainerId', trainer.id)
      .where('athleteId', athlete.id)
      .first()

    if (existing) {
      return response.conflict({ message: 'Атлет уже привязан' })
    }

    await TrainerAthlete.create({
      trainerId: trainer.id,
      athleteId: athlete.id,
      status: 'active',
    })

    return response.created({
      success: true,
      data: {
        id: athlete.id,
        fullName: athlete.fullName,
        email: athlete.email,
        status: 'active',
      },
    })
  }

  async generateInviteLink({ auth, response }: HttpContext) {
    const trainer = auth.user!
    const token = randomUUID()

    await TrainerAthlete.create({
      trainerId: trainer.id,
      athleteId: null,
      status: 'pending',
      inviteToken: token,
    })

    return response.created({
      success: true,
      data: { token, link: `/invite/${token}` },
    })
  }

  async addAthleteByQr({ auth, request, response }: HttpContext) {
    const trainer = auth.user!
    const { athleteId } = request.only(['athleteId'])

    if (!athleteId) {
      return response.badRequest({ message: 'athleteId обязателен' })
    }

    const athlete = await User.find(athleteId)
    if (!athlete) {
      return response.notFound({ message: 'Атлет не найден' })
    }

    if (athlete.id === trainer.id) {
      return response.badRequest({ message: 'Нельзя добавить самого себя' })
    }

    const existing = await TrainerAthlete.query()
      .where('trainerId', trainer.id)
      .where('athleteId', athlete.id)
      .first()

    if (existing) {
      return response.conflict({ message: 'Атлет уже привязан' })
    }

    await TrainerAthlete.create({
      trainerId: trainer.id,
      athleteId: athlete.id,
      status: 'active',
    })

    return response.created({
      success: true,
      data: {
        id: athlete.id,
        fullName: athlete.fullName,
        email: athlete.email,
        status: 'active',
      },
    })
  }

  async removeAthlete({ auth, params, response }: HttpContext) {
    const trainer = auth.user!

    const binding = await TrainerAthlete.query()
      .where('trainerId', trainer.id)
      .where('athleteId', params.athleteId)
      .first()

    if (!binding) {
      return response.notFound({ message: 'Связь не найдена' })
    }

    await binding.delete()

    return response.ok({ success: true, message: 'Атлет отвязан' })
  }

  // ─── Athlete data viewing ───

  async getAthleteStats({ auth, params, request, response }: HttpContext) {
    const trainer = auth.user!
    const athleteId = Number(params.athleteId)

    if (!(await this.verifyAthleteAccess(trainer.id, athleteId))) {
      return response.forbidden({ message: 'Нет доступа к этому атлету' })
    }

    const from = request.input('from')
    const to = request.input('to')

    if (!from || !to) {
      return response.badRequest({ message: 'Параметры "from" и "to" обязательны' })
    }

    const workouts = await Workout.query()
      .where('userId', athleteId)
      .whereBetween('date', [from, to])
      .orderBy('date', 'asc')

    const stats = WorkoutCalculator.calculatePeriodStats(workouts)

    return response.ok(stats)
  }

  async getAthleteAvatar({ auth, params, request, response }: HttpContext) {
    const trainer = auth.user!
    const athleteId = Number(params.athleteId)

    if (!(await this.verifyAthleteAccess(trainer.id, athleteId))) {
      return response.forbidden({ message: 'Нет доступа к этому атлету' })
    }

    const mode = request.input('mode', 'recovery')

    if (mode === 'recovery') {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 14)

      const workouts = await Workout.query()
        .where('userId', athleteId)
        .where('date', '>=', startDate)
        .orderBy('date', 'asc')

      const stats = WorkoutCalculator.calculateRecoveryState(workouts)

      return response.json({ success: true, data: stats })
    }

    const period = request.input('period', 'week')
    const from = request.input('from')
    const to = request.input('to')

    let startDate: Date
    let endDate = new Date()

    if (from && to) {
      startDate = new Date(from)
      endDate = new Date(to)
    } else {
      startDate = this.calculateStartDate(period)
    }

    const workouts = await Workout.query()
      .where('userId', athleteId)
      .whereBetween('date', [startDate, endDate])
      .orderBy('date', 'asc')

    const stats = WorkoutCalculator.calculatePeriodStats(workouts, period)

    return response.json({ success: true, data: stats })
  }

  // ─── Group management ───

  async listGroups({ auth, response }: HttpContext) {
    const trainer = auth.user!

    const groups = await TrainerGroup.query()
      .where('trainerId', trainer.id)
      .withCount('athletes', (q) => q.as('athleteCount'))
      .orderBy('createdAt', 'desc')

    return response.ok({
      success: true,
      data: groups.map((g) => ({
        id: g.id,
        name: g.name,
        athleteCount: Number((g.$extras as any).athleteCount || 0),
        createdAt: g.createdAt,
      })),
    })
  }

  async createGroup({ auth, request, response }: HttpContext) {
    const trainer = auth.user!
    const { name } = await request.validateUsing(createGroupValidator)

    const group = await TrainerGroup.create({
      trainerId: trainer.id,
      name,
    })

    return response.created({
      success: true,
      data: { id: group.id, name: group.name, athleteCount: 0, createdAt: group.createdAt },
    })
  }

  async updateGroup({ auth, params, request, response }: HttpContext) {
    const trainer = auth.user!
    const { name } = await request.validateUsing(createGroupValidator)

    const group = await TrainerGroup.query()
      .where('id', params.id)
      .where('trainerId', trainer.id)
      .firstOrFail()

    group.name = name
    await group.save()

    return response.ok({ success: true, data: { id: group.id, name: group.name } })
  }

  async deleteGroup({ auth, params, response }: HttpContext) {
    const trainer = auth.user!

    const group = await TrainerGroup.query()
      .where('id', params.id)
      .where('trainerId', trainer.id)
      .firstOrFail()

    await group.delete()

    return response.ok({ success: true, message: 'Группа удалена' })
  }

  async addAthleteToGroup({ auth, params, request, response }: HttpContext) {
    const trainer = auth.user!
    const { athleteId } = await request.validateUsing(addAthleteToGroupValidator)

    const group = await TrainerGroup.query()
      .where('id', params.id)
      .where('trainerId', trainer.id)
      .firstOrFail()

    if (!(await this.verifyAthleteAccess(trainer.id, athleteId))) {
      return response.badRequest({ message: 'Атлет не привязан к вам' })
    }

    await group.related('athletes').attach([athleteId])

    return response.created({ success: true, message: 'Атлет добавлен в группу' })
  }

  async removeAthleteFromGroup({ auth, params, response }: HttpContext) {
    const trainer = auth.user!

    const group = await TrainerGroup.query()
      .where('id', params.id)
      .where('trainerId', trainer.id)
      .firstOrFail()

    await group.related('athletes').detach([Number(params.athleteId)])

    return response.ok({ success: true, message: 'Атлет убран из группы' })
  }

  async getGroupAthletes({ auth, params, response }: HttpContext) {
    const trainer = auth.user!

    const group = await TrainerGroup.query()
      .where('id', params.id)
      .where('trainerId', trainer.id)
      .preload('athletes')
      .firstOrFail()

    const athletes = group.athletes.map((a) => ({
      id: a.id,
      fullName: a.fullName,
      email: a.email,
    }))

    return response.ok({ success: true, data: athletes })
  }

  // ─── Helpers ───

  private async verifyAthleteAccess(trainerId: number, athleteId: number): Promise<boolean> {
    const binding = await TrainerAthlete.query()
      .where('trainerId', trainerId)
      .where('athleteId', athleteId)
      .where('status', 'active')
      .first()
    return !!binding
  }

  private calculateStartDate(period: string): Date {
    const now = new Date()
    const startDate = new Date(now)

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case 'all':
        startDate.setFullYear(2000)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    return startDate
  }
}
