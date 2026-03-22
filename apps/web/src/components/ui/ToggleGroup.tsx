import { type ReactNode } from 'react';

interface Option<T> {
  value: T;
  label: ReactNode;
}

interface Props<T extends string | number> {
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
  /** Number of grid columns (default: auto = options.length) */
  cols?: 2 | 3 | 4;
  className?: string;
}

const COLS = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' } as const;

export default function ToggleGroup<T extends string | number>({
  options,
  value,
  onChange,
  cols,
  className = '',
}: Props<T>) {
  const colClass = COLS[cols ?? (options.length as 2 | 3 | 4)] ?? 'grid-cols-2';

  return (
    <div className={`grid gap-2 ${colClass} ${className}`}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`py-2 rounded-xl text-sm font-medium transition-all border ${
              active
                ? 'bg-(--color_primary_light) border-(--color_primary_light) text-white'
                : 'bg-(--color_bg_card_hover) border-(--color_border) text-(--color_text_muted) hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
