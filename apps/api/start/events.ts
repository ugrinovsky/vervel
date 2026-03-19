import emitter from '@adonisjs/core/services/emitter'
import '#events/push_events'

const PushListener = () => import('#listeners/push_listener')

emitter.on('push:message', [PushListener, 'onMessage'])
emitter.on('push:athlete_added', [PushListener, 'onAthleteAdded'])
emitter.on('push:invite_accepted', [PushListener, 'onInviteAccepted'])
emitter.on('push:workout_scheduled', [PushListener, 'onWorkoutScheduled'])
