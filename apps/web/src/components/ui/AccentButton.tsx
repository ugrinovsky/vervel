import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface AccentButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** 'sm' — compact (px-3 py-1.5 rounded-lg), 'md' — standard (py-2 rounded-xl w-full) */
  size?: 'sm' | 'md';
  loading?: boolean;
  loadingText?: string;
}

/**
 * Primary accent button — uses --color_primary_light background.
 * @deprecated Prefer `<Button variant="primary" />` — kept for backward compatibility.
 */
export default function AccentButton({
  children,
  size = 'md',
  loading,
  loadingText,
  className = '',
  ...props
}: AccentButtonProps) {
  return (
    <Button
      variant="primary"
      size={size === 'sm' ? 'sm' : 'md'}
      fullWidth={size === 'md'}
      loading={loading}
      loadingText={loadingText}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}
