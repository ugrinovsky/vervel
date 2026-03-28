import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /**
   * 'ghost' — bg-card, muted text, hover white (default)
   * 'accent' — primary background, white text
   */
  variant?: 'ghost' | 'accent';
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
