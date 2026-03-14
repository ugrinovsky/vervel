import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import FullScreenChat from '@/components/FullScreenChat/FullScreenChat';
import WorkoutInlineForm from '@/components/WorkoutInlineForm/WorkoutInlineForm';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { trainerApi, type AthleteListItem, type TrainerGroupItem } from '@/api/trainer';
import AthleteAvatarsRow from '@/components/AthleteAvatarsRow/AthleteAvatarsRow';
import InlineAthleteAvatar from '@/components/MiniAvatar/InlineAthleteAvatar';
import { PlusIcon, UsersIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton';
import BackButton from '@/components/BackButton/BackButton';

type Tab = 'members' | 'chat';

export default function TrainerGroupDetailScreen() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const id = Number(groupId);

  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [group, setGroup] = useState<TrainerGroupItem | null>(null);
  const [athletes, setAthletes] = useState<AthleteListItem[]>([]);
  const [allAthletes, setAllAthletes] = useState<AthleteListItem[]>([]);
  const [chatId, setChatId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddPicker, setShowAddPicker] = useState(false);

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

      <div className="p-4 w-full mx-auto">
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
                ? 'bg-(--color_primary_light) text-white'
                : 'bg-(--color_bg_card) text-(--color_text_muted) hover:text-white'
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            Участники
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
              activeTab === 'chat'
                ? 'bg-(--color_primary_light) text-white'
                : 'bg-(--color_bg_card) text-(--color_text_muted) hover:text-white'
            }`}
          >
            <ChatBubbleLeftIcon className="w-4 h-4" />
            Чат
          </button>
          <button
            onClick={() => setShowCreateSheet(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors bg-(--color_bg_card) text-(--color_text_muted) hover:text-white"
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
            className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border) mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Участники</h2>
              {availableAthletes.length > 0 && (
                <button
                  onClick={() => setShowAddPicker(!showAddPicker)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--color_primary_light) text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <PlusIcon className="w-4 h-4" />
                  Добавить
                </button>
              )}
            </div>

            {/* Add picker */}
            {showAddPicker && (
              <div className="mb-4 space-y-1">
                <p className="text-xs text-(--color_text_muted) mb-2">
                  Выберите атлета для добавления:
                </p>
                {availableAthletes.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleAddToGroup(a.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-(--color_bg_card_hover) hover:bg-(--color_border) transition-colors text-left"
                  >
                    <span className="text-sm text-white">{a.fullName || a.email}</span>
                    <span className="text-xs text-(--color_text_muted)">{a.email}</span>
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
              <p className="text-sm text-(--color_text_muted) text-center py-4">
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
                    <ConfirmDeleteButton
                      label="Убрать?"
                      onConfirm={() => handleRemoveFromGroup(athlete.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        <BottomSheet
          open={showCreateSheet}
          onClose={() => setShowCreateSheet(false)}
          emoji="🏋️"
          title="Создать тренировку"
        >
          <WorkoutInlineForm
            noCard
            preselectedAssignee={{ type: 'group', id, name: group?.name || 'Группа' }}
            onSuccess={() => setShowCreateSheet(false)}
            onCancel={() => setShowCreateSheet(false)}
          />
        </BottomSheet>
      </div>
    </Screen>
  );
}
