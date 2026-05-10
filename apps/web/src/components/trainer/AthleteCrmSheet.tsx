import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { trainerApi, type AthleteCrmStatus } from '@/api/trainer';

interface Props {
  athleteId: number;
  crmStatus: AthleteCrmStatus;
  crmNote: string | null;
  nextFollowUpAt: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (patch: {
    crmStatus: AthleteCrmStatus;
    crmNote: string | null;
    nextFollowUpAt: string | null;
  }) => void;
}

const STATUS_CONFIG: Record<
  AthleteCrmStatus,
  { label: string; desc: string; activeClass: string; inactiveClass: string }
> = {
  active: {
    label: 'Активен',
    desc: 'Клиент ходит и занимается',
    activeClass: 'bg-green-500/30 border-green-400/60 text-green-200',
    inactiveClass: 'bg-green-500/10 border-green-500/20 text-green-400/50',
  },
  sleeping: {
    label: 'Тихо',
    desc: 'Давно нет активности',
    activeClass: 'bg-amber-500/30 border-amber-400/60 text-amber-200',
    inactiveClass: 'bg-amber-500/10 border-amber-500/20 text-amber-400/50',
  },
  paused: {
    label: 'Пауза',
    desc: 'Временный перерыв',
    activeClass: 'bg-blue-500/30 border-blue-400/60 text-blue-200',
    inactiveClass: 'bg-blue-500/10 border-blue-500/20 text-blue-400/50',
  },
  churned: {
    label: 'Ушёл',
    desc: 'Прекратил занятия',
    activeClass: 'bg-gray-500/30 border-gray-400/60 text-gray-300',
    inactiveClass: 'bg-gray-500/10 border-gray-500/20 text-gray-500/50',
  },
};

const STATUS_ORDER: AthleteCrmStatus[] = ['active', 'sleeping', 'paused', 'churned'];

export default function AthleteCrmSheet({
  athleteId,
  crmStatus,
  crmNote,
  nextFollowUpAt,
  open,
  onClose,
  onUpdated,
}: Props) {
  const [status, setStatus] = useState<AthleteCrmStatus>(crmStatus);
  const [note, setNote] = useState(crmNote ?? '');
  const [followUpDate, setFollowUpDate] = useState(
    nextFollowUpAt ? nextFollowUpAt.slice(0, 10) : ''
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(crmStatus);
    setNote(crmNote ?? '');
    setFollowUpDate(nextFollowUpAt ? nextFollowUpAt.slice(0, 10) : '');
  }, [crmStatus, crmNote, nextFollowUpAt, open]);

  const patch = async (data: {
    crmStatus?: AthleteCrmStatus;
    crmNote?: string | null;
    nextFollowUpAt?: string | null;
  }) => {
    setSaving(true);
    try {
      await trainerApi.updateAthleteCrm(athleteId, data);
      onUpdated({
        crmStatus: data.crmStatus ?? status,
        crmNote: data.crmNote !== undefined ? data.crmNote : note.trim() || null,
        nextFollowUpAt:
          data.nextFollowUpAt !== undefined ? data.nextFollowUpAt : followUpDate || null,
      });
    } catch {
      toast.error('Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (s: AthleteCrmStatus) => {
    setStatus(s);
    await patch({ crmStatus: s });
  };

  const handleFollowUpChange = async (val: string) => {
    setFollowUpDate(val);
    await patch({ nextFollowUpAt: val || null });
  };

  const handleNoteBlur = async () => {
    const current = note.trim() || null;
    const original = crmNote?.trim() || null;
    if (current !== original) {
      await patch({ crmNote: current });
    }
  };

  return (
    <BottomSheet id="athlete-crm" open={open} onClose={onClose} title="CRM" emoji="📋">
      <div className="space-y-5">
        {/* Status */}
        <div>
          <div className="text-xs text-(--color_text_muted) mb-2">Статус клиента</div>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_ORDER.map((s) => {
              const cfg = STATUS_CONFIG[s];
              const isActive = status === s;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={saving}
                  onClick={() => handleStatusChange(s)}
                  className={`px-3 py-2.5 rounded-xl border text-left transition-all disabled:opacity-50 ${isActive ? cfg.activeClass : cfg.inactiveClass}`}
                >
                  <div className="text-sm font-semibold leading-tight">{cfg.label}</div>
                  <div className="text-[11px] opacity-70 mt-0.5">{cfg.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reminder date */}
        <div>
          <div className="text-xs text-(--color_text_muted) mb-2">Напомнить</div>
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => handleFollowUpChange(e.target.value)}
            className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-(--color_primary_light) transition-colors [color-scheme:dark]"
          />
        </div>

        {/* Note */}
        <div>
          <div className="text-xs text-(--color_text_muted) mb-2">Заметка</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={handleNoteBlur}
            placeholder="Причина паузы, договорённости, особенности клиента..."
            rows={3}
            className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors resize-none placeholder:text-(--color_text_muted) leading-relaxed"
          />
        </div>
      </div>
    </BottomSheet>
  );
}
