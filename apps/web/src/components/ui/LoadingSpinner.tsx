import type { HTMLAttributes } from 'react';

const SIZE_STYLES = {
  /** 12px, тонкая обводка */
  '2xs': 'w-3 h-3 border',
  xs: 'w-4 h-4 border-2',
  sm: 'w-5 h-5 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
  xl: 'h-12 w-12 border-4',
  /** 28px — индикатор pull-to-refresh в Screen */
  pull: 'h-7 w-7 border-2',
} as const;

const VARIANT_STYLES = {
  /** Кольцо приглушённое, штрих — primary (экраны, списки) */
  accent: 'border-white/20 border-t-(--color_primary_light)',
  /** На тёмном оверлее (GIF, аватар) */
  light: 'border-white/30 border-t-white',
  /** Мягче кольцо, белый штрих (например invite) */
  soft: 'border-white/20 border-t-white',
  /** Зелёное кольцо с просветом сверху */
  emeraldArc: 'border-emerald-500 border-t-transparent',
  /** Кольцо как accent, штрих emerald */
  emeraldAccent: 'border-white/20 border-t-emerald-400',
  /** Приглушённое кольцо на тёмной кнопке, просвет сверху */
  trackDark: 'border-white/40 border-t-transparent',
  /** На светлой заливке кнопки */
  trackLight: 'border-black/40 border-t-transparent',
  /** Кольцо primary, просвет сверху */
  primaryArc: 'border-(--color_primary_light) border-t-transparent',
  /** Крупный белый спиннер на градиенте OAuth */
  oauth: 'border-white border-t-transparent',
} as const;

export type LoadingSpinnerSize = keyof typeof SIZE_STYLES;
export type LoadingSpinnerVariant = keyof typeof VARIANT_STYLES;

type Props = Omit<HTMLAttributes<HTMLDivElement>, 'size'> & {
  size?: LoadingSpinnerSize;
  variant?: LoadingSpinnerVariant;
  /** false — вращение задаёт снаружи (например framer-motion в pull-to-refresh) */
  animated?: boolean;
};

/** Кольцевой индикатор загрузки — размеры и варианты в одном месте. */
export default function LoadingSpinner({
  size = 'lg',
  variant = 'accent',
  animated = true,
  className = '',
  ...rest
}: Props) {
  return (
    <div
      aria-hidden
      className={`shrink-0 rounded-full ${animated ? 'animate-spin' : ''} ${SIZE_STYLES[size]} ${VARIANT_STYLES[variant]} ${className}`.trim()}
      {...rest}
    />
  );
}
