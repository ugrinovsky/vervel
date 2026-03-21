import type { EventsList } from '@adonisjs/core/types'
import { PushNotificationService } from '#services/PushNotificationService'

export default class PushListener {
  async onMessage(data: EventsList['push:message']) {
    try {
      const parsed = JSON.parse(data.content)
      if (parsed.__type) return // skip structured internal messages (e.g. workout_preview)
    } catch {
      // not JSON — proceed normally
    }
    await PushNotificationService.sendToUsers(data.recipientIds, {
      title: data.senderName,
      body: data.content.slice(0, 100),
      url: data.url,
    })
  }

  async onAthleteAdded(data: EventsList['push:athlete_added']) {
    await PushNotificationService.sendToUser(data.athleteId, {
      title: 'Новый тренер',
      body: `Тренер ${data.trainerName} добавил вас`,
      url: `/my-team`,
    })
  }

  async onInviteAccepted(data: EventsList['push:invite_accepted']) {
    await PushNotificationService.sendToUser(data.trainerId, {
      title: 'Новый атлет',
      body: `${data.athleteName} принял ваше приглашение`,
      url: `/trainer/athletes`,
    })
  }

  async onWorkoutScheduled(data: EventsList['push:workout_scheduled']) {
    await PushNotificationService.sendToUsers(data.athleteIds, {
      title: 'Новая тренировка',
      body: `Тренер ${data.trainerName} добавил тренировку на ${data.scheduledDate}`,
      url: `/home`,
    })
  }
}
