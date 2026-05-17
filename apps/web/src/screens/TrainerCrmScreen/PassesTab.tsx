import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { type AthletePassSummary } from '@/api/trainer';
import UserAvatar from '@/components/UserAvatar/UserAvatar';
import ChipScrollRow from '@/components/ui/ChipScrollRow';
import ListButton from '@/components/ui/ListButton';
import SearchInput from '@/components/ui/SearchInput';
import IconButton from '@/components/ui/IconButton';
import AthletePassSheet from './AthletePassSheet';
import {
  ExclamationTriangleIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

// ─── helpers ─────────────────────────────────────────────────────────────────

function urgencyFor(summary: AthletePassSummary): 'expiring' | 'depleted' | 'none' | 'no_pass' {
  const p = summary.activePass;
  if (!p) return 'no_pass';
  if (p.status === 'depleted') return 'depleted';
  if (p.sessionsLeft <= 2) return 'expiring';
  if (p.validUntil) {
    const days = differenceInDays(parseISO(p.validUntil), new Date());
    if (days <= 7) return 'expiring';
  }
  return 'none';
}

type FilterTab = 'all' | 'attention' | 'no_pass';
const FILTER_TABS: FilterTab[] = ['all', 'attention', 'no_pass'];
const isFilterTab = (key: string): key is FilterTab => (FILTER_TABS as string[]).includes(key);

// ─── component ───────────────────────────────────────────────────────────────

export default function PassesTab({
  summaries,
  loading = false,
}: {
  summaries: AthletePassSummary[];
  loading?: boolean;
}) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [passSheetSummary, setPassSheetSummary] = useState<AthletePassSummary | null>(null);

  const enriched = useMemo(
    () =>
      summaries
        .map((s) => ({ ...s, urgency: urgencyFor(s) }))
        .sort((a, b) => {
          const order = { expiring: 0, none: 1, depleted: 2, no_pass: 3 };
          return order[a.urgency] - order[b.urgency];
        }),
    [summaries]
  );

  const counts = useMemo(
    () => ({
      attention: enriched.filter((s) => s.urgency === 'depleted' || s.urgency === 'expiring')
        .length,
      no_pass: enriched.filter((s) => s.urgency === 'no_pass').length,
    }),
    [enriched]
  );

  const filtered = useMemo(() => {
    let arr = enriched;
    if (filter === 'attention')
      arr = arr.filter((s) => s.urgency === 'depleted' || s.urgency === 'expiring');
    else if (filter === 'no_pass') arr = arr.filter((s) => s.urgency === 'no_pass');
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (s) =>
          (s.athleteName ?? '').toLowerCase().includes(q) ||
          (s.athleteEmail ?? '').toLowerCase().includes(q)
      );
    }
    return arr;
  }, [enriched, filter, search]);

  const activeCount = enriched.filter((s) => s.activePass?.status === 'active').length;
  const totalRevenue = enriched.reduce((sum, s) => {
    const n = s.activePass ? Number(s.activePass.priceAmount) : 0;
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  if (loading) {
    return (
      <div className="space-y-2 pt-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 glass rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
          <div className="text-xl font-bold text-white">{activeCount}</div>
          <div className="text-[11px] text-(--color_text_muted) text-center">Активных</div>
        </div>
        <div
          className={`rounded-xl p-3 border flex flex-col items-center gap-1 ${
            counts.attention > 0
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-(--color_bg_card) border-(--color_border)'
          }`}
        >
          <div
            className={`text-xl font-bold ${counts.attention > 0 ? 'text-amber-300' : 'text-white'}`}
          >
            {counts.attention}
          </div>
          <div className="text-[11px] text-(--color_text_muted) text-center">Внимание</div>
        </div>
        <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
          <div className="text-xl font-bold text-white">
            {totalRevenue > 0 ? `${Math.round(totalRevenue / 1000)}к` : '—'}
          </div>
          <div className="text-[11px] text-(--color_text_muted) text-center">₽ в абонем.</div>
        </div>
      </div>

      {summaries.length > 5 && (
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени..."
          dense
          clearable={false}
          className="bg-(--color_bg_card)"
        />
      )}

      <ChipScrollRow
        activeKey={filter}
        onChipClick={(key) => {
          if (isFilterTab(key)) setFilter(key);
        }}
        chips={(
          [
            { id: 'all', label: 'Все', count: enriched.length },
            { id: 'attention', label: 'Требуют внимания', count: counts.attention },
            { id: 'no_pass', label: 'Нет пакета', count: counts.no_pass },
          ] as { id: FilterTab; label: string; count: number }[]
        ).map((f) => ({
          key: f.id,
          label: (
            <>
              {f.label}
              {f.count > 0 && (
                <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-white/20">
                  {f.count}
                </span>
              )}
            </>
          ),
        }))}
      />

      {/* List */}
      <AthletePassSheet
        summary={passSheetSummary}
        open={passSheetSummary !== null}
        onClose={() => setPassSheetSummary(null)}
      />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-(--color_border) bg-(--color_bg_card) p-8 text-center">
          <div className="text-3xl mb-2">💳</div>
          <div className="text-sm font-medium text-white mb-1">Нет данных</div>
          <p className="text-xs text-(--color_text_muted)">
            Откройте карточку атлета и добавьте первый абонемент
          </p>
        </div>
      ) : (
        <motion.div
          key={filter}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="space-y-2"
        >
          {filtered.map((s) => {
            const p = s.activePass;
            const name = s.athleteName || s.athleteEmail || '—';

            return (
              <div key={s.trainerAthleteId} className="glass rounded-xl flex overflow-hidden">
                {/* Левая часть — открыть шит с абонементом */}
                <ListButton
                  variant="flat"
                  onClick={() => setPassSheetSummary(s)}
                  className="flex-1 min-w-0 p-3.5 hover:bg-(--color_bg_card_hover)"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      photoUrl={s.athletePhotoUrl}
                      name={name}
                      size={36}
                      className="shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">{name}</span>
                        {(s.urgency === 'depleted' || s.urgency === 'expiring') && (
                          <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>

                      {p ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <PassPill pass={p} urgency={s.urgency} />
                        </div>
                      ) : (
                        <span className="text-xs text-(--color_text_muted)">
                          Нет активного пакета
                        </span>
                      )}
                    </div>

                    {p && (
                      <div className="text-right shrink-0">
                        <div className="text-base font-bold text-white leading-none">
                          {p.sessionsLeft}
                          <span className="text-xs font-normal text-(--color_text_muted)">
                            /{p.sessionsTotal}
                          </span>
                        </div>
                        <div className="text-[10px] text-(--color_text_muted) mt-0.5">зан.</div>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  {p && (
                    <div className="mt-2.5 h-1 rounded-full bg-(--color_border) overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          s.urgency === 'depleted'
                            ? 'bg-gray-500'
                            : s.urgency === 'expiring'
                              ? 'bg-amber-400'
                              : 'bg-(--color_primary_light)'
                        }`}
                        style={{
                          width: `${Math.round((p.sessionsUsed / p.sessionsTotal) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </ListButton>

                {/* Правая часть — перейти в карточку атлета */}
                {s.athleteId && (
                  <IconButton
                    variant="row-action"
                    onClick={() => navigate(`/trainer/athletes/${s.athleteId}`)}
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </IconButton>
                )}
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

// ─── PassPill ─────────────────────────────────────────────────────────────────

function PassPill({
  pass,
  urgency,
}: {
  pass: NonNullable<AthletePassSummary['activePass']>;
  urgency: ReturnType<typeof urgencyFor>;
}) {
  if (urgency === 'depleted') {
    return <span className="text-xs text-gray-400">Исчерпан</span>;
  }

  const parts: string[] = [];

  if (urgency === 'expiring' && pass.sessionsLeft <= 2) {
    parts.push(`осталось ${pass.sessionsLeft} зан.`);
  }

  if (pass.validUntil) {
    const days = differenceInDays(parseISO(pass.validUntil), new Date());
    if (days <= 14) {
      parts.push(
        days <= 0 ? 'просрочен' : `до ${format(parseISO(pass.validUntil), 'd MMM', { locale: ru })}`
      );
    }
  }

  if (parts.length === 0) {
    parts.push(`${pass.title}`);
  }

  return (
    <span
      className={`text-xs ${urgency === 'expiring' ? 'text-amber-400' : 'text-(--color_text_muted)'}`}
    >
      {parts.join(' · ')}
    </span>
  );
}
