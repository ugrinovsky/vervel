import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import Screen from '@/components/Screen/Screen'
import Tabs from '@/components/ui/Tabs'
import Badge from '@/components/ui/Badge'
import AccentButton from '@/components/ui/AccentButton'
import AppInput from '@/components/ui/AppInput'
import BottomSheet from '@/components/BottomSheet/BottomSheet'
import AddAthleteDrawer from '@/components/AddAthleteDrawer/AddAthleteDrawer'
import UserAvatar from '@/components/UserAvatar/UserAvatar'
import ConfirmDeleteWrapper from '@/components/ui/ConfirmDeleteWrapper'
import { trainerApi, type TrainerGroupItem, type AthleteListItem } from '@/api/trainer'
import { useTrainerUnreadCounts } from '@/hooks/useTrainerUnreadCounts'
import {
  PlusIcon,
  UserGroupIcon,
  UserPlusIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ViewColumnsIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'

type Tab = 'athletes' | 'groups'
type ViewMode = '2' | '3' | 'list'

export default function TrainerTeamScreen() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('athletes')
  const [loading, setLoading] = useState(true)
  const [athletes, setAthletes] = useState<AthleteListItem[]>([])
  const [groups, setGroups] = useState<TrainerGroupItem[]>([])
  const { data: unread } = useTrainerUnreadCounts(30_000)

  // Athletes tab state
  const [search, setSearch] = useState('')
  const [showAddAthlete, setShowAddAthlete] = useState(false)
  const [view, setView] = useState<ViewMode>(() => {
    const s = localStorage.getItem('athletes_view_mode')
    return s === '3' || s === 'list' ? (s as ViewMode) : '2'
  })

  const setViewMode = (v: ViewMode) => {
    setView(v)
    localStorage.setItem('athletes_view_mode', v)
  }

  // Groups tab state
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  const loadData = async () => {
    try {
      const [ar, gr] = await Promise.all([trainerApi.listAthletes(), trainerApi.listGroups()])
      setAthletes(ar.data.data)
      setGroups(gr.data.data)
    } catch {
      toast.error('Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filteredAthletes = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return athletes
    return athletes.filter(
      (a) =>
        (a.fullName ?? '').toLowerCase().includes(q) ||
        (a.email ?? '').toLowerCase().includes(q) ||
        (a.nickname ?? '').toLowerCase().includes(q)
    )
  }, [athletes, search])

  const handleRemoveAthlete = async (id: number) => {
    try {
      await trainerApi.removeAthlete(id)
      toast.success('Атлет отвязан')
      loadData()
    } catch {
      toast.error('Ошибка при отвязке атлета')
    }
  }

  const handleDeleteGroup = async (id: number) => {
    try {
      await trainerApi.deleteGroup(id)
      toast.success('Группа удалена')
      loadData()
    } catch {
      toast.error('Ошибка удаления группы')
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return
    try {
      await trainerApi.createGroup(newGroupName.trim())
      setNewGroupName('')
      setShowCreateGroup(false)
      toast.success('Группа создана')
      loadData()
    } catch {
      toast.error('Ошибка создания группы')
    }
  }

  const getAthleteUnread = (athleteId: number) =>
    unread?.athletes.find((a) => a.athleteId === athleteId)?.unread ?? 0

  const getGroupUnread = (groupId: number) =>
    unread?.groups.find((g) => g.groupId === groupId)?.unread ?? 0

  return (
    <Screen loading={loading} className="trainer-team-screen">
      <AddAthleteDrawer
        open={showAddAthlete}
        onClose={() => setShowAddAthlete(false)}
        onAdded={loadData}
      />
      <BottomSheet
        id="trainer-team-create-group"
        open={showCreateGroup}
        onClose={() => { setShowCreateGroup(false); setNewGroupName('') }}
        emoji="👥"
        title="Новая группа"
      >
        <div className="flex flex-col gap-3">
          <AppInput
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Название группы"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
          />
          <AccentButton onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
            Создать группу
          </AccentButton>
        </div>
      </BottomSheet>

      <div className="px-4 pt-4 pb-3">
        <motion.h1
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-3xl font-bold text-white mb-3 flex items-center gap-3"
        >
          <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-linear-to-br from-(--color_primary_light)/20 to-(--color_primary)/20 border border-(--color_border)">
            <span className="text-2xl">🏋️</span>
          </span>
          <span className="bg-linear-to-r from-white to-(--color_text_secondary) bg-clip-text text-transparent">Команда</span>
        </motion.h1>
        <Tabs
          tabs={[
            { id: 'athletes', label: 'Атлеты' },
            { id: 'groups', label: 'Группы' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      <AnimatePresence mode="wait">

        {/* ── Athletes ── */}
        {tab === 'athletes' && (
          <motion.div
            key="athletes"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center gap-2 px-4 pb-2">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--color_text_muted) pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск…"
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-(--color_bg_card) border border-(--color_border) text-white placeholder:text-(--color_text_muted) focus:outline-none focus:border-(--color_primary_light)/60"
                />
              </div>
              <Tabs
                size="sm"
                active={view}
                onChange={setViewMode}
                tabs={[
                  { id: '2', label: <Squares2X2Icon className="w-4 h-4" /> },
                  { id: '3', label: <ViewColumnsIcon className="w-4 h-4" /> },
                  { id: 'list', label: <Bars3Icon className="w-4 h-4" /> },
                ]}
              />
              <AccentButton size="sm" onClick={() => setShowAddAthlete(true)}>
                <UserPlusIcon className="w-4 h-4" />
                Добавить
              </AccentButton>
            </div>

            {filteredAthletes.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="text-3xl mb-2">🏃</div>
                <p className="text-sm text-white font-medium mb-1">
                  {athletes.length === 0 ? 'Пока нет атлетов' : 'Ничего не найдено'}
                </p>
                {athletes.length === 0 && (
                  <p className="text-xs text-(--color_text_muted)">
                    Пригласите атлета — он увидит ваш профиль и сможет писать в чат
                  </p>
                )}
              </div>
            ) : view === 'list' ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-2 px-4 pb-4"
                >
                  {filteredAthletes.map((athlete) => {
                    const athleteUnread = getAthleteUnread(athlete.id)
                    return (
                      <ConfirmDeleteWrapper
                        key={athlete.id}
                        onConfirm={() => handleRemoveAthlete(athlete.id)}
                        className="flex items-center gap-3 px-4 py-3 bg-(--color_bg_card) hover:bg-(--color_bg_card_hover) transition-colors"
                      >
                        <div
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigate(`/trainer/athletes/${athlete.id}`)}
                        >
                          <UserAvatar photoUrl={athlete.photoUrl} name={athlete.fullName} size={44} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white truncate leading-snug">
                              {athlete.nickname || athlete.fullName || 'Без имени'}
                            </div>
                            {athlete.nickname && (
                              <div className="text-[11px] text-(--color_text_muted) truncate leading-snug">
                                {athlete.fullName || ''}
                              </div>
                            )}
                            <div className="text-[11px] text-(--color_text_muted)/70 truncate leading-snug">
                              {athlete.status === 'pending' ? '⏳ Ожидает' : athlete.email}
                            </div>
                          </div>
                        </div>
                        {athleteUnread > 0 && <Badge count={athleteUnread} />}
                        <ConfirmDeleteWrapper.Trigger />
                      </ConfirmDeleteWrapper>
                    )
                  })}
                </motion.div>
              </AnimatePresence>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className={`grid gap-3 px-4 pb-4 ${view === '2' ? 'grid-cols-2' : 'grid-cols-3'}`}
                >
                  {filteredAthletes.map((athlete) => {
                    const athleteUnread = getAthleteUnread(athlete.id)
                    return (
                      <motion.div key={athlete.id} whileTap={{ scale: 0.97 }}>
                        <ConfirmDeleteWrapper
                          onConfirm={() => handleRemoveAthlete(athlete.id)}
                          rounded="rounded-2xl"
                          overlayLayout="column"
                          className="flex flex-col items-center gap-2 p-4 bg-(--color_bg_card) hover:bg-(--color_bg_card_hover) transition-colors"
                        >
                          {athleteUnread > 0 && (
                            <Badge count={athleteUnread} className="absolute top-2.5 right-2.5" />
                          )}
                          <ConfirmDeleteWrapper.Trigger className="absolute top-2.5 left-2.5" />
                          <div
                            className="cursor-pointer w-full flex flex-col items-center gap-2"
                            onClick={() => navigate(`/trainer/athletes/${athlete.id}`)}
                          >
                            <UserAvatar
                              photoUrl={athlete.photoUrl}
                              name={athlete.fullName}
                              size={view === '2' ? 68 : 52}
                            />
                            <div className="w-full text-center">
                              {athlete.nickname && (
                                <div className={`leading-tight truncate font-semibold text-white ${view === '2' ? 'text-sm' : 'text-xs'}`}>
                                  {athlete.nickname}
                                </div>
                              )}
                              <div className={`text-(--color_text_muted) truncate ${view === '2' ? 'text-xs' : 'text-[10px]'}`}>
                                {athlete.fullName || 'Без имени'}
                              </div>
                              {view === '2' && (
                                <div className="text-[10px] text-(--color_text_muted)/60 truncate">
                                  {athlete.status === 'pending' ? '⏳ Ожидает' : athlete.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </ConfirmDeleteWrapper>
                      </motion.div>
                    )
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        )}

        {/* ── Groups ── */}
        {tab === 'groups' && (
          <motion.div
            key="groups"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center justify-between px-4 pb-2">
              <span className="text-sm text-(--color_text_muted)">{groups.length} групп</span>
              <AccentButton size="sm" onClick={() => setShowCreateGroup(true)}>
                <PlusIcon className="w-4 h-4" />
                Создать
              </AccentButton>
            </div>

            {groups.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="text-3xl mb-2">👥</div>
                <p className="text-sm text-white font-medium mb-1">Пока нет групп</p>
                <p className="text-xs text-(--color_text_muted)">
                  Создайте группу и добавьте атлетов — они получат расписание и доступ к чату
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 px-4 pb-4">
              {groups.map((group) => {
                const groupUnread = getGroupUnread(group.id)
                return (
                  <ConfirmDeleteWrapper
                    key={group.id}
                    onConfirm={() => handleDeleteGroup(group.id)}
                    className="flex items-center gap-3 px-4 py-3 bg-(--color_bg_card) hover:bg-(--color_bg_card_hover) transition-colors"
                  >
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/trainer/groups/${group.id}`)}
                    >
                      <div className="w-11 h-11 rounded-full bg-(--color_primary_light)/20 flex items-center justify-center border border-(--color_primary_icon)/30 shrink-0">
                        <UserGroupIcon className="w-5 h-5 text-(--color_primary_icon)" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate leading-snug">
                          {group.name}
                        </div>
                        <div className="text-[11px] text-(--color_text_muted) leading-snug">
                          {group.athleteCount} атлетов
                        </div>
                      </div>
                    </div>
                    {groupUnread > 0 && <Badge count={groupUnread} />}
                    <ConfirmDeleteWrapper.Trigger />
                  </ConfirmDeleteWrapper>
                )
              })}
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </Screen>
  )
}
