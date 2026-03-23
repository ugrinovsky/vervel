/// <reference lib="webworker" />

import { registerOffline } from './sw/offline'
import { registerPush } from './sw/push'

registerOffline()
registerPush()
