import DatePicker, { registerLocale } from 'react-datepicker';
import { ru } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/datepicker.css';
import { toTimeKey } from '@/utils/date';

registerLocale('ru', ru);

const INPUT_CLS =
  'w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors';

interface Props {
  date: Date;
  time: Date;
  onDateChange: (d: Date) => void;
  onTimeChange: (t: Date) => void;
}

export default function WorkoutDateTimeRow({ date, time, onDateChange, onTimeChange }: Props) {
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h, m] = e.target.value.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return;
    const next = new Date(time);
    next.setHours(h, m, 0, 0);
    onTimeChange(next);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <DatePicker
        selected={date}
        onChange={(d: Date | null) => d && onDateChange(d)}
        dateFormat="d MMM yyyy"
        locale="ru"
        wrapperClassName="w-full"
        className={INPUT_CLS}
        calendarClassName="dark-datepicker"
        popperPlacement="bottom-start"
        portalId="datepicker-portal"
      />
      <input
        type="time"
        value={toTimeKey(time)}
        onChange={handleTimeChange}
        className={`${INPUT_CLS} [&::-webkit-calendar-picker-indicator]:invert`}
      />
    </div>
  );
}
