declare module '@adonisjs/core/types' {
  interface EventsList {
    'chat:new_message': {
      chatId: number
      message: {
        id: number
        content: string
        senderId: number
        sender: { id: number; fullName: string | null; email: string }
        createdAt: unknown
      }
    }
    'push:message': {
      senderName: string
      content: string
      /** IDs of users to notify (not the sender) */
      recipientIds: number[]
      /** URL to open on notification click */
      url: string
    }
    'push:athlete_added': {
      athleteId: number
      trainerName: string
    }
    'push:invite_accepted': {
      trainerId: number
      athleteName: string
    }
    'push:workout_scheduled': {
      athleteIds: number[]
      scheduledDate: string
      trainerName: string
    }
    'push:call_incoming': {
      recipientIds: number[]
      trainerName: string
    }
  }
}
