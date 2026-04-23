import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import AiChat from '@/components/AiChat/AiChat'
import ChatScreen from '@/components/ChatScreen/ChatScreen'
import Screen from '@/components/Screen/Screen'
import Badge from '@/components/ui/Badge'
import Tabs from '@/components/ui/Tabs'
import UserAvatar from '@/components/UserAvatar/UserAvatar'
import { type DialogItem } from '@/api/chat'
import { useActiveMode } from '@/contexts/AuthContext'
import { useDialogs } from '@/hooks/useDialogs'
import { SparklesIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { parseWorkoutPreview } from '@/components/ChatBox/WorkoutPreviewCard'
import { isKlipyMessageContent } from '@/util/klipyMessage'
import { formatDialogTime } from '@/utils/date'
import SearchInput from '@/components/ui/SearchInput'

type DialogTab = 'all' | 'personal' | 'group'

function DialogRow({ dialog, onOpen }: { dialog: DialogItem; onOpen: () => void }) {
  const rawContent = dialog.lastMessage?.content ?? ''
  const isWorkout = !!parseWorkoutPreview(rawContent)
  const isGif = isKlipyMessageContent(rawContent)
  const preview = dialog.lastMessage
    ? (dialog.lastMessage.isOwnMessage ? 'Вы: ' : '') +
      (isWorkout ? '🏋️ Тренировка' : isGif ? '🎬 GIF' : rawContent)
    : 'Нет сообщений'
  const displayName = dialog.nickname || dialog.name

  return (
    <div
      onClick={onOpen}
      className="flex items-center gap-3 px-4 cursor-pointer hover:bg-(--color_bg_card_hover) active:bg-(--color_bg_card_hover) transition-colors"
    >
      <div className="shrink-0 py-3">
        {dialog.type === 'group' ? (
          <div className="w-12.5 h-12.5 rounded-full bg-(--color_primary_light)/20 flex items-center justify-center border border-(--color_primary_icon)/30">
            <UserGroupIcon className="w-6 h-6 text-(--color_primary_icon)" />
          </div>
        ) : (
          <UserAvatar photoUrl={dialog.avatarUrl} name={displayName} size={50} />
        )}
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-2 py-3 border-b border-(--color_border)/50">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[15px] font-semibold text-white truncate leading-snug">
              {displayName}
            </span>
            {dialog.lastMessage && (
              <span className="text-[11px] text-(--color_text_muted) shrink-0">
                {formatDialogTime(dialog.lastMessage.sentAt)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-[13px] text-(--color_text_muted) truncate leading-snug">
              {preview}
            </span>
            {dialog.unreadCount > 0 && (
              <Badge count={dialog.unreadCount} size="sm" className="shrink-0 bg-emerald-500!" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DialogsScreen() {
  const { isTrainer } = useActiveMode()
  const { data: dialogs, refresh } = useDialogs(30_000)
  const [loading, setLoading] = useState(!dialogs)
  const [activeDialog, setActiveDialog] = useState<DialogItem | null>(null)
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<DialogTab>('all')

  const filteredDialogs = dialogs?.filter((d) => {
    const searchLower = search.toLowerCase()
    const matchesSearch = (d.nickname || d.name).toLowerCase().includes(searchLower)
    if (!matchesSearch) return false
    if (activeTab === 'personal') return d.type === 'personal'
    if (activeTab === 'group') return d.type === 'group'
    return true
  })

  useEffect(() => {
    if (dialogs !== null) setLoading(false)
  }, [dialogs])

  useEffect(() => {
    if (!dialogs) refresh().finally(() => setLoading(false))
  }, [])

  // Restore active chat after page refresh
  useEffect(() => {
    if (!dialogs || activeDialog) return
    const savedId = sessionStorage.getItem('activeChatId')
    if (!savedId) return
    const found = dialogs.find((d) => d.chatId === Number(savedId))
    if (found) setActiveDialog(found)
  }, [dialogs])

  const openChat = (dialog: DialogItem) => {
    setActiveDialog(dialog)
    sessionStorage.setItem('activeChatId', String(dialog.chatId))
  }

  const closeChat = () => {
    setActiveDialog(null)
    sessionStorage.removeItem('activeChatId')
  }

  const SPRING = { type: 'spring', damping: 28, stiffness: 260 } as const

  return (
    <Screen
      loading={loading}
      className="dialogs-screen overflow-hidden"
      enablePullToRefresh={!activeDialog}
    >
      <ChatScreen
        open={!!activeDialog}
        dialog={activeDialog}
        onClose={closeChat}
      />
      <AiChat open={aiChatOpen} onClose={() => setAiChatOpen(false)} />

      <motion.h1
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-3xl font-bold text-white px-4 pt-4 mb-2 flex items-center gap-3"
      >
        <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-linear-to-br from-(--color_primary_light)/20 to-(--color_primary)/20 border border-(--color_border)">
          <span className="text-2xl">💬</span>
        </span>
        <span className="bg-linear-to-r from-white to-(--color_text_secondary) bg-clip-text text-transparent">Сообщения</span>
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="sticky top-0 z-10 bg-(--color_bg)"
      >
        <div className="px-4 pt-2 pb-1">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск"
          />
        </div>
        <Tabs
          variant="underline"
          tabs={[
            { id: 'all', label: 'Все' },
            { id: 'personal', label: 'Личные' },
            { id: 'group', label: 'Группы' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
          className="px-4"
        />
      </motion.div>

      <motion.div
        animate={{ x: activeDialog ? '-22%' : '0%', opacity: activeDialog ? 0.4 : 1 }}
        transition={SPRING}
        className="will-change-transform"
      >
        {/* AI assistant — only on "all" tab */}
        {activeTab === 'all' &&
        <div
          onClick={() => setAiChatOpen(true)}
          className="flex items-center gap-3 px-4 cursor-pointer hover:bg-(--color_bg_card_hover) active:bg-(--color_bg_card_hover) transition-colors"
        >
          <div className="shrink-0 py-3">
            <div className="w-12.5 h-12.5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <SparklesIcon className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0 flex items-center py-3 border-b border-(--color_border)/50">
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold text-white leading-snug">ИИ-помощник</div>
              <div className="text-[13px] text-(--color_text_muted) leading-snug mt-0.5">
                Тренировки, питание, восстановление
              </div>
            </div>
          </div>
        </div>}

        {filteredDialogs && filteredDialogs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mt-4 bg-(--color_bg_card) rounded-2xl p-10 border border-(--color_border) text-center"
          >
            <div className="text-4xl mb-3">{search ? '🔍' : isTrainer ? '🏋️' : '🤝'}</div>
            <p className="text-white font-medium mb-1">
              {search
                ? 'Ничего не найдено'
                : isTrainer
                  ? 'Нет активных чатов'
                  : 'Пока нет тренера или группы'}
            </p>
            {!search && (
              <p className="text-sm text-(--color_text_muted)">
                {isTrainer
                  ? 'Пригласите атлета или создайте группу'
                  : 'Попросите тренера добавить вас или вступите в группу'}
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            {filteredDialogs?.map((dialog) => (
              <DialogRow key={dialog.chatId} dialog={dialog} onOpen={() => openChat(dialog)} />
            ))}
          </motion.div>
        )}
      </motion.div>
    </Screen>
  )
}
