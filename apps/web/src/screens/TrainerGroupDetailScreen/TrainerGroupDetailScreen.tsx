import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import FullScreenChat from '@/components/FullScreenChat/FullScreenChat';
import WorkoutInlineForm from '@/components/WorkoutInlineForm/WorkoutInlineForm';
import { trainerApi, type AthleteListItem, type TrainerGroupItem } from '@/api/trainer';
import AthleteAvatarsRow from '@/components/AthleteAvatarsRow/AthleteAvatarsRow';
import InlineAthleteAvatar from '@/components/MiniAvatar/InlineAthleteAvatar';
import { TrashIcon, PlusIcon, UsersIcon, ChatBubbleLeftIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import BackButton from '@/components/BackButton/BackButton';

type Tab = 'members' | 'chat' | 'create';

export default function TrainerGroupDetailScreen() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const id = Number(groupId);

  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [group, setGroup] = useState<TrainerGroupItem | null>(null);
  const [athletes, setAthletes] = useState<AthleteListItem[]>([]);
  const [allAthletes, setAllAthletes] = useState<AthleteListItem[]>([]);
  const [chatId, setChatId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsRes, groupAthletesRes, allAthletesRes, chatRes] = await Promise.all([
        trainerApi.listGroups(),
        trainerApi.getGroupAthletes(id),
        trainerApi.listAthletes(),
        trainerApi.getOrCreateGroupChat(id),
      ]);
      const foundGroup = groupsRes.data.data.find((g) => g.id === id);
      setGroup(foundGroup || null);
      setAthletes(groupAthletesRes.data.data);
      setAllAthletes(allAthletesRes.data.data);
      setChatId(chatRes.data.data.chatId);
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAddToGroup = async (athleteId: number) => {
    try {
      await trainerApi.addAthleteToGroup(id, athleteId);
      toast.success('Атлет добавлен в группу');
      setShowAddPicker(false);
      loadData();
    } catch {
      toast.error('Ошибка добавления');
    }
  };

  const handleRemoveFromGroup = async (athleteId: number) => {
    try {
      await trainerApi.removeAthleteFromGroup(id, athleteId);
      setConfirmRemoveId(null);
      toast.success('Атлет убран из группы');
      loadData();
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const athleteIdsInGroup = new Set(athletes.map((a) => a.id));
  const availableAthletes = allAthletes.filter((a) => !athleteIdsInGroup.has(a.id));

  return (
    <Screen loading={loading} className="trainer-group-detail-screen">
      <FullScreenChat
        open={activeTab === 'chat'}
        chatId={chatId}
        title={`Чат: ${group?.name || 'Группа'}`}
        onClose={() => setActiveTab('members')}
      />

      <div className="p-4 w-full max-w-2xl mx-auto">
        <BackButton onClick={() => navigate('/trainer/groups')} />

        <ScreenHeader
          icon="👥"
          title={group?.name || 'Группа'}
          description={`${athletes.length} атлетов`}
        />

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
              activeTab === 'members'
                ? 'bg-[var(--color_primary_light)] text-white'
                : 'bg-[var(--color_bg_card)] text-[var(--color_text_muted)] hover:text-white'
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            Участники
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
              activeTab === 'chat'
                ? 'bg-[var(--color_primary_light)] text-white'
                : 'bg-[var(--color_bg_card)] text-[var(--color_text_muted)] hover:text-white'
            }`}
          >
            <ChatBubbleLeftIcon className="w-4 h-4" />
            Чат
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
              activeTab === 'create'
                ? 'bg-[var(--color_primary_light)] text-white'
                : 'bg-[var(--color_bg_card)] text-[var(--color_text_muted)] hover:text-white'
            }`}
          >
            <PlusIcon className="w-4 h-4" />
            Создать
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'members' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--color_bg_card)] rounded-2xl p-5 border border-[var(--color_border)] mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Участники</h2>
              {availableAthletes.length > 0 && (
                <button
                  onClick={() => setShowAddPicker(!showAddPicker)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color_primary_light)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <PlusIcon className="w-4 h-4" />
                  Добавить
                </button>
              )}
            </div>

            {/* Add picker */}
            {showAddPicker && (
              <div className="mb-4 space-y-1">
                <p className="text-xs text-[var(--color_text_muted)] mb-2">
                  Выберите атлета для добавления:
                </p>
                {availableAthletes.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleAddToGroup(a.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[var(--color_bg_card_hover)] hover:bg-[var(--color_border)] transition-colors text-left"
                  >
                    <span className="text-sm text-white">
                      {a.fullName || a.email}
                    </span>
                    <span className="text-xs text-[var(--color_text_muted)]">{a.email}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Мини-аватары нагрузки */}
            {athletes.length > 0 && (
              <div className="mb-4 p-3 bg-(--color_bg_card_hover) rounded-xl">
                <p className="text-[10px] text-(--color_text_muted) mb-2 uppercase tracking-wider">
                  Нагрузка зон мышц
                </p>
                <AthleteAvatarsRow athletes={athletes} />
              </div>
            )}

            {athletes.length === 0 ? (
              <p className="text-sm text-[var(--color_text_muted)] text-center py-4">
                В группе пока нет атлетов
              </p>
            ) : (
              <div className="space-y-2">
                {athletes.map((athlete) => (
                  <div
                    key={athlete.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-(--color_bg_card_hover) hover:bg-(--color_border) transition-colors cursor-pointer"
                    onClick={() => navigate(`/trainer/athletes/${athlete.id}`)}
                  >
                    <InlineAthleteAvatar athleteId={athlete.id} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-white truncate">
                        {athlete.fullName || 'Без имени'}
                      </div>
                      <div className="text-xs text-(--color_text_muted) truncate">
                        {athlete.email}
                      </div>
                    </div>
                    {confirmRemoveId === athlete.id ? (
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-xs text-red-400 mr-1">Убрать?</span>
                        <button
                          onClick={() => handleRemoveFromGroup(athlete.id)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          title="Да"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmRemoveId(null)}
                          className="p-1 text-[var(--color_text_muted)] hover:text-white transition-colors"
                          title="Отмена"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmRemoveId(athlete.id);
                        }}
                        className="text-[var(--color_text_muted)] hover:text-red-400 transition-colors p-1"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}


        {activeTab === 'create' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <WorkoutInlineForm
              preselectedAssignee={{
                type: 'group',
                id: id,
                name: group?.name || 'Группа',
              }}
              onSuccess={() => setActiveTab('members')}
              onCancel={() => setActiveTab('members')}
            />
          </motion.div>
        )}
      </div>
    </Screen>
  );
}
