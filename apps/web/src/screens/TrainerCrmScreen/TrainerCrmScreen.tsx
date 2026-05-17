import { useState, useEffect, useMemo } from 'react';
import { now, today, parseLocalDate, parseApiDateTime } from '../../utils/date';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  CartesianGrid,
} from 'recharts';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import SectionGroup from '@/components/ui/SectionGroup';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import ScreenLinks from '@/components/ScreenLinks/ScreenLinks';
import Tabs from '@/components/ui/Tabs';
import ChipScrollRow from '@/components/ui/ChipScrollRow';
import ChipCountBadge from '@/components/ui/ChipCountBadge';
import {
  LEAD_CHIP_ALL_ACTIVE,
  LEAD_CHIP_ALL_INACTIVE,
  type LeadChipToneKey,
} from '@/components/ui/leadChipStyles';
import { MotionButton } from '@/components/ui/Button';
import AddAthleteDrawer from '@/components/AddAthleteDrawer/AddAthleteDrawer';
import LeadDetailSheet from '@/components/trainer/LeadDetailSheet';
import {
  trainerApi,
  type TrainerLead,
  type LeadCrmStatus,
  type AthleteListItem,
  type AthletePassSummary,
} from '@/api/trainer';
import {
  PlusIcon,
  PhoneIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { computeGrowthData, formatFollowUp, countLeadsByCrmStatus } from './crmUtils';
import PassesTab from './PassesTab';
import GhostButton from '@/components/ui/GhostButton';
import SearchInput from '@/components/ui/SearchInput';
import PillButton from '@/components/ui/PillButton';

// ─── Leads pipeline ──────────────────────────────────────────────────────────

const LEAD_STATUS_CONFIG: Record<
  LeadCrmStatus,
  {
    label: string;
    badgeClass: string;
    filterActiveClass: string;
    color: string;
  }
> = {
  new: {
    label: 'Новый',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    filterActiveClass: 'bg-amber-500/20 border-amber-400/40 text-amber-200',
    color: '#f59e0b',
  },
  contacted: {
    label: 'Связался',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    filterActiveClass: 'bg-blue-500/20 border-blue-400/40 text-blue-200',
    color: '#3b82f6',
  },
  trial: {
    label: 'Пробное',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    filterActiveClass: 'bg-purple-500/20 border-purple-400/40 text-purple-200',
    color: '#a855f7',
  },
  converted: {
    label: 'Клиент',
    badgeClass: 'bg-green-500/20 text-green-300 border-green-500/30',
    filterActiveClass: 'bg-green-500/20 border-green-400/40 text-green-200',
    color: '#22c55e',
  },
  lost: {
    label: 'Потерян',
    badgeClass: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    filterActiveClass: 'bg-gray-500/20 border-gray-400/40 text-gray-300',
    color: '#6b7280',
  },
};

const ATHLETE_CRM_CONFIG = {
  active: {
    label: 'Активен',
    hint: 'Тренируется регулярно',
    dot: 'bg-green-400',
    bar: 'bg-green-400',
    card: 'border-green-500/20 bg-green-500/10',
    text: 'text-green-300',
  },
  sleeping: {
    label: 'Неактивен',
    hint: 'Давно не появлялся',
    dot: 'bg-amber-400',
    bar: 'bg-amber-400',
    card: 'border-amber-500/20 bg-amber-500/10',
    text: 'text-amber-300',
  },
  paused: {
    label: 'Пауза',
    hint: 'Временно приостановил',
    dot: 'bg-blue-400',
    bar: 'bg-blue-400',
    card: 'border-blue-500/20 bg-blue-500/10',
    text: 'text-blue-300',
  },
  churned: {
    label: 'Ушёл',
    hint: 'Прекратил тренировки',
    dot: 'bg-gray-500',
    bar: 'bg-gray-500',
    card: 'border-gray-500/20 bg-gray-500/10',
    text: 'text-gray-400',
  },
};

type MainTab = 'leads' | 'passes' | 'analytics';
const MAIN_TABS: MainTab[] = ['leads', 'passes', 'analytics'];
const isMainTab = (s: string | null): s is MainTab =>
  s !== null && (MAIN_TABS as string[]).includes(s);

type LeadFilter = 'all' | LeadCrmStatus;
const LEAD_FILTERS: LeadFilter[] = ['all', 'new', 'contacted', 'trial', 'converted', 'lost'];
const isLeadFilter = (key: string): key is LeadFilter => (LEAD_FILTERS as string[]).includes(key);

const SOURCE_LABELS: Record<string, string> = {
  referral: 'Сарафан',
  instagram: 'Instagram',
  gym: 'Зал',
  other: 'Другое',
  manual: 'Вручную',
};

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs text-white shadow-lg">
      {payload[0].value} чел.
    </div>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function TrainerCrmScreen() {
  const [tab, setTab] = useState<MainTab>(() => {
    const s = localStorage.getItem('crm_tab');
    return isMainTab(s) ? s : 'leads';
  });

  const [lastLoadedAt, setLastLoadedAt] = useState(0);

  const handleTabChange = (next: MainTab) => {
    localStorage.setItem('crm_tab', next);
    setTab(next);
    if (now().getTime() - lastLoadedAt > 60_000) loadData();
  };
  const [leads, setLeads] = useState<TrainerLead[]>([]);
  const [athletes, setAthletes] = useState<AthleteListItem[]>([]);
  const [passSummaries, setPassSummaries] = useState<AthletePassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LeadFilter>('all');
  const [sort, setSort] = useState<'created_desc' | 'followup_asc' | 'name_asc'>('created_desc');
  const [search, setSearch] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedLead, setSelectedLead] = useState<TrainerLead | null>(null);

  const loadData = async () => {
    try {
      const [leadsRes, athletesRes, passesRes] = await Promise.all([
        trainerApi.listLeads(),
        trainerApi.listAthletes(),
        trainerApi.listAllPasses(),
      ]);
      const freshLeads = leadsRes.data.data;
      setLeads(freshLeads);
      setAthletes(athletesRes.data.data);
      setPassSummaries(passesRes.data.data);
      setLastLoadedAt(now().getTime());
      return freshLeads;
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── Leads computed ──────────────────────────────────────────────────────────

  const leadCounts = useMemo(() => {
    const endOfToday = today();
    endOfToday.setHours(23, 59, 59, 999);
    const byStatus = countLeadsByCrmStatus(leads);
    return {
      total: leads.length,
      active: leads.filter((l) => l.crmStatus !== 'converted' && l.crmStatus !== 'lost').length,
      followUpToday: leads.filter(
        (l) => l.nextFollowUpAt && parseApiDateTime(l.nextFollowUpAt) <= endOfToday
      ).length,
      byStatus,
    };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    let arr = filter === 'all' ? leads : leads.filter((l) => l.crmStatus === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((l) => l.name.toLowerCase().includes(q) || l.phone.includes(q));
    }
    const sorted = [...arr];
    if (sort === 'created_desc') {
      sorted.sort(
        (a, b) => parseApiDateTime(b.createdAt).getTime() - parseApiDateTime(a.createdAt).getTime()
      );
    } else if (sort === 'name_asc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    } else if (sort === 'followup_asc') {
      sorted.sort((a, b) => {
        if (!a.nextFollowUpAt) return 1;
        if (!b.nextFollowUpAt) return -1;
        return (
          parseApiDateTime(a.nextFollowUpAt).getTime() -
          parseApiDateTime(b.nextFollowUpAt).getTime()
        );
      });
    }
    return sorted;
  }, [leads, filter, search, sort]);

  const filterOptions = useMemo(
    (): { id: LeadFilter; label: string; count: number }[] => [
      { id: 'all', label: 'Все', count: leadCounts.total },
      { id: 'new', label: 'Новые', count: leadCounts.byStatus.new },
      { id: 'contacted', label: 'Связались', count: leadCounts.byStatus.contacted },
      { id: 'trial', label: 'Пробное', count: leadCounts.byStatus.trial },
      { id: 'converted', label: 'Клиенты', count: leadCounts.byStatus.converted },
      { id: 'lost', label: 'Потеряны', count: leadCounts.byStatus.lost },
    ],
    [leadCounts],
  );

  const leadFilterChips = useMemo(
    () =>
      filterOptions.map((f) => ({
        key: f.id,
        tone: f.id !== 'all' ? (f.id as LeadChipToneKey) : undefined,
        inactiveClass: f.id === 'all' ? LEAD_CHIP_ALL_INACTIVE : undefined,
        activeClass: f.id === 'all' ? LEAD_CHIP_ALL_ACTIVE : undefined,
        label: (
          <>
            {f.label}
            {f.count > 0 && <ChipCountBadge>{f.count}</ChipCountBadge>}
          </>
        ),
      })),
    [filterOptions],
  );

  // ── Analytics computed ──────────────────────────────────────────────────────

  const funnelData = useMemo(
    (): { label: string; count: number; status: LeadCrmStatus }[] => [
      { label: 'Новые', count: leadCounts.byStatus.new, status: 'new' },
      { label: 'Связались', count: leadCounts.byStatus.contacted, status: 'contacted' },
      { label: 'Пробное', count: leadCounts.byStatus.trial, status: 'trial' },
      { label: 'Клиенты', count: leadCounts.byStatus.converted, status: 'converted' },
    ],
    [leadCounts]
  );

  const conversionRate = useMemo(() => {
    const closed = leadCounts.byStatus.converted + leadCounts.byStatus.lost;
    if (closed === 0) return null;
    return Math.round((leadCounts.byStatus.converted / closed) * 100);
  }, [leadCounts]);

  const growthData = useMemo(() => computeGrowthData(leads), [leads]);

  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      const src = l.source;
      if (!src || src === 'manual') return;
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([src, count]) => ({ label: SOURCE_LABELS[src] ?? src, count }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const athleteCrmData = useMemo(() => {
    const active = athletes.filter((a) => a.status === 'active');
    return {
      active: active.filter((a) => !a.crmStatus || a.crmStatus === 'active').length,
      sleeping: active.filter((a) => a.crmStatus === 'sleeping').length,
      paused: active.filter((a) => a.crmStatus === 'paused').length,
      churned: active.filter((a) => a.crmStatus === 'churned').length,
    };
  }, [athletes]);

  const passAnalytics = useMemo(() => {
    const active = passSummaries.filter((s) => s.activePass?.status === 'active');
    const activePortfolioValue = active.reduce(
      (sum, s) => sum + Number(s.activePass!.priceAmount),
      0
    );
    const expiringSoon = passSummaries.filter((s) => {
      const p = s.activePass;
      if (!p || p.status !== 'active') return false;
      if (p.sessionsLeft <= 2) return true;
      if (p.validUntil) {
        const days = Math.ceil(
          (parseLocalDate(p.validUntil).getTime() - now().getTime()) / (1000 * 60 * 60 * 24)
        );
        if (days <= 7) return true;
      }
      return false;
    }).length;
    const noPass = passSummaries.filter((s) => !s.activePass).length;
    return { activePortfolioValue, expiringSoon, noPass, activeCount: active.length };
  }, [passSummaries]);

  return (
    <Screen loading={loading} className="trainer-crm-screen">
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
        onUpdated={async () => {
          const fresh = await loadData();
          if (fresh && selectedLead) {
            setSelectedLead(fresh.find((l) => l.id === selectedLead.id) ?? null);
          }
        }}
      />

      <div className="p-4 w-full mx-auto space-y-4">
        <SectionGroup showLabel={false} showBreakAfter={false} bodyClassName="space-y-4">
          <ScreenHeader icon="🗂️" title="CRM" description="Заявки и аналитика клиентской базы" />

          <Tabs
            tabs={[
              { id: 'leads', label: 'Заявки' },
              { id: 'passes', label: 'Абонементы' },
              { id: 'analytics', label: 'Аналитика' },
            ]}
            active={tab}
            onChange={handleTabChange}
          />
        </SectionGroup>

        <AnimatePresence mode="wait">
          {/* ── LEADS TAB ─────────────────────────────────────────────────── */}
          {tab === 'leads' && (
            <motion.div
              key="leads"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <ScreenHint>
                Потенциальный клиент, который ещё не стал атлетом. Ведите статусы и ставьте{' '}
                <strong className="text-white">напоминания</strong> — нужные заявки подсветятся в
                сводке в нужный день.
              </ScreenHint>

              <SectionGroup title="Сводка" showBreakAfter>
                <div className="grid grid-cols-3 gap-3">
                  <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
                    <div className="text-xl font-bold text-white">{leadCounts.total}</div>
                    <div className="text-[11px] text-(--color_text_muted) text-center">Всего</div>
                  </div>
                  <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
                    <div className="text-xl font-bold text-amber-300">{leadCounts.active}</div>
                    <div className="text-[11px] text-(--color_text_muted) text-center">
                      В работе
                    </div>
                  </div>
                  <div
                    className={`rounded-xl p-3 border flex flex-col items-center gap-1 ${
                      leadCounts.followUpToday > 0
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-(--color_bg_card) border-(--color_border)'
                    }`}
                  >
                    <div
                      className={`text-xl font-bold ${leadCounts.followUpToday > 0 ? 'text-red-300' : 'text-white'}`}
                    >
                      {leadCounts.followUpToday}
                    </div>
                    <div className="text-[11px] text-(--color_text_muted) text-center">
                      Напомнить
                    </div>
                  </div>
                </div>
              </SectionGroup>

              <SectionGroup
                title="Заявки"
                showBreakAfter={false}
                bodyClassName="space-y-3"
                action={
                  <GhostButton
                    variant="outline-accent"
                    onClick={() => setShowAddClient(true)}
                    className="text-xs py-1 px-2"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Добавить
                  </GhostButton>
                }
              >
                <ChipScrollRow
                  colored
                  edgeFade
                  activeKey={filter}
                  onChipClick={(key) => {
                    if (isLeadFilter(key)) setFilter(key);
                  }}
                  chips={leadFilterChips}
                />

                {leads.length > 3 && (
                  <div className="flex items-center gap-2">
                    <SearchInput
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Имя или телефон..."
                      dense
                      clearable={false}
                      className="flex-1 bg-(--color_bg_card)"
                    />
                    <div className="flex gap-1 shrink-0">
                      {(
                        [
                          { id: 'created_desc', label: 'Новые' },
                          { id: 'followup_asc', label: 'По дате' },
                          { id: 'name_asc', label: 'А–Я' },
                        ] as { id: typeof sort; label: string }[]
                      ).map((s) => (
                        <PillButton
                          key={s.id}
                          variant="tab"
                          active={sort === s.id}
                          onClick={() => setSort(s.id)}
                          className="px-2 py-1.5 rounded-lg text-xs"
                        >
                          {s.label}
                        </PillButton>
                      ))}
                    </div>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {filteredLeads.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="rounded-2xl border border-dashed border-(--color_border) bg-(--color_bg_card) p-8 text-center"
                    >
                      <div className="text-3xl mb-2">📭</div>
                      <div className="text-sm font-medium text-white mb-1">
                        {filter === 'all'
                          ? 'Пока нет заявок'
                          : `Нет в статусе «${filterOptions.find((f) => f.id === filter)?.label}»`}
                      </div>
                      <p className="text-xs text-(--color_text_muted)">
                        {filter === 'all'
                          ? 'Запишите первого клиента'
                          : 'Измените фильтр или добавьте нового'}
                      </p>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {filteredLeads.map((lead) => {
                        const cfg = LEAD_STATUS_CONFIG[lead.crmStatus];
                        const hasFollowUp = !!lead.nextFollowUpAt;
                        const followUpText = hasFollowUp
                          ? formatFollowUp(lead.nextFollowUpAt!)
                          : null;
                        const isOverdue =
                          hasFollowUp && parseApiDateTime(lead.nextFollowUpAt!) < now();
                        return (
                          <MotionButton
                            key={lead.id}
                            type="button"
                            variant="unstyled"
                            whileTap={{ scale: 0.99 }}
                            onClick={() => setSelectedLead(lead)}
                            className="glass-row rounded-xl w-full text-left p-4"
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="text-sm font-semibold text-white truncate">
                                {lead.name}
                              </div>
                              <span
                                className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cfg.badgeClass}`}
                              >
                                {cfg.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-(--color_text_muted)">
                              <span className="flex items-center gap-1">
                                <PhoneIcon className="w-3 h-3" />
                                {lead.phone}
                              </span>
                              {followUpText && (
                                <span
                                  className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}
                                >
                                  <CalendarDaysIcon className="w-3 h-3" />
                                  {followUpText}
                                </span>
                              )}
                            </div>
                            {lead.note && (
                              <div className="mt-2 text-xs text-(--color_text_muted) truncate">
                                {lead.note}
                              </div>
                            )}
                          </MotionButton>
                        );
                      })}
                    </div>
                  )}
                </AnimatePresence>
              </SectionGroup>
            </motion.div>
          )}

          {/* ── PASSES TAB ────────────────────────────────────────────────── */}
          {tab === 'passes' && (
            <motion.div
              key="passes"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <ScreenHint emoji="💳">
                Отслеживайте оплаченные занятия. Нажмите на атлета, чтобы списать занятие или
                добавить новый пакет.
              </ScreenHint>

              <SectionGroup title="Абонементы" showBreakAfter={false}>
                <PassesTab summaries={passSummaries} loading={loading} />
              </SectionGroup>
            </motion.div>
          )}

          {/* ── ANALYTICS TAB ─────────────────────────────────────────────── */}
          {tab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <ScreenHint emoji="📊">
                Сводная статистика по заявкам и абонементам. Данные обновляются при каждом открытии
                страницы.
              </ScreenHint>

              {/* Сводные цифры */}
              <SectionGroup title="Ключевые показатели" showBreakAfter>
                <div className="glass rounded-2xl overflow-hidden">
                  <div className="px-4 pt-2.5 pb-2">
                    <div className="text-[11px] font-semibold text-(--color_text_muted) uppercase tracking-wider mb-1.5">
                      Заявки
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col items-center gap-0.5 py-1">
                        <div className="text-xl font-bold text-white">{leadCounts.total}</div>
                        <div className="text-[11px] text-(--color_text_muted) text-center">
                          Всего
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 py-1">
                        <div className="text-xl font-bold text-green-300">
                          {leadCounts.byStatus.converted}
                        </div>
                        <div className="text-[11px] text-(--color_text_muted) text-center">
                          Клиентов
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 py-1">
                        <div
                          className={`text-xl font-bold ${
                            conversionRate === null
                              ? 'text-(--color_text_muted)'
                              : conversionRate >= 50
                                ? 'text-green-300'
                                : conversionRate < 30
                                  ? 'text-red-300'
                                  : 'text-white'
                          }`}
                        >
                          {conversionRate !== null ? `${conversionRate}%` : '—'}
                        </div>
                        <div className="text-[11px] text-(--color_text_muted) text-center">
                          Конверсия
                        </div>
                      </div>
                    </div>
                  </div>

                  {passSummaries.length > 0 && (
                    <>
                      <div className="h-px bg-(--color_border) mx-4" />
                      <div className="px-4 pt-2 pb-2.5">
                        <div className="text-[11px] font-semibold text-(--color_text_muted) uppercase tracking-wider mb-1.5">
                          Абонементы
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="flex flex-col items-center gap-0.5 py-1">
                            <div className="text-xl font-bold text-white">
                              {passAnalytics.activeCount}
                            </div>
                            <div className="text-[11px] text-(--color_text_muted) text-center">
                              Активных
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 py-1">
                            <div className="text-xl font-bold text-white">
                              {passAnalytics.activePortfolioValue > 0
                                ? `${Math.round(passAnalytics.activePortfolioValue / 1000)}к`
                                : '—'}
                            </div>
                            <div className="text-[11px] text-(--color_text_muted) text-center">
                              Оборот, ₽
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 py-1">
                            <div
                              className={`text-xl font-bold ${passAnalytics.expiringSoon > 0 ? 'text-amber-300' : 'text-white'}`}
                            >
                              {passAnalytics.expiringSoon}
                            </div>
                            <div className="text-[11px] text-(--color_text_muted) text-center">
                              Истекает
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 py-1">
                            <div className="text-xl font-bold text-(--color_text_muted)">
                              {passAnalytics.noPass}
                            </div>
                            <div className="text-[11px] text-(--color_text_muted) text-center">
                              Без пакета
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </SectionGroup>

              {/* Рост базы */}
              {growthData.length >= 1 && (
                <SectionGroup title="Рост базы" showBreakAfter>
                  <div className="glass rounded-2xl p-4">
                    <p className="text-xs text-(--color_text_muted) mb-4">
                      Накоплено заявок и клиентов
                    </p>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart
                        data={growthData}
                        margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.06)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: 'var(--color_text_muted)', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fill: 'var(--color_text_muted)', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          content={<ChartTooltip />}
                          cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="total"
                          name="Лиды"
                          stroke="var(--color_primary_light)"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: 'var(--color_primary_light)' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="converted"
                          name="Клиенты"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: '#22c55e' }}
                          strokeDasharray="4 2"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2 justify-center">
                      <span className="flex items-center gap-1.5 text-[11px] text-(--color_text_muted)">
                        <span className="w-4 h-0.5 rounded inline-block bg-(--color_primary_light)" />
                        Заявки
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-(--color_text_muted)">
                        <span className="w-4 h-0.5 rounded inline-block bg-green-500" />
                        Клиенты
                      </span>
                    </div>
                  </div>
                </SectionGroup>
              )}

              {/* Воронка */}
              <SectionGroup title="Воронка заявок" showBreakAfter={sourceData.length > 0}>
                <div className="glass rounded-2xl p-4">
                  {leads.length === 0 ? (
                    <div className="text-center py-6 text-xs text-(--color_text_muted)">
                      Добавьте заявки, чтобы увидеть воронку
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {funnelData.map((item) => {
                        const cfg = LEAD_STATUS_CONFIG[item.status];
                        const pct =
                          leadCounts.total > 0
                            ? Math.round((item.count / leadCounts.total) * 100)
                            : 0;
                        return (
                          <div key={item.status}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-(--color_text_muted)">{item.label}</span>
                              <span className="text-white font-medium">
                                {item.count} · {pct}%
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-(--color_bg_card_hover) overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: cfg.color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </SectionGroup>

              {/* Источники */}
              {sourceData.length > 0 && (
                <SectionGroup title="Откуда клиенты" showBreakAfter>
                  <div className="glass rounded-2xl p-4">
                    <ResponsiveContainer width="100%" height={sourceData.length * 44 + 16}>
                      <BarChart
                        data={sourceData}
                        layout="vertical"
                        margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={80}
                          tick={{ fill: 'var(--color_text_muted)', fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          content={<ChartTooltip />}
                          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        />
                        <Bar
                          dataKey="count"
                          radius={[0, 6, 6, 0]}
                          maxBarSize={24}
                          fill="hsl(210, 70%, 60%)"
                          fillOpacity={0.8}
                        >
                          <LabelList
                            dataKey="count"
                            position="right"
                            style={{ fill: 'white', fontSize: 12, fontWeight: 600 }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionGroup>
              )}

              {/* Атлеты по CRM-статусу */}
              {(() => {
                const rows = [
                  ['active', athleteCrmData.active],
                  ['sleeping', athleteCrmData.sleeping],
                  ['paused', athleteCrmData.paused],
                  ['churned', athleteCrmData.churned],
                ] as [keyof typeof ATHLETE_CRM_CONFIG, number][];
                const total = rows.reduce((s, [, n]) => s + n, 0);
                return (
                  <SectionGroup
                    title="Атлеты по статусу"
                    showBreakAfter={false}
                    description={total > 0 ? `${total} всего` : undefined}
                  >
                    <div className="glass rounded-2xl p-4">
                      {total > 0 ? (
                        <div className="flex rounded-full overflow-hidden h-1.5 mb-4 gap-px">
                          {rows.map(([status, count]) => {
                            const pct = (count / total) * 100;
                            if (pct === 0) return null;
                            return (
                              <div
                                key={status}
                                className={ATHLETE_CRM_CONFIG[status].bar}
                                style={{ width: `${pct}%` }}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="h-1.5 rounded-full bg-(--color_border) mb-4" />
                      )}
                      <div className="space-y-2.5">
                        {rows.map(([status, count]) => {
                          const cfg = ATHLETE_CRM_CONFIG[status];
                          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                          return (
                            <div key={status} className="flex items-center gap-3">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-xs font-medium text-white">
                                    {cfg.label}
                                  </span>
                                  <span className="text-[11px] text-(--color_text_muted)">
                                    {cfg.hint}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-baseline gap-1 shrink-0">
                                <span className={`text-base font-bold leading-none ${cfg.text}`}>
                                  {count}
                                </span>
                                {total > 0 && (
                                  <span className="text-[10px] text-(--color_text_muted)">
                                    {pct}%
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </SectionGroup>
                );
              })()}

              {leads.length === 0 && athletes.length === 0 && (
                <div className="rounded-2xl border border-dashed border-(--color_border) p-8 text-center">
                  <div className="text-3xl mb-2">📊</div>
                  <div className="text-sm font-medium text-white mb-1">Данных пока нет</div>
                  <p className="text-xs text-(--color_text_muted)">
                    Добавьте заявки и атлетов — аналитика появится автоматически
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <SectionGroup title="Ещё" showBreakAfter={false}>
          <ScreenLinks
            links={[
              {
                emoji: '📅',
                bg: 'bg-emerald-500/20',
                label: 'Календарь',
                sub: 'Запланировать тренировки',
                to: '/trainer/calendar',
              },
              {
                emoji: '🏋️',
                bg: 'bg-blue-500/20',
                label: 'Команда',
                sub: 'Атлеты и группы',
                to: '/trainer/athletes',
              },
              {
                emoji: '📋',
                bg: 'bg-amber-500/20',
                label: 'Шаблоны',
                sub: 'Готовые тренировки',
                to: '/trainer/templates',
              },
            ]}
          />
        </SectionGroup>
      </div>
    </Screen>
  );
}
