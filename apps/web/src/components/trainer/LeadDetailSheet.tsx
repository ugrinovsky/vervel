import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import PhoneInput from '@/components/ui/PhoneInput';
import { trainerApi, type TrainerLead, type LeadCrmStatus } from '@/api/trainer';
import {
  PhoneIcon,
  TrashIcon,
  UserPlusIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

interface Props {
  lead: TrainerLead | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_CONFIG: Record<
  LeadCrmStatus,
  { label: string; activeClass: string; inactiveClass: string }
> = {
  new: {
    label: 'Новый',
    activeClass: 'bg-amber-500/30 border-amber-400/60 text-amber-200',
    inactiveClass: 'bg-amber-500/10 border-amber-500/20 text-amber-400/50',
  },
  contacted: {
    label: 'Связался',
    activeClass: 'bg-blue-500/30 border-blue-400/60 text-blue-200',
    inactiveClass: 'bg-blue-500/10 border-blue-500/20 text-blue-400/50',
  },
  trial: {
    label: 'Пробное',
    activeClass: 'bg-purple-500/30 border-purple-400/60 text-purple-200',
    inactiveClass: 'bg-purple-500/10 border-purple-500/20 text-purple-400/50',
  },
  converted: {
    label: 'Клиент',
    activeClass: 'bg-green-500/30 border-green-400/60 text-green-200',
    inactiveClass: 'bg-green-500/10 border-green-500/20 text-green-400/50',
  },
  lost: {
    label: 'Потерян',
    activeClass: 'bg-gray-500/30 border-gray-400/60 text-gray-300',
    inactiveClass: 'bg-gray-500/10 border-gray-500/20 text-gray-500/50',
  },
};

const STATUS_ORDER: LeadCrmStatus[] = ['new', 'contacted', 'trial', 'converted', 'lost'];

export default function LeadDetailSheet({ lead, open, onClose, onUpdated }: Props) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<LeadCrmStatus>('new');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  useEffect(() => {
    if (lead) {
      setStatus(lead.crmStatus);
      setPhone(lead.phone ?? '');
      setNote(lead.note ?? '');
      setFollowUpDate(lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : '');
      setConfirmDelete(false);
      setInviteLink(null);
    }
  }, [lead]);

  if (!lead) return null;

  const patch = async (data: Parameters<typeof trainerApi.updateLead>[1]) => {
    setSaving(true);
    try {
      await trainerApi.updateLead(lead.id, data);
      onUpdated();
    } catch {
      toast.error('Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (s: LeadCrmStatus) => {
    setStatus(s);
    await patch({ crmStatus: s });
  };

  const handleFollowUpChange = async (val: string) => {
    setFollowUpDate(val);
    await patch({ nextFollowUpAt: val || null });
  };

  const handlePhoneBlur = async () => {
    const current = phone.trim();
    if (current && current !== lead.phone) {
      await patch({ phone: current });
    }
  };

  const handleNoteBlur = async () => {
    const current = note.trim() || null;
    const original = lead.note?.trim() || null;
    if (current !== original) {
      await patch({ note: current });
    }
  };

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    try {
      const res = await trainerApi.generateInvite();
      const link = `${window.location.origin}/invite/${res.data.data.token}`;
      setInviteLink(link);
    } catch {
      toast.error('Ошибка генерации ссылки');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleCopyInvite = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast.success('Ссылка скопирована');
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await trainerApi.deleteLead(lead.id);
      toast.success('Заявка удалена');
      onUpdated();
      onClose();
    } catch {
      toast.error('Не удалось удалить');
    }
  };

  return (
    <BottomSheet id="lead-detail" open={open} onClose={onClose} title={lead.name} emoji="👤">
      <div className="space-y-5">
        {/* Phone */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <PhoneInput value={phone} onChange={setPhone} onBlur={handlePhoneBlur} />
          </div>
          <a
            href={`tel:${phone || lead.phone}`}
            className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-(--color_bg_card_hover) border border-(--color_border) hover:border-(--color_primary_light)/40 transition-colors"
          >
            <PhoneIcon className="w-4 h-4 text-(--color_primary_icon)" />
          </a>
        </div>

        {/* Status pills */}
        <div>
          <div className="text-xs text-(--color_text_muted) mb-2">Статус</div>
          <div className="flex flex-wrap gap-2">
            {STATUS_ORDER.map((s) => {
              const cfg = STATUS_CONFIG[s];
              const isActive = status === s;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={saving}
                  onClick={() => handleStatusChange(s)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all disabled:opacity-50 ${isActive ? cfg.activeClass : cfg.inactiveClass}`}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Link to athlete card */}
        {lead.convertedAthleteId && (
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(`/trainer/athletes/${lead.convertedAthleteId}`);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-green-500/30 bg-green-500/10 text-sm font-medium text-green-300 hover:bg-green-500/20 transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
            Открыть карточку атлета
          </button>
        )}

        {/* Invite to app — always show until athlete is connected */}
        {!lead.convertedAthleteId && (
          <div>
            <div className="text-xs text-(--color_text_muted) mb-2">
              {status === 'converted' ? (
                <span className="text-amber-400">Атлет ещё не подключён к приложению</span>
              ) : (
                'Пригласить в приложение'
              )}
            </div>
            {!inviteLink ? (
              <button
                type="button"
                disabled={generatingInvite}
                onClick={handleGenerateInvite}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-50 ${
                  status === 'converted'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                    : 'border-(--color_border) bg-(--color_bg_card_hover) text-white hover:border-(--color_primary_light)/40'
                }`}
              >
                <UserPlusIcon className="w-4 h-4" />
                {generatingInvite ? 'Генерируем...' : 'Сгенерировать ссылку'}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="px-3 py-2.5 rounded-xl bg-(--color_bg_input) border border-(--color_border) text-xs text-white/80 break-all">
                  {inviteLink}
                </div>
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-(--color_primary_light) text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  Скопировать ссылку
                </button>
                {status !== 'converted' && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleStatusChange('converted')}
                    className="w-full py-2 text-xs text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
                  >
                    Отметить как «Клиент» после отправки →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

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
            placeholder="Цель клиента, откуда пришёл, договорённости..."
            rows={3}
            className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors resize-none placeholder:text-(--color_text_muted) leading-relaxed"
          />
        </div>

        {/* Delete */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleDelete}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              confirmDelete
                ? 'bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30'
                : 'bg-(--color_bg_card_hover) border border-(--color_border) text-(--color_text_muted) hover:text-red-400 hover:border-red-500/30'
            }`}
          >
            <TrashIcon className="w-4 h-4" />
            {confirmDelete ? 'Подтвердите удаление' : 'Удалить заявку'}
          </button>
          {confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="w-full text-xs text-(--color_text_muted) hover:text-white transition-colors py-1"
            >
              Отмена
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
