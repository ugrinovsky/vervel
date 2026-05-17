import { toTimeKey } from '@/utils/date';
import DatePickerField from '@/components/ui/DatePickerField';
import TimeInput from '@/components/ui/TimeInput';

interface Props {
  date: Date;
  time: Date;
  onDateChange: (d: Date) => void;
  onTimeChange: (t: Date) => void;
}

export default function WorkoutDateTimeRow({ date, time, onDateChange, onTimeChange }: Props) {
  const handleTimeChange = (e: { target: { value: string } }) => {
    const [h, m] = e.target.value.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return;
    const next = new Date(time);
    next.setHours(h, m, 0, 0);
    onTimeChange(next);
  };

  return (
    <div className="grid grid-cols-2 gap-2 min-w-0">
      <DatePickerField
        selected={date}
        onChange={(d: Date | null) => d && onDateChange(d)}
        dateFormat="d MMM yyyy"
      />
      <div className="min-w-0">
        <TimeInput value={toTimeKey(time)} onChange={handleTimeChange} />
      </div>
    </div>
  );
}
