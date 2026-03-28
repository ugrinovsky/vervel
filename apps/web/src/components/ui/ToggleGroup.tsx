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
  /** Vertical padding of each button (default: 'py-2') */
  itemPy?: string;
  /** Join buttons together without gap, rounded only on ends */
  joined?: boolean;
}

const COLS = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' } as const;

export default function ToggleGroup<T extends string | number>({
  options,
  value,
  onChange,
  cols,
  className = '',
  itemPy = 'py-2',
  joined = false,
}: Props<T>) {
  const colClass = COLS[cols ?? (options.length as 2 | 3 | 4)] ?? 'grid-cols-2';

  if (joined) {
    return (
      <div className={`flex ${className}`}>
        {options.map((opt, i) => {
          const active = opt.value === value;
          const isFirst = i === 0;
          const isLast = i === options.length - 1;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`flex-1 ${itemPy} text-sm font-medium transition-all border relative
                ${isFirst ? 'rounded-l-xl' : '-ml-px'}
                ${isLast ? 'rounded-r-xl' : ''}
                ${active
                  ? 'bg-(--color_primary_light) border-(--color_primary_light) text-white z-10'
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

  return (
    <div className={`grid gap-2 ${colClass} ${className}`}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`${itemPy} rounded-xl text-sm font-medium transition-all border ${
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
