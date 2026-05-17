import { useId, type ReactNode } from 'react';
import Button from '@/components/ui/Button';
import FieldLabel from '@/components/ui/FieldLabel';
import type { FieldLabelVariant } from '@/components/ui/fieldLabelStyles';

export interface ChoiceChipOption<T extends string> {
  value: T;
  label: ReactNode;
  description?: ReactNode;
  activeClass?: string;
  inactiveClass?: string;
  /** Доп. классы на кнопку */
  className?: string;
  /** Квадратный чип только с иконкой / коротким лейблом */
  compact?: boolean;
}

export interface ChoiceChipsProps<T extends string> {
  options: ChoiceChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  variant?: 'pill' | 'tile';
  label?: ReactNode;
  /** Стиль заголовка над группой (по умолчанию section) */
  labelVariant?: FieldLabelVariant;
  ariaLabel?: string;
  className?: string;
  /** Все чипы в одну строку (горизонтальный скролл при нехватке места) */
  nowrap?: boolean;
}

const CHIP_BORDER = 'border-2 box-border';

export const choiceChipInactiveClass =
  'border-(--color_border) bg-(--color_bg_card_hover) text-(--color_text_secondary) hover:text-white hover:border-white/30';

export const choiceChipActiveDefaultClass =
  'border-(--color_primary_light) bg-(--color_primary_light)/20 text-white';

const CHIP_LAYOUT =
  'inline-flex items-center justify-center touch-manipulation select-none [-webkit-tap-highlight-color:transparent] transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200 ease-in-out active:opacity-100! active:filter-none!';

const PILL_BASE = 'px-3 py-1.5 rounded-full text-xs font-medium';
const PILL_COMPACT = 'w-8 h-8 min-w-8 p-0 rounded-full text-xs font-medium';
const TILE_BASE = 'px-3 py-2.5 rounded-xl text-sm font-semibold leading-tight text-left';

export default function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  variant = 'pill',
  label,
  labelVariant = 'section',
  ariaLabel,
  className = '',
  nowrap = false,
}: ChoiceChipsProps<T>) {
  const labelId = useId();
  const groupLabel = ariaLabel ?? (typeof label === 'string' ? label : undefined);
  const rowLayout = nowrap
    ? 'flex flex-nowrap gap-2 overflow-x-auto no-scrollbar'
    : 'flex flex-wrap gap-2';
  const layout =
    variant === 'tile' ? `grid grid-cols-2 gap-2 ${className}` : `${rowLayout} ${className}`;

  const group = (
    <div
      className={layout.trim()}
      role="group"
      aria-label={label == null ? groupLabel : undefined}
      aria-labelledby={label != null ? labelId : undefined}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        const itemBase = opt.compact
          ? PILL_COMPACT
          : variant === 'tile'
            ? TILE_BASE
            : PILL_BASE;
        return (
          <Button
            key={opt.value}
            type="button"
            variant="unstyled"
            fullWidth={variant === 'tile'}
            disabled={disabled}
            aria-pressed={isActive}
            onClick={() => onChange(opt.value)}
            className={`${CHIP_LAYOUT} ${itemBase} ${CHIP_BORDER} disabled:opacity-50 shrink-0 ${
              isActive
                ? (opt.activeClass ?? choiceChipActiveDefaultClass)
                : (opt.inactiveClass ?? choiceChipInactiveClass)
            } ${opt.className ?? ''}`}
          >
            {variant === 'tile' && opt.description != null ? (
              <>
                <span className="block">{opt.label}</span>
                <span className="block text-[11px] opacity-70 mt-0.5 font-normal">{opt.description}</span>
              </>
            ) : (
              opt.label
            )}
          </Button>
        );
      })}
    </div>
  );

  if (label == null) return group;

  return (
    <div>
      <FieldLabel id={labelId} as="p" variant={labelVariant}>
        {label}
      </FieldLabel>
      {group}
    </div>
  );
}
