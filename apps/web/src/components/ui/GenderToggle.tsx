import ToggleGroup from '@/components/ui/ToggleGroup';

export type GenderValue = 'male' | 'female' | null;

const OPTIONS = [
  { value: 'male' as const, label: '👨 Мужской' },
  { value: 'female' as const, label: '👩 Женский' },
];

interface Props {
  value: GenderValue;
  onChange: (value: GenderValue) => void;
  label?: string;
  className?: string;
  labelClassName?: string;
}

export default function GenderToggle({
  value,
  onChange,
  label = 'Пол',
  className = '',
  labelClassName = 'text-xs text-(--color_text_muted) mb-2 block',
}: Props) {
  return (
    <div className={className}>
      <label className={labelClassName}>{label}</label>
      <ToggleGroup
        cols={2}
        value={value}
        onChange={(v) => onChange(value === v ? null : v)}
        options={OPTIONS}
      />
    </div>
  );
}
