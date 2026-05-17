import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import AnimatedBlock from '@/components/ui/AnimatedBlock';
import SectionGroup from '@/components/ui/SectionGroup';
import AccentButton from '@/components/ui/AccentButton';
import Button, { MotionButton } from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ScreenLinks from '@/components/ScreenLinks/ScreenLinks';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import AddAthleteDrawer from '@/components/AddAthleteDrawer/AddAthleteDrawer';
import LeadDetailSheet from '@/components/trainer/LeadDetailSheet';
import { trainerApi, type TodayOverview, type TrainerLead, type UnreadCounts } from '@/api/trainer';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTrainerGettingStartedSteps,
  getTrainerQuickLinks,
  getTrainerTodayDashboardHint,
  getTrainerWorkStyleIntent,
} from '@/util/trainerOnboarding';
import { getCurrentHour } from '@/utils/date';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

function getGreeting(fullName: string | null | undefined) {
  const hour = getCurrentHour();
  const firstName = fullName?.trim().split(' ')[0] ?? null;
  const base = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
  return firstName ? `${base}, ${firstName}` : base;
}

function getTrainerSubtitle(todayCount: number, hasRestDayToday: boolean) {
  if (hasRestDayToday && todayCount === 0) {
    return 'Сегодня у вас выходной в календаре — отдыхайте.';
  }
  if (todayCount === 0) return 'Тренировок сегодня нет — можно выдохнуть.';
  if (todayCount === 1) return '1 тренировка запланирована на сегодня.';
  return `${todayCount} тренировки запланированы на сегодня.`;
}

