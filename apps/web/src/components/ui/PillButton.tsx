import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

/**
 * Pill/tab toggle button.
 * Active: bg-(--color_primary_light) with white text.
 * Inactive: transparent with muted text.
 * Works correctly in both dark and light themes.
 */
export default function PillButton({ active, className = '', children, ...props }: PillButtonProps) {
  return (
    <button
      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all leading-[1.4] ${
        active
          ? 'bg-(--color_primary_light) text-white'
          : 'text-(--color_text_muted) hover:text-white'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
