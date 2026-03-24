import { motion, AnimatePresence } from 'framer-motion'
import { PhoneIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { VideoCameraIcon } from '@heroicons/react/24/outline'
import type { VideoCall } from '../../api/calls'
import AccentButton from '../ui/AccentButton'
import GhostButton from '../ui/GhostButton'

interface IncomingCallProps {
  call: VideoCall
  onAccept: () => void
  onDecline: () => void
}

export default function IncomingCall({ call, onAccept, onDecline }: IncomingCallProps) {
  const callerName = call.trainer?.fullName ?? 'Тренер'
  const subtitle = call.group ? `Групповая тренировка · ${call.group.name}` : 'Личный звонок'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -80, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -80, scale: 0.9 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
      >
        <div className="bg-(--color_bg_card) backdrop-blur-xl rounded-2xl p-4 border border-(--color_border) shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-(--color_primary_light) flex items-center justify-center shrink-0">
              <VideoCameraIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{callerName}</p>
              <p className="text-sm text-(--color_text_muted) truncate">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onDecline}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/8 hover:bg-white/15 text-white/50 hover:text-white transition-all shrink-0"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2">
            <GhostButton variant="solid" onClick={onDecline} className="flex-1">
              <PhoneIcon className="w-4 h-4 rotate-135" />
              Отклонить
            </GhostButton>
            <AccentButton size="md" onClick={onAccept} className="flex-1">
              <PhoneIcon className="w-4 h-4" />
              Принять
            </AccentButton>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
