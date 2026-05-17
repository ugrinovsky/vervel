import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import SectionGroup from '@/components/ui/SectionGroup';
import AccentButton from '@/components/ui/AccentButton';
import { MotionButton } from '@/components/ui/Button';
import ChipScrollRow from '@/components/ui/ChipScrollRow';
import ChipCountBadge from '@/components/ui/ChipCountBadge';
import { LEAD_CHIP_ALL_ACTIVE, LEAD_CHIP_ALL_INACTIVE } from '@/components/ui/leadChipStyles';
import AddAthleteDrawer from '@/components/AddAthleteDrawer/AddAthleteDrawer';
import LeadDetailSheet from '@/components/trainer/LeadDetailSheet';
import { trainerApi, type TrainerLead, type LeadCrmStatus } from '@/api/trainer';
import { countLeadsByCrmStatus } from '@/screens/TrainerCrmScreen/crmUtils';
import { PlusIcon, PhoneIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

const STATUS_CONFIG: Record<LeadCrmStatus, { label: string; badgeClass: string }> = {
  new: {
    label: 'Новый',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  contacted: {
    label: 'Связался',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  trial: {
    label: 'Пробное',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  converted: {
    label: 'Клиент',
    badgeClass: 'bg-green-500/20 text-green-300 border-green-500/30',
  },
  lost: {
    label: 'Потерян',
    badgeClass: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  },
};

type Filter = 'all' | LeadCrmStatus;

const LEAD_FILTERS: Filter[] = ['all', 'new', 'contacted', 'trial', 'converted', 'lost'];

function isLeadFilter(key: string): key is Filter {
  return (LEAD_FILTERS as string[]).includes(key);
}

function formatFollowUp(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Завтра';
  if (diff === -1) return 'Вчера';
  if (diff < 0) return `${Math.abs(diff)} дн. назад`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function TrainerLeadsScreen() {
  const [leads, setLeads] = useState<TrainerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedLead, setSelectedLead] = useState<TrainerLead | null>(null);

  const loadData = async () => {
    try {
      const res = await trainerApi.listLeads();
      setLeads(res.data.data);
    } catch {
      toast.error('Ошибка загрузки заявок');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const counts = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return {
      total: leads.length,
      active: leads.filter((l) => l.crmStatus !== 'converted' && l.crmStatus !== 'lost').length,
      followUpToday: leads.filter((l) => {
        if (!l.nextFollowUpAt) return false;
        return new Date(l.nextFollowUpAt) <= today;
      }).length,
      byStatus: countLeadsByCrmStatus(leads),
    };
  }, [leads]);

  const filtered = useMemo(() => {
    if (filter === 'all') return leads;
    return leads.filter((l) => l.crmStatus === filter);
  }, [leads, filter]);

  const filterChips = useMemo(
    () => {
      const filters: { id: Filter; label: string; count: number }[] = [
        { id: 'all', label: 'Все', count: counts.total },
        { id: 'new', label: 'Новые', count: counts.byStatus.new },
        { id: 'contacted', label: 'Связались', count: counts.byStatus.contacted },
        { id: 'trial', label: 'Пробное', count: counts.byStatus.trial },
        { id: 'converted', label: 'Клиенты', count: counts.byStatus.converted },
        { id: 'lost', label: 'Потеряны', count: counts.byStatus.lost },
      ];
      return filters.map((f) => ({
        key: f.id,
        tone: f.id !== 'all' ? f.id : undefined,
        inactiveClass: f.id === 'all' ? LEAD_CHIP_ALL_INACTIVE : undefined,
        activeClass: f.id === 'all' ? LEAD_CHIP_ALL_ACTIVE : undefined,
        label: (
          <>
            {f.label}
            {f.count > 0 && <ChipCountBadge>{f.count}</ChipCountBadge>}
          </>
        ),
      }));
    },
    [counts],
  );

  return (
    <Screen loading={loading} className="trainer-leads-screen">
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
        onUpdated={() => {
          loadData();
          setSelectedLead(null);
        }}
      />

      <div className="p-4 w-full mx-auto space-y-4">
        <SectionGroup showLabel={false} showBreakAfter={false} bodyClassName="space-y-4">
          <ScreenHeader
            icon="📋"
            title="Лиды"
            description="Заявки и воронка — записывайте всех, кто интересовался, не теряйте контакт и конвертируйте в атлетов"
          />

          {/* Summary cards */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-3"
          >
            <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
              <div className="text-xl font-bold text-white">{counts.total}</div>
              <div className="text-[11px] text-(--color_text_muted) text-center">Всего</div>
            </div>
            <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
              <div className="text-xl font-bold text-amber-300">{counts.active}</div>
              <div className="text-[11px] text-(--color_text_muted) text-center">Активных</div>
            </div>
            <div
              className={`rounded-xl p-3 border flex flex-col items-center gap-1 ${
                counts.followUpToday > 0
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-(--color_bg_card) border-(--color_border)'
              }`}
            >
              <div
                className={`text-xl font-bold ${counts.followUpToday > 0 ? 'text-red-300' : 'text-white'}`}
              >
                {counts.followUpToday}
              </div>
              <div className="text-[11px] text-(--color_text_muted) text-center">Напомнить</div>
            </div>
          </motion.div>
        </SectionGroup>

        <SectionGroup title="Пайплайн" showBreakAfter={false}>
          <ChipScrollRow
            colored
            edgeFade
            className="-mx-4 px-4 pb-1"
            activeKey={filter}
            onChipClick={(key) => {
              if (isLeadFilter(key)) setFilter(key);
            }}
            chips={filterChips}
          />

          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
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
                    : `Нет в статусе «${STATUS_CONFIG[filter].label}»`}
                </div>
                <p className="text-xs text-(--color_text_muted)">
                  {filter === 'all'
                    ? 'Запишите первого клиента — он появится здесь'
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
                {filtered.map((lead) => {
                  const cfg = STATUS_CONFIG[lead.crmStatus];
                  const hasFollowUp = !!lead.nextFollowUpAt;
                  const followUpText = hasFollowUp ? formatFollowUp(lead.nextFollowUpAt!) : null;
                  const isOverdue = hasFollowUp && new Date(lead.nextFollowUpAt!) < new Date();
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
                        <div className="text-sm font-semibold text-white truncate">{lead.name}</div>
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
              </motion.div>
            )}
          </AnimatePresence>

          <AccentButton onClick={() => setShowAddClient(true)}>
            <PlusIcon className="w-4 h-4" />
            Записать клиента
          </AccentButton>
        </SectionGroup>
      </div>
    </Screen>
  );
}
