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
import { PlusIcon, UsersIcon, ChatBubbleLeftIcon, TrophyIcon } from '@heroicons/react/24/outline';
import ConfirmDeleteWrapper from '@/components/ui/ConfirmDeleteWrapper';
import BackButton from '@/components/BackButton/BackButton';
import AccentButton from '@/components/ui/AccentButton';
import { cardClass } from '@/components/ui/Card';

type Tab = 'members' | 'chat';

type LeaderboardEntry = { id: number; fullName: string | null; workouts: number; volume: number; intensity: number };
type LeaderboardMetric = 'workouts' | 'volume' | 'intensity';

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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbPeriod, setLbPeriod] = useState<7 | 30>(7);
  const [lbMetric, setLbMetric] = useState<LeaderboardMetric>('workouts');
  const [lbLoading, setLbLoading] = useState(false);

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

  const openLeaderboard = async (period: 7 | 30 = lbPeriod) => {
    setShowLeaderboard(true);
    setLbLoading(true);
    try {
      const res = await trainerApi.getGroupLeaderboard(id, period);
      setLeaderboard(res.data.data);
    } catch {
      toast.error('Ошибка загрузки лидерборда');
    } finally {
      setLbLoading(false);
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
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors bg-(--color_bg_card) text-(--color_text_muted) hover:text-white shrink-0"
            title="Создать тренировку"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => openLeaderboard()}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors bg-(--color_bg_card) text-(--color_text_muted) hover:text-white shrink-0"
            title="Лидерборд"
          >
            <TrophyIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'members' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${cardClass} rounded-2xl p-5 mb-6`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Участники</h2>
              {availableAthletes.length > 0 && (
                <AccentButton size="sm" onClick={() => setShowAddPicker(!showAddPicker)}>
                  <PlusIcon className="w-4 h-4" />
                  Добавить
                </AccentButton>
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
              <div className="grid grid-cols-2 gap-2">
                {athletes.map((athlete) => (
                  <ConfirmDeleteWrapper
                    key={athlete.id}
                    onConfirm={() => handleRemoveFromGroup(athlete.id)}
                    overlayLayout="column"
                    trigger={<ConfirmDeleteWrapper.Trigger className="absolute top-2 right-2 z-[1]" />}
                    className="bg-(--color_bg_card_hover) hover:bg-(--color_border) transition-colors cursor-pointer"
                  >
                    <div
                      className="flex flex-col items-center gap-1.5 p-3"
                      onClick={() => navigate(`/trainer/athletes/${athlete.id}`)}
                    >
                      <InlineAthleteAvatar athleteId={athlete.id} size="md" />
                      <div className="text-center min-w-0 w-full">
                        <div className="text-xs font-medium text-white truncate">
                          {athlete.fullName || 'Без имени'}
                        </div>
                        <div className="text-[10px] text-(--color_text_muted) truncate">
                          {athlete.email}
                        </div>
                      </div>
                    </div>
                  </ConfirmDeleteWrapper>
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

        <BottomSheet
          open={showLeaderboard}
          onClose={() => setShowLeaderboard(false)}
          emoji="🏆"
          title="Лидерборд"
        >
          {/* Period toggle */}
          <div className="flex gap-2 mb-2">
            {([7, 30] as const).map((p) => (
              <button
                key={p}
                onClick={() => { setLbPeriod(p); openLeaderboard(p); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  lbPeriod === p
                    ? 'bg-(--color_primary_light) text-white'
                    : 'bg-(--color_bg_card_hover) text-(--color_text_muted)'
                }`}
              >
                {p === 7 ? 'Неделя' : 'Месяц'}
              </button>
            ))}
          </div>
          {/* Metric toggle */}
          <div className="flex gap-2 mb-4">
            {([
              { key: 'workouts', label: '🏋️ Тренировки', hint: 'кол-во' },
              { key: 'volume', label: '⚖️ Тоннаж', hint: 'кг поднято' },
              { key: 'intensity', label: '🔥 Баллы', hint: 'RPE × объём' },
            ] as { key: LeaderboardMetric; label: string; hint: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setLbMetric(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  lbMetric === key
                    ? 'bg-(--color_primary_light) text-white'
                    : 'bg-(--color_bg_card_hover) text-(--color_text_muted)'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {lbLoading ? (
            <div className="text-center py-8 text-(--color_text_muted) text-sm">Загрузка...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-(--color_text_muted) text-sm">Нет данных</div>
          ) : (
            <div className="space-y-2">
              {[...leaderboard]
                .sort((a, b) => b[lbMetric] - a[lbMetric])
                .map((entry, i) => {
                  const sorted = [...leaderboard].sort((a, b) => b[lbMetric] - a[lbMetric]);
                  const max = sorted[0]?.[lbMetric] || 1;
                  const value = entry[lbMetric];
                  const pct = max > 0 ? (value / max) * 100 : 0;
                  const medals = ['🥇', '🥈', '🥉'];
                  const medal = medals[i] || `${i + 1}.`;
                  const valueLabel =
                    lbMetric === 'workouts'
                      ? `${value} трен.`
                      : lbMetric === 'volume'
                        ? `${value.toLocaleString()} кг`
                        : `${Math.round(value)} б.`;

                  return (
                    <div
                      key={entry.id}
                      className="rounded-xl border p-3"
                      style={{ borderColor: 'var(--color_border)', backgroundColor: 'var(--color_bg_card)' }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg w-7 shrink-0">{medal}</span>
                        <span className="text-sm font-medium text-white flex-1 truncate">
                          {entry.fullName || 'Без имени'}
                        </span>
                        <span className="text-sm font-bold text-white">{valueLabel}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: 'var(--color_primary_light)' }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </BottomSheet>
      </div>
    </Screen>
  );
}
