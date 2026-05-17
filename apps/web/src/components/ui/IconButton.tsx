import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /**
   * 'ghost' — bg-card, muted text, hover white (default)
   * 'accent' — primary background, white text
   * 'row-action' — transparent, border-left divider; use as right-side action inside a card row
   */
  variant?: 'ghost' | 'accent' | 'row-action';
  /**
   * 'sm'   — icon + label: px-3 py-1.5 rounded-lg text-xs
   * 'icon' — square icon-only: w-9 h-9 rounded-xl
   */
  size?: 'sm' | 'icon';
}

export default function IconButton({
  children,
  variant = 'ghost',
  size = 'sm',
  className = '',
  ...props
}: IconButtonProps) {
  if (variant === 'row-action') {
    return (
      <button
        {...props}
        className={`shrink-0 flex items-center justify-center w-10 self-stretch border-l border-(--color_border) text-(--color_text_muted) hover:text-white hover:bg-(--color_bg_card_hover) transition-colors disabled:opacity-50 ${className}`}
      >
        {children}
      </button>
    );
  }

  const base =
    size === 'icon'
      ? 'flex items-center justify-center w-9 h-9 rounded-xl shrink-0'
      : 'flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0';

  const colors =
    variant === 'accent'
      ? 'bg-(--color_primary_light) text-white hover:opacity-90'
      : 'bg-(--color_bg_card) text-(--color_text_muted) hover:text-white';

  return (
    <button
      {...props}
      className={`${base} ${colors} text-xs font-medium transition-colors disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
