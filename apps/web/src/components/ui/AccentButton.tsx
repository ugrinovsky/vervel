import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface AccentButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** 'sm' — compact (px-3 py-1.5 rounded-lg), 'md' — standard (py-3 rounded-xl w-full) */
  size?: 'sm' | 'md';
  loading?: boolean;
  loadingText?: string;
}

/**
 * Primary accent button — uses --color_primary_light background.
 * Always use this component instead of inline bg-(--color_primary_light) classes
 * to ensure consistent theming (especially light theme compatibility).
 */
export default function AccentButton({
  children,
  size = 'md',
  loading,
  loadingText,
  disabled,
  className = '',
  ...props
}: AccentButtonProps) {
  const base =
    size === 'sm'
      ? 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium'
      : 'flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-sm font-medium';

  return (
    <button
      disabled={disabled || loading}
      style={{ color: 'white' }}
      className={`${base} bg-(--color_primary_light) hover:opacity-90 transition-opacity disabled:opacity-50 ${className}`}
      {...props}
    >
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
