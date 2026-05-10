import { useState, useEffect, useMemo } from 'react';
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
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import SectionGroup from '@/components/ui/SectionGroup';
import AccentButton from '@/components/ui/AccentButton';
import Tabs from '@/components/ui/Tabs';
import AddAthleteDrawer from '@/components/AddAthleteDrawer/AddAthleteDrawer';
import LeadDetailSheet from '@/components/trainer/LeadDetailSheet';
import {
  trainerApi,
  type TrainerLead,
  type LeadCrmStatus,
  type AthleteListItem,
} from '@/api/trainer';
import { PlusIcon, PhoneIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { computeGrowthData, formatFollowUp, countLeadsByCrmStatus } from './crmUtils';

// ─── Leads pipeline ──────────────────────────────────────────────────────────

const LEAD_STATUS_CONFIG: Record<
  LeadCrmStatus,
  { label: string; badgeClass: string; filterActiveClass: string; color: string }
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
    label: 'Тихо',
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

type LeadFilter = 'all' | LeadCrmStatus;

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
    <div className="bg-(--color_bg_card) border border-(--color_border) rounded-xl px-3 py-2 text-xs text-white shadow-lg">
      {payload[0].value} чел.
    </div>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

type MainTab = 'leads' | 'analytics';

export default function TrainerCrmScreen() {
  const [tab, setTab] = useState<MainTab>('leads');
  const [leads, setLeads] = useState<TrainerLead[]>([]);
  const [athletes, setAthletes] = useState<AthleteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LeadFilter>('all');
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedLead, setSelectedLead] = useState<TrainerLead | null>(null);

  const loadData = async () => {
    try {
      const [leadsRes, athletesRes] = await Promise.all([
        trainerApi.listLeads(),
        trainerApi.listAthletes(),
      ]);
      const freshLeads = leadsRes.data.data;
      setLeads(freshLeads);
      setAthletes(athletesRes.data.data);
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
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const byStatus = countLeadsByCrmStatus(leads);
    return {
      total: leads.length,
      active: leads.filter((l) => l.crmStatus !== 'converted' && l.crmStatus !== 'lost').length,
      followUpToday: leads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt) <= today)
        .length,
      byStatus,
    };
  }, [leads]);

  const filteredLeads = useMemo(
    () => (filter === 'all' ? leads : leads.filter((l) => l.crmStatus === filter)),
    [leads, filter]
  );

  const filterOptions: { id: LeadFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Все', count: leadCounts.total },
    { id: 'new', label: 'Новые', count: leadCounts.byStatus.new },
    { id: 'contacted', label: 'Связались', count: leadCounts.byStatus.contacted },
    { id: 'trial', label: 'Пробное', count: leadCounts.byStatus.trial },
    { id: 'converted', label: 'Клиенты', count: leadCounts.byStatus.converted },
    { id: 'lost', label: 'Потеряны', count: leadCounts.byStatus.lost },
  ];

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
      const src = l.source || 'manual';
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

          <ScreenHint>
            <strong className="text-white">Заявка</strong> — потенциальный клиент, который ещё не
            стал атлетом. Ведите статусы от «Новый» до «Клиент»: так видно, кто в работе, кто ждёт
            пробной и кого пора добавить в команду.{' '}
            <strong className="text-white">Напоминание</strong> — дата следующего контакта; в этот
            день придёт push-уведомление.
          </ScreenHint>

          <Tabs
            tabs={[
              { id: 'leads', label: 'Заявки' },
              { id: 'analytics', label: 'Аналитика' },
            ]}
            active={tab}
            onChange={setTab}
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
              className="space-y-4"
            >
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) flex flex-col items-center gap-1">
                  <div className="text-xl font-bold text-white">{leadCounts.total}</div>
                  <div className="text-[11px] text-(--color_text_muted) text-center">Всего</div>
                </div>
                <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) flex flex-col items-center gap-1">
                  <div className="text-xl font-bold text-amber-300">{leadCounts.active}</div>
                  <div className="text-[11px] text-(--color_text_muted) text-center">В работе</div>
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
                  <div className="text-[11px] text-(--color_text_muted) text-center">Напомнить</div>
                </div>
              </div>

              {/* Filter chips */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
                {filterOptions.map((f) => {
                  const isActive = filter === f.id;
                  const cfg = f.id !== 'all' ? LEAD_STATUS_CONFIG[f.id] : null;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f.id)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                        isActive
                          ? (cfg?.filterActiveClass ??
                            'bg-(--color_primary_light)/20 border-(--color_primary_light)/40 text-white')
                          : 'border-(--color_border) text-(--color_text_muted)'
                      }`}
                    >
                      {f.label}
                      {f.count > 0 && (
                        <span
                          className={`text-[10px] rounded-full px-1.5 py-0.5 ${isActive ? 'bg-white/20' : 'bg-(--color_bg_card_hover)'}`}
                        >
                          {f.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Lead list */}
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
                  <motion.div
                    key={filter}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col gap-2"
                  >
                    {filteredLeads.map((lead) => {
                      const cfg = LEAD_STATUS_CONFIG[lead.crmStatus];
                      const hasFollowUp = !!lead.nextFollowUpAt;
                      const followUpText = hasFollowUp
                        ? formatFollowUp(lead.nextFollowUpAt!)
                        : null;
                      const isOverdue = hasFollowUp && new Date(lead.nextFollowUpAt!) < new Date();
                      return (
                        <motion.button
                          key={lead.id}
                          type="button"
                          whileTap={{ scale: 0.99 }}
                          onClick={() => setSelectedLead(lead)}
                          className="w-full text-left p-4 rounded-xl bg-(--color_bg_card) border border-(--color_border) hover:bg-(--color_bg_card_hover) hover:border-(--color_primary_light)/30 transition-colors"
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
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              <AccentButton onClick={() => setShowAddClient(true)}>
                <PlusIcon className="w-4 h-4" />
                Записать клиента
              </AccentButton>
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
              className="space-y-5"
            >
              {/* Key numbers */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) flex flex-col items-center gap-1">
                  <div className="text-xl font-bold text-white">{leadCounts.total}</div>
                  <div className="text-[11px] text-(--color_text_muted) text-center">Заявок</div>
                </div>
                <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) flex flex-col items-center gap-1">
                  <div className="text-xl font-bold text-green-300">
                    {leadCounts.byStatus.converted}
                  </div>
                  <div className="text-[11px] text-(--color_text_muted) text-center">Клиентов</div>
                </div>
                <div
                  className={`rounded-xl p-3 border flex flex-col items-center gap-1 ${
                    conversionRate !== null && conversionRate >= 50
                      ? 'bg-green-500/10 border-green-500/20'
                      : conversionRate !== null && conversionRate < 30
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-(--color_bg_card) border-(--color_border)'
                  }`}
                >
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
                  <div className="text-[11px] text-(--color_text_muted) text-center">Конверсия</div>
                </div>
              </div>

              {/* Growth chart */}
              {growthData.length >= 1 && (
                <div className="bg-(--color_bg_card) rounded-2xl p-4 border border-(--color_border)">
                  <div className="text-sm font-semibold text-white mb-1">Рост базы</div>
                  <p className="text-xs text-(--color_text_muted) mb-4">
                    Накопленно заявок и клиентов
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
              )}

              {/* Funnel */}
              <div className="bg-(--color_bg_card) rounded-2xl p-4 border border-(--color_border)">
                <div className="text-sm font-semibold text-white mb-4">Воронка заявок</div>
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

              {/* Sources */}
              {sourceData.length > 0 && (
                <div className="bg-(--color_bg_card) rounded-2xl p-4 border border-(--color_border)">
                  <div className="text-sm font-semibold text-white mb-4">Откуда клиенты</div>
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
              )}

              {/* Athletes by CRM status */}
              {(() => {
                const rows = [
                  ['active', athleteCrmData.active],
                  ['sleeping', athleteCrmData.sleeping],
                  ['paused', athleteCrmData.paused],
                  ['churned', athleteCrmData.churned],
                ] as [keyof typeof ATHLETE_CRM_CONFIG, number][];
                const total = rows.reduce((s, [, n]) => s + n, 0);
                return (
                  <div className="bg-(--color_bg_card) rounded-2xl p-4 border border-(--color_border)">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-white">Атлеты по статусу</div>
                      {total > 0 && (
                        <div className="text-xs text-(--color_text_muted)">{total} всего</div>
                      )}
                    </div>

                    {/* Stacked proportion bar */}
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

                    {/* Stats list */}
                    <div className="space-y-2.5">
                      {rows.map(([status, count]) => {
                        const cfg = ATHLETE_CRM_CONFIG[status];
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <div key={status} className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xs font-medium text-white">{cfg.label}</span>
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
      </div>
    </Screen>
  );
}
