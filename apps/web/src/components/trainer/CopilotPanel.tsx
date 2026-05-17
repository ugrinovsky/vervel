import { useState } from 'react';
import toast from 'react-hot-toast';
import { trainerApi, type CopilotDraftResult, type CopilotInsightsSummary } from '@/api/trainer';
import { useBalance } from '@/contexts/AuthContext';
import AccentButton from '@/components/ui/AccentButton';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { SparklesIcon, CheckIcon } from '@heroicons/react/24/outline';
import { isRecord } from '@/utils/typeGuards';

const PHASE_LABEL: Record<string, string> = {
  overload: 'Перегрузка',
  accumulation: 'Накопление',
  intensification: 'Интенсификация',
  peak: 'Пик формы',
  deload: 'Разгрузка',
  maintenance: 'Поддержание',
};

const PHASE_EMOJI: Record<string, string> = {
  overload: '⚠️',
  accumulation: '📈',
  intensification: '🔥',
  peak: '🏆',
  deload: '🔄',
  maintenance: '➡️',
};

const PHASE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  overload: { text: 'text-red-300', bg: 'bg-red-500/10', border: 'border-red-500/25' },
  accumulation: { text: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/25' },
  intensification: { text: 'text-cyan-300', bg: 'bg-cyan-500/10', border: 'border-cyan-500/25' },
  peak: { text: 'text-green-300', bg: 'bg-green-500/10', border: 'border-green-500/25' },
  deload: { text: 'text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-500/25' },
  maintenance: { text: 'text-white/50', bg: 'bg-white/5', border: 'border-white/10' },
};

const ACWR_LABEL: Record<string, { text: string; color: string }> = {
  low: { text: 'Недогруз', color: 'text-blue-400' },
  optimal: { text: 'Оптимум', color: 'text-green-400' },
  high: { text: 'Высокая', color: 'text-yellow-400' },
  very_high: { text: 'Опасная', color: 'text-red-400' },
  insufficient_data: { text: 'Мало данных', color: 'text-white/40' },
};

function readiness(tsb: number): { label: string; color: string; hint: string } {
  if (tsb > 10)
    return { label: 'Высокая', color: 'text-green-400', hint: 'можно давать интенсивное' };
  if (tsb > 0)
    return { label: 'Хорошая', color: 'text-emerald-400', hint: 'умеренно-высокая нагрузка' };
  if (tsb > -10) return { label: 'Умеренная', color: 'text-yellow-400', hint: 'средняя нагрузка' };
  if (tsb > -20) return { label: 'Пониженная', color: 'text-orange-400', hint: 'лёгкая нагрузка' };
  return { label: 'Низкая', color: 'text-red-400', hint: 'нужен отдых или deload' };
}

function MetricChip({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center gap-0.5 rounded-xl bg-white/5 border border-white/8 py-2 px-1">
      <div className="text-[10px] text-(--color_text_muted) uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-bold ${valueColor ?? 'text-white'}`}>{value}</div>
      {sub && (
        <div className="text-[9px] text-(--color_text_muted) text-center leading-tight">{sub}</div>
      )}
    </div>
  );
}

