import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import emitter from '@adonisjs/core/services/emitter'
import VideoCall from '#models/video_call'
import TrainerAthlete from '#models/trainer_athlete'
import TrainerGroup from '#models/trainer_group'
import LiveKitService from '#services/LiveKitService'
import { computeCallAction } from '#services/callLogic'

export default class VideoCallsController {
  /**
   * Trainer initiates a call to an athlete or group.
   * POST /trainer/calls
   * Body: { athleteId } or { groupId }
   */
  async create({ request, auth, response }: HttpContext) {
    const trainer = auth.getUserOrFail()
    const { athleteId, groupId } = request.only(['athleteId', 'groupId'])

    if (!athleteId && !groupId) {
      return response.badRequest({ message: 'Укажите athleteId или groupId' })
    }

    let roomName: string

    if (athleteId) {
      // Verify active trainer↔athlete binding
      const binding = await TrainerAthlete.query()
        .where('trainer_id', trainer.id)
        .where('athlete_id', athleteId)
        .where('status', 'active')
        .first()
      if (!binding) {
        return response.forbidden({ message: 'Атлет не найден или не активен' })
      }
      roomName = LiveKitService.personalRoomName(trainer.id, athleteId)
    } else {
      // Verify group belongs to trainer
      const group = await TrainerGroup.query()
        .where('id', groupId)
        .where('trainer_id', trainer.id)
        .whereNull('deleted_at')
        .first()
      if (!group) {
        return response.forbidden({ message: 'Группа не найдена' })
      }
      roomName = LiveKitService.groupRoomName(trainer.id, groupId)
    }

    let call = await VideoCall.findBy('room_name', roomName)

    const roomAlive = call && call.status !== 'ended'
      ? await LiveKitService.roomExists(roomName)
      : false
    const action = computeCallAction(call, roomAlive)

    if (action.shouldCreateRoom) {
      await LiveKitService.createRoom(roomName)
    }

    if (!call) {
      call = await VideoCall.create({
        roomName,
        trainerId: trainer.id,
        athleteId: athleteId ?? null,
        groupId: groupId ?? null,
        status: 'pending',
      })
    } else if (action.shouldResetCall) {
      call.status = 'pending'
      call.startedAt = null
      call.endedAt = null
      await call.save()
    }

    if (action.shouldNotify) {
      let recipientIds: number[] = []
      if (athleteId) {
        recipientIds = [athleteId]
      } else if (groupId) {
        const group = await TrainerGroup.query()
          .where('id', groupId)
          .preload('athletes')
          .firstOrFail()
        recipientIds = group.athletes.map((a) => a.id)
      }
      if (recipientIds.length > 0) {
        emitter.emit('push:call_incoming', {
          recipientIds,
          trainerName: trainer.fullName ?? 'Тренер',
        })
      }
    }

    const token = await LiveKitService.createToken({
      roomName,
      userId: trainer.id,
      userName: trainer.fullName ?? trainer.id.toString(),
      role: 'trainer',
    })

    return response.ok({
      callId: call.id,
      roomName,
      token,
      url: LiveKitService.wsUrl,
    })
  }

