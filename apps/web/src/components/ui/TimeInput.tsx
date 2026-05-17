import { PatternFormat } from 'react-number-format';
import { ClockIcon } from '@heroicons/react/24/outline';
import { pickerFieldClasses } from '@/components/ui/inputStyles';
import { PickerFieldShell } from '@/components/ui/pickerField';

/** Минимальная форма события — PatternFormat не отдаёт нативный ChangeEvent. */
export type TimeInputChange = { target: { value: string } };

interface TimeInputProps {
  value: string;
  onChange: (e: TimeInputChange) => void;
  className?: string;
}

const isTime = (val: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(val);

export default function TimeInput({ value, onChange, className = '' }: TimeInputProps) {
  const handleValueChange = (v: { formattedValue: string }) => {
    const nextValue = v.formattedValue;
    onChange({ target: { value: nextValue } });
  };

  return (
    <PickerFieldShell icon={ClockIcon}>
      <PatternFormat
        value={value}
        format="##:##"
        placeholder="HH:MM"
        mask="_"
        className={pickerFieldClasses({ className })}
        onValueChange={handleValueChange}
        onBlur={(e) => {
          if (!isTime(e.currentTarget.value)) {
            onChange({ target: { value } });
          }
        }}
      />
    </PickerFieldShell>
  );
}
