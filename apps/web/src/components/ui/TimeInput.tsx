interface TimeInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

const BASE_CLS =
  'w-full min-w-0 h-10 bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors appearance-none [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-datetime-edit]:text-sm [&::-webkit-date-and-time-value]:text-left';

export default function TimeInput({ value, onChange, className = '' }: TimeInputProps) {
  return (
    <input
      type="time"
      value={value}
      onChange={onChange}
      className={`${BASE_CLS} ${className}`}
    />
  );
}