  /**
   * Athlete declines an incoming call.
   * POST /calls/:roomName/decline
   */
  async decline({ params, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const call = await VideoCall.query()
      .where('room_name', params.roomName)
      .whereIn('status', ['pending', 'active'])
      .first()

    if (!call) {
      return response.ok({ message: 'Звонок уже завершён' })
    }

    // Only the assigned athlete (or group member) can decline
    const isAthlete = call.athleteId === user.id
    let isGroupMember = false
    if (call.groupId && !isAthlete) {
      const membership = await TrainerGroup.query()
        .where('id', call.groupId)
        .whereHas('athletes', (q) => q.where('users.id', user.id))
        .first()
      isGroupMember = !!membership
    }

    if (!isAthlete && !isGroupMember) {
      return response.forbidden({ message: 'Нет доступа к этому звонку' })
    }

    call.status = 'ended'
    call.endedAt = DateTime.now()
    await call.save()
    await LiveKitService.deleteRoom(call.roomName)

    return response.ok({ message: 'Звонок отклонён' })
  }

  /**
   * Athlete or trainer joins an existing call.
   * POST /calls/:roomName/join
   */
  async join({ params, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const call = await VideoCall.query()
      .where('room_name', params.roomName)
      .whereIn('status', ['pending', 'active'])
      .first()

    if (!call) {
      return response.notFound({ message: 'Звонок не найден или завершён' })
    }

    // Check access: must be trainer, the assigned athlete, or a member of the group
    const isTrainer = call.trainerId === user.id
    const isAthlete = call.athleteId === user.id
    let isGroupMember = false

    if (call.groupId && !isTrainer) {
      const membership = await TrainerGroup.query()
        .where('id', call.groupId)
        .whereHas('athletes', (q) => q.where('users.id', user.id))
        .first()
      isGroupMember = !!membership
    }

    if (!isTrainer && !isAthlete && !isGroupMember) {
      return response.forbidden({ message: 'Нет доступа к этому звонку' })
    }

    // Mark as active on first join
    if (call.status === 'pending') {
      call.status = 'active'
      call.startedAt = DateTime.now()
      await call.save()
    }

    const token = await LiveKitService.createToken({
      roomName: call.roomName,
      userId: user.id,
      userName: user.fullName ?? user.id.toString(),
      role: isTrainer ? 'trainer' : 'athlete',
    })

    return response.ok({
      callId: call.id,
      roomName: call.roomName,
      token,
      url: LiveKitService.wsUrl,
    })
  }

  /**
   * End a call (trainer only).
   * POST /trainer/calls/:callId/end
   */
  async end({ params, auth, response }: HttpContext) {
    const trainer = auth.getUserOrFail()
    const call = await VideoCall.query()
      .where('id', params.callId)
      .where('trainer_id', trainer.id)
      .whereIn('status', ['pending', 'active'])
      .firstOrFail()

    call.status = 'ended'
    call.endedAt = DateTime.now()
    await call.save()

    await LiveKitService.deleteRoom(call.roomName)

    return response.ok({ message: 'Звонок завершён' })
  }

  /**
   * Get call history for trainer.
   * GET /trainer/calls
   */
  async trainerHistory({ auth, response }: HttpContext) {
    const trainer = auth.getUserOrFail()
    const calls = await VideoCall.query()
      .where('trainer_id', trainer.id)
      .preload('athlete')
      .preload('group')
      .orderBy('created_at', 'desc')
      .limit(50)

    return response.ok(calls)
  }

  /**
   * Get active call for athlete (to show incoming call screen).
   * GET /athlete/calls/active
   */
  async athleteActive({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    // Personal call
    const personalCall = await VideoCall.query()
      .where('athlete_id', user.id)
      .whereIn('status', ['pending', 'active'])
      .preload('trainer')
      .first()

    if (personalCall) {
      // Don't mutate the record here — a flaky LiveKit check would permanently
      // destroy a valid pending call. Stale records are cleaned up when the
      // trainer re-initiates (create endpoint) or ends the call explicitly.
      const alive = await LiveKitService.roomExists(personalCall.roomName)
      return response.ok(alive ? personalCall : null)
    }

    // Group call — find groups user belongs to
    const groupCall = await VideoCall.query()
      .whereNotNull('group_id')
      .whereIn('status', ['pending', 'active'])
      .whereHas('group', (q) =>
        q.whereHas('athletes', (aq) => aq.where('users.id', user.id))
      )
      .preload('trainer')
      .preload('group')
      .first()

    if (groupCall) {
      const alive = await LiveKitService.roomExists(groupCall.roomName)
      return response.ok(alive ? groupCall : null)
    }

    return response.ok(null)
  }
}
