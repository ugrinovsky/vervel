import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import PhoneInput from '@/components/ui/PhoneInput';
import DatePickerField from '@/components/ui/DatePickerField';
import { parseLocalDate, toDateKey } from '@/utils/date';
import Textarea from '@/components/ui/Textarea';
import AccentButton from '@/components/ui/AccentButton';
import GhostButton from '@/components/ui/GhostButton';
import Button from '@/components/ui/Button';
import ChoiceChips, { type ChoiceChipOption } from '@/components/ui/ChoiceChips';
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

const LEAD_STATUS_OPTIONS: ChoiceChipOption<LeadCrmStatus>[] = [
  {
    value: 'new',
    label: 'Новый',
    activeClass: 'border-amber-400 bg-amber-500/25 text-amber-100',
    inactiveClass: 'border-amber-500/20 bg-amber-500/10 text-amber-400/70 hover:text-amber-100',
  },
  {
    value: 'contacted',
    label: 'Связался',
    activeClass: 'border-blue-400 bg-blue-500/25 text-blue-100',
    inactiveClass: 'border-blue-500/20 bg-blue-500/10 text-blue-400/70 hover:text-blue-100',
  },
  {
    value: 'trial',
    label: 'Пробное',
    activeClass: 'border-purple-400 bg-purple-500/25 text-purple-100',
    inactiveClass: 'border-purple-500/20 bg-purple-500/10 text-purple-400/70 hover:text-purple-100',
  },
  {
    value: 'converted',
    label: 'Клиент',
    activeClass: 'border-green-400 bg-green-500/25 text-green-100',
    inactiveClass: 'border-green-500/20 bg-green-500/10 text-green-400/70 hover:text-green-100',
  },
  {
    value: 'lost',
    label: 'Потерян',
    activeClass: 'border-gray-400 bg-gray-500/25 text-gray-200',
    inactiveClass: 'border-gray-500/20 bg-gray-500/10 text-gray-500/70 hover:text-gray-300',
  },
];

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

        <ChoiceChips
          label="Статус"
          ariaLabel="Статус лида"
          options={LEAD_STATUS_OPTIONS}
          value={status}
          onChange={handleStatusChange}
          disabled={saving}
        />

        {/* Link to athlete card */}
        {lead.convertedAthleteId && (
          <Button
            type="button"
            variant="unstyled"
            fullWidth
            onClick={() => {
              onClose();
              navigate(`/trainer/athletes/${lead.convertedAthleteId}`);
            }}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-green-500/30 bg-green-500/10 text-sm font-medium text-green-300 hover:bg-green-500/20 transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
            Открыть карточку атлета
          </Button>
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
              <AccentButton
                onClick={handleGenerateInvite}
                disabled={generatingInvite}
                className="py-3 gap-2"
              >
                <UserPlusIcon className="w-4 h-4 shrink-0" />
                {generatingInvite ? 'Генерируем...' : 'Сгенерировать ссылку'}
              </AccentButton>
            ) : (
              <div className="space-y-2">
                <div className="px-3 py-2.5 rounded-xl bg-(--color_bg_input) border border-(--color_border) text-xs text-white/80 break-all">
                  {inviteLink}
                </div>
                <AccentButton onClick={handleCopyInvite}>
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  Скопировать ссылку
                </AccentButton>
                {status !== 'converted' && (
                  <Button
                    type="button"
                    variant="link"
                    fullWidth
                    disabled={saving}
                    onClick={() => handleStatusChange('converted')}
                    className="py-2 !text-xs !text-green-400 hover:!text-green-300 !no-underline disabled:opacity-50"
                  >
                    Отметить как «Клиент» после отправки →
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reminder date */}
        <div>
          <div className="text-xs text-(--color_text_muted) mb-2">Напомнить</div>
          <DatePickerField
            selected={followUpDate ? parseLocalDate(followUpDate) : null}
            onChange={(d) => handleFollowUpChange(d ? toDateKey(d) : '')}
            dateFormat="d MMM yyyy"
            isClearable
            placeholderText="Не выбрано"
          />
        </div>

        {/* Note */}
        <div>
          <div className="text-xs text-(--color_text_muted) mb-2">Заметка</div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={handleNoteBlur}
            placeholder="Цель клиента, откуда пришёл, договорённости..."
            rows={3}
          />
        </div>

        {/* Delete */}
        <div className="space-y-2">
          <Button
            type="button"
            variant={confirmDelete ? 'danger' : 'secondary'}
            fullWidth
            onClick={handleDelete}
            className={`py-2.5 gap-2 ${confirmDelete ? '' : 'hover:text-red-400 hover:border-red-500/30'}`}
          >
            <TrashIcon className="w-4 h-4" />
            {confirmDelete ? 'Подтвердите удаление' : 'Удалить заявку'}
          </Button>
          {confirmDelete && (
            <GhostButton
              variant="link"
              onClick={() => setConfirmDelete(false)}
              className="w-full text-center py-1"
            >
              Отмена
            </GhostButton>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