function InsightsBadge({ insights }: { insights: CopilotInsightsSummary }) {
  const isInactive = insights.daysSinceLastWorkout > 30 || insights.daysSinceLastWorkout >= 99;

  // Если атлет давно не тренировался — переопределяем фазу
  const effectivePhase = isInactive ? 'deload' : insights.phase;
  const effectiveAdvice = isInactive
    ? 'Атлет давно не тренировался — начните с лёгкого восстановительного блока, не форсируйте нагрузку.'
    : insights.phaseAdvice;
  const effectiveLabel = isInactive
    ? 'Долгий перерыв'
    : (PHASE_LABEL[insights.phase] ?? insights.phase);
  const effectiveEmoji = isInactive ? '😴' : (PHASE_EMOJI[insights.phase] ?? '');

  const colors = PHASE_COLORS[effectivePhase] ?? PHASE_COLORS.maintenance;
  const ready = readiness(insights.tsb);
  const acwr = ACWR_LABEL[insights.acwrZone] ?? { text: insights.acwrZone, color: 'text-white/50' };

  const lastWorkoutText =
    insights.daysSinceLastWorkout >= 99
      ? 'нет данных'
      : insights.daysSinceLastWorkout === 0
        ? 'сегодня'
        : insights.daysSinceLastWorkout === 1
          ? 'вчера'
          : `${insights.daysSinceLastWorkout} дн. назад`;

  return (
    <div className="space-y-2.5">
      {/* Фаза + совет */}
      <div className={`rounded-xl border ${colors.bg} ${colors.border} p-3 space-y-1`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm font-semibold ${colors.text}`}>
            {effectiveEmoji} {effectiveLabel}
          </span>
          {insights.coldStart && !isInactive && (
            <span className="text-[10px] text-white/40 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
              мало данных
            </span>
          )}
        </div>
        {effectiveAdvice && <p className="text-xs text-white/60 leading-snug">{effectiveAdvice}</p>}
      </div>

      {/* Метрики */}
      <div className="flex gap-1.5">
        <MetricChip
          label="Готовность"
          value={ready.label}
          sub={ready.hint}
          valueColor={ready.color}
        />
        <MetricChip
          label="Нагрузка"
          value={`ATL ${Math.round(insights.atl)}`}
          sub={`база ${Math.round(insights.ctl)}`}
        />
        <MetricChip label="ACWR" value={acwr.text} valueColor={acwr.color} />
      </div>

      {/* Дополнительные факты */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-0.5">
        <span className="text-xs text-(--color_text_muted)">
          Последняя тренировка: <span className="text-white/70">{lastWorkoutText}</span>
        </span>
        {(insights.recentWorkoutsCount ?? 0) > 0 && (
          <span className="text-xs text-(--color_text_muted)">
            За 2 недели: <span className="text-white/70">{insights.recentWorkoutsCount} трен.</span>
          </span>
        )}
      </div>

      {/* Перегруженные зоны */}
      {insights.overloadedZones.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-red-500/8 border border-red-500/20 px-3 py-2">
          <span className="text-red-400 text-sm shrink-0">⚠️</span>
          <p className="text-xs text-red-300">
            Перегружены: <span className="font-medium">{insights.overloadedZones.join(', ')}</span>{' '}
            — избегайте акцента на эти группы
          </p>
        </div>
      )}
    </div>
  );
}

function SuggestedDays({ dates }: { dates: string[] }) {
  const suggested = new Set(dates);

  // Строим все 7 дней текущей недели (пн–вс)
  const weekDays: string[] = [];
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // 0=пн
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDays.push(d.toISOString().slice(0, 10));
  }

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold text-(--color_text_muted) uppercase tracking-wider px-0.5">
        Рекомендуемые дни
      </div>
      <div className="flex gap-1">
        {weekDays.map((date) => {
          const d = new Date(date + 'T00:00:00');
          const weekday = d.toLocaleDateString('ru-RU', { weekday: 'short' });
          const day = d.getDate();
          const active = suggested.has(date);
          return (
            <div
              key={date}
              className={`flex-1 flex flex-col items-center py-1.5 rounded-xl border transition-colors ${
                active
                  ? 'bg-(--color_primary_light)/15 border-(--color_primary_light)/30'
                  : 'bg-white/3 border-white/8'
              }`}
            >
              <span
                className={`text-[10px] uppercase font-semibold ${active ? 'text-(--color_primary_light)' : 'text-white/20'}`}
              >
                {weekday}
              </span>
              <span
                className={`text-sm font-bold leading-tight ${active ? 'text-white' : 'text-white/25'}`}
              >
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STORAGE_KEY = (id: number) => `copilot_draft_v2_${id}`;

function loadSaved(athleteId: number): { draft: CopilotDraftResult; message: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(athleteId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(athleteId: number, draft: CopilotDraftResult, message: string) {
  try {
    localStorage.setItem(STORAGE_KEY(athleteId), JSON.stringify({ draft, message }));
  } catch {}
}

function clearDraft(athleteId: number) {
  localStorage.removeItem(STORAGE_KEY(athleteId));
}

interface Props {
  athleteId: number;
  onCommitted: () => void;
}

export default function CopilotPanel({ athleteId, onCommitted }: Props) {
  const { setBalance } = useBalance();
  const saved = loadSaved(athleteId);

  const [draft, setDraft] = useState<CopilotDraftResult | null>(saved?.draft ?? null);
  const [message, setMessage] = useState(saved?.message ?? '');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleDraft = async () => {
    setLoading(true);
    try {
      const res = await trainerApi.copilotDraft({ athleteId });
      const data = res.data.data;
      setDraft(data);
      setMessage(data.chatMessageDraft);
      saveDraft(athleteId, data, data.chatMessageDraft);
      if (data.ai.balanceAfter !== null && setBalance) {
        setBalance(data.ai.balanceAfter);
      }
    } catch (err: unknown) {
      const e = isRecord(err) ? err : null;
      const resp = e && isRecord(e.response) ? e.response : null;
      const status = resp && typeof resp.status === 'number' ? resp.status : null;
      const data = resp && isRecord(resp.data) ? resp.data : null;
      const balance = data && typeof data.balance === 'number' ? data.balance : null;
      const required = data && typeof data.required === 'number' ? data.required : null;

      if (status === 402) {
        toast.error(
          `Недостаточно средств: баланс ${balance ?? '—'}₽, нужно ${required ?? '—'}₽`
        );
      } else {
        toast.error('Не удалось получить данные');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await trainerApi.copilotSendMessage(athleteId, message);
      setSent(true);
      clearDraft(athleteId);
      toast.success('Сообщение отправлено');
      onCommitted();
    } catch {
      toast.error('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
        <CheckIcon className="w-4 h-4 text-green-400 shrink-0" />
        <span className="text-sm text-green-300">Сообщение отправлено атлету</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-3">
      {!draft ? (
        <AccentButton size="sm" onClick={handleDraft} disabled={loading} className="w-full">
          <SparklesIcon className="w-3.5 h-3.5 shrink-0" />
          {loading ? 'Анализирую...' : 'Проанализировать атлета'}
          {!loading && <span className="ml-auto text-[10px] text-white/50 font-normal">4₽</span>}
        </AccentButton>
      ) : (
        <div className="space-y-3">
          {/* Сводка по атлету */}
          <InsightsBadge insights={draft.insights} />

          {/* Рекомендуемые дни */}
          <SuggestedDays dates={draft.suggestedDates} />

          {/* Сообщение */}
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-(--color_text_muted) uppercase tracking-wider px-0.5">
              Сообщение атлету
            </div>
            <Textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (draft) saveDraft(athleteId, draft, e.target.value);
              }}
              rows={3}
              className="!bg-white/5 !border-white/10 focus:!border-(--color_primary_light)/50 !py-2"
              placeholder="Сообщение для атлета..."
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="link"
              onClick={handleDraft}
              disabled={loading}
              className="!text-xs text-(--color_text_muted) hover:!text-white !no-underline disabled:opacity-40 flex items-center gap-1 p-0"
            >
              <span className={loading ? 'animate-spin inline-block' : ''}>↺</span>
              Обновить
            </Button>
            <div className="flex-1" />
            <AccentButton onClick={handleSend} disabled={sending || !message.trim()}>
              {sending ? 'Отправляю...' : 'Отправить сообщение'}
            </AccentButton>
          </div>
        </div>
      )}
    </div>
  );
}
