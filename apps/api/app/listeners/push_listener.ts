import type { EventsList } from '@adonisjs/core/types'
import { JobQueueService } from '#services/JobQueueService'

export default class PushListener {
  async onMessage(data: EventsList['push:message']) {
    await JobQueueService.enqueue({
      type: 'push_event',
      payload: { event: 'push:message', data },
      maxAttempts: 10,
    })
  }

  async onAthleteAdded(data: EventsList['push:athlete_added']) {
    await JobQueueService.enqueue({
      type: 'push_event',
      payload: { event: 'push:athlete_added', data },
      maxAttempts: 10,
    })
  }

  async onInviteAccepted(data: EventsList['push:invite_accepted']) {
    await JobQueueService.enqueue({
      type: 'push_event',
      payload: { event: 'push:invite_accepted', data },
      maxAttempts: 10,
    })
  }

  async onWorkoutScheduled(data: EventsList['push:workout_scheduled']) {
    await JobQueueService.enqueue({
      type: 'push_event',
      payload: { event: 'push:workout_scheduled', data },
      maxAttempts: 10,
    })
  }

  async onCallIncoming(data: EventsList['push:call_incoming']) {
    await JobQueueService.enqueue({
      type: 'push_event',
      payload: { event: 'push:call_incoming', data },
      maxAttempts: 10,
    })
  }
}
