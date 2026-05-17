/** Shared button class maps — single source of truth for all button UI. */

/** Клавиатурный фокус — плавное появление кольца (все варианты кроме link). */
/** Плавные смена состояния (hover / active / aria-pressed) и фокус-кольцо */
export const BUTTON_TRANSITION =
  'transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200 ease-in-out';

export const BUTTON_FOCUS_RING =
  `outline-none ${BUTTON_TRANSITION} focus-visible:ring-2 focus-visible:ring-(--color_primary_light) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color_primary_dark) disabled:focus-visible:ring-0`;

const BUTTON_FOCUS_LINK =
  `outline-none ${BUTTON_TRANSITION} focus-visible:underline focus-visible:text-white focus-visible:ring-2 focus-visible:ring-(--color_primary_light)/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent`;

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'soft'
  | 'ghost'
  | 'outline'
  | 'outline-accent'
  | 'link'
  | 'danger'
  | 'danger-soft'
  | 'success'
  | 'soft-muted'
  | 'subtle'
  | 'emerald'
  | 'emerald-cta'
  | 'list-row'
  | 'unstyled';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'toolbar';

const SIZE: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 rounded-lg text-xs font-medium gap-1',
  sm: 'px-3 py-1.5 rounded-lg text-sm font-medium gap-1.5',
  md: 'px-4 py-2 rounded-xl text-sm font-medium gap-1.5',
  lg: 'px-4 py-3 rounded-xl text-base font-semibold gap-2',
  icon: 'w-9 h-9 rounded-xl p-0 gap-0',
  toolbar: 'w-6 h-6 rounded-md p-0 gap-0',
};

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-(--color_primary_light) text-white hover:opacity-90 transition-opacity disabled:opacity-50',
  secondary:
    'bg-(--color_bg_card_hover) border border-(--color_border) text-(--color_text_muted) hover:text-white transition-colors',
  soft:
    'bg-(--color_primary)/25 border border-(--color_primary_light)/40 text-(--color_primary_light) font-semibold hover:opacity-95',
  ghost:
    'border border-dashed border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors',
  outline:
    'border border-(--color_border) bg-(--color_bg_card_hover) text-(--color_text_muted) hover:text-white transition-colors',
  'outline-accent':
    'border border-(--color_border) text-(--color_primary_light) hover:bg-(--color_primary_light)/10 transition-colors',
  link: 'bg-transparent border-0 shadow-none text-(--color_text_muted) underline-offset-2 hover:underline p-0',
  danger:
    'bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-colors',
  'danger-soft': 'text-white/30 hover:text-red-400 hover:bg-red-500/15 transition-colors',
  success: 'bg-emerald-500/20 text-emerald-300 font-semibold hover:bg-emerald-500/30 transition-colors',
  'soft-muted':
    'bg-(--color_primary_light)/20 text-(--color_primary) font-medium hover:bg-(--color_primary_light)/30 border-0',
  subtle:
    'border border-white/10 bg-white/5 text-white hover:bg-white/[0.08] hover:border-white/20 transition-colors',
  emerald:
    'bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors disabled:cursor-not-allowed',
  'emerald-cta':
    'bg-emerald-500 text-black font-medium hover:bg-emerald-400 transition-colors disabled:opacity-50',
  'list-row': 'text-white hover:bg-white/5',
  unstyled: '',
};

export function listRowClasses(selected: boolean): string {
  return selected
    ? 'bg-(--color_primary_light) text-white'
    : 'text-white hover:bg-white/5';
}

/** Pill / tab toggle colors (use with `active` on Button or PillButton). */
export function pillColors(variant: 'pill' | 'tab', active: boolean): string {
  if (variant === 'tab') {
    return active
      ? 'bg-(--color_primary_light) text-white'
      : 'bg-(--color_bg_card) text-(--color_text_muted) hover:text-white';
  }
  return active
    ? 'bg-(--color_primary_light) text-white'
    : 'text-(--color_text_muted) hover:text-white';
}

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  selected,
  className = '',
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  selected?: boolean;
  className?: string;
}): string {
  const layout =
    variant === 'link'
      ? 'inline-flex items-center gap-1'
      : variant === 'unstyled'
        ? ''
        : `inline-flex items-center justify-center ${SIZE[size]}`;

  const width = fullWidth && variant !== 'link' ? 'w-full' : '';

  const softCompact =
    variant === 'soft' && size === 'xs'
      ? 'bg-(--color_primary_light)/15 hover:bg-(--color_primary_light)/25 text-(--color_primary_light) border-0 font-semibold active:scale-95'
      : VARIANT[variant];

  const listRow =
    variant === 'list-row'
      ? `w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${listRowClasses(!!selected)}`
      : '';

  const resolvedLayout = variant === 'list-row' ? '' : layout;
  const resolvedBase = listRow || softCompact;
  const focus = variant === 'link' ? BUTTON_FOCUS_LINK : BUTTON_FOCUS_RING;

  return [resolvedLayout, width, resolvedBase, focus, className].filter(Boolean).join(' ').trim();
}

/** Icon-only toolbar action (duplicate / delete in forms). */
export function toolbarIconClasses(tone: 'default' | 'info' | 'danger' = 'default'): string {
  const tones = {
    default: 'text-white/30 hover:text-white hover:bg-white/10',
    info: 'text-white/30 hover:text-blue-400 hover:bg-blue-500/15',
    danger: 'text-white/30 hover:text-red-400 hover:bg-red-500/15 disabled:opacity-20 disabled:cursor-not-allowed',
  };
  return `inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors ${BUTTON_FOCUS_RING} ${tones[tone]}`;
}
