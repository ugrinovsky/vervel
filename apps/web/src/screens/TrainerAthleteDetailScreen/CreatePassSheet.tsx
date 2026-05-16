import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ru } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/datepicker.css';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import AccentButton from '@/components/ui/AccentButton';
import { trainerApi, type AthletePass } from '@/api/trainer';

registerLocale('ru', ru);

const LS_KEY = 'trainer_pass_defaults';

interface PassDefaults {
  sessionsTotal: string;
  priceAmount: string;
}

function loadDefaults(): PassDefaults {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { sessionsTotal: '', priceAmount: '' };
}

function saveDefaults(d: PassDefaults) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(d));
  } catch {}
}

interface Props {
  athleteId: number;
  open: boolean;
  onClose: () => void;
  onCreated: (pass: AthletePass) => void;
}

export default function CreatePassSheet({ athleteId, open, onClose, onCreated }: Props) {
  const defaults = loadDefaults();

  const [title, setTitle] = useState('');
  const [priceAmount, setPriceAmount] = useState(defaults.priceAmount);
  const [sessionsTotal, setSessionsTotal] = useState(defaults.sessionsTotal);
  const [validUntil, setValidUntil] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Сбрасываем форму при открытии, но сохраняем дефолты
  useEffect(() => {
    if (open) {
      const d = loadDefaults();
      setTitle('');
      setPriceAmount(d.priceAmount);
      setSessionsTotal(d.sessionsTotal);
      setValidUntil(null);
      setNotes('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(priceAmount);
    const sessions = parseInt(sessionsTotal, 10);

    if (!Number.isFinite(price) || price < 0) {
      toast.error('Введите корректную сумму');
      return;
    }
    if (!Number.isInteger(sessions) || sessions < 1) {
      toast.error('Количество занятий должно быть ≥ 1');
      return;
    }

    setSaving(true);
    try {
      const res = await trainerApi.createPass(athleteId, {
        title: title.trim() || undefined,
        priceAmount: price,
        sessionsTotal: sessions,
        validUntil: validUntil ? validUntil.toISOString().slice(0, 10) : null,
        notes: notes.trim() || null,
      });
      saveDefaults({ priceAmount, sessionsTotal });
      onCreated(res.data.data);
      toast.success('Абонемент создан');
      onClose();
    } catch {
      toast.error('Не удалось создать абонемент');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet id="create-pass" open={open} onClose={onClose} title="Новый абонемент" emoji="💳">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Сумма + Занятия */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-(--color_text_muted) mb-1.5">Сумма, ₽</label>
            <input
              type="number"
              inputMode="numeric"
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
              placeholder="5000"
              min="0"
              required
              className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-(--color_text_muted)"
            />
          </div>
          <div>
            <label className="block text-xs text-(--color_text_muted) mb-1.5">Занятий</label>
            <input
              type="number"
              inputMode="numeric"
              value={sessionsTotal}
              onChange={(e) => setSessionsTotal(e.target.value)}
              placeholder="8"
              min="1"
              required
              className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-(--color_text_muted)"
            />
          </div>
        </div>

        {/* Дата окончания */}
        <div>
          <label className="block text-xs text-(--color_text_muted) mb-1.5">
            Действует до <span className="opacity-50">(необязательно)</span>
          </label>
          <DatePicker
            selected={validUntil}
            onChange={(d: Date | null) => setValidUntil(d)}
            dateFormat="d MMM yyyy"
            locale="ru"
            placeholderText="Без ограничения"
            isClearable
            minDate={new Date()}
            wrapperClassName="w-full"
            className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-(--color_text_muted)"
            calendarClassName="dark-datepicker"
            popperPlacement="bottom-start"
            portalId="datepicker-portal"
          />
        </div>

        {/* Название */}
        <div>
          <label className="block text-xs text-(--color_text_muted) mb-1.5">
            Название <span className="opacity-50">(необязательно)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            placeholder="Абонемент"
            className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-(--color_text_muted)"
          />
        </div>

        {/* Заметка */}
        <div>
          <label className="block text-xs text-(--color_text_muted) mb-1.5">
            Заметка <span className="opacity-50">(необязательно)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Оплатил наличными, перенос с прошлого пакета..."
            rows={2}
            className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors resize-none placeholder:text-(--color_text_muted) leading-relaxed"
          />
        </div>

        <AccentButton type="submit" loading={saving} loadingText="Сохраняем...">
          Сохранить
        </AccentButton>
      </form>
    </BottomSheet>
  );
}
