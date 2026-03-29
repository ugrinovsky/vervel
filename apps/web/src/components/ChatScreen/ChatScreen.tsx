import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { UserGroupIcon, VideoCameraIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import UserAvatar from '@/components/UserAvatar/UserAvatar'
import BackButton from '@/components/BackButton/BackButton'
import ChatBox from '@/components/ChatBox/ChatBox'
import VideoCallRoom, { DisconnectReason } from '@/components/VideoCall/VideoCallRoom'
import { useVideoCall } from '@/hooks/useVideoCall'
import { useActiveMode } from '@/contexts/AuthContext'
import type { DialogItem } from '@/api/chat'

interface Props {
  open: boolean
  dialog: DialogItem | null
  onClose: () => void
}

// Scattered sport pattern — barbell, flame, zap, activity, timer, trophy. Lucide outline (MIT).
const SPORT_TILE = `<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'>
  <g transform='translate(3,8) rotate(22,12,12) scale(1.5)' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
    <path d='M2 12h1'/><path d='M21 12h1'/>
    <path d='M6 8h1a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z'/>
    <path d='M17 8h1a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z'/>
    <path d='M8 12h8'/>
  </g>
  <g transform='translate(90,3) rotate(-168,12,12) scale(0.9)' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
    <path d='M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4'/>
  </g>
  <g transform='translate(15,57) rotate(-35,12,12) scale(1.6)' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
    <path d='M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'/>
  </g>
  <g transform='translate(93,48) rotate(48,12,12) scale(1.2)' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
    <line x1='10' x2='14' y1='2' y2='2'/><line x1='12' x2='15' y1='14' y2='11'/><circle cx='12' cy='14' r='8'/>
  </g>
  <g transform='translate(52,28) rotate(-20,12,12) scale(1.0)' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
    <path d='M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2'/>
  </g>
  <g transform='translate(57,75) rotate(14,12,12) scale(0.85)' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
    <path d='M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2'/>
  </g>
  <g transform='translate(118,33) rotate(55,12,12) scale(0.9)' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
    <path d='M2 12h1'/><path d='M21 12h1'/>
    <path d='M6 8h1a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z'/>
    <path d='M17 8h1a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z'/>
    <path d='M8 12h8'/>
  </g>
  <g transform='translate(123,87) rotate(72,12,12) scale(0.75)' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
    <path d='M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'/>
    <path d='M3.22 12H9.5l.5-1 2 4 .5-1 2-6 .5 2h6.28'/>
  </g>
  <g transform='translate(25,105) rotate(-55,12,12) scale(1.35)' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
    <line x1='10' x2='14' y1='2' y2='2'/><line x1='12' x2='15' y1='14' y2='11'/><circle cx='12' cy='14' r='8'/>
  </g>
  <g transform='translate(93,110) rotate(145,12,12) scale(0.8)' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
    <path d='M2 12h1'/><path d='M21 12h1'/>
    <path d='M6 8h1a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z'/>
    <path d='M17 8h1a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z'/>
    <path d='M8 12h8'/>
  </g>
  <g transform='translate(0,123) rotate(-18,12,12) scale(1.1)' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
    <path d='M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4'/>
  </g>
  <g transform='translate(62,115) rotate(-40,12,12) scale(1.0)' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
    <path d='M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'/>
  </g>
</svg>`

const HEADER_BG = {
  background: 'var(--chat_panel_bg)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderBottom: '1px solid var(--color_border)',
} as const

export default function ChatScreen({ open, dialog, onClose }: Props) {
  const { session, isConnecting, startCallToAthlete, startCallToGroup, endCall, leaveCall } =
    useVideoCall()
  const navigate = useNavigate()
  const { isTrainer } = useActiveMode()

  const headerRef = useRef<HTMLDivElement>(null)
  const [headerHeight, setHeaderHeight] = useState(0)

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const obs = new ResizeObserver(() => setHeaderHeight(el.offsetHeight))
    obs.observe(el)
    return () => obs.disconnect()
  }, [open])

  const handleProfileClick = () => {
    if (!dialog || dialog.type === 'group') return
    if (isTrainer && dialog.athleteId) {
      navigate(`/trainer/athletes/${dialog.athleteId}`)
      onClose()
    } else if (!isTrainer && dialog.trainerId) {
      navigate(`/trainer/profile/${dialog.trainerId}`)
      onClose()
    }
  }

  const handleCall = () => {
    if (!dialog) return
    if (dialog.type === 'group' && dialog.groupId) startCallToGroup(dialog.groupId)
    else if (dialog.athleteId) startCallToAthlete(dialog.athleteId)
  }

  return (
    <AnimatePresence>
      {open && dialog && (
        <motion.div
          key="chat-screen"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="fixed inset-0 z-60 overflow-hidden"
          style={{ background: 'var(--color_primary_dark)' }}
        >
          {/* Icon pattern overlay */}
          <div
            className="absolute inset-0 pointer-events-none chat-icon-overlay"
            style={{
              opacity: 0.045,
              backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(SPORT_TILE)}")`,
              backgroundRepeat: 'repeat',
              backgroundSize: '150px 150px',
            }}
          />

          {/* Header */}
          <div
            ref={headerRef}
            className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-2"
            style={{
              ...HEADER_BG,
              paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
              paddingBottom: '12px',
            }}
          >
            <BackButton onClick={onClose} label="" />

            {dialog.type === 'group' ? (
              <div className="w-9 h-9 rounded-full bg-(--color_primary_light)/20 flex items-center justify-center border border-(--color_primary_icon)/30 shrink-0">
                <UserGroupIcon className="w-5 h-5 text-(--color_primary_icon)" />
              </div>
            ) : (
              <div className="cursor-pointer shrink-0" onClick={handleProfileClick}>
                <UserAvatar photoUrl={dialog.avatarUrl} name={dialog.name} size={36} />
              </div>
            )}

            <div
              className="flex-1 min-w-0 ml-0.5"
              onClick={dialog.type !== 'group' ? handleProfileClick : undefined}
              style={dialog.type !== 'group' ? { cursor: 'pointer' } : undefined}
            >
              <div className="text-[15px] font-semibold text-white leading-tight truncate">
                {isTrainer && dialog.nickname ? dialog.nickname : dialog.name}
              </div>
              {isTrainer && dialog.nickname && (
                <div className="text-[12px] text-(--color_text_muted) leading-tight truncate">
                  {dialog.name}
                </div>
              )}
              {dialog.type === 'group' && dialog.memberCount != null && (
                <div className="text-[12px] text-(--color_text_muted) leading-tight">
                  {dialog.memberCount} участников
                </div>
              )}
            </div>

            {isTrainer && (
              <button
                onClick={handleCall}
                disabled={isConnecting}
                className="p-2 rounded-full hover:bg-white/10 active:bg-white/15 transition-colors shrink-0 mr-1 disabled:opacity-40"
              >
                <VideoCameraIcon className="w-5 h-5 text-white/70" />
              </button>
            )}
          </div>

          {/* Chat messages + input */}
          <div className="absolute inset-0 z-10">
            <ChatBox chatId={dialog.chatId} glass className="h-full" topPadding={headerHeight} />
          </div>

          {session && (
            <VideoCallRoom
              session={session}
              onDisconnected={(reason) => {
                if (reason === DisconnectReason.ROOM_DELETED) {
                  toast('Собеседник завершил звонок', { icon: '📵' })
                }
                endCall().catch(() => {})
                leaveCall()
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
