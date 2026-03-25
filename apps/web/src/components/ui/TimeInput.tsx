import { PatternFormat } from 'react-number-format';

interface TimeInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

const BASE_CLS =
  'w-full min-w-0 h-10 bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors appearance-none';

const isTime = (val: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(val);

export default function TimeInput({ value, onChange, className = '' }: TimeInputProps) {
  const handleValueChange = (v: { formattedValue: string }) => {
    const nextValue = v.formattedValue;
    const output = nextValue.length === 5 && isTime(nextValue) ? nextValue : nextValue;
    onChange({
      target: { value: output } as unknown as EventTarget,
    } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <PatternFormat
      value={value}
      format="##:##"
      placeholder="HH:MM"
      mask="_"
      className={`${BASE_CLS} ${className}`}
      onValueChange={handleValueChange}
      onBlur={(e) => {
        if (!isTime(e.currentTarget.value)) {
          onChange({
            target: { value } as unknown as EventTarget,
          } as React.ChangeEvent<HTMLInputElement>);
        }
      }}
    />
  );
}
