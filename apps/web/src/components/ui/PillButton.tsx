import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
  /**
   * 'pill' (default) — transparent inactive, primary_light active (tiny nav chips)
   * 'tab' — card bg inactive, primary_light active (screen-level tabs)
   */
  variant?: 'pill' | 'tab';
  /**
   * 'sm' (default) — compact chip: text-[11px] px-2 py-0.5 rounded-md
   * 'md' — full tab: text-sm px-4 py-2 rounded-xl
   */
  size?: 'sm' | 'md';
}

export default function PillButton({
  active,
  variant = 'pill',
  size = 'sm',
  className = '',
  children,
  ...props
}: PillButtonProps) {
  const base =
    size === 'md'
      ? 'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors'
      : 'px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all leading-[1.4]';

  const colors =
    variant === 'tab'
      ? active
        ? 'bg-(--color_primary_light) text-white'
        : 'bg-(--color_bg_card) text-(--color_text_muted) hover:text-white'
      : active
        ? 'bg-(--color_primary_light) text-white'
        : 'text-(--color_text_muted) hover:text-white';

  return (
    <button className={`${base} ${colors} ${className}`} {...props}>
      {children}
    </button>
  );
}
