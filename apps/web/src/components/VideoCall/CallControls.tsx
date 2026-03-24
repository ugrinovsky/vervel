import { MicrophoneIcon, VideoCameraIcon, PhoneXMarkIcon } from '@heroicons/react/24/outline'
import FloatingPanel from '../ui/FloatingPanel'

interface CallControlsProps {
  isMicEnabled: boolean
  isCameraEnabled: boolean
  onToggleMic: () => void
  onToggleCamera: () => void
  onLeave: () => void
}

export default function CallControls({
  isMicEnabled,
  isCameraEnabled,
  onToggleMic,
  onToggleCamera,
  onLeave,
}: CallControlsProps) {
  return (
    <FloatingPanel>
      <button
        onClick={onToggleMic}
        title={isMicEnabled ? 'Выключить микрофон' : 'Включить микрофон'}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
          isMicEnabled ? 'bg-white/15 hover:bg-white/25' : 'bg-red-500/80 hover:bg-red-500'
        }`}
      >
        <MicrophoneIcon className="w-6 h-6 text-white" />
      </button>

      <button
        onClick={onLeave}
        title="Завершить звонок"
        className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors shadow-lg"
      >
        <PhoneXMarkIcon className="w-7 h-7 text-white" />
      </button>

      <button
        onClick={onToggleCamera}
        title={isCameraEnabled ? 'Выключить камеру' : 'Включить камеру'}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
          isCameraEnabled ? 'bg-white/15 hover:bg-white/25' : 'bg-red-500/80 hover:bg-red-500'
        }`}
      >
        <VideoCameraIcon className="w-6 h-6 text-white" />
      </button>
    </FloatingPanel>
  )
}