function getTrainerTodayHeroEmoji(todayCount: number, hasRestDayToday: boolean) {
  if (hasRestDayToday && todayCount === 0) return '🛋️';
  const hour = getCurrentHour();
  if (hour < 12) return '☀️';
  if (hour < 18) return '🌤️';
  return '🌙';
}
import {
  ClockIcon,
  UserGroupIcon,
  UsersIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline';
import { WORKOUT_TYPE_CONFIG } from '@/constants/AnalyticsConstants';
import CopilotAthleteList from '@/components/trainer/CopilotAthleteList';

export default function TrainerTodayScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const flags = useFeatureFlags();
  const workStyle = user ? getTrainerWorkStyleIntent(user) : null;
  const [overview, setOverview] = useState<TodayOverview | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts | null>(null);
  const [leads, setLeads] = useState<TrainerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedLead, setSelectedLead] = useState<TrainerLead | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewRes, unreadRes, leadsRes] = await Promise.all([
        trainerApi.getTodayOverview(),
        trainerApi.getUnreadCounts(),
        trainerApi.listLeads(),
      ]);
      setOverview(overviewRes.data.data);
      setUnreadCounts(unreadRes.data.data);
      setLeads(leadsRes.data.data);
    } catch {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const todaySessionWorkouts = useMemo(
    () => overview?.todayWorkouts.filter((w) => w.workoutData.type !== 'rest_day') ?? [],
    [overview]
  );

  /** Выходной: флаг с API или запись rest_day в ответе (на случай рассинхрона счётчиков). */
  const hasRestDayToday = useMemo(() => {
    if (!overview) return false;
    if (overview.stats.hasRestDayToday === true) return true;
    return overview.todayWorkouts.some((w) => w.workoutData.type === 'rest_day');
  }, [overview]);

  const todaySessionCount = todaySessionWorkouts.length;

  const actionLeads = useMemo(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return leads
      .filter((lead) => {
        if (lead.crmStatus === 'converted' || lead.crmStatus === 'lost') return false;
        if (lead.crmStatus === 'new') return true;
        if (!lead.nextFollowUpAt) return false;
        return new Date(lead.nextFollowUpAt).getTime() <= endOfToday.getTime();
      })
      .slice(0, 3);
  }, [leads]);

  const showCrmBlock = !!overview && flags.trainerCrm;

  return (
    <Screen loading={loading} className="trainer-today-screen">
      <AddAthleteDrawer
        open={showAddClient}
        onClose={() => setShowAddClient(false)}
        onAdded={loadData}
        onLeadCreated={loadData}
      />
      <LeadDetailSheet
        lead={selectedLead}
        open={selectedLead !== null}
        onClose={() => setSelectedLead(null)}
        onUpdated={loadData}
      />
      <div className="p-4 w-full mx-auto">
        <ScreenHeader
          icon="☀️"
          title="Сегодня"
          description={
            flags.teams
              ? 'Что происходит сегодня — запланированные тренировки, непрочитанные сообщения и активность атлетов'
              : 'Что происходит сегодня — запланированные тренировки и быстрый доступ к календарю'
          }
        />

        <SectionGroup showLabel={false} showBreakAfter={false} bodyClassName="space-y-4">
          <AnimatedBlock className="card-shadow w-full rounded-2xl p-4 border border-(--color_primary_light)/30 bg-(--color_primary_light)/10">
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {overview
                  ? getTrainerTodayHeroEmoji(todaySessionCount, hasRestDayToday)
                  : getTrainerTodayHeroEmoji(0, false)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-(--color_text_primary)">
                  {getGreeting(user?.fullName)}
                </div>
                <div className="text-xs text-(--color_text_secondary) mt-0.5 min-h-4">
                  {overview ? getTrainerSubtitle(todaySessionCount, hasRestDayToday) : ''}
                </div>
              </div>
            </div>
          </AnimatedBlock>

          <ScreenHint>
            {workStyle ? (
              <span className="block mb-2">{getTrainerTodayDashboardHint(workStyle)}</span>
            ) : null}
            Дашборд тренера на текущий день.
            {flags.teams ? (
              <> Красные бейджи — непрочитанные сообщения от атлетов и групп. </>
            ) : null}
            <span className="text-white font-medium">Тренировки на сегодня</span> — все
            запланированные занятия; нажмите, чтобы перейти в Календарь.
            {flags.teams ? (
              <>
                {' '}
                В блоке <span className="text-white font-medium">Сводка</span> плитки ведут в
                календарь, список атлетов и список групп.
              </>
            ) : null}
          </ScreenHint>

          {/* Unread messages banners — только при включённых атлетах и группах */}
          {flags.teams && unreadCounts && (
            <div className="space-y-3">
              {(() => {
                const groupsWithUnread = unreadCounts.groups.filter((g) => g.unread > 0);
                const groupsTotal = groupsWithUnread.reduce((s, g) => s + g.unread, 0);
                if (groupsTotal === 0) return null;
                return (
                  <MotionButton
                    key="groups-unread"
                    type="button"
                    variant="unstyled"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => navigate('/trainer/groups')}
                    className="glass-row rounded-xl w-full flex items-center gap-3 p-4 text-left"
                  >
                    <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-(--color_primary_icon) shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">Группы</div>
                      <div className="text-xs text-(--color_text_muted)">
                        {groupsWithUnread.length}{' '}
                        {groupsWithUnread.length === 1 ? 'группа' : 'групп'} с непрочитанными
                      </div>
                    </div>
                    <Badge count={groupsTotal} size="md" />
                  </MotionButton>
                );
              })()}
              {(() => {
                const athletesWithUnread = unreadCounts.athletes.filter((a) => a.unread > 0);
                const athletesTotal = athletesWithUnread.reduce((s, a) => s + a.unread, 0);
                if (athletesTotal === 0) return null;
                return (
                  <MotionButton
                    key="athletes-unread"
                    type="button"
                    variant="unstyled"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    onClick={() => navigate('/trainer/athletes')}
                    className="glass-row rounded-xl w-full flex items-center gap-3 p-4 text-left"
                  >
                    <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-(--color_primary_icon) shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">Персоналки</div>
                      <div className="text-xs text-(--color_text_muted)">
                        {athletesWithUnread.length}{' '}
                        {athletesWithUnread.length === 1 ? 'атлет' : 'атлетов'} с непрочитанными
                      </div>
                    </div>
                    <Badge count={athletesTotal} size="md" />
                  </MotionButton>
                );
              })()}
            </div>
          )}

          {/* Getting started guide — показываем пока нет атлетов (счётчик с бэка; при выключенных командах — другой лид) */}
          {overview && overview.stats.athleteCount === 0 && (
            <AnimatedBlock className="rounded-2xl p-5 bg-(--color_bg_card) border border-amber-500/20">
              <h3 className="text-base font-semibold text-white mb-1">🚀 С чего начать</h3>
              <p className="text-xs text-(--color_text_muted) mb-4">
                {flags.teams
                  ? 'Запишите клиента или подключите атлета — дальше назначьте первую тренировку и не теряйте контакт из одного места'
                  : 'Календарь и шаблоны — без списка атлетов в приложении. Включите «Атлеты и группы» в настройках, когда понадобится ростер и чаты.'}
              </p>
              <AccentButton onClick={() => setShowAddClient(true)} className="mb-4">
                Добавить клиента
              </AccentButton>
              <div className="space-y-3">
                {getTrainerGettingStartedSteps(workStyle, {
                  templates: flags.trainerTemplates,
                  teams: flags.teams,
                }).map(({ step, title, desc, to, label }) => (
                  <div key={to} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-(--color_primary_light)/30 text-(--color_primary) flex items-center justify-center text-sm font-bold shrink-0">
                      {step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{title}</div>
                      <div className="text-xs text-(--color_text_muted) mt-0.5">{desc}</div>
                    </div>
                    <Button
                      variant="soft-muted"
                      size="sm"
                      onClick={() => navigate(to)}
                      className="shrink-0 text-xs"
                    >
                      {label}
                    </Button>
                  </div>
                ))}
              </div>
            </AnimatedBlock>
          )}
        </SectionGroup>

        {overview && (
          <>
            <SectionGroup title="Сводка">
              <AnimatedBlock
                className={`grid gap-3 ${flags.teams ? 'grid-cols-3' : 'grid-cols-1'}`}
              >
                <Button
                  type="button"
                  variant="unstyled"
                  fullWidth
                  aria-label="Открыть календарь тренера"
                  onClick={() => navigate('/trainer/calendar')}
                  className="glass-row rounded-xl p-4 text-center"
                >
                  <ClockIcon className="w-6 h-6 text-(--color_primary_icon) mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{todaySessionCount}</div>
                  <div className="text-xs text-(--color_text_muted) mt-1">Тренировок</div>
                </Button>
                {flags.teams ? (
                  <>
                    <Button
                      type="button"
                      variant="unstyled"
                      fullWidth
                      aria-label="Список атлетов"
                      onClick={() => navigate('/trainer/athletes')}
                      className="glass-row rounded-xl p-4 text-center"
                    >
                      <UsersIcon className="w-6 h-6 text-(--color_primary_icon) mx-auto mb-2" />
                      <div className="text-2xl font-bold text-white">
                        {overview.stats.athleteCount}
                      </div>
                      <div className="text-xs text-(--color_text_muted) mt-1">Атлетов</div>
                    </Button>
                    <Button
                      type="button"
                      variant="unstyled"
                      fullWidth
                      aria-label="Список групп"
                      onClick={() => navigate('/trainer/groups')}
                      className="glass-row rounded-xl p-4 text-center"
                    >
                      <UserGroupIcon className="w-6 h-6 text-(--color_primary_icon) mx-auto mb-2" />
                      <div className="text-2xl font-bold text-white">
                        {overview.stats.groupCount}
                      </div>
                      <div className="text-xs text-(--color_text_muted) mt-1">Групп</div>
                    </Button>
                  </>
                ) : null}
              </AnimatedBlock>
            </SectionGroup>

            <SectionGroup title="Тренировки на сегодня">
              <AnimatedBlock delay={0.1} className="glass rounded-2xl p-5">
                {todaySessionWorkouts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">{hasRestDayToday ? '🛋️' : '🎉'}</div>
                    <p className="text-sm text-(--color_text_muted)">
                      {hasRestDayToday
                        ? 'Выходной в календаре — других занятий на сегодня нет.'
                        : 'Сегодня нет запланированных тренировок'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todaySessionWorkouts.map((workout) => (
                      <Button
                        key={workout.id}
                        type="button"
                        variant="unstyled"
                        fullWidth
                        onClick={() => navigate('/trainer/calendar')}
                        className="text-left p-4 rounded-xl bg-(--color_bg_card_hover) border border-(--color_border) hover:border-(--color_primary_light)/40 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4 text-(--color_primary_icon)" />
                            <span className="text-sm font-medium text-white">
                              {formatTime(workout.scheduledDate)}
                            </span>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-(--color_primary_light) text-white">
                            {WORKOUT_TYPE_CONFIG[workout.workoutData.type] ??
                              workout.workoutData.type}
                          </span>
                        </div>

                        <div className="mb-2">
                          <div className="text-xs text-(--color_text_muted) mb-1">
                            Назначено для:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {workout.assignedTo.map((assigned) => (
                              <span
                                key={assigned.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(
                                    assigned.type === 'group'
                                      ? `/trainer/groups/${assigned.id}`
                                      : `/trainer/athletes/${assigned.id}`
                                  );
                                }}
                                className="text-xs px-2 py-1 rounded-lg bg-(--color_bg_card) text-white hover:bg-(--color_primary_light)/20 transition-colors cursor-pointer"
                              >
                                {assigned.type === 'group' ? '👥' : '🏃'} {assigned.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        {workout.workoutData.exercises &&
                          workout.workoutData.exercises.length > 0 && (
                            <div>
                              <div className="text-xs text-(--color_text_muted) mb-1">
                                Упражнения:
                              </div>
                              <div className="text-xs text-white">
                                {workout.workoutData.exercises.map((ex) => ex.name).join(', ')}
                              </div>
                            </div>
                          )}
                      </Button>
                    ))}
                  </div>
                )}
              </AnimatedBlock>
            </SectionGroup>
          </>
        )}

        {/* CRM action list: leads + athletes that need attention */}
        {showCrmBlock && (
          <SectionGroup title="Кого не потерять">
            <AnimatedBlock delay={0.15} className="glass rounded-2xl p-4 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-white">CRM: следующие действия</div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => navigate('/trainer/crm')}
                      className="shrink-0"
                    >
                      Все заявки
                    </Button>
                    <AccentButton
                      onClick={() => setShowAddClient(true)}
                      size="sm"
                      className="text-xs"
                    >
                      Добавить
                    </AccentButton>
                  </div>
                </div>
                <p className="text-xs text-(--color_text_muted)">
                  Записывайте заявки и ведите атлетов, которым нужен план или напоминание о
                  контакте.
                </p>
              </div>

              {actionLeads.length > 0 && (
                <div className="space-y-2">
                  {actionLeads.map((lead) => (
                    <Button
                      key={lead.id}
                      type="button"
                      variant="unstyled"
                      fullWidth
                      onClick={() => setSelectedLead(lead)}
                      className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-left hover:bg-amber-500/15 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">{lead.name}</div>
                          <div className="text-xs text-(--color_text_muted) truncate">
                            {lead.phone}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-1 text-[10px] font-semibold text-amber-200">
                          {lead.crmStatus === 'new' ? 'Новый' : 'Напомнить'}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}

              {flags.ai && flags.teams && overview.stats.athleteCount > 0 && (
                <CopilotAthleteList onAnyCommitted={loadData} />
              )}

              {actionLeads.length === 0 && (!flags.teams || overview.stats.athleteCount === 0) && (
                <div className="rounded-xl border border-dashed border-(--color_border) bg-(--color_bg_card_hover) p-4 text-center">
                  <div className="text-sm font-medium text-white">Пока нечего спасать</div>
                  <p className="mt-1 text-xs text-(--color_text_muted)">
                    Добавьте первого клиента: он появится здесь как заявка с напоминанием.
                  </p>
                </div>
              )}
            </AnimatedBlock>
          </SectionGroup>
        )}

        <SectionGroup title="Ещё" showBreakAfter={false}>
          <AnimatedBlock delay={0.2}>
            <ScreenLinks
              links={getTrainerQuickLinks(workStyle, {
                templates: flags.trainerTemplates,
                teams: flags.teams,
              })}
            />
          </AnimatedBlock>
        </SectionGroup>
      </div>
    </Screen>
  );
}
