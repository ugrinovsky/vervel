import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { trainerApi, type AthleteCrmStatus } from '@/api/trainer';
import DatePickerField from '@/components/ui/DatePickerField';
import { parseLocalDate, toDateKey } from '@/utils/date';
import Textarea from '@/components/ui/Textarea';
import ChoiceChips, { type ChoiceChipOption } from '@/components/ui/ChoiceChips';

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

const ATHLETE_STATUS_OPTIONS: ChoiceChipOption<AthleteCrmStatus>[] = [
  {
    value: 'active',
    label: 'Активен',
    description: 'Клиент ходит и занимается',
    activeClass: 'border-green-400 bg-green-500/25 text-green-100',
    inactiveClass: 'border-green-500/20 bg-green-500/10 text-green-400/70 hover:text-green-100',
  },
  {
    value: 'sleeping',
    label: 'Неактивен',
    description: 'Давно нет активности',
    activeClass: 'border-amber-400 bg-amber-500/25 text-amber-100',
    inactiveClass: 'border-amber-500/20 bg-amber-500/10 text-amber-400/70 hover:text-amber-100',
  },
  {
    value: 'paused',
    label: 'Пауза',
    description: 'Временный перерыв',
    activeClass: 'border-blue-400 bg-blue-500/25 text-blue-100',
    inactiveClass: 'border-blue-500/20 bg-blue-500/10 text-blue-400/70 hover:text-blue-100',
  },
  {
    value: 'churned',
    label: 'Ушёл',
    description: 'Прекратил занятия',
    activeClass: 'border-gray-400 bg-gray-500/25 text-gray-200',
    inactiveClass: 'border-gray-500/20 bg-gray-500/10 text-gray-500/70 hover:text-gray-300',
  },
];

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
        <ChoiceChips
          variant="tile"
          label="Статус клиента"
          ariaLabel="Статус клиента"
          options={ATHLETE_STATUS_OPTIONS}
          value={status}
          onChange={handleStatusChange}
          disabled={saving}
        />

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
            placeholder="Причина паузы, договорённости, особенности клиента..."
            rows={3}
          />
        </div>
      </div>
    </BottomSheet>
  );
}
